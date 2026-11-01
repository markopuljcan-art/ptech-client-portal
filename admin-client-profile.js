/* PTech Digital | Unified Client Profile V11
   All client data comes from the role-protected ptech-admin-system Edge Function.
   The publishable Supabase key is intentionally public; secret keys never appear here.
*/
(() => {
  'use strict';
  const SUPABASE_URL='https://agivwsbczzvvuzszcvxz.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE';
  if (!window.supabase) return;
  const db=window.supabase.createClient(SUPABASE_URL,PUBLISHABLE_KEY);
  const $=id=>document.getElementById(id);
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dt=x=>{if(!x)return '—';const t=new Date(x);return Number.isNaN(t.getTime())?'—':t.toLocaleString('hr-HR',{dateStyle:'medium',timeStyle:'short'});};
  const day=x=>{if(!x)return '—';const t=new Date(x);return Number.isNaN(t.getTime())?'—':t.toLocaleDateString('hr-HR');};
  const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x||'');
  const userId=new URLSearchParams(location.search).get('id');
  const state={detail:null};
  let dialogHandler=null;
  const say=(message,kind='info')=>{const el=$('cpNotice');el.textContent=message;el.dataset.kind=kind;};
  function empty(message){return `<p class="cp-empty">${esc(message)}</p>`;}
  async function api(action,extra={}){
    const {data:{session},error}=await db.auth.getSession();
    if(error||!session?.access_token)throw Error('Prijava je istekla. Ponovno se prijavi.');
    const resp=await fetch(`${SUPABASE_URL}/functions/v1/ptech-admin-system`,{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':PUBLISHABLE_KEY},
      body:JSON.stringify({action,...extra})
    });
    let out;try{out=await resp.json();}catch{throw Error('Edge Function nije vratila JSON odgovor.');}
    if(!resp.ok||!out.ok){if(out?.error==='Nepoznata radnja.')throw Error('Prvo deployaj index.ts V11 u Supabase Edge Functions.');throw Error(out?.error||`HTTP ${resp.status}`);}
    return out.data;
  }
  function setText(id,value){$(id).textContent=String(value??'—');}
  const hrefSafe=id=>encodeURIComponent(String(id));
  function render(){
    const d=state.detail, u=d.user, projects=d.projects||[], docs=d.documents||[], messages=d.messages||[], notes=d.notes||[];
    const banned=!!(u.banned_until && Date.parse(u.banned_until)>Date.now());
    setText('cpName',u.display_name||'Klijent');setText('cpAvatar',(u.display_name||'K').trim().slice(0,1).toLocaleUpperCase('hr-HR'));
    setText('cpEmail',u.email||'Nema e-mail adrese');setText('cpDetailName',u.display_name||'—');setText('cpDetailEmail',u.email||'—');
    setText('cpRegistered',dt(u.created_at));setText('cpConfirmed',u.confirmed_at?dt(u.confirmed_at):'Nije potvrđen');
    setText('cpLastSignInFull',dt(u.last_sign_in_at));setText('cpLastLogin',day(u.last_sign_in_at));setText('cpAccessState',banned?'Blokiran':u.confirmed_at?'Aktivan':'Čeka potvrdu e-maila');
    setText('cpEmailStatus',u.confirmed_at?'E-mail potvrđen':'Čeka potvrdu e-maila');$('cpEmailStatus').dataset.kind=u.confirmed_at?'good':'bad';
    setText('cpAccountStatus',banned?'Pristup blokiran':'Pristup dopušten');$('cpAccountStatus').dataset.kind=banned?'bad':'good';
    setText('cpProjectCount',d.counts?.projects??projects.length);setText('cpDocumentCount',d.counts?.documents??docs.length);setText('cpMessageCount',d.counts?.messages??messages.length);
    $('cpBan').textContent=banned?'Odblokiraj pristup':'Blokiraj pristup';
    const chat=`admin-support.html?client=${hrefSafe(u.id)}`;$('cpOpenChat').href=chat;$('cpChatLink').href=chat;
    $('cpNewProject').href='admin-projects.html';
    $('cpProjects').innerHTML=projects.length?projects.map(p=>`<article class="cp-line"><div class="cp-line-main"><strong>${esc(p.name||'Projekt')}</strong><p>${esc(p.type||'Projekt')} · Status: ${esc(p.status||'—')} · Napredak: ${esc(p.progress??0)} % · ${esc(day(p.created_at))}</p></div><div class="cp-line-actions"><span class="cp-badge">${esc(p.package||'Projekt')}</span><a class="cp-button cp-outline" href="admin-project-detail.html?id=${hrefSafe(p.id)}">Detalji ↗</a></div></article>`).join(''):empty('Klijent nema dodijeljenih projekata.');
    $('cpDocs').innerHTML=docs.length?docs.map(doc=>`<article class="cp-line"><div class="cp-line-main"><strong>${esc(doc.name||'Dokument')}</strong><p>${esc(doc.project_name||'Bez projekta')} · ${esc(doc.category||'Ostalo')} · ${esc(day(doc.created_at))}</p></div><div class="cp-line-actions"><span class="cp-badge">${doc.source==='client_uploads'?'Klijent':'Projekt'}</span><button type="button" class="cp-button cp-outline" data-doc-open="${esc(doc.source)}:${esc(doc.id)}">Pregledaj ↗</button></div></article>`).join(''):empty('Klijent i njegovi projekti još nemaju dokumente.');
    $('cpMessages').innerHTML=messages.length?messages.map(m=>`<article class="cp-msg ${m.sender_role==='admin'?'admin':''}"><div class="cp-msg-head"><span>${m.sender_role==='admin'?'Administrator':'Klijent'}</span><time>${esc(dt(m.created_at))}</time></div><p>${esc(m.text||'Poruka bez prikaza teksta')}</p></article>`).join(''):empty('Još nema poruka. Otvori razgovor da pošalješ prvu poruku.');
    const pr=new Map(projects.map(p=>[String(p.id),p.name]));
    $('cpNotes').innerHTML=notes.length?notes.map(n=>`<article class="cp-line"><div class="cp-line-main"><strong>${esc(pr.get(String(n.project_id))||'Projekt')} · ${esc(day(n.created_at))}</strong><p>${esc(n.note)}</p></div></article>`).join(''):empty('Nema internih bilješki za klijentove projekte.');
    $('cpNoteProject').replaceChildren();const emptyOption=document.createElement('option');emptyOption.value='';emptyOption.textContent='Odaberi projekt';$('cpNoteProject').append(emptyOption);
    for(const project of projects){const op=document.createElement('option');op.value=String(project.id);op.textContent=project.name||`Projekt ${project.id}`;$('cpNoteProject').append(op);}
    const canNote=projects.length>0;$('cpNoteProject').disabled=!canNote;$('cpNoteText').disabled=!canNote;$('cpNoteForm').querySelector('button').disabled=!canNote;
  }
  async function load(){
    if(!uuid(userId)){say('Nedostaje ispravan ID klijenta. Otvori profil iz Upravljanje sustavom → Računi.','error');return;}
    $('cpRefresh').disabled=true;say('Učitavanje podataka klijenta…');
    try{state.detail=await api('client_detail',{id:userId});render();say('Profil klijenta ažuriran.','success');}
    catch(e){console.error('[PTech Client Profile]',e);say(e.message||'Profil nije moguće učitati.','error');}
    finally{$('cpRefresh').disabled=false;}
  }
  function showDialog({title,html,button='Potvrdi',danger=false,handler}){
    dialogHandler=handler;$('cpDialogTitle').textContent=title;$('cpDialogBody').innerHTML=html;
    $('cpDialogConfirm').textContent=button;$('cpDialogConfirm').className='cp-button '+(danger?'cp-danger':'cp-primary');$('cpDialog').hidden=false;
    $('cpDialogConfirm').focus();
  }
  function closeDialog(){$('cpDialog').hidden=true;dialogHandler=null;}
  async function submitDialog(){if(!dialogHandler)return closeDialog();const b=$('cpDialogConfirm');b.disabled=true;
    try{const ok=await dialogHandler();if(ok!==false){closeDialog();await load();}}
    catch(e){const x=document.createElement('p');x.className='cp-inline-error';x.textContent=e.message||'Radnja nije uspjela.';$('cpDialogBody').append(x);}
    finally{b.disabled=false;}
  }
  function editName(){const u=state.detail?.user;if(!u)return;showDialog({title:'Uredi naziv klijenta',html:`<p>Promjena će ažurirati prikazno ime u portalu, ne i e-mail.</p><label for="cpEditName">Novi naziv</label><input id="cpEditName" maxlength="100" value="${esc(u.display_name)}">`,button:'Spremi naziv',handler:async()=>{const name=$('cpEditName').value.trim();if(name.length<2){say('Ime je prekratko.','error');return false;}await api('user_rename',{id:u.id,name});return true;}});}
  function recovery(){const u=state.detail?.user;if(!u)return;showDialog({title:'Oporavak lozinke',html:`<p>Poslati klijentu <strong>${esc(u.email)}</strong> e-mail za postavljanje nove lozinke?</p><p>Ne otkriva administratoru postojeću lozinku.</p>`,button:'Pošalji zahtjev',handler:async()=>{const r=await api('user_recovery',{id:u.id});say(r.message||'Zahtjev za oporavak poslan.','success');return true;}});}
  function ban(){const u=state.detail?.user;if(!u)return;const blocked=!!(u.banned_until&&Date.parse(u.banned_until)>Date.now());showDialog({title:blocked?'Odblokiraj pristup':'Blokiraj pristup',html:`<p>Račun <strong>${esc(u.email)}</strong> će biti ${blocked?'odblokiran':'blokiran za nove prijave'}.</p><p>Ne brišu se klijentovi projekti ili dokumenti. Aktivne sesije možda ostanu valjane do isteka.</p>`,button:blocked?'Odblokiraj':'Blokiraj',danger:!blocked,handler:async()=>{await api('user_ban',{id:u.id,ban:!blocked});return true;}});}
  async function openDoc(key,popup){const d=(state.detail?.documents||[]).find(x=>`${x.source}:${x.id}`===key);if(!d){popup?.close();return;}
    try{const r=await api('document_link',{source:d.source,id:d.id});const url=new URL(r.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw Error('Neispravna poveznica.');if(popup){popup.opener=null;popup.location.replace(url.href);}else location.assign(url.href);}
    catch(e){popup?.close();say(e.message||'Dokument nije moguće otvoriti.','error');}
  }
  async function init(){
    $('cpRefresh').addEventListener('click',load);$('cpRename').addEventListener('click',editName);$('cpRecovery').addEventListener('click',recovery);$('cpBan').addEventListener('click',ban);
    $('cpDocs').addEventListener('click',e=>{const b=e.target.closest('[data-doc-open]');if(b){const pop=window.open('about:blank','_blank');openDoc(b.dataset.docOpen,pop);}});
    $('cpNoteForm').addEventListener('submit',async e=>{e.preventDefault();const project_id=$('cpNoteProject').value,note=$('cpNoteText').value.trim();if(!project_id||!note)return;say('Spremanje interne bilješke…');try{await api('note_add',{project_id,note});$('cpNoteText').value='';await load();}catch(error){say(error.message||'Spremanje nije uspjelo.','error');}});
    $('cpDialogX').addEventListener('click',closeDialog);$('cpDialogCancel').addEventListener('click',closeDialog);$('cpDialogConfirm').addEventListener('click',submitDialog);
    $('cpDialog').addEventListener('click',e=>{if(e.target===$('cpDialog'))closeDialog();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('cpDialog').hidden)closeDialog();});
    try{const {data,error}=await db.auth.getUser();if(error||!data.user)throw Error('Prijavi se kao administrator.');const r=await db.rpc('is_admin_user',{check_user_id:data.user.id});if(r.error||r.data!==true)throw Error('Nemate administratorska prava.');await load();}
    catch(error){say(error.message||'Provjera prijave nije uspjela.','error');}
  }
  init();
})();
