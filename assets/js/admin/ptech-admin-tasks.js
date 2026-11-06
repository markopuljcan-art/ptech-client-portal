/* PTech Digital V14.1 - admin CRUD for client-facing project tasks. */
(() => {
  'use strict';
  const api=window.supabase?.createClient(
    'https://agivwsbczzvvuzszcvxz.supabase.co',
    'sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE'
  );
  const $=id=>document.getElementById(id);
  let user=null,tasks=[],projects=[],projectById=new Map(),busy=false,focusFrom=null;
  const labels={todo:'Za napraviti',doing:'U tijeku',done:'Dovr\u0161eno'};
  const txt=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=String(text??'');return el;};
  const fmt=value=>{if(!value)return 'Bez roka';const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?'Bez roka':d.toLocaleDateString('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'});};
  const overdue=task=>task.status!=='done'&&task.due_date&&task.due_date < new Date().toISOString().slice(0,10);
  function message(text,type='',target='atNotice'){
    const n=$(target);if(!n)return;n.hidden=false;n.className='at-notice'+(type?' '+type:'');n.textContent=text;
  }
  const labelProject=id=>{const p=projectById.get(String(id));return p?p.name+' / '+p.client:'Projekt '+id;};
  function setOptions(target,first,arr){
    const el=$(target);const old=el.value;el.replaceChildren(new Option(first,''));
    for(const item of arr)el.add(new Option(item.label,item.id));
    if([...el.options].some(o=>o.value===old))el.value=old;
  }
  function render(){
    $('atTotal').textContent=String(tasks.length);
    $('atOpen').textContent=String(tasks.filter(t=>t.status!=='done').length);
    $('atDone').textContent=String(tasks.filter(t=>t.status==='done').length);
    const pid=$('atProjectFilter').value,status=$('atStatusFilter').value,q=$('atSearch').value.trim().toLocaleLowerCase('hr');
    const visible=tasks.filter(t=>(!pid||String(t.project_id)===pid)&&(!status||t.status===status)&&(!q||[t.title,t.description,labelProject(t.project_id)].join(' ').toLocaleLowerCase('hr').includes(q)))
      .sort((a,b)=>(a.status==='done')-(b.status==='done')||String(a.due_date||'9999').localeCompare(String(b.due_date||'9999'))||String(b.created_at).localeCompare(String(a.created_at)));
    const list=$('atList');list.replaceChildren();
    if(!visible.length){list.append(txt('div','at-empty',tasks.length?'Nema rezultata za odabrane filtere.':'Jo\u0161 nema zadataka za klijente.'));return;}
    for(const t of visible){
      const card=document.createElement('article');card.className='at-card';
      const head=txt('div','at-card-top','');
      const intro=document.createElement('div');intro.append(txt('h4','',t.title));head.append(intro);
      const btn=txt('button','at-button','Uredi');btn.type='button';btn.addEventListener('click',()=>openEditor(t));head.append(btn);card.append(head);
      const meta=txt('div','at-card-meta','');
      const span=(content,cls='')=>txt('span','at-pill'+(cls?' '+cls:''),content);
      meta.append(span(labelProject(t.project_id)),span(labels[t.status]||t.status,t.status==='done'?'done':''),span('Rok: '+fmt(t.due_date),overdue(t)?'overdue':''));
      if(!t.client_action)meta.append(span('Potvr\u0111uje admin'));
      card.append(meta);if(t.description)card.append(txt('p','',t.description));list.append(card);
    }
  }
  async function load(){
    message('U\u010ditavanje zadataka i projekata...');
    const [taskResult,projectResult]=await Promise.all([
      api.from('ptech_client_tasks').select('id,project_id,title,description,status,due_date,client_action,action_type,created_at,completed_at,completed_by').order('created_at',{ascending:false}),
      api.from('projects').select('id,name,user_id').order('name')
    ]);
    if(projectResult.error){console.error('[PTech V14] Projects:',projectResult.error);message('Nije mogu\u0107e dohvatiti projekte. Provjeri administratorske ovlasti.','error');return;}
    projects=projectResult.data||[];
    const ids=[...new Set(projects.map(p=>p.user_id).filter(Boolean))];
    let profileMap=new Map();
    if(ids.length){const {data,error}=await api.from('profiles').select('id,display_name').in('id',ids);
      if(error)console.warn('[PTech V14] Profile names:',error);else profileMap=new Map((data||[]).map(p=>[p.id,p.display_name]));}
    projectById=new Map(projects.map(p=>[String(p.id),{...p,client:profileMap.get(p.user_id)||'Klijent'}]));
    const options=projects.map(p=>({id:String(p.id),label:labelProject(p.id)}));
    setOptions('atProjectFilter','Svi projekti',options);setOptions('atProject','Odaberi projekt',options);
    if(taskResult.error){tasks=[];render();
      message(/ptech_client_tasks|schema cache|relation|404|42P01|PGRST205/i.test(taskResult.error.message||'')?
        'Baza jo\u0161 nema tablicu zadataka. U Supabase SQL Editoru pokreni datoteku supabase/migrations/20261106_ptech_v14_client_tasks.sql.' :
        'Nije mogu\u0107e u\u010ditati zadatke: '+taskResult.error.message,'error');return;
    }
    tasks=taskResult.data||[];message('Zadaci su u\u010ditani.');render();
  }
  function openEditor(t=null){
    if(busy)return;
    focusFrom=document.activeElement;
    $('atForm').reset();$('atId').value=t?.id||'';
    $('atDialogTitle').textContent=t?'Uredi zadatak':'Novi zadatak';
    $('atTitle').value=t?.title||'';$('atProject').value=t?String(t.project_id):'';
    $('atStatus').value=t?.status||'todo';$('atDue').value=t?.due_date||'';
    $('atDescription').value=t?.description||'';$('atClientAction').checked=t?t.client_action:true;
    $('atAction').value=t?.action_type||'none';$('atDelete').hidden=!t;$('atFormNotice').hidden=true;
    $('atOverlay').hidden=false;document.body.style.overflow='hidden';$('atTitle').focus();
  }
  function closeEditor(){if(busy)return;$('atOverlay').hidden=true;document.body.style.overflow='';focusFrom?.focus?.();}
  async function save(event){
    event.preventDefault();if(busy||!user)return;
    const id=$('atId').value,title=$('atTitle').value.trim(),projectId=$('atProject').value;
    if(title.length<2||title.length>160||!projectById.has(projectId)){
      message('Unesi naziv zadatka i odaberi ispravan projekt.','error','atFormNotice');return;
    }
    const status=$('atStatus').value;
    const old=tasks.find(t=>t.id===id);
    const payload={project_id:Number(projectId),title,description:$('atDescription').value.trim()||null,
      status,due_date:$('atDue').value||null,client_action:$('atClientAction').checked,action_type:$('atAction').value};
    if(status==='done' && old?.status!=='done'){
      payload.completed_at=new Date().toISOString();payload.completed_by=user.id;
    }else if(status!=='done'){
      payload.completed_at=null;payload.completed_by=null;
    }
    if(!id)payload.created_by=user.id;
    busy=true;$('atSave').disabled=true;$('atSave').textContent='Spremanje...';
    try{
      const query=id?api.from('ptech_client_tasks').update(payload).eq('id',id):api.from('ptech_client_tasks').insert(payload);
      const {error}=await query.select('id').single();if(error)throw error;
      busy=false;closeEditor();await load();message('Zadatak je uspje\u0161no spremljen.','success');
    }catch(error){console.error('[PTech V14] Save:',error);message('Spremanje nije uspjelo: '+(error.message||'Provjeri vezu i SQL migraciju.'),'error','atFormNotice');}
    finally{busy=false;$('atSave').disabled=false;$('atSave').textContent='Spremi zadatak';}
  }
  async function remove(){
    if(busy)return;const id=$('atId').value;if(!id)return;
    if(!confirm('Trajno obrisati zadatak? Ova se radnja ne mo\u017ee poni\u0161titi.'))return;
    busy=true;$('atDelete').disabled=true;
    try{
      const {data,error}=await api.from('ptech_client_tasks').delete().eq('id',id).select('id');
      if(error)throw error;if(!data?.length)throw new Error('Brisanje nije potvr\u0111eno.');
      busy=false;closeEditor();await load();message('Zadatak je obrisan.','success');
    }catch(error){console.error('[PTech V14] Delete:',error);message('Brisanje nije uspjelo: '+error.message,'error','atFormNotice');}
    finally{busy=false;$('atDelete').disabled=false;}
  }
  async function start(){
    $('atNew').addEventListener('click',()=>openEditor());$('atClose').addEventListener('click',closeEditor);
    $('atCancel').addEventListener('click',closeEditor);$('atOverlay').addEventListener('click',e=>{if(e.target===$('atOverlay'))closeEditor();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('atOverlay').hidden)closeEditor();});
    $('atForm').addEventListener('submit',save);$('atDelete').addEventListener('click',remove);
    $('atProjectFilter').addEventListener('change',render);$('atStatusFilter').addEventListener('change',render);
    $('atSearch').addEventListener('input',render);$('atRefresh').addEventListener('click',load);
    if(!api){message('Supabase nije dostupan. Provjeri vezu.','error');return;}
    const {data:{user:current},error}=await api.auth.getUser();
    if(error||!current){location.replace('login.html');return;}user=current;
    const {data:allowed,error:roleError}=await api.rpc('is_admin_user',{check_user_id:user.id});
    if(roleError||allowed!==true){location.replace('form.html');return;}
    const {data:profile}=await api.from('profiles').select('display_name').eq('id',user.id).maybeSingle();
    if(profile?.display_name)$('adminUserName').textContent=profile.display_name;
    await load();
  }
  start().catch(error=>{console.error('[PTech V14] Admin tasks:',error);message('Centar zadataka nije dostupan.','error');});
})();
