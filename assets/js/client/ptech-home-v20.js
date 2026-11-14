/* PTech Digital V20 homepage view.
 * Visual companion to the original script.js + V16 dashboard. NO new database
 * calls, NO changes to V16 localStorage, task ownership or upload logic.
 */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const root = byId('v20Home');
  if (!root) return;
  const original = {
    slider: byId('projectsSlider'),
    tasks: byId('ptechDashboardTasksList'),
    count: byId('ptechDashboardTasksCount'),
    messages: byId('recentMessagesList'),
    documents: byId('recentDocumentsList'),
    actions: document.querySelector('[data-widget-id="actions"] .actions-grid'),
    user: byId('userTop')
  };
  const svg = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M4 16l12-12 4 4L8 20H4z"/></svg>',
    revision: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16m-5-4 5 4-5 4M20 17H4m5-4-5 4 5 4"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></svg>',
    support: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H2v7h5v-7H4zm16 0h2v7h-5v-7h3zM19 19a4 4 0 0 1-4 3h-3"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-3-5.3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4"/></svg>'
  };
  const setText = (id, value) => {const el = byId(id); if (el && el.textContent !== String(value)) el.textContent = String(value);};
  const firstName = name => String(name || 'Klijent').trim().split(/\s+/)[0] || 'Klijent';
  const previewStatus = (node, value) => {node.replaceChildren(); const el = document.createElement('div'); el.className = 'v20-empty'; el.textContent = value; node.appendChild(el);};
  const make = (tag, cls, str) => {const el=document.createElement(tag); if(cls)el.className=cls; if(str!==undefined)el.textContent=str; return el;};
  const getProjects = () => {
    try {return typeof projects !== 'undefined' && Array.isArray(projects) ? projects : [];} catch(_) {return [];}
  };
  const getActiveIndex = () => {
    try{return typeof activeProjectIndex !== 'undefined' ? Number(activeProjectIndex)||0 : 0;}catch(_){return 0;}
  };
  const date = v => {
    try {return typeof formatDate === 'function' ? formatDate(v) : new Date(v).toLocaleDateString('hr-HR');}
    catch (_) {return '–';}
  };
  function renderName() {
    const current = original.user?.textContent?.trim();
    setText('v20FirstName', firstName(current && current !== 'Klijent' ? current : 'Klijente'));
  }
  function renderProject() {
    const arr = getProjects();
    const idx = Math.max(0,Math.min(getActiveIndex(),arr.length-1));
    const p = arr[idx];
    const index = byId('v20ProjectIndex');
    if(index){index.hidden = arr.length < 2;index.textContent = `${idx+1}/${arr.length}`;}
    const pages = byId('v20ProjectPages');
    if(pages) {pages.hidden = arr.length < 2;byId('v20ProjectPrev').disabled = idx === 0;byId('v20ProjectNext').disabled = idx === arr.length-1;}
    if(!p){
      setText('v20ProjectTitle', arr.length ? 'Projekt' : (original.slider?.querySelector('.no-projects')?.textContent?.trim() || 'Trenutno nema projekata'));
      setText('v20ProjectName','');
      byId('v20ProjectStatus').hidden=true;byId('v20ProjectPackage').hidden=true;
      setText('v20ProjectPercent','0%');byId('v20ProjectBar').style.width='0%';
      byId('v20ProjectTrack').setAttribute('aria-valuenow','0');
      setText('v20ProjectDeadline','–');setText('v20ProjectUpdated','–');
      byId('v20ProjectOpen').href='my-projects.html';
      return;
    }
    setText('v20ProjectTitle',p.type || p.name || 'Projekt');
    setText('v20ProjectName',p.name || '');
    const s = byId('v20ProjectStatus');
    s.hidden = false;s.textContent = p.status || '–';
    s.classList.toggle('waiting', /čekanj/i.test(p.status || ''));
    s.classList.toggle('done',/završen|gotov/i.test(p.status || ''));
    const pack = byId('v20ProjectPackage');pack.hidden = !p.package;pack.textContent = p.package || '';
    const progress = Math.max(0,Math.min(100,Number(p.progress)||0));
    setText('v20ProjectPercent',`${progress}%`);
    byId('v20ProjectTrack').setAttribute('aria-valuenow', String(progress));
    byId('v20ProjectBar').style.width=`${progress}%`;
    setText('v20ProjectDeadline',p.deadline ? date(p.deadline) : '–');
    const sourceUpdate=original.slider?.querySelectorAll('.project-slide')?.[idx]?.querySelector('.latest-update')?.textContent?.trim();
    setText('v20ProjectUpdated',sourceUpdate || '–');
    const link=byId('v20ProjectOpen');link.href='project.html?id='+encodeURIComponent(String(p.id));
    link.setAttribute('aria-label',`Otvori projekt ${p.type || p.name || ''}`);
  }
  function renderTasks() {
    const box=byId('v20TasksContent');if(!box)return;
    const str=original.count?.textContent?.trim() || '–';
    const loading = str==='–' || original.tasks?.textContent?.includes('Učitavanje');
    const n=Number(str);
    const rows=Array.from(original.tasks?.querySelectorAll('.ptech-task-preview-row') || []);
    // Do not re-render an identical empty state on every observer notification.
    const signature = `${str}:${rows.slice(0,2).map(n=>n.textContent).join('|')}:${loading}`;
    if(box.dataset.signature===signature) return;box.dataset.signature=signature;
    box.replaceChildren();
    if(loading){box.append(make('span','v20-task-illustration'),make('h3','','Učitavanje zadataka...'),make('p','','Provjeri svoje obveze i rokove.'));box.firstChild.innerHTML=svg.check;return;}
    const icon=make('span','v20-task-illustration');icon.innerHTML=svg.check;box.append(icon);
    if(Number.isFinite(n)&&n>0){
      box.append(make('h3','',n===1?'Imate 1 otvoreni zadatak':`Imate ${n} otvorenih zadataka`));
      if(rows.length){const first=rows[0].querySelector('strong')?.textContent?.trim();box.append(make('p','v20-task-mini',first||'Provjeri svoje obveze i rokove.'));}
      else box.append(make('p','','Provjeri svoje obveze i rokove.'));
    }else if(str==='!') {box.append(make('h3','','Zadaci nisu dostupni'),make('p','','Otvori stranicu Zadaci za više informacija.'));}
    else box.append(make('h3','','Nemate otvorenih zadataka'),make('p','','Sve je odrađeno! Trenutno nemate aktivnih zadataka.'));
  }
  function actionId(node) {
    const id=node.id || '';
    if(id==='approveDesignAction')return 'approve';
    if(id==='revisionAction')return 'revision';
    if(id==='materialsAction')return 'materials';
    const txt=node.querySelector('strong')?.textContent?.trim()?.toLowerCase()||'';
    if(txt.includes('podrš'))return 'support';
    if(txt.includes('projekt'))return 'projects';
    if(txt.includes('zadat'))return 'tasks';
    if(txt.includes('dokument'))return 'documents';
    if(txt.includes('profil'))return 'profile';
    return 'support';
  }
  function renderActions() {
    const root=byId('v20ActionsList');if(!root||!original.actions)return;
    const items=[...original.actions.querySelectorAll('.ptech-action-slot')].filter(slot=>!slot.hidden).sort((a,b)=>(Number(a.style.order)||0)-(Number(b.style.order)||0)).map(slot=>slot.querySelector('.action-card')).filter(Boolean);
    const signature=items.map(e=>`${e.id}|${e.querySelector('strong')?.textContent}|${e.getAttribute('aria-disabled')}|${e.disabled}|${e.getAttribute('href')}`).join('~');
    if(root.dataset.signature===signature)return;root.dataset.signature=signature;
    root.replaceChildren();
    for(const source of items){
      const title=source.querySelector('strong')?.textContent?.trim()||'Akcija';
      const id=actionId(source);
      const shortDescription={approve:'Pregledaj i odobri predloženi dizajn.',revision:'Pošalji zahtjev za izmjenom.',materials:'Učitaj potrebne datoteke.',support:'Postavi pitanje našem timu.'};
      const description=shortDescription[id]||source.querySelector('p')?.textContent?.trim()||'Otvori akciju';
      const disabled=source.disabled||source.getAttribute('aria-disabled')==='true';
      const b=make('button','v20-action-tile');b.type='button';b.disabled=Boolean(disabled);b.title=title;
      const icon=make('span','v20-action-icon');icon.innerHTML=svg[{approve:'edit',materials:'upload'}[id]||id]||svg.support;
      const copy=make('span','v20-action-copy');copy.append(make('strong','',title),make('small','',description));
      const arr=make('span','v20-action-arrow');arr.innerHTML=svg.arrow;
      b.append(icon,copy,arr);
      b.addEventListener('click',()=>{
        if(source.isConnected && !source.disabled && source.getAttribute('aria-disabled')!=='true')source.click();
      });
      root.append(b);
    }
    if(!root.childElementCount)previewStatus(root,'Trenutno nema dostupnih brzih akcija.');
  }
  function previewMessage() {
    const target=byId('v20MessagePreview');if(!target||!original.messages)return;
    const source=original.messages.querySelector('.overview-row');
    const signature=source?.textContent?.trim() || original.messages.textContent?.trim() || '';
    if(target.dataset.signature===signature)return;target.dataset.signature=signature;
    if(!source){previewStatus(target,signature || 'Trenutno nema poruka.');return;}
    const link=make('a','v20-preview-link');link.href='messages.html';
    const icon=make('span','v20-preview-icon');icon.innerHTML=svg.people;
    const copy=make('span','v20-preview-copy');
    copy.append(make('strong','',source.querySelector('.overview-row-main strong')?.textContent?.trim()||'Poruka'),make('small','',source.querySelector('.overview-row-main small')?.textContent?.trim()||''));
    const dateEl=make('span','v20-preview-date',source.querySelector('time')?.textContent?.trim()||'');
    link.append(icon,copy,dateEl);target.replaceChildren(link);
  }
  function previewDocument() {
    const target=byId('v20DocumentPreview');if(!target||!original.documents)return;
    const source=original.documents.querySelector('.overview-row');
    const signature=(source?.textContent?.trim()||original.documents.textContent?.trim()||'')+'|'+(source?.getAttribute('href')||'');
    if(target.dataset.signature===signature)return;target.dataset.signature=signature;
    if(!source){previewStatus(target,signature || 'Trenutno nema dokumenata.');return;}
    const link=make('a','v20-preview-link');
    const href=source.getAttribute('href')||'documents.html';
    // URLs are generated by the existing document renderer, never by user input here.
    link.href=href;
    if(source.getAttribute('target')==='_blank'){link.target='_blank';link.rel='noopener noreferrer';}
    const ext=(source.querySelector('.overview-file-icon')?.textContent||'FILE').trim();
    const icon=make('span','v20-preview-icon',ext);
    const copy=make('span','v20-preview-copy');
    copy.append(make('strong','',source.querySelector('.overview-row-main strong')?.textContent?.trim()||'Dokument'),make('small','',source.querySelector('.overview-row-main small')?.textContent?.trim()||''));
    const dl=make('span','v20-preview-download');dl.innerHTML=svg.download;
    link.append(icon,copy,dl);target.replaceChildren(link);
  }
  let queued=false;
  function update(){queued=false;renderName();renderProject();renderTasks();renderActions();previewMessage();previewDocument();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(update);}
  for(const node of Object.values(original)){
    if(node)new MutationObserver(queue).observe(node,{subtree:true,childList:true,characterData:true,attributes:node===original.actions,attributeFilter:node===original.actions?['hidden','style']:undefined});
  }
  // Source project list and package/status can change after auth, not only after DOM edits.
  byId('v20ProjectPrev')?.addEventListener('click',()=>{try{setActiveProject(Math.max(0,getActiveIndex()-1));}catch(_){}queue();});
  byId('v20ProjectNext')?.addEventListener('click',()=>{try{setActiveProject(Math.min(getProjects().length-1,getActiveIndex()+1));}catch(_){}queue();});
  const edit=byId('ptechLayoutEdit');
  const personalUse=byId('v20PersonalUse');
  const standardUse=byId('v20StandardUse');
  let checkedModeForUser='';
  let layoutAtEditStart=undefined;
  function userId(){try{return typeof currentSession!=='undefined'?currentSession?.user?.id||'':'';}catch(_){return '';}}
  function modeKey(){const id=userId();return id ? `ptech_v20_home_mode_${id}` : '';}
  function readLayout(){const id=userId();if(!id)return null;try{return localStorage.getItem(`ptech_v16_dashboard_layout_${id}`);}catch(_){return null;}}
  function setView(personal){
    document.body.classList.toggle('ptech-home-personal',Boolean(personal));
    const key=modeKey();if(key)try{localStorage.setItem(key,personal?'personal':'standard');}catch(_){/* private browsing */}
    updateModeButtons();
    requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
  function updateModeButtons(){
    const editing=document.body.classList.contains('ptech-layout-editing');
    if(personalUse)personalUse.hidden=!editing;
    if(standardUse)standardUse.hidden=editing||!document.body.classList.contains('ptech-home-personal');
  }
  function restoreMode(){
    const key=modeKey();if(!key||key===checkedModeForUser)return;
    checkedModeForUser=key;
    try{document.body.classList.toggle('ptech-home-personal',localStorage.getItem(key)==='personal');}catch(_){}
    updateModeButtons();
  }
  // Auth populates the profile after the page scripts have loaded.
  const userNameUpdated = new MutationObserver(restoreMode);
  if(original.user)userNameUpdated.observe(original.user,{childList:true,characterData:true,subtree:true});
  byId('v20Edit')?.addEventListener('click',()=>{
    if(edit && !edit.disabled){
      // Show the real V16 grid for one animation frame BEFORE its edit handler
      // measures tile positions. Otherwise a display:none source would yield
      // invalid saved coordinates for existing user layouts.
      document.body.classList.add('ptech-home-preparing-edit');
      requestAnimationFrame(()=>{
        edit.click();
        document.body.classList.remove('ptech-home-preparing-edit');
      });
    } else {const note=byId('v20Edit');note.title='Pričekaj prijavu prije uređivanja';}
  });
  // Opening V16 editing unhides the original grid. Exiting editing switches back
  // without replacing or touching any saved layout/notes.
  edit?.addEventListener('click',()=>{
    if(document.body.classList.contains('ptech-layout-editing')){
      layoutAtEditStart=readLayout();
    }else{
      if(layoutAtEditStart!==undefined && readLayout()!==layoutAtEditStart)setView(true);
      layoutAtEditStart=undefined;
      queue();
    }
    updateModeButtons();
  });
  personalUse?.addEventListener('click',()=>{
    setView(true);
    if(document.body.classList.contains('ptech-layout-editing'))edit?.click();
  });
  standardUse?.addEventListener('click',()=>setView(false));
  window.addEventListener('pageshow',()=>{restoreMode();queue();});
  restoreMode();queue();
})();
