/* PTech Digital Client Portal V21.0 - homepage presentation only.
 * Source of truth: existing Supabase-driven DOM and script.js/V16 JS.
 * Does not write to the database, replace listeners, or alter saved widgets.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('v21Home')) return;
  const source = {
    slider: $('projectsSlider'),
    count: $('ptechDashboardTasksCount'),
    tasks: $('ptechDashboardTasksList'),
    messages: $('recentMessagesList'),
    documents: $('recentDocumentsList'),
    user: $('userTop'),
    materials: $('materialsAction')
  };
  const svg = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-3-5.3"/></svg>',
    document: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h8l5 5v15H6z"/><path d="M14 2v5h5M9 12h7M9 16h7"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4"/></svg>'
  };
  const create = (tag,cls,content) => {const n = document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=String(content);return n;};
  const text = (id,value) => {const n=$(id);if(n && n.textContent!==String(value))n.textContent=String(value);};
  // The global `projects` lexical binding is readable across defer scripts. Do not
  // redeclare it locally: that would shadow the binding provided by script.js.
  function getProjects(){try{return typeof window.projects !== 'undefined' && Array.isArray(window.projects) ? window.projects : (typeof projects !== 'undefined' && Array.isArray(projects) ? projects : []);}catch(_){return [];}}
  function getIndex(){try{return typeof activeProjectIndex !== 'undefined' ? Number(activeProjectIndex)||0 : 0;}catch(_){return 0;}}
  function format(v){try{return typeof formatDate==='function'?formatDate(v):new Date(v).toLocaleDateString('hr-HR');}catch(_){return '–';}}
  function name(){const n=source.user?.textContent?.trim()||'';const first=n && n!=='Klijent'?n.split(/\s+/)[0]:'klijente';text('v21FirstName',first);}
  function project(){
    const list=getProjects();const index=Math.max(0,Math.min(getIndex(),list.length-1));const p=list[index];
    const counter=$('v21ProjectCount');
    const count=list.length;
    if(counter){const active=list.filter(item=>!/završen|dovršen|gotov/i.test(item.status||'')).length;counter.textContent=count ? (active===1?'1 aktivni projekt':active>=2&&active<=4?`${active} aktivna projekta`:`${active} aktivnih projekata`) : (source.slider?.textContent?.includes('Učitavanje')?'Učitavanje...':'Nema projekata');}
    const nav=$('v21ProjectPages');if(nav){nav.hidden=count<2;$('v21ProjectPrev').disabled=index<=0;$('v21ProjectNext').disabled=index>=count-1;}
    const card=document.querySelector('#v21Home .v21-project-card');
    card?.classList.toggle('is-empty',!p);
    const open=$('v21ProjectOpen');
    if(!p){
      text('v21ProjectTitle',source.slider?.querySelector('.no-projects')?.textContent?.trim()||'Trenutno nema projekata');
      text('v21ProjectName','');
      $('v21ProjectStatus').hidden=true;
      text('v21ProjectPackage','–');text('v21ProjectPercent','0%');$('v21ProjectBar').style.width='0%';
      $('v21ProjectTrack').setAttribute('aria-valuenow','0');
      text('v21ProjectDeadline','–');text('v21ProjectUpdated','–');
      if(open){open.href='my-projects.html';open.setAttribute('aria-label','Pogledaj sve projekte');open.firstChild.textContent='Svi projekti ';}
      return;
    }
    text('v21ProjectTitle',p.type || p.name || 'Projekt');
    text('v21ProjectName',p.name || '');
    const status=$('v21ProjectStatus');status.hidden=!p.status;
    status.textContent=p.status||'';
    status.classList.toggle('waiting',/čekanj/i.test(p.status||''));
    status.classList.toggle('done',/gotov|završen|dovršen/i.test(p.status||''));
    text('v21ProjectPackage',p.package||'–');
    const progress=Math.max(0,Math.min(100,Number(p.progress)||0));
    text('v21ProjectPercent',`${progress}%`);
    $('v21ProjectBar').style.width=`${progress}%`;
    $('v21ProjectTrack').setAttribute('aria-valuenow',String(progress));
    text('v21ProjectDeadline',p.deadline?format(p.deadline):'–');
    const last=source.slider?.querySelectorAll('.project-slide')?.[index]?.querySelector('.latest-update')?.textContent?.trim();
    text('v21ProjectUpdated',last|| (p.updated_at?format(p.updated_at):'–'));
    if(open){open.href='project.html?id='+encodeURIComponent(String(p.id));open.setAttribute('aria-label',`Otvori projekt ${p.type||p.name||''}`);open.firstChild.textContent='Otvori projekt ';}
  }
  function tasks(){
    const raw=source.count?.textContent?.trim()||'–';
    const loading=raw==='–' || Boolean(source.tasks?.textContent?.includes('Učitavanje'));
    const n=Number(raw);const rows=[...(source.tasks?.querySelectorAll('.ptech-task-preview-row')||[])];
    if(loading){text('v21TaskCount','–');text('v21TaskStatus','Učitavanje zadataka...');text('v21TaskDescription','Provjeri svoje obveze i rokove.');return;}
    if(raw==='!' || !Number.isFinite(n)){
      text('v21TaskCount','!');text('v21TaskStatus','Zadaci nisu dostupni');text('v21TaskDescription','Otvori stranicu Zadaci za više informacija.');return;
    }
    text('v21TaskCount',n);
    if(n>0){text('v21TaskStatus',n===1?'1 otvoreni zadatak':`${n} otvorenih zadataka`);
      const title=rows[0]?.querySelector('strong')?.textContent?.trim();text('v21TaskDescription',title?`Sljedeći zadatak: ${title}`:'Pogledajte zadatke i njihove rokove.');
    }else{text('v21TaskStatus','Nema otvorenih zadataka');text('v21TaskDescription','Trenutačno nema dodijeljenih zadataka.');}
  }
  function empty(target,message,kind){
    target.replaceChildren();const wrap=create('span','v21-empty-preview');const icon=create('span','v21-empty-icon');icon.innerHTML=kind==='document'?svg.document:svg.mail;wrap.append(icon,create('span','',message));target.append(wrap);
  }
  function messages(){
    const target=$('v21MessagePreview');if(!target||!source.messages)return;
    const row=source.messages.querySelector('.overview-row');
    const current=(row?.textContent||source.messages.textContent||'').trim();
    if(target.dataset.signature===current)return;
    target.dataset.signature=current;
    if(!row){empty(target,current||'Trenutno nema poruka.','message');return;}
    const link=create('a','v21-preview-link');link.href='messages.html';
    const icon=create('span','v21-preview-icon');icon.innerHTML=svg.people;
    const copy=create('span','v21-preview-copy');copy.append(create('strong','',row.querySelector('.overview-row-main strong')?.textContent?.trim()||'Poruka'),create('small','',row.querySelector('.overview-row-main small')?.textContent?.trim()||''));
    const when=create('span','v21-preview-date',row.querySelector('time')?.textContent?.trim()||'');
    link.append(icon,copy,when);target.replaceChildren(link);
  }
  function documents(){
    const target=$('v21DocumentPreview');if(!target||!source.documents)return;
    const row=source.documents.querySelector('.overview-row');
    const current=(row?.textContent||source.documents.textContent||'').trim()+'|'+(row?.getAttribute('href')||'');
    if(target.dataset.signature===current)return;
    target.dataset.signature=current;
    if(!row){empty(target,current.replace(/\|$/,'')||'Nema novih dokumenata.','document');return;}
    const rawUrl=row.getAttribute('href')||'';
    let href='documents.html';try{const parsed=new URL(rawUrl,location.href);if(['http:','https:'].includes(parsed.protocol))href=parsed.href;}catch(_){}
    const link=create('a','v21-preview-link');link.href=href;
    if(row.getAttribute('target')==='_blank'){link.target='_blank';link.rel='noopener noreferrer';}
    const ext=row.querySelector('.overview-file-icon')?.textContent?.trim()||'PDF';
    const icon=create('span','v21-preview-icon',ext.slice(0,5));
    const copy=create('span','v21-preview-copy');copy.append(create('strong','',row.querySelector('.overview-row-main strong')?.textContent?.trim()||'Dokument'),create('small','',row.querySelector('.overview-row-main small')?.textContent?.trim()||''));
    const download=create('span','v21-preview-download');download.innerHTML=svg.download;
    link.append(icon,copy,download);target.replaceChildren(link);
  }
  let queued=false;
  function update(){queued=false;name();project();tasks();messages();documents();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(update);}
  [source.slider,source.count,source.tasks,source.messages,source.documents,source.user].forEach(node=>{if(node)new MutationObserver(queue).observe(node,{subtree:true,childList:true,characterData:true});});
  $('v21ProjectPrev')?.addEventListener('click',()=>{try{if(typeof setActiveProject==='function')setActiveProject(Math.max(0,getIndex()-1));}catch(_){}queue();});
  $('v21ProjectNext')?.addEventListener('click',()=>{try{if(typeof setActiveProject==='function')setActiveProject(Math.min(getProjects().length-1,getIndex()+1));}catch(_){}queue();});
  $('v21AddDocument')?.addEventListener('click',()=>{
    const original=source.materials;
    if(original && original.isConnected && !original.disabled && original.getAttribute('aria-disabled')!=='true') original.click();
    else location.href='documents.html';
  });
  // Reuse native V16 dashboard editing with the user's existing saved grid.
  const editor=$('ptechLayoutEdit'), personalUse=$('v21PersonalUse'), standardUse=$('v21StandardUse');
  let checkedKey='',layoutAtStart;
  function userId(){try{return typeof currentSession!=='undefined'?currentSession?.user?.id||'':'';}catch(_){return '';}}
  function storageKey(){const uid=userId();return uid?`ptech_v21_home_mode_${uid}`:'';}
  function savedGrid(){const uid=userId();if(!uid)return null;try{return localStorage.getItem(`ptech_v16_dashboard_layout_${uid}`);}catch(_){return null;}}
  function buttons(){const editing=document.body.classList.contains('ptech-layout-editing');
    if(personalUse)personalUse.hidden=!editing;
    if(standardUse)standardUse.hidden=editing || !document.body.classList.contains('ptech-home-personal');
  }
  function setView(personal){document.body.classList.toggle('ptech-home-personal',Boolean(personal));const key=storageKey();
    if(key)try{localStorage.setItem(key,personal?'personal':'standard');}catch(_){}
    buttons();requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
  function restore(){const key=storageKey();if(!key || key===checkedKey)return;checkedKey=key;
    try{document.body.classList.toggle('ptech-home-personal',localStorage.getItem(key)==='personal');}catch(_){}
    buttons();
  }
  if(source.user)new MutationObserver(restore).observe(source.user,{childList:true,characterData:true,subtree:true});
  // V21.2: restore the original, proven V16.11 editor (free grid placement,
  // smooth drag-and-drop and lower-right corner resize). The V21.1 inline
  // editor is intentionally not loaded. Neither editor data nor tasks are reset.
  $('v21Edit')?.addEventListener('click',()=>{
    if (!editor || editor.disabled) {
      const trigger=$('v21Edit');
      if (trigger) trigger.title='Pričekajte da se učita korisnički račun.';
      return;
    }
    if (document.body.classList.contains('ptech-layout-editing')) return;
    document.body.classList.add('ptech-home-preparing-edit');
    requestAnimationFrame(()=>{
      try { editor.click(); }
      finally { document.body.classList.remove('ptech-home-preparing-edit'); }
    });
  });
  editor?.addEventListener('click',()=>{
    if(document.body.classList.contains('ptech-layout-editing')) layoutAtStart=savedGrid();
    else {if(layoutAtStart!==undefined && savedGrid()!==layoutAtStart)setView(true);layoutAtStart=undefined;queue();}
    buttons();
  });
  $('v21Personal')?.addEventListener('click',()=>setView(true));
  personalUse?.addEventListener('click',()=>{setView(true);if(document.body.classList.contains('ptech-layout-editing'))editor?.click();});
  standardUse?.addEventListener('click',()=>setView(false));
  window.addEventListener('pageshow',()=>{restore();queue();});
  restore();queue();
})();
