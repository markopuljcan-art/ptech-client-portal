/* PTech Digital | Admin System V10
   Sensitive actions ONLY through ptech-admin-system Edge Function.
   HTML is a public static asset, all data/actions are server-side authorized.
*/
(() => {
  'use strict';
  const SUPABASE_URL = 'https://agivwsbczzvvuzszcvxz.supabase.co';
  const KEY = 'sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE';
  if (!window.supabase) return;
  const db = window.supabase.createClient(SUPABASE_URL, KEY);
  const $ = id => document.getElementById(id);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = v => v ? new Date(v).toLocaleString('hr-HR',{dateStyle:'medium',timeStyle:'short'}) : '—';
  const fmtNum = n => Number(n??0).toLocaleString('hr-HR');
  const state = { users:[], docs:[], inbox:[], audit:[], tab:'accounts', inboxFilter:'all', ready:false };
  let pendingConfirm = null;
  function notice(message,kind='info') { const el=$('sysStatus'); el.textContent=message;el.dataset.kind=kind; }
  function empty(message) { return `<div class="sys-empty">${esc(message)}</div>`; }
  async function request(action, extra={}) {
    const {data:{session},error}=await db.auth.getSession();
    if (error || !session?.access_token) throw Error('Prijava je istekla. Prijavi se ponovno.');
    const response=await fetch(`${SUPABASE_URL}/functions/v1/ptech-admin-system`,{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':KEY},
      body:JSON.stringify({action,...extra})
    });
    let payload;
    try {payload=await response.json();} catch {throw Error('Poslužitelj nije vratio ispravan odgovor.');}
    if (!response.ok || !payload.ok) throw Error(payload?.error||`Pogreška ${response.status}`);
    return payload.data;
  }
  async function run(task,loading) {
    try { notice(loading||'Učitavanje…'); await task(); notice('Podaci su ažurirani.','success'); }
    catch(e) { console.error('[PTech Admin System]',e); notice(e.message||'Dogodila se pogreška.','error'); }
  }
  function modal({title,html,button='Potvrdi',danger=false,onConfirm}) {
    $('sysDialogTitle').textContent=title;
    $('sysDialogBody').innerHTML=html;
    $('sysDialogConfirm').textContent=button;
    $('sysDialogConfirm').className=`sys-button ${danger?'danger':'primary'}`;
    pendingConfirm=onConfirm;
    $('sysDialog').hidden=false;
    $('sysDialogConfirm').focus();
  }
  function close() {$('sysDialog').hidden=true;pendingConfirm=null;}
  async function confirm() {
    if (!pendingConfirm) return close();
    const handler=pendingConfirm;
    const btn=$('sysDialogConfirm');btn.disabled=true;
    try {const ok=await handler();if(ok!==false)close();}
    catch(e){notice(e.message||'Pogreška radnje.','error');}
    finally {btn.disabled=false;}
  }
  function setTab(tab) {
    if (!['accounts','inbox','docs','projects','audit','health'].includes(tab)) tab='accounts';
    state.tab=tab;
    document.querySelectorAll('[data-tab]').forEach(x=>{
      const active=x.dataset.tab===tab;x.classList.toggle('active',active);x.setAttribute('aria-selected',String(active));
    });
    document.querySelectorAll('.sys-panel').forEach(x=>x.hidden=x.id!==`tab-${tab}`);
    const loader={accounts:loadUsers,inbox:loadInbox,docs:loadDocs,audit:loadAudit,health:loadHealth};
    if (loader[tab]) run(loader[tab],`Učitavanje: ${tab}…`);
    if (tab==='projects') run(loadProjectChoices,'Učitavanje projekata…');
    const hash=`#${tab}`; if(location.hash!==hash) history.replaceState(null,'',hash);
  }

  async function loadOverview() {
    const data=await request('overview');
    $('sysSummary').hidden=false;
    $('sysClients').textContent=fmtNum(data.clients);
    $('sysProjects').textContent=fmtNum(data.projects);
    $('sysUnread').textContent=fmtNum(data.unread);
    $('sysTime').textContent=`Ažurirano: ${new Date().toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'})}`;
  }
  async function loadUsers() {state.users=await request('users');renderUsers();}
  function renderUsers() {
    const term=$('sysSearchUsers').value.toLowerCase().trim();
    const filtered=state.users.filter(u=>(`${u.display_name} ${u.email}`).toLowerCase().includes(term));
    $('sysUsers').innerHTML=filtered.length?filtered.map(u=>{
      const banned=u.banned_until && Date.parse(u.banned_until)>Date.now();
      return `<article class="sys-record"><div class="sys-record-body">
        <div class="sys-record-head"><h4>${esc(u.display_name)}</h4>
        <span class="sys-pill ${banned?'bad':u.confirmed_at?'ok':'warn'}">${banned?'Blokiran':u.confirmed_at?'E-mail potvrđen':'Čeka aktivaciju'}</span></div>
        <p>${esc(u.email)} · Registriran: ${esc(date(u.created_at))} · Zadnja prijava: ${esc(date(u.last_sign_in_at))}</p></div>
        <div class="sys-record-actions"><button type="button" class="sys-button secondary" data-rename="${esc(u.id)}">Uredi naziv</button>
        <button type="button" class="sys-button secondary" data-recovery="${esc(u.id)}">Oporavak lozinke</button>
        <button type="button" class="sys-button ${banned?'ghost':'danger'}" data-ban="${esc(u.id)}">${banned?'Odblokiraj':'Blokiraj'}</button></div></article>`;
    }).join(''):empty('Nema klijenata za zadanu pretragu.');
  }
  function clientById(id) {return state.users.find(u=>u.id===id);}
  function clientAction(action,id) {
    const u=clientById(id);if(!u)return;
    if(action==='rename') return modal({title:'Uredi prikazno ime',html:`<p>Klijent: <strong>${esc(u.email)}</strong></p><label for="sysNewName">Ime ili naziv klijenta</label><input id="sysNewName" maxlength="100" value="${esc(u.display_name)}">`,button:'Spremi naziv',onConfirm:async()=>{
      const name=$('sysNewName').value.trim();if(name.length<2){notice('Naziv je prekratak.','error');return false;}
      await request('user_rename',{id,name});await loadUsers();notice('Naziv je spremljen.','success');
    }});
    if(action==='ban') {
      const banned=!!(u.banned_until && Date.parse(u.banned_until)>Date.now());
      return modal({title:banned?'Odblokiranje računa':'Blokiranje računa',html:`<p>${banned?'Omogući nove prijave računa':'Spriječi buduće prijave računa'} <strong>${esc(u.email)}</strong>?</p><p>Ova radnja ne briše podatke. Aktivne sesije mogu ostati valjane do isteka.</p>`,button:banned?'Odblokiraj':'Blokiraj',danger:!banned,onConfirm:async()=>{
        await request('user_ban',{id,ban:!banned});await loadUsers();notice('Pristup je ažuriran.','success');
      }});
    }
    if(action==='recovery')return modal({title:'Oporavak pristupa',html:`<p>Želiš poslati poruku za oporavak lozinke klijentu <strong>${esc(u.email)}</strong>?</p><p>Oporavak radi samo za potvrđene račune; e-mail dostava ovisi o konfiguraciji Supabase Autha. Link vodi na postojeću login stranicu.</p>`,button:'Zatraži slanje',onConfirm:async()=>{
      const data=await request('user_recovery',{id});notice(data.message,'success');
    }});
  }

  async function loadInbox(){state.inbox=await request('inbox');renderInbox();}
  function renderInbox(){
    const filter=state.inboxFilter;
    const items=state.inbox.filter(x=>filter==='all'||(filter==='unread'?!x.read:x.type===filter));
    $('sysInbox').innerHTML=items.length?items.map(x=>`<article class="sys-record ${!x.read?'sys-unread':''}">
    <div class="sys-record-body"><div class="sys-record-head"><h4>${esc(x.title)}</h4>${!x.read?'<span class="sys-pill warn">Novo</span>':''}</div>
    <p>${esc(x.subtitle)} · ${esc(date(x.created_at))}</p></div>
    <div class="sys-record-actions"><a class="sys-button ghost" href="${esc(x.href)}">Otvori</a>
    ${x.read?'':'<button class="sys-button secondary" data-read="'+esc(x.key)+'">Označi pregledanim</button>'}</div></article>`).join(''):empty('Nema događaja u odabranom prikazu.');
  }
  async function markRead(key){await request('inbox_read',{key});const x=state.inbox.find(y=>y.key===key);if(x)x.read=true;renderInbox();await loadOverview();notice('Događaj je označen pregledanim.','success');}

  async function loadDocs(){state.docs=await request('documents');renderDocs();}
  function renderDocs(){
    const term=$('sysSearchDocs').value.toLowerCase().trim(),filter=$('sysDocsArchived').value;
    const items=state.docs.filter(d=>(filter==='all'||(filter==='active'?!d.archived:d.archived))&&
      (`${d.display_name} ${d.author} ${d.admin_category} ${d.project_id}`).toLowerCase().includes(term));
    $('sysDocs').innerHTML=items.length?items.map(d=>`<article class="sys-record"><div class="sys-record-body">
       <div class="sys-record-head"><h4>${esc(d.display_name)}</h4><span class="sys-pill">${esc(d.admin_category)}</span>${d.archived?'<span class="sys-pill warn">Arhivirano</span>':''}</div>
       <p>${esc(d.author)} · Projekt ${esc(d.project_id)} · ${esc(date(d.created_at))} · ${esc(d.source)}</p></div>
       <div class="sys-record-actions"><button type="button" class="sys-button secondary" data-doclink="${esc(d.source)}:${esc(d.id)}">Pregledaj</button>
       <button type="button" class="sys-button ghost" data-docedit="${esc(d.source)}:${esc(d.id)}">Uredi oznake</button></div></article>`).join(''):empty('Nema dokumenata u odabranom prikazu.');
  }
  function docByKey(key){return state.docs.find(d=>`${d.source}:${d.id}`===key);}
  async function docOpen(key,popup){const d=docByKey(key);if(!d)return;let r;try{r=await request('document_link',{source:d.source,id:d.id});}catch(e){if(popup)popup.close();throw e;}
    // Only open signed URL returned by this trusted API, never arbitrary document data.
    const u=new URL(r.url);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co'))throw Error('Nedopuštena poveznica.');
    if(popup){popup.opener=null;popup.location.replace(u.href);}else{window.location.assign(u.href);}notice('Privatna poveznica vrijedi dvije minute.','success');
  }
  function docEdit(key){const d=docByKey(key);if(!d)return;
    modal({title:'Uredi interne oznake dokumenta',html:`<p>Izvorna datoteka ostaje nepromijenjena. Izmjene se vide u administratorskom centru.</p>
    <label for="sysDocName">Naziv u admin centru</label><input id="sysDocName" maxlength="220" value="${esc(d.display_name)}">
    <label for="sysDocCategory">Kategorija</label><input id="sysDocCategory" maxlength="100" value="${esc(d.admin_category)}">
    <label style="display:flex;align-items:center;gap:8px"><input style="width:auto;min-height:auto" type="checkbox" id="sysDocArchive" ${d.archived?'checked':''}> Arhiviraj u admin centru</label>`,button:'Spremi',onConfirm:async()=>{
      const name=$('sysDocName').value.trim(),category=$('sysDocCategory').value.trim(),archived=$('sysDocArchive').checked;
      if(!name){notice('Naziv dokumenta je obavezan.','error');return false;}
      const r=await request('document_update',{source:d.source,id:d.id,name,category,archived});
      await loadDocs();notice(r.message,'success');
    }});
  }
  async function loadAudit(){state.audit=await request('audit');
    $('sysAudit').innerHTML=state.audit.length?state.audit.map(x=>`<article class="sys-record"><div class="sys-record-body"><div class="sys-record-head"><h4>${esc(x.action.replaceAll('_',' '))}</h4><span class="sys-pill">${esc(x.target_type)}</span></div><p>Meta: ${esc(x.target_id||'—')} · ${esc(date(x.created_at))}</p></div></article>`).join(''):empty('Nema zabilježenih radnji.');
  }
  async function loadHealth(){const data=await request('health');$('sysHealth').innerHTML=data.checks.map(x=>`<article class="sys-health-card"><strong>${esc(x.name)}</strong><b>${x.ok?fmtNum(x.count):'—'}</b><p>${x.ok?'Provjera baze uspješna':'Provjera nije dostupna'}</p></article>`).join('')+
    `<article class="sys-health-card"><strong>Storage bucketi</strong><b>${data.buckets.length}</b><p>${esc(data.buckets.map(x=>x.name).join(', ')||'Nije dostupno')}</p></article>`+
    `<article class="sys-health-card"><strong>Zadnja provjera</strong><p>${esc(date(data.checked_at))}</p><p>Detaljni logovi nisu dostupni u ovom prikazu.</p></article>`;
  }
  async function loadProjectChoices(){
    const items=await request('project_list');
    const list=$('sysProjectSuggestions');list.replaceChildren();
    for(const project of items){const option=document.createElement('option');option.value=String(project.id);option.label=`${project.name||'Projekt'} · ${project.type||''}`;list.appendChild(option);}
  }
  async function loadNotes(){const project_id=$('sysNoteProject').value.trim();
    if(!project_id){$('sysNotes').innerHTML=empty('Upiši ID projekta.');return;}
    const notes=await request('notes',{project_id});$('sysNotes').innerHTML=notes.length?notes.map(n=>`<article class="sys-record"><div class="sys-record-body"><h4>${esc(date(n.created_at))}</h4><p>${esc(n.note)}</p></div></article>`).join(''):empty('Nema internih bilješki za ovaj projekt.');
  }
  function improveNavIcons(){
    const paths={
     'admin.html':'<rect x=3 y=3 width=18 height=18 rx=3/><path d="M3 9h18M9 9v12"/>',
     'admin-projects.html':'<rect x=3 y=7 width=18 height=14 rx=2/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
     'admin-clients.html':'<circle cx=9 cy=8 r=3/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 6a3 3 0 0 1 0 6M19 20v-2a6 6 0 0 0-2-4"/>',
     'admin-revisions.html':'<path d="M4 7h16M16 3l4 4-4 4M20 17H4M8 13l-4 4 4 4"/>',
     'admin-approvals.html':'<rect x=3 y=3 width=18 height=18 rx=3/><path d="m7 12 3 3 7-7"/>',
     'admin-documents.html':'<path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v6h5M8 13h8M8 17h6"/>',
     'admin-support.html':'<path d="M21 11a8 8 0 0 1-8 8H5l-2 2V7a5 5 0 0 1 5-5h5a8 8 0 0 1 8 9zM8 10h9M8 14h6"/>',
     'admin-system.html':'<circle cx=12 cy=12 r=3/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>'
    };
    document.querySelectorAll('.admin-nav-item').forEach(a=>{const target=a.getAttribute('href'),icon=a.querySelector('.admin-nav-icon');if(icon&&paths[target])icon.innerHTML=`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[target]}</svg>`;});
  }
  function bind() {
    $('sysRefresh').addEventListener('click',()=>run(async()=>{await loadOverview();const loader={accounts:loadUsers,inbox:loadInbox,docs:loadDocs,projects:loadNotes,audit:loadAudit,health:loadHealth}[state.tab];if(loader)await loader();},'Osvježavanje…'));
    $('sysTabs').addEventListener('click',e=>{const btn=e.target.closest('[data-tab]');if(btn)setTab(btn.dataset.tab);});
    $('sysSearchUsers').addEventListener('input',renderUsers);
    $('sysSearchDocs').addEventListener('input',renderDocs);
    $('sysDocsArchived').addEventListener('change',renderDocs);
    $('sysLoadUsers').addEventListener('click',()=>run(loadUsers,'Učitavanje računa…'));
    $('sysLoadInbox').addEventListener('click',()=>run(loadInbox,'Učitavanje obavijesti…'));
    $('sysLoadDocs').addEventListener('click',()=>run(loadDocs,'Učitavanje dokumenata…'));
    $('sysLoadAudit').addEventListener('click',()=>run(loadAudit,'Učitavanje dnevnika…'));
    $('sysLoadHealth').addEventListener('click',()=>run(loadHealth,'Provjera sustava…'));
    $('sysUsers').addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;
      for(const type of ['ban','rename','recovery'])if(btn.dataset[type])return clientAction(type,btn.dataset[type]);
    });
    $('sysDocs').addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;
      if(btn.dataset.docedit)docEdit(btn.dataset.docedit);
      if(btn.dataset.doclink){const popup=window.open('about:blank','_blank');run(()=>docOpen(btn.dataset.doclink,popup),'Otvaranje dokumenta…');}
    });
    $('sysInbox').addEventListener('click',e=>{const btn=e.target.closest('[data-read]');if(btn)run(()=>markRead(btn.dataset.read),'Spremanje…');});
    document.querySelectorAll('[data-inbox-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      state.inboxFilter=btn.dataset.inboxFilter;document.querySelectorAll('[data-inbox-filter]').forEach(x=>x.classList.toggle('active',x===btn));renderInbox();
    }));
    $('sysNoteProject').addEventListener('change',()=>run(loadNotes,'Učitavanje bilješki…'));
    $('sysNoteForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{
      const project_id=$('sysNoteProject').value.trim(),note=$('sysNoteText').value.trim();
      if(!project_id||!note)throw Error('Unesi projekt i tekst bilješke.');
      await request('note_add',{project_id,note});$('sysNoteText').value='';await loadNotes();
    },'Spremanje bilješke…');});
    $('sysDialogClose').addEventListener('click',close);
    $('sysDialogCancel').addEventListener('click',close);
    $('sysDialogConfirm').addEventListener('click',confirm);
    $('sysDialog').addEventListener('click',e=>{if(e.target===$('sysDialog'))close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('sysDialog').hidden)close();});
  }
  async function init() {
    improveNavIcons();bind();
    try {
      const {data,error}=await db.auth.getUser();
      if(error||!data.user) throw Error('Nisi prijavljen. Otvori login stranicu.');
      // UI check is only for usability; Edge function separately enforces role.
      const res=await db.rpc('is_admin_user',{check_user_id:data.user.id});
      if(res.error||res.data!==true)throw Error('Samo administrator može koristiti ovu stranicu.');
      state.ready=true;
      await loadOverview();
      setTab(location.hash.slice(1)||'accounts');
    } catch (error) {notice(error.message||'Prijava nije potvrđena.','error');
      $('sysTabs').hidden=true;document.querySelectorAll('.sys-panel').forEach(x=>x.hidden=true);
    }
  }
  init();
})();
