/* V19.0 — composition layer for the approved visual reference.
 * Enhances ORIGINAL V16 widgets and their live Supabase data in-place.
 * Never replaces the project slider, real action buttons or chat/document rows.
 */
(() => {
  'use strict';
  const root=document.documentElement;
  if(!root.classList.contains('ptech-v19'))return;
  const grid=document.getElementById('ptechDashboardGrid');
  if(!grid)return;
  const get=id=>grid.querySelector(`[data-widget-id="${id}"]`);
  const iconPaths={
    projects:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    tasks:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
    actions:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
    messages:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.8-5.4a9 9 0 0 1-1.3-4.1 8.5 8.5 0 1 1 17 0z"/>',
    documents:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
  };
  const sectionTitles={projects:'AKTIVNI PROJEKTI',tasks:'MOJI ZADACI',actions:'BRZE AKCIJE',messages:'NEDAVNE PORUKE',documents:'DOKUMENTI'};
  const selectors={projects:'.section-title',tasks:'.ptech-tasks-head h2',actions:'.actions-header h2',messages:'.overview-panel-header h2',documents:'.overview-panel-header h2'};
  const links={messages:['messages.html','Pogledaj sve poruke →'],documents:['documents.html','Pogledaj sve dokumente →']};
  function updateHeading(id){
    const widget=get(id), heading=widget?.querySelector(selectors[id]);
    if(!heading||heading.dataset.v19Styled)return;
    heading.dataset.v19Styled='true';
    heading.replaceChildren();
    const span=document.createElement('span');span.className='v19-heading-icon';span.setAttribute('aria-hidden','true');
    // Only constant, developer-owned SVG path markup, no user input.
    span.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[id]}</svg>`;
    heading.append(span,document.createTextNode(sectionTitles[id]));
  }
  function updateProjectChips(){
    const slider=document.getElementById('projectsSlider');if(!slider)return;
    for(const card of slider.querySelectorAll('.project-card')){
      const target=card.querySelector('.project-heading-right');
      const name=card.querySelector('.package-name')?.textContent?.trim();
      if(!target||!name)return;
      let chip=target.querySelector('.v19-package-chip');
      if(!chip){
        chip=document.createElement('span');chip.className='v19-package-chip';
        const arrow=target.querySelector('.project-open-arrow');
        if(arrow)target.insertBefore(chip,arrow);else target.append(chip);
      }
      if(chip.textContent!==name)chip.textContent=name;
    }
  }
  function updateTaskEmpty(){
    const widget=get('tasks'),list=document.getElementById('ptechDashboardTasksList');if(!widget||!list)return;
    const rows=list.querySelectorAll('.ptech-task-preview-row,.task-row,.task-item');
    const text=list.textContent.trim().toLowerCase();
    const empty=rows.length===0 && /\b(nema|nema dodijeljenih|trenutačno nema|trenutno nema)\b/i.test(text);
    widget.dataset.v19Empty=String(empty);
    let art=widget.querySelector('.v19-task-empty');
    if(!art){
      art=document.createElement('div');art.className='v19-task-empty';
      const icon=document.createElement('div');icon.className='v19-check-art';icon.textContent='✓';icon.setAttribute('aria-hidden','true');
      const name=document.createElement('strong');name.textContent='Nemate otvorenih zadataka';
      const sub=document.createElement('span');sub.textContent='Sve je odrađeno! Trenutno nemate aktivnih zadataka.';
      art.append(icon,name,sub);
      const head=widget.querySelector('.ptech-tasks-head');
      if(head)head.insertAdjacentElement('afterend',art);
    }
    art.hidden=!empty;
  }
  function addOverviewLinks(){
    for(const [id,[href,label]] of Object.entries(links)){
      const inner=get(id)?.querySelector('.ptech-tile-inner');if(!inner||inner.querySelector('.v19-footer-link'))continue;
      const link=document.createElement('a');link.className='v19-footer-link';link.href=href;link.textContent=label;
      inner.append(link);
    }
  }
  function adjustViews(){
    const rules={
      projects:[520,250],tasks:[340,255],actions:[660,120],messages:[330,175],documents:[330,175]
    };
    for(const [id,[minW,minH]] of Object.entries(rules)){
      const widget=get(id);if(!widget)continue;
      const {width,height}=widget.getBoundingClientRect();
      const show=width>=minW&&height>=minH;
      if(widget.dataset.v19Show!==String(show))widget.dataset.v19Show=String(show);
    }
  }
  function init(){
    for(const id of Object.keys(sectionTitles))updateHeading(id);
    const bar=document.querySelector('.ptech-layout-bar');
    const edit=document.getElementById('ptechLayoutEdit');
    const preset=document.getElementById('ptechFirstGlassPreset');
    if(preset){preset.textContent='▦ Raspored sa slike';preset.title='Primijeni raspored Projekti + Zadaci / Brze akcije / Poruke + Dokumenti';}
    if(edit){edit.textContent='✦ Uredi dashboard';edit.title='Pomakni, dodaj, povećaj ili smanji kockice';}
    if(bar && edit){
      const watcher=new MutationObserver(()=>bar.classList.toggle('v19-editor-open',document.body.classList.contains('ptech-layout-editing')));
      watcher.observe(document.body,{attributes:true,attributeFilter:['class']});
      bar.classList.toggle('v19-editor-open',document.body.classList.contains('ptech-layout-editing'));
    }
    addOverviewLinks();updateProjectChips();updateTaskEmpty();adjustViews();
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(()=>requestAnimationFrame(adjustViews)):null;
    for(const id of Object.keys(sectionTitles)) {const widget=get(id);if(widget&&ro)ro.observe(widget);}
    const list=document.getElementById('ptechDashboardTasksList');
    if(list)new MutationObserver(updateTaskEmpty).observe(list,{childList:true,subtree:true,characterData:true});
    const slider=document.getElementById('projectsSlider');
    if(slider)new MutationObserver(updateProjectChips).observe(slider,{childList:true,subtree:true});
    window.addEventListener('resize',()=>requestAnimationFrame(adjustViews),{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
