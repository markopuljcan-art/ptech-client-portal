/* PTech Digital V8 — read-only authenticated project overview.
   Shows actual Supabase records; business modifications stay in original admin-projects.js/RPC. */
(() => {
  'use strict';
  const db = window.supabase.createClient(
    'https://agivwsbczzvvuzszcvxz.supabase.co',
    'sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE'
  );
  const $ = id => document.getElementById(id);
  const safe = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  const fmt = v => { if (!v) return '—'; const d=new Date(v); return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('hr-HR'); };
  const show = (id,value) => { const el=$(id); if(el) el.textContent=String(value ?? '—'); };
  const paramId = new URLSearchParams(location.search).get('id');
  async function optionalQuery(promise, label) {
    try { const r=await promise; if(r.error) { console.warn(label,r.error); return { rows:[],error:r.error }; } return {rows:r.data||[],error:null}; }
    catch(e) { console.warn(label,e); return {rows:[],error:e}; }
  }
  async function start() {
    if (!paramId || !/^\d+$/.test(paramId)) { show('v8ProjectNotice','Nije naveden valjan ID projekta.'); return; }
    const {data:{user},error:authError}=await db.auth.getUser();
    if (authError || !user) { location.replace('login.html'); return; }
    const {data:isAdmin,error:roleError}=await db.rpc('is_admin_user',{check_user_id:user.id});
    if (roleError || isAdmin !== true) { location.replace('form.html'); return; }
    const {data:project,error}=await db.from('projects').select('id,name,type,status,progress,created_at,deadline,package,user_id').eq('id',Number(paramId)).maybeSingle();
    if(error || !project) { show('v8ProjectNotice','Projekt nije pronađen ili nemaš pravo pristupa.'); return; }
    show('v8ProjectTitle',project.type || project.name || `Projekt #${project.id}`);
    show('v8ProjectSubtitle',project.name || 'Projekt');
    show('v8ProjectDate',fmt(project.created_at));
    show('v8ProjectStatus',project.status || '—');
    show('v8Type',project.type || '—'); show('v8Package',project.package || '—');
    show('v8Deadline',fmt(project.deadline)); show('v8ProjectId',project.id);
    const progress=Number.isFinite(Number(project.progress))?Math.min(100,Math.max(0,Number(project.progress))):0;
    show('v8ProgressNumber',`${progress} %`); show('v8ProgressLabel',`${progress} %`);
    $('v8ProgressFill').style.width=progress+'%';
    $('v8EditProject').href='admin-projects.html?edit='+encodeURIComponent(String(project.id));
    $('v8SupportLink').href='admin-support.html?client='+encodeURIComponent(project.user_id);
    if (project.user_id) {
      const p=await db.from('profiles').select('display_name').eq('id',project.user_id).maybeSingle();
      show('v8ClientName',p.data?.display_name||'Klijent');
    }
    const [d,ad,cu]=await Promise.all([
      optionalQuery(db.from('project_designs').select('id,status,created_at').eq('project_id',project.id).order('created_at',{ascending:false}), 'project_designs'),
      optionalQuery(db.from('project_documents').select('id,name,document_type,created_at').eq('project_id',project.id).order('created_at',{ascending:false}), 'project_documents'),
      optionalQuery(db.from('client_uploads').select('id,title,original_file_name,created_at,category').eq('project_id',String(project.id)).order('created_at',{ascending:false}), 'client_uploads')
    ]);
    const designs=d.rows; const documents=[...ad.rows.map(x=>({...x,source:'admin'})),...cu.rows.map(x=>({...x,name:x.original_file_name||x.title||'Dokument',source:'client'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const latest=designs[0]; show('v8LatestVersion',latest?`Dizajn #${latest.id}`:'Nema verzije');
    const labels={pending:'Čeka odluku',approved:'Odobreno',revision_requested:'Tražene izmjene'};
    show('v8DesignStatus',latest ? (labels[latest.status]||latest.status||'—'):'Bez dizajna');
    show('v8DesignCount',designs.length);show('v8DocsCount',documents.length);
    $('v8DesignList').innerHTML=designs.length ? designs.map(v=>`<div class="v8-item"><div><strong>Dizajn #${safe(v.id)}</strong><small>${fmt(v.created_at)}</small></div><span class="v8-tag">${safe(labels[v.status]||v.status||'Učitano')}</span></div>`).join('') : '<p class="v8-muted">Nema učitanih verzija dizajna.</p>';
    $('v8DocumentList').innerHTML=documents.length ? documents.map(v=>`<div class="v8-item"><div><strong>${safe(v.name||'Dokument')}</strong><small>${v.source==='client'?'Poslao klijent':'Dodao administrator'} · ${fmt(v.created_at)}</small></div><span class="v8-tag">${safe(v.document_type||v.category||'Datoteka')}</span></div>`).join('') : '<p class="v8-muted">Nema dokumenata za ovaj projekt.</p>';
    const timeline=[...designs.map(v=>({when:v.created_at,title:'Učitana verzija dizajna',desc:`Dizajn #${v.id} — ${labels[v.status]||v.status||'Učitano'}`})),...documents.map(v=>({when:v.created_at,title:'Dodan dokument',desc:v.name||'Dokument'}))].sort((a,b)=>new Date(b.when)-new Date(a.when)).slice(0,8);
    $('v8ActivityList').innerHTML=timeline.length?timeline.map(v=>`<div class="v8-activity"><div><strong>${safe(v.title)}</strong><span>${safe(v.desc)} · ${fmt(v.when)}</span></div></div>`).join(''):'<p class="v8-muted">Još nema zabilježenih dizajna ili dokumenata za ovaj projekt.</p>';
    $('v8ProjectNotice').hidden=true;
    $('v8ProjectView').hidden=false;
    if (d.error || ad.error || cu.error) console.warn('Dio podataka možda nije dostupan zbog RLS-a.');
  }
  start().catch(e=>{console.error('Project overview',e);show('v8ProjectNotice','Učitavanje nije uspjelo. Osvježi stranicu ili provjeri prijavu.');});
})();
