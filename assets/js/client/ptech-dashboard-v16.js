/* PTech Digital Client Portal V16.11 - precise placement into empty grid cells.
 * Safe: project-related operations stay in original script.js; Supabase tasks
 * are read only through existing RLS. Layout and personal notes are local to
 * the signed-in user's browser and are never stored in Supabase.
 */
(() => {
  'use strict';
  const grid = document.getElementById('ptechDashboardGrid');
  if (!grid) return;
  document.body.classList.add('ptech-dashboard-v16', 'ptech-dashboard-v162', 'ptech-dashboard-v164', 'ptech-dashboard-v165', 'ptech-dashboard-v166', 'ptech-dashboard-v167', 'ptech-dashboard-v168', 'ptech-dashboard-v169', 'ptech-dashboard-v1610', 'ptech-dashboard-v1611');
  const button = document.getElementById('ptechLayoutEdit');
  const resetButton = document.getElementById('ptechLayoutReset');
  const showButton = document.getElementById('ptechLayoutShow');
  const hint = document.getElementById('ptechLayoutHint');
  const hiddenTray = document.getElementById('ptechHiddenWidgets');
  const densityControl=document.getElementById('ptechGridDensityControl');
  const densityButtons=[...document.querySelectorAll('[data-grid-preset]')];
  const customColumns=document.getElementById('ptechGridCustomColumns');
  const customRows=document.getElementById('ptechGridCustomRows');
  const applyCustomGrid=document.getElementById('ptechGridApply');
  const gridStatus=document.getElementById('ptechGridStatus');
  const taskList = document.getElementById('ptechDashboardTasksList');
  const taskCount = document.getElementById('ptechDashboardTasksCount');
  const taskRefresh = document.getElementById('ptechDashboardTasksRefresh');

  // Real page actions are kept as original DOM nodes; never recreate handlers.
  const actionSection = grid.querySelector('[data-widget-id="actions"]');
  const actionGrid = actionSection?.querySelector('.actions-grid');
  const actionCatalog = {
    approve: {title:'Odobri dizajn', native:'approveDesignAction'},
    revision: {title:'Zatraži izmjenu', native:'revisionAction'},
    materials: {title:'Dostavi materijale', native:'materialsAction'},
    support: {title:'Kontaktiraj podršku', native:'support'},
    projects: {title:'Moji projekti', icon:'▤', description:'Pogledaj sve svoje projekte.', href:'my-projects.html', cta:'Otvori projekte'},
    tasks: {title:'Moji zadaci', icon:'✓', description:'Provjeri svoje obveze i rokove.', href:'tasks.html', cta:'Otvori zadatke'},
    documents: {title:'Dokumenti', icon:'▧', description:'Pristupi svojim dokumentima.', href:'documents.html', cta:'Otvori dokumente'},
    profile: {title:'Moj profil', icon:'◉', description:'Pregledaj i ažuriraj profil.', href:'profile.html', cta:'Otvori profil'}
  };
  const actionIds=Object.keys(actionCatalog);
  const actionSlots=new Map();
  let actionPickerOpen=false,actionPicker,actionAddButton,actionCount,emptyActions,actionMore;

  const hubCatalog = {
    'hub-messages':  {title:'Poruke',icon:'✉',detail:'Otvori razgovore s podrškom',href:'messages.html'},
    'hub-documents': {title:'Dokumenti',icon:'▤',detail:'Svi dokumenti na jednom mjestu',href:'documents.html'},
    'hub-tasks':     {title:'Zadaci',icon:'✓',detail:'Dodijeljeni zadaci i rokovi',href:'tasks.html'},
    'hub-projects':  {title:'Projekti',icon:'▣',detail:'Status svih projekata',href:'my-projects.html'},
    'hub-profile':   {title:'Moj profil',icon:'◉',detail:'Osobne postavke',href:'profile.html'},
    'hub-approval':  {title:'Odobravanje dizajna',icon:'✧',detail:'Odaberi projekt i potvrdi dizajn',href:'my-projects.html'},
    'hub-revisions': {title:'Izmjene dizajna',icon:'↗',detail:'Odaberi projekt za izmjenu',href:'my-projects.html'},
    'hub-support':   {title:'Podrška',icon:'?',detail:'Postavi pitanje ili pošalji poruku',href:'messages.html'}
  };
  const titles = {
    projects:'Aktivni projekti', tasks:'Moji zadaci', actions:'Brze akcije',
    messages:'Nedavne poruke', documents:'Korisni dokumenti'
  };
  const primaryIds=Object.keys(titles);
  for(const [id,meta] of Object.entries(hubCatalog)) titles[id]=meta.title;
  const hubIds=Object.keys(hubCatalog);
  const ids=Object.keys(titles);
  const widgets=new Map(primaryIds.map(id=>[id,grid.querySelector(`[data-widget-id="${id}"]`)]));
  if ([...widgets.values()].some(widget=>!widget)) return;
  const defaultDims={
    projects:{w:12,h:5},tasks:{w:6,h:5},actions:{w:6,h:5},
    messages:{w:6,h:4},documents:{w:6,h:4}
  };
  const defaults={
    order:['projects','tasks','actions','messages','documents',...hubIds],
    hidden:[...hubIds],
    dims:{...defaultDims},
    actionOrder:[...actionIds],hiddenActions:['projects','tasks','documents','profile'],
    customTasks:[],gridPreset:12,gridRows:12,placements:{}
  };
  let currentUserId=null,api=null,editing=false,state=null;
  let tasks=[],taskError=false,taskLoading=false;
  let drag=null,resize=null,zoom=null;
  let densityFrame=0;
  const tileObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>scheduleDensities()):null;
  let pickerOpen=false,picker,taskForm,widgetList,taskFormToggle;
  const MIN_ROWS=1,MAX_ROWS=11;
  const usablePageLinks={
    none:'',messages:'messages.html',documents:'documents.html',tasks:'tasks.html',
    projects:'my-projects.html',profile:'profile.html',approve:'my-projects.html',
    revision:'my-projects.html'
  };
  const prefersReducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const cloneDims=()=>Object.fromEntries(Object.entries(defaultDims).map(([id,d])=>[id,{...d}]));
  const uuid=()=>window.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2,9)}`;
  const customId=task=>`personal-${task.id}`;
  const validCoreId=id=>typeof id==='string' && Object.hasOwn(titles,id);
  const validCustomTask=t=>t && typeof t==='object' && typeof t.id==='string' && /^[a-zA-Z0-9-]{8,60}$/.test(t.id)
    && typeof t.title==='string' && t.title.trim() && t.title.length<=100;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const storageKey=()=>currentUserId?`ptech_v16_dashboard_layout_${currentUserId}`:null;
  const escapeSelector=val=>CSS.escape?CSS.escape(val):val.replace(/[^a-zA-Z0-9-]/g,'');
  function cloneDefaults(){return {
    order:[...defaults.order],hidden:[...defaults.hidden],dims:cloneDims(),
    actionOrder:[...defaults.actionOrder],hiddenActions:[...defaults.hiddenActions],customTasks:[],gridPreset:12,gridRows:12,placements:{}
  };}
  function normalize(raw){
    if(!raw||typeof raw!=='object')return cloneDefaults();
    const out=cloneDefaults();
    // Existing V16.7 layouts are automatically migrated (gridRows = gridPreset).
    const readGrid=(v,fallback)=>Number.isFinite(Number(v))&&String(v).trim()!==''?
      clamp(Math.round(Number(v)),6,60):fallback;
    out.gridPreset=readGrid(raw.gridPreset,12);
    out.gridRows=readGrid(raw.gridRows,out.gridPreset);
    out.customTasks=Array.isArray(raw.customTasks)?raw.customTasks.filter(validCustomTask).slice(0,40).map(t=>({
      id:t.id,title:t.title.trim().slice(0,100),description:String(t.description||'').slice(0,400),
      href:Object.values(usablePageLinks).includes(t.href)?t.href:'',done:Boolean(t.done)
    })):[];
    const possible=[...ids,...out.customTasks.map(customId)];
    const goodId=id=>possible.includes(id);
    const order=Array.isArray(raw.order)?[...new Set(raw.order.filter(goodId))]:[];
    for(const id of possible)if(!order.includes(id))order.push(id);
    out.order=order;
    out.hidden=Array.isArray(raw.hidden)?[...new Set(raw.hidden.filter(goodId))]:[...defaults.hidden];
    for(const id of hubIds)if(!Array.isArray(raw.hidden) && !out.hidden.includes(id))out.hidden.push(id);
    out.dims={...cloneDims()};
    for(const id of possible){
      const oldWidth=raw.sizes?.[id]==='small'?4:raw.sizes?.[id]==='large'?12:6;
      const d=raw.dims?.[id];
      const fallback=out.dims[id]||{w:6,h:4};
      out.dims[id]={w:clamp(Number.isFinite(d?.w)?Math.round(d.w*1000)/1000:(raw.sizes?.[id]?oldWidth:fallback.w),0.15,12),
        h:clamp(Number.isFinite(d?.h)?Math.round(d.h*1000)/1000:fallback.h,0.15,MAX_ROWS),
        ...(d?.m===1||d?.m===2?{m:d.m}:{})};
    }
    out.actionOrder=Array.isArray(raw.actionOrder)?[...new Set(raw.actionOrder.filter(id=>Object.hasOwn(actionCatalog,id)))]:[...actionIds];
    for(const id of actionIds)if(!out.actionOrder.includes(id))out.actionOrder.push(id);
    out.hiddenActions=Array.isArray(raw.hiddenActions)?[...new Set(raw.hiddenActions.filter(id=>Object.hasOwn(actionCatalog,id)))]:[...defaults.hiddenActions];
    // V16.11: preserve explicit positions separately on phone, tablet and desktop.
    // Previous V16.10 saved layouts have no placements and are safely migrated on first edit.
    const positions=raw.placements;
    if(positions && typeof positions==='object')for(const mode of ['desktop','tablet','mobile']){
      const saved=positions[mode];
      if(!saved || typeof saved!=='object' || !saved.items || typeof saved.items!=='object')continue;
      const items={};
      for(const [id,pos] of Object.entries(saved.items)){
        if(!goodId(id) || !pos || typeof pos!=='object')continue;
        const c=Number(pos.col),r=Number(pos.row);
        if(Number.isInteger(c)&&c>=1&&c<=120 && Number.isInteger(r)&&r>=1&&r<=3000)
          items[id]={col:c,row:r};
      }
      out.placements[mode]={cols:clamp(Math.round(Number(saved.cols)||12),2,60),
        rowDensity:clamp(Math.round(Number(saved.rowDensity)||12),6,60),items};
    }
    return out;
  }
  function save(){try{if(storageKey())localStorage.setItem(storageKey(),JSON.stringify(state));}
    catch(e){console.warn('[PTech V16.11] Raspored nije spremljen',e);}}
  function load(){try{const raw=storageKey() && localStorage.getItem(storageKey());return normalize(raw?JSON.parse(raw):null);}
    catch(_){return cloneDefaults();}}
  function text(tag,cls,content){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=content;return el;}
  function makeButton(label,action,cls=''){
    const el=text('button',`ptech-widget-tool ${cls}`,label);el.type='button';
    el.setAttribute('aria-label',action);el.title=action;return el;
  }
  // The saved sizes use proportional 12x12 design units. High-density grids
  // offer smaller snap steps without enlarging/shrinking existing tiles on selection.
  const GRID_MIN=6,GRID_MAX=60;
  function isMobile(){return window.matchMedia('(max-width:720px)').matches;}
  function actualGridColumns(){
    if(isMobile())return 2; // Keep legible cards on narrow phones.
    const columns=state?.gridPreset||12;
    return window.matchMedia('(max-width:1120px)').matches?Math.max(3,Math.round(columns/2)):columns;
  }
  function breakpointColumns(){return actualGridColumns();}
  function rowScale(){return isMobile()?1:(state?.gridRows||12)/12;}
  function cellGap(){
    if(isMobile())return 12;
    return clamp(Math.round(14*12/Math.max(actualGridColumns(),state?.gridRows||12)),3,14);
  }
  function cellHeight(){return isMobile()?66:Math.max(12,Math.round(68*12/(state?.gridRows||12)));}
  function columnStep(cols=actualGridColumns()){
    const gap=cellGap();
    return (Math.max(grid.clientWidth,320)-gap*(cols-1))/cols+gap;
  }
  function gridMinCols(id,cols){
    if(isMobile())return id==='projects'||id==='actions'?2:1;
    const minWidth=id==='projects'?168:id==='actions'?158:96;
    return clamp(Math.ceil((minWidth+cellGap())/Math.max(columnStep(cols),1)),1,cols);
  }
  function gridMinRows(){
    if(isMobile())return 2;
    const step=cellHeight()+cellGap();
    return Math.max(1,Math.ceil((128+cellGap())/step));
  }
  function gridMaxRows(){return Math.max(gridMinRows(),Math.round(MAX_ROWS*rowScale()));}
  function minColumn(id){
    if(isMobile())return id==='projects'||id==='actions'?12:6;
    return Math.ceil(gridMinCols(id,actualGridColumns())*12/actualGridColumns()*1000)/1000;
  }
  function logicalToGrid(value,columns){
    // Two half-width cards must still fit beside one another on odd-density
    // grids (e.g. 15 columns: 7+7, not 8+8 which forces a new row).
    return Math.max(1,Math.floor(value*columns/12+1e-7));
  }
  function viewDims(id){
    const d=state.dims[id]||{w:6,h:4};
    const cols=actualGridColumns();
    if(isMobile()){
      const preferred=(id==='projects'||id==='actions'||id==='tasks'||d.w>=10)?2:1;
      return {w:clamp(d.m||preferred,gridMinCols(id,cols),cols),
        h:clamp(Math.round(d.h),gridMinRows(),MAX_ROWS)};
    }
    return {w:clamp(logicalToGrid(d.w,cols),gridMinCols(id,cols),cols),
      h:clamp(Math.round(d.h*rowScale()),gridMinRows(),gridMaxRows())};
  }
  function applyGridPreset(){
    if(!state)return;
    grid.style.setProperty('--ptech-grid-columns',String(actualGridColumns()));
    grid.style.setProperty('--ptech-grid-row-height',`${cellHeight()}px`);
    grid.style.setProperty('--ptech-grid-gap',`${cellGap()}px`);
    if(densityControl)densityControl.hidden=!editing;
    for(const btn of densityButtons){
      const preset=Number(btn.dataset.gridPreset);
      const active=preset===state.gridPreset&&preset===state.gridRows;
      btn.setAttribute('aria-pressed',String(active));
      btn.classList.toggle('is-selected',active);
    }
    if(customColumns&&document.activeElement!==customColumns)customColumns.value=String(state.gridPreset);
    if(customRows&&document.activeElement!==customRows)customRows.value=String(state.gridRows);
    if(gridStatus)gridStatus.textContent=`Aktivna mreža: ${state.gridPreset} × ${state.gridRows}`;
  }
  function renderSizes(id,widget){
    const d=viewDims(id),raw=state.dims[id]||{w:6,h:4};
    widget.style.setProperty('--ptech-span-cols',String(d.w));
    widget.style.setProperty('--ptech-span-rows',String(d.h));
    widget.dataset.widgetSize=raw.w<=4?'small':raw.w>=10?'large':'medium';
    widget.dataset.widgetColumns=String(d.w);
    const counter=widget.querySelector('.ptech-widget-dimensions');
    if(counter)counter.textContent=`${d.w} × ${d.h}`;
  }
  /* V16.11: explicit coordinates allow genuine empty holes in the dashboard.
   * CSS grid auto-flow and DOM order alone cannot express a tile dropped into a gap.
   * Keep each breakpoint independent so mobile placement never destroys desktop layout.
   */
  const placementMode=()=>isMobile()?'mobile':window.matchMedia('(max-width:1120px)').matches?'tablet':'desktop';
  const densityRows=()=>isMobile()?12:(state?.gridRows||12);
  const currentPlacement=()=>state?.placements?.[placementMode()]||null;
  const visibleTiles=()=>state.order.filter(id=>widgets.has(id)&&!state.hidden.includes(id));
  const gridRowStep=()=>{
    const style=getComputedStyle(grid);
    return (parseFloat(style.gridAutoRows)||cellHeight())+(parseFloat(style.rowGap)||cellGap());
  };
  function gridPosition(node){
    const outer=grid.getBoundingClientRect(),rect=node.getBoundingClientRect();
    const cw=columnStep(),rh=gridRowStep();
    const d=viewDims(node.dataset.widgetId);
    return {col:clamp(Math.round((rect.left-outer.left)/cw)+1,1,actualGridColumns()-d.w+1),
      row:Math.max(1,Math.round((rect.top-outer.top)/rh)+1)};
  }
  function captureInitialPositions(){
    if(currentPlacement())return;
    const items={};
    for(const id of visibleTiles())items[id]=gridPosition(widgets.get(id));
    state.placements[placementMode()]={cols:actualGridColumns(),rowDensity:densityRows(),items};
  }
  function requestedPositions(){
    const entry=currentPlacement();if(!entry)return null;
    const cols=actualGridColumns(),factor=densityRows()/entry.rowDensity;
    const requested={};
    for(const [id,pos] of Object.entries(entry.items)){
      if(!widgets.has(id))continue;
      const size=viewDims(id);
      requested[id]={col:clamp(Math.round((pos.col-1)*cols/entry.cols)+1,1,cols-size.w+1),
        row:clamp(Math.round((pos.row-1)*factor)+1,1,3000)};
    }
    return requested;
  }
  function planPositions(requested={},priorityId=null){
    const cols=actualGridColumns(),used=new Set(),result={};
    const fits=(c,r,w,h)=>{
      if(c<1||c+w-1>cols||r<1)return false;
      for(let y=r;y<r+h;y++)for(let x=c;x<c+w;x++)if(used.has(`${x}:${y}`))return false;
      return true;
    };
    const occupy=(id,c,r)=>{
      const {w,h}=viewDims(id);
      for(let y=r;y<r+h;y++)for(let x=c;x<c+w;x++)used.add(`${x}:${y}`);
      result[id]={col:c,row:r};
    };
    const ids=visibleTiles();
    const sequence=priorityId&&ids.includes(priorityId)?[priorityId,...ids.filter(id=>id!==priorityId)]:ids;
    // Priority tile is reserved first. Other tiles keep their original coordinates
    // whenever possible. Only overlaps are moved to the next free slot.
    for(const id of sequence){
      const {w,h}=viewDims(id),pos=requested[id];
      const c=clamp(pos?.col||1,1,cols-w+1),r=clamp(pos?.row||1,1,3000);
      if(pos&&fits(c,r,w,h)){occupy(id,c,r);continue;}
      let found=false;
      // For an overlap, search forward from its original row. For newly added
      // tiles without a position, start at the beginning of the grid.
      const start=pos?r:1;
      for(let y=start;y<Math.max(start+500,700)&&!found;y++){
        for(let x=1;x<=cols-w+1;x++)if(fits(x,y,w,h)){
          occupy(id,x,y);found=true;break;
        }
      }
      if(!found)occupy(id,1,Math.min(start+700,2900));
    }
    return result;
  }
  function setGridCell(node,id,pos){
    const d=viewDims(id);
    node.style.setProperty('grid-column',`${pos.col} / span ${d.w}`,'important');
    node.style.setProperty('grid-row',`${pos.row} / span ${d.h}`,'important');
  }
  function putPositions(positions){
    for(const [id,node] of widgets){
      if(node.hidden)continue;
      if(positions[id])setGridCell(node,id,positions[id]);
    }
  }
  function rememberPositions(positions){
    const items={};
    for(const [id,pos] of Object.entries(positions))if(widgets.has(id))items[id]={...pos};
    state.placements[placementMode()]={cols:actualGridColumns(),rowDensity:densityRows(),items};
    // Keep keyboard traversal and accessibility order consistent with the grid.
    const sorted=visibleTiles().sort((a,b)=>(items[a]?.row||0)-(items[b]?.row||0)||
      (items[a]?.col||0)-(items[b]?.col||0));
    state.order=[...sorted,...state.order.filter(id=>!sorted.includes(id))];
  }
  function updateExplicitPositions(){
    const requested=requestedPositions();
    if(!requested){
      for(const node of widgets.values()){
        node.style.removeProperty('grid-column');node.style.removeProperty('grid-row');
      }
      return;
    }
    putPositions(planPositions(requested));
  }
  function placeAddedAtBottom(id){
    const layout=currentPlacement();if(!layout)return;
    const existing=planPositions(requestedPositions()||{});
    const bottom=Math.max(0,...Object.entries(existing).filter(([key])=>key!==id)
      .map(([key,pos])=>pos.row+viewDims(key).h-1));
    // A new widget is shown below the others, where auto-scroll can reveal it.
    const desired={...existing,[id]:{col:1,row:bottom+1}};
    rememberPositions(planPositions(desired,id));
  }
  function shiftPinnedTile(id,dx,dy){
    const original=planPositions(requestedPositions()||{}),pos=original[id];
    if(!pos)return false;
    const w=viewDims(id).w;
    const updated={...original,[id]:{col:clamp(pos.col+dx,1,actualGridColumns()-w+1),
      row:Math.max(1,pos.row+dy)}};
    const next=planPositions(updated,id);
    if(next[id].col===pos.col&&next[id].row===pos.row)return false;
    rememberPositions(next);return true;
  }

  // Responsive previews: the *same* widget progressively reveals more information.
  // Compact tiles show a title/name; medium tiles add context; large tiles add a summary.
  const hubHints={
    'hub-messages':'Razgovori i odgovori podrške na jednom mjestu.',
    'hub-documents':'Pregled dokumenata, datoteka i materijala za projekte.',
    'hub-tasks':'Dodijeljene obveze, statusi i rokovi za tvoje projekte.',
    'hub-projects':'Detalji projekata, status izrade i sljedeći koraci.',
    'hub-profile':'Tvoj korisnički račun i postavke profila.',
    'hub-approval':'Otvori projekt kako bi pregledao i odobrio dizajn.',
    'hub-revisions':'Pošalji prijedloge izmjena odabranog projekta.',
    'hub-support':'Otvorene poruke i način kako kontaktirati podršku.'
  };
  function currentDisplayName(){
    const label=document.getElementById('userTop')?.textContent?.trim();
    return label&&label!=='Klijent'?label:'Klijent';
  }
  function hubNode(id,meta){
    const node=document.createElement('section');node.className='ptech-widget ptech-hub-widget';
    node.dataset.widgetId=id;node.setAttribute('aria-label',meta.title);
    const content=document.createElement('div');content.className='ptech-hub-body';
    const icon=text('span','ptech-hub-icon',meta.icon);icon.setAttribute('aria-hidden','true');
    const title=text('h2','ptech-hub-title',meta.title);
    content.append(icon,title,text('span','ptech-hub-metric',id==='hub-profile'?'Moj račun':'Otvori'));
    if(id==='hub-profile')content.append(text('h2','ptech-hub-title-compact',currentDisplayName()));
    content.append(text('p','ptech-hub-description',meta.detail));
    const extra=document.createElement('div');extra.className='ptech-hub-extra';
    extra.append(text('strong','ptech-hub-summary-title',meta.title),
      text('p','ptech-hub-summary-text',hubHints[id]||meta.detail));
    if(id==='hub-profile')extra.append(text('p','ptech-hub-summary-email',''));
    content.append(extra);
    const link=text('a','ptech-hub-link','Otvori →');link.href=meta.href;
    content.append(link);node.append(content);return node;
  }
  function updateHubSummaries(){
    const profile=widgets.get('hub-profile');
    if(profile){
      const name=currentDisplayName();
      const compact=profile.querySelector('.ptech-hub-title-compact');
      if(compact)compact.textContent=name;
      const strong=profile.querySelector('.ptech-hub-summary-title');
      if(strong)strong.textContent=name;
      const email=profile.querySelector('.ptech-hub-summary-email');
      const address=typeof currentSession!=='undefined'?currentSession?.user?.email:'';
      if(email){email.textContent=address||'';email.hidden=!address;}
    }
    const projects=widgets.get('hub-projects');
    const total=document.getElementById('totalProjects')?.textContent?.trim();
    const pSummary=projects?.querySelector('.ptech-hub-summary-title');
    if(pSummary)pSummary.textContent=total&&/^\d+$/.test(total)?`${total} projekata`:'Moji projekti';
    const tasksHub=widgets.get('hub-tasks');
    const tSummary=tasksHub?.querySelector('.ptech-hub-summary-title');
    const count=taskCount?.textContent?.trim();
    if(tSummary)tSummary.textContent=count&&/^\d+$/.test(count)?`${count} otvorenih zadataka`:'Dodijeljeni zadaci';
  }
  // Smart summaries for the five existing dashboard tiles. Data is read
  // from existing rendered DOM and Supabase task result, never hard-coded.
  const corePreviewMeta={
    projects:{icon:'▣',label:'Projekti',link:'my-projects.html'},
    tasks:{icon:'✓',label:'Zadaci',link:'tasks.html'},
    actions:{icon:'✦',label:'Brze akcije',link:null},
    messages:{icon:'✉',label:'Poruke',link:'messages.html'},
    documents:{icon:'▤',label:'Dokumenti',link:'documents.html'}
  };
  const corePreviews=new Map();
  function createCorePreview(id,widget){
    const meta=corePreviewMeta[id];if(!meta)return;
    widget.classList.add('ptech-core-widget');
    const inner=widget.querySelector('.ptech-tile-inner');if(!inner)return;
    const holder=document.createElement('div');holder.className='ptech-smart-preview';
    holder.setAttribute('aria-label',`Sažetak: ${meta.label}`);
    const head=text('div','ptech-smart-head','');
    head.append(text('span','ptech-smart-icon',meta.icon),text('span','ptech-smart-label',meta.label));
    const metric=text('strong','ptech-smart-metric','–');
    const main=text('span','ptech-smart-main','Učitavanje podataka...');
    const detail=text('span','ptech-smart-detail','');
    const progress=document.createElement('div');progress.className='ptech-smart-progress';
    const bar=document.createElement('span');progress.append(bar);
    const footer=document.createElement('div');footer.className='ptech-smart-footer';
    const link=meta.link?text('a','ptech-smart-link','Otvori →'):text('span','ptech-smart-link','');
    if(meta.link)link.href=meta.link;
    footer.append(detail,link);
    holder.append(head,metric,main,progress,footer);
    inner.prepend(holder);
    corePreviews.set(id,{holder,metric,main,detail,progress,bar,link});
  }
  function updateCorePreviews(){
    for(const [id,p] of corePreviews){
      let metric='–',main='',detail='',progress=null;
      if(id==='projects'){
        const count=document.getElementById('totalProjects')?.textContent?.trim()||'0';
        const selected=Math.max(0,(Number(document.getElementById('currentProject')?.textContent)||1)-1);
        const slide=grid.querySelectorAll('.projects-slider .project-slide')[selected];
        const title=slide?.querySelector('.project-title-wrap h3')?.textContent?.trim();
        const name=slide?.querySelector('.project-title-wrap p')?.textContent?.trim();
        const status=slide?.querySelector('.status-badge')?.textContent?.trim();
        const candidate=slide?.querySelector('.progress-row strong,.progress-row b,.progress-percent')?.textContent?.trim();
        metric=count; main=title||'Moji projekti';
        detail=name||status||'Praćenje izrade i rokova';
        const n=Number((candidate||'').replace(/[^0-9.]/g,''));
        if(candidate && Number.isFinite(n))progress=clamp(n,0,100);
      }else if(id==='tasks'){
        const open=tasks.filter(t=>t.status!=='done');
        metric=taskError?'!':String(open.length);
        const upcoming=[...open].sort((a,b)=>String(a.due_date||'9999').localeCompare(String(b.due_date||'9999')))[0];
        main=taskError?'Nije moguće učitati':upcoming?.title||'Nema otvorenih zadataka';
        detail=upcoming?.due_date?`Rok: ${new Date(upcoming.due_date+'T12:00:00').toLocaleDateString('hr-HR')}`:'Prati svoje obveze';
      }else if(id==='actions'){
        const visible=state.actionOrder.filter(key=>!state.hiddenActions.includes(key)&&actionSlots.has(key));
        metric=String(visible.length);main='Odaberi željenu akciju';
        detail=visible.slice(0,3).map(key=>actionCatalog[key].title).join(' · ')||'Dodaj željenu akciju';
      }else{
        const list=grid.querySelector(id==='messages'?'#recentMessagesList':'#recentDocumentsList');
        const rows=[...list?.querySelectorAll('.overview-row')||[]];
        metric=String(rows.length);
        const first=rows[0];
        main=first?.querySelector('.overview-row-main strong')?.textContent?.trim()||
          (id==='messages'?'Nema novih poruka':'Nema novih dokumenata');
        detail=first?.querySelector('.overview-row-main small')?.textContent?.trim()||
          (id==='messages'?'Poruke i podrška na jednom mjestu':'Datoteke tvojih projekata');
      }
      if(p.metric.textContent!==metric)p.metric.textContent=metric;
      if(p.main.textContent!==main)p.main.textContent=main;
      if(p.detail.textContent!==detail)p.detail.textContent=detail;
      p.progress.hidden=progress===null;
      if(progress!==null)p.bar.style.width=`${progress}%`;
      if(!p.link.getAttribute('href'))p.link.hidden=true;
    }
    updateHubMetrics();
  }
  function updateHubMetrics(){
    const map={
      'hub-messages':corePreviews.get('messages')?.metric.textContent,
      'hub-documents':corePreviews.get('documents')?.metric.textContent,
      'hub-tasks':corePreviews.get('tasks')?.metric.textContent,
      'hub-projects':corePreviews.get('projects')?.metric.textContent
    };
    for(const [id,value] of Object.entries(map)){
      const node=widgets.get(id)?.querySelector('.ptech-hub-metric');
      if(node&&value!==undefined)node.textContent=value;
    }
    const profile=widgets.get('hub-profile')?.querySelector('.ptech-hub-metric');
    if(profile)profile.textContent='Moj račun';
  }
  function observeOriginalContent(){
    const selectors=['#projectsSlider','#currentProject','#recentMessagesList','#recentDocumentsList'];
    if(typeof MutationObserver!=='function')return;
    for(const sel of selectors){
      const el=document.querySelector(sel);if(!el)continue;
      const observer=new MutationObserver(()=>scheduleDensities());
      observer.observe(el,{childList:true,subtree:true,characterData:true});
    }
  }
  // V16.9: Native project slide is the preferred presentation, not a duplicated
  // summary above the slide. Only a genuinely small tile switches to ONE summary.
  // Quick actions use measured available space so their tiles never get clipped.
  function fitQuickActions(widget, width, height){
    if(!actionGrid || !actionSection || !state)return;
    const visible=state.actionOrder.filter(key=>!state.hiddenActions.includes(key)&&actionSlots.has(key));
    const n=visible.length;
    const inZoom=zoom?.widget===widget;
    const padding=width<400?22:40;
    const usableWidth=Math.max(75,width-padding);
    const heading=(!inZoom && editing)?108:(!inZoom?77:85);
    const usableHeight=Math.max(38,height-heading);
    // Choose balanced rectangles instead of very tall empty action cards.
    const maxCols=Math.min(n||1,Math.max(1,Math.floor(usableWidth/100)));
    let cols=1,bestScore=Infinity;
    for(let candidate=1;candidate<=maxCols;candidate++){
      const candidateRows=Math.ceil(n/candidate);
      const cardW=(usableWidth-8*(candidate-1))/candidate;
      const cardH=(usableHeight-8*(candidateRows-1))/candidateRows;
      if(cardH<49)continue;
      const ratio=cardW/Math.max(1,cardH);
      const score=Math.abs(Math.log(ratio/1.5)) +
        (cardW<124?0.45:0) + (cardH<82?0.6:0);
      if(score<bestScore){bestScore=score;cols=candidate;}
    }
    let rows=Math.ceil(n/cols);
    // Never crop the last row. Extra actions remain available through 'Još akcija'.
    const minRowHeight=editing?72:61;
    const fitRows=Math.max(1,Math.floor((usableHeight+8)/(minRowHeight+8)));
    const shown=inZoom?n:Math.min(n,Math.max(1,cols*fitRows));
    rows=Math.max(1,Math.ceil(shown/Math.max(1,cols)));
    const cardHeight=(usableHeight-8*Math.max(0,rows-1))/rows;
    const availableCardWidth=(usableWidth-8*Math.max(0,cols-1))/cols;
    const presentation=inZoom || (cardHeight>=149 && availableCardWidth>=175)?'detail':
      cardHeight>=95 && availableCardWidth>=125?'standard':'compact';
    widget.dataset.actionsPresentation=presentation;
    actionGrid.style.setProperty('--ptech-actions-cols',String(cols));
    actionGrid.style.setProperty('--ptech-actions-rows',String(rows));
    actionGrid.style.setProperty('--ptech-actions-row-height',`${Math.max(36,Math.round(cardHeight))}px`);
    for(const [i,key] of visible.entries()){
      const slot=actionSlots.get(key);
      if(slot)slot.dataset.ptechOverflow=i>=shown?'true':'false';
    }
    // Keep the overflow control outside the action grid; it opens the existing
    // fullscreen view, without changing the user's saved arrangement.
    const extra=Math.max(0,n-shown);
    if(actionMore){
      actionMore.hidden=extra===0;
      actionMore.textContent=width<360?`+${extra} · Sve`:`+ ${extra} više · Prikaži sve`;
      actionMore.setAttribute('aria-label',`Prikaži još ${extra} brzih akcija`);
    }
  }
  function applyDensity(widget){
    if(!widget || widget.hidden || !widget.isConnected)return;
    const rect=widget.getBoundingClientRect();
    if(rect.width<10||rect.height<10)return;
    const width=rect.width,height=rect.height;
    const id=widget.dataset.widgetId;
    const logical=state?.dims[id];
    const tiny=logical && logical.w<=minColumn(id) && logical.h<=MIN_ROWS;
    const mode=zoom?.widget===widget?'expanded':tiny||width<285||height<250?'compact':width>=425&&height>=325?'expanded':'standard';
    if(widget.dataset.widgetDensity!==mode)widget.dataset.widgetDensity=mode;
    if(id==='projects'){
      // A 4-column project stats row needs little more than 300px vertically;
      // narrower cards need extra height for the wrapped project details.
      const full=zoom?.widget===widget ||
        ((width>=700 && height>=335) || (width>=480 && height>=420));
      widget.dataset.projectContent=full?'full':'summary';
    }
    if(id==='messages'){
      // Show the original message list only when there is room. No nested
      // scroll: cap the visible rows by the actual tile height. A compact
      // message tile uses the existing live-data summary instead.
      const headRoom=editing?151:116;
      const rowHeight=width<440?70:61;
      const count=clamp(Math.floor((height-headRoom)/rowHeight),1,4);
      widget.dataset.messageRows=String(count);
    }
    if(id==='actions')fitQuickActions(widget,width,height);
  }
  function scheduleDensities(){
    if(densityFrame)return;
    densityFrame=requestAnimationFrame(()=>{
      densityFrame=0;
      for(const widget of widgets.values())applyDensity(widget);
      updateHubSummaries();
      updateCorePreviews();
    });
  }
  function personalNode(task){
    const node=document.createElement('section');node.className='ptech-widget ptech-personal-widget';
    node.dataset.widgetId=customId(task);node.setAttribute('aria-label',task.title);
    const content=document.createElement('div');content.className='ptech-personal-body';
    content.append(text('span','ptech-personal-symbol',task.done?'✓':'○'));
    const eyebrow=text('span','ptech-personal-eyebrow','MOJ OSOBNI ZADATAK');
    const name=text('h2','',task.title),description=text('p','',task.description || 'Tvoj osobni podsjetnik');
    const actions=document.createElement('div');actions.className='ptech-personal-actions';
    const check=text('button','ptech-personal-check',task.done?'✓ Dovršeno':'○ Označi dovršenim');check.type='button';
    check.setAttribute('aria-pressed',String(task.done));
    check.addEventListener('click',()=>{
      if(editing)return;
      const item=state.customTasks.find(t=>t.id===task.id);if(!item)return;
      item.done=!item.done;renderPersonal(node,item);save();
    });
    actions.append(check);
    if(task.href){const link=text('a','ptech-hub-link','Otvori →');link.href=task.href;actions.append(link);}
    content.append(eyebrow,name,description,actions);node.append(content);
    renderPersonal(node,task);return node;
  }
  function renderPersonal(node,task){
    node.classList.toggle('ptech-personal-done',Boolean(task.done));
    const symbol=node.querySelector('.ptech-personal-symbol');if(symbol)symbol.textContent=task.done?'✓':'○';
    const check=node.querySelector('.ptech-personal-check');
    if(check){check.textContent=task.done?'✓ Dovršeno':'○ Označi dovršenim';check.setAttribute('aria-pressed',String(task.done));}
  }
  for(const [id,meta] of Object.entries(hubCatalog)){
    const node=hubNode(id,meta);grid.append(node);widgets.set(id,node);
  }

  // V16.1: each quick action is independently removable and restorable.
  // We wrap existing DOM nodes instead of cloning them, preserving onclick listeners,
  // IDs and dynamically updated href/disabled state from script.js.
  if (actionGrid && actionSection) {
    const nativeCards = {
      approve: document.getElementById('approveDesignAction'),
      revision: document.getElementById('revisionAction'),
      materials: document.getElementById('materialsAction'),
      support: Array.from(actionGrid.querySelectorAll('.action-card')).find(node=>
        node.getAttribute('href')==='messages.html')
    };

    const toolbox = document.createElement('div');
    toolbox.className='ptech-action-toolbox';
    actionAddButton = text('button','ptech-action-add','+ Dodaj akciju');
    actionAddButton.type='button';
    actionAddButton.hidden=true;
    actionAddButton.setAttribute('aria-controls','ptechActionPicker');
    actionAddButton.setAttribute('aria-expanded','false');
    actionCount=text('span','ptech-action-count','');
    actionCount.setAttribute('aria-live','polite');
    toolbox.append(actionAddButton,actionCount);
    actionPicker=document.createElement('div');
    actionPicker.id='ptechActionPicker';
    actionPicker.className='ptech-action-picker';
    actionPicker.hidden=true;
    actionPicker.setAttribute('aria-label','Katalog brzih akcija');
    // The actions panel always has one clean heading. A hidden overflow control
    // makes every shortcut reachable even when the panel is very small.
    const nativeHeader=actionSection.querySelector('.actions-header');
    if(nativeHeader){
      actionMore=text('button','ptech-action-more','');
      actionMore.type='button';actionMore.hidden=true;
      actionMore.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        openZoom('actions',actionMore);
      });
      nativeHeader.append(actionMore);
    }
    actionSection.insertBefore(toolbox,actionGrid);
    actionSection.insertBefore(actionPicker,actionGrid);
    emptyActions=text('p','ptech-action-empty','Nema prikazanih brzih akcija. Klikni „Uredi raspored” kako bi ih dodao.');
    emptyActions.hidden=true;
    actionGrid.after(emptyActions);

    for (const id of actionIds) {
      const item=actionCatalog[id];
      let card = nativeCards[id];
      if (!card && item.href) {
        card=document.createElement('a');
        card.href=item.href;
        card.className='action-card';
        card.append(text('div','action-icon',item.icon),text('strong','',item.title),
          text('p','',item.description),text('span','action-button',item.cta));
        actionGrid.append(card);
      }
      if (!card) continue;
      const slot=document.createElement('div');
      slot.className='ptech-action-slot';
      slot.dataset.actionId=id;
      card.before(slot);
      slot.append(card);
      const tools=document.createElement('div');
      tools.className='ptech-action-controls';
      tools.setAttribute('aria-label',`Uredi akciju ${item.title}`);
      const up=makeButton('←',`Pomakni akciju ${item.title} ranije`,'ptech-action-move-earlier');
      const down=makeButton('→',`Pomakni akciju ${item.title} kasnije`,'ptech-action-move-later');
      const remove=makeButton('×',`Ukloni akciju ${item.title} s dashboarda`,'ptech-action-remove');
      up.addEventListener('click',()=>moveAction(id,-1));
      down.addEventListener('click',()=>moveAction(id,1));
      remove.addEventListener('click',()=>{
        if(!editing || !currentUserId)return;
        state.hiddenActions=[...new Set([...state.hiddenActions,id])];
        render();save();
      });
      tools.append(up,down,remove);
      slot.append(tools);
      actionSlots.set(id,slot);
    }

    actionAddButton.addEventListener('click',()=>{
      if(!editing || !currentUserId)return;
      actionPickerOpen=!actionPickerOpen;
      renderQuickActions();
      if(actionPickerOpen)actionPicker.scrollIntoView({block:'nearest',behavior:'smooth'});
    });

    // Keep native actions inert while editing (no accidental navigation/uploads).
    actionGrid.addEventListener('click',event=>{
      if(!editing)return;
      if(event.target.closest('.action-card')) {
        event.preventDefault();
        event.stopPropagation();
      }
    },true);
  }

  function moveAction(id,delta) {
    if(!editing || !currentUserId)return;
    const visible=state.actionOrder.filter(item=>!state.hiddenActions.includes(item) && actionSlots.has(item));
    const index=visible.indexOf(id),next=index+delta;
    if(index<0 || next<0 || next>=visible.length)return;
    const a=state.actionOrder.indexOf(id), b=state.actionOrder.indexOf(visible[next]);
    [state.actionOrder[a],state.actionOrder[b]]=[state.actionOrder[b],state.actionOrder[a]];
    render();save();
  }

  function renderQuickActions() {
    if(!actionGrid || !actionPicker)return;
    const visible=state.actionOrder.filter(id=>!state.hiddenActions.includes(id) && actionSlots.has(id));
    for(const [id,slot] of actionSlots) {
      slot.style.order=String(state.actionOrder.indexOf(id));
      slot.hidden=state.hiddenActions.includes(id);
      const card=slot.querySelector('.action-card');
      if(card){
        if(editing){
          if(!card.hasAttribute('data-ptech-old-tabindex')){
            card.dataset.ptechOldTabindex=card.hasAttribute('tabindex')?card.getAttribute('tabindex'):'none';
          }
          card.tabIndex=-1;
        } else if(card.hasAttribute('data-ptech-old-tabindex')){
          if(card.dataset.ptechOldTabindex==='none') card.removeAttribute('tabindex');
          else card.setAttribute('tabindex',card.dataset.ptechOldTabindex);
          delete card.dataset.ptechOldTabindex;
        }
      }
      const i=visible.indexOf(id);
      slot.querySelector('.ptech-action-move-earlier').disabled=i<=0;
      slot.querySelector('.ptech-action-move-later').disabled=i<0 || i===visible.length-1;
    }
    actionCount.textContent=`${visible.length} od ${actionSlots.size} akcija`;
    actionCount.hidden=!editing;
    emptyActions.hidden=visible.length>0;
    actionAddButton.hidden=!editing;
    const available=actionIds.filter(id=>actionSlots.has(id) && state.hiddenActions.includes(id));
    actionAddButton.disabled=!available.length;
    actionAddButton.textContent=available.length?`+ Dodaj akciju (${available.length})`:'Sve akcije dodane';
    if(!available.length)actionPickerOpen=false;
    actionAddButton.setAttribute('aria-expanded',String(editing && actionPickerOpen));
    actionPicker.hidden=!editing || !actionPickerOpen || !available.length;
    actionPicker.replaceChildren();
    if(!actionPicker.hidden){
      actionPicker.append(text('strong','ptech-action-picker-title','Odaberi akcije koje želiš prikazati'));
      const list=document.createElement('div');
      list.className='ptech-action-picker-list';
      for(const id of available){
        const add=text('button','ptech-action-picker-item','+ '+actionCatalog[id].title);
        add.type='button';
        add.addEventListener('click',()=>{
          if(!editing || !currentUserId)return;
          state.hiddenActions=state.hiddenActions.filter(item=>item!==id);
          render();save();
        });
        list.append(add);
      }
      actionPicker.append(list);
    }
  }


  // Wrap content without cloning elements, keeping native event handlers and IDs.
  // In ordinary dashboard mode the entire page scrolls, not individual tiles.
  // The resize handle stays pinned to its corner.
  function equipWidget(id,widget){
    if(widget.dataset.ptechEquipped)return;
    widget.dataset.ptechEquipped='true';
    tileObserver?.observe(widget);
    const content=document.createElement('div');content.className='ptech-tile-inner';
    while(widget.firstChild)content.append(widget.firstChild);
    widget.append(content);
    createCorePreview(id,widget);
    const controls=document.createElement('div');controls.className='ptech-widget-controls';
    controls.setAttribute('aria-label',`Uređivanje kartice ${titles[id]||'Moj zadatak'}`);
    const name=titles[id]||state.customTasks.find(t=>customId(t)===id)?.title||'Moj zadatak';
    const handle=makeButton('⠿',`Premjesti ${name}`,'ptech-widget-move');
    handle.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight ArrowUp ArrowDown');
    handle.addEventListener('pointerdown',e=>startDrag(e,id));
    handle.addEventListener('keydown',e=>{
      if(!editing||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();moveOne(id,e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1);
    });
    const label=text('span','ptech-widget-dimensions','');label.setAttribute('aria-hidden','true');
    const prev=makeButton('←',`Pomakni ${name} ranije`);
    prev.addEventListener('click',()=>moveOne(id,-1));
    const next=makeButton('→',`Pomakni ${name} kasnije`);
    next.addEventListener('click',()=>moveOne(id,1));
    const compact=makeButton('▣',`Smanji ${name} na malu kockicu`,'ptech-widget-compact');
    compact.addEventListener('click',()=>{
      if(!editing || drag || resize || zoom)return;
      const old=state.dims[id]||{w:6,h:4};
      state.dims[id]={...old,w:minColumn(id),h:Math.round((gridMinRows()/rowScale())*1000)/1000,
        m:(id==='projects'||id==='actions')?2:1};
      render(true);save();
    });
    // V16.6: Expand a tile IN THE DASHBOARD GRID (without leaving edit mode).
    // Keep the corner-resize handle for fine tuning of both width and height.
    const grow=makeButton('⤢',`Povećaj ${name} na veliku kockicu`,'ptech-widget-grow');
    grow.addEventListener('click',()=>{
      if(!editing || drag || resize || zoom)return;
      const old=state.dims[id]||{w:6,h:4};
      state.dims[id]={...old,w:12,h:Math.max(old.h,7),m:2};
      render(true);save();
    });
    const hide=makeButton('×',`Ukloni ${name} s dashboarda`,'ptech-widget-hide');
    hide.addEventListener('click',()=>{
      if(!editing)return;
      if(id.startsWith('personal-')){
        const item=state.customTasks.find(t=>customId(t)===id);
        if(!item||!window.confirm(`Ukloniti osobni zadatak „${item.title}”?`))return;
        state.customTasks=state.customTasks.filter(t=>customId(t)!==id);
        state.order=state.order.filter(x=>x!==id);
        state.hidden=state.hidden.filter(x=>x!==id);
        delete state.dims[id];
        tileObserver?.unobserve(widget);widgets.delete(id);widget.remove();
      }else if(!state.hidden.includes(id))state.hidden.push(id);
      render();save();
    });
    controls.append(handle,label,compact,grow,prev,next,hide);
    const grip=makeButton('','Povuci kut za promjenu širine i visine '+name,'ptech-widget-resize');
    grip.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 20l11-11M15 20l5-5M19 20h1v-1"/></svg>';
    grip.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight ArrowUp ArrowDown');
    grip.addEventListener('pointerdown',e=>startResize(e,id));
    grip.addEventListener('keydown',e=>{
      if(!editing)return;
      const delta={'ArrowRight':[1,0],'ArrowLeft':[-1,0],'ArrowDown':[0,1],'ArrowUp':[0,-1]}[e.key];
      if(!delta)return;e.preventDefault();
      const d=state.dims[id]||{w:6,h:4};
      if(breakpointColumns()===2){
        d.m=clamp((d.m||viewDims(id).w)+delta[0],id==='projects'||id==='actions'?2:1,2);
      }else{d.w=clamp(Math.round((d.w+delta[0]*12/breakpointColumns())*1000)/1000,minColumn(id),12);}
      d.h=clamp(Math.round((d.h+delta[1]/rowScale())*1000)/1000,0.15,MAX_ROWS);state.dims[id]=d;
      render();save();
    });
    // Fullscreen preview is available ONLY in Uredi dashboard (never in normal view).
    const expand=makeButton('⛶',`Prikaži ${name} preko cijelog zaslona`,'ptech-widget-expand');
    expand.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      if(editing)openZoom(id,expand);
    });
    controls.append(expand);
    widget.append(controls,grip);
  }

  // Maximize/restore: move the REAL widget to an accessible fullscreen dialog.
  // A footprint placeholder retains its exact grid position and dimensions.
  // Restoring does not modify saved order or tile dimensions.
  function openZoom(id,trigger){
    if(zoom || drag || resize || !widgets.has(id) || widgets.get(id).hidden)return;
    // Stay in edit mode; the dialog is just a preview, not a saved layout change.
    const widget=widgets.get(id);
    const rect=widget.getBoundingClientRect();
    const placeholder=document.createElement('div');
    placeholder.className='ptech-zoom-footprint';
    placeholder.style.order=widget.style.order;
    placeholder.style.gridColumn=`span ${viewDims(id).w}`;
    placeholder.style.gridRow=`span ${viewDims(id).h}`;
    placeholder.setAttribute('aria-hidden','true');
    const overlay=document.createElement('div');
    overlay.className='ptech-zoom-overlay';
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
    const title=titles[id]||state.customTasks.find(t=>customId(t)===id)?.title||'Kockica';
    overlay.setAttribute('aria-label',`Prošireni prikaz: ${title}`);
    const dialog=document.createElement('div');dialog.className='ptech-zoom-dialog';
    const header=document.createElement('div');header.className='ptech-zoom-header';
    const heading=text('strong','ptech-zoom-heading',title);
    const restore=makeButton('↙ Vrati',`Vrati ${title} na dashboard`,'ptech-zoom-restore');
    header.append(heading,restore);
    const stage=document.createElement('div');stage.className='ptech-dashboard-grid ptech-zoom-grid';
    // Keep the saved footprint in the dashboard while the real tile is inside
    // the fullscreen dialog. Do not carry pinned grid coordinates into the dialog.
    const savedCellColumn=widget.style.getPropertyValue('grid-column');
    const savedCellRow=widget.style.getPropertyValue('grid-row');
    if(savedCellColumn)placeholder.style.setProperty('grid-column',savedCellColumn,'important');
    if(savedCellRow)placeholder.style.setProperty('grid-row',savedCellRow,'important');
    widget.replaceWith(placeholder);
    widget.style.removeProperty('grid-column');widget.style.removeProperty('grid-row');
    stage.append(widget);
    dialog.append(header,stage);overlay.append(dialog);document.body.append(overlay);
    const oldOverflow=document.documentElement.style.overflow;
    document.documentElement.style.overflow='hidden';
    const onKey=e=>{
      if(e.key==='Escape'){e.preventDefault();closeZoom();}
      if(e.key==='Tab'){
        const elements=[...overlay.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')]
          .filter(el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden');
        if(!elements.length){e.preventDefault();restore.focus();return;}
        const first=elements[0],last=elements[elements.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };
    const onBackdrop=e=>{if(e.target===overlay)closeZoom();};
    zoom={id,widget,trigger,placeholder,overlay,restore,onKey,onBackdrop,oldOverflow,rect};
    restore.addEventListener('click',closeZoom);
    overlay.addEventListener('pointerdown',onBackdrop);
    document.addEventListener('keydown',onKey,true);
    document.body.classList.add('ptech-widget-zoom-open');
    widget.dataset.widgetDensity='expanded';
    taskPreviewRender();
    scheduleDensities();
    restore.focus({preventScroll:true});
  }
  function closeZoom(){
    if(!zoom)return;
    const z=zoom;zoom=null;
    document.removeEventListener('keydown',z.onKey,true);
    z.overlay.removeEventListener('pointerdown',z.onBackdrop);
    z.placeholder.replaceWith(z.widget);
    z.overlay.remove();
    document.documentElement.style.overflow=z.oldOverflow;
    document.body.classList.remove('ptech-widget-zoom-open');
    taskPreviewRender();
    render();
    // Restore focus to the button, not to the start of the page.
    if(z.trigger.isConnected)z.trigger.focus({preventScroll:true});
  }

  // Scroll to newly placed tile only after the picker has closed and the
  // browser calculated its final grid position. The short glow helps orientation.
  let newTileTimeout=0;
  function revealAddedWidget(id){
    const widget=widgets.get(id);
    if(!widget)return;
    window.clearTimeout(newTileTimeout);
    for(const node of widgets.values())node.classList.remove('ptech-widget-just-added');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(!widget.isConnected||widget.hidden)return;
      widget.classList.add('ptech-widget-just-added');
      widget.scrollIntoView({behavior:prefersReducedMotion()?'instant':'smooth',block:'center',inline:'nearest'});
      newTileTimeout=window.setTimeout(()=>widget.classList.remove('ptech-widget-just-added'),2900);
    }));
  }

  // Catalog: all supported portal sections plus unlimited user-defined local tasks
  // up to a conservative limit. Never accept arbitrary hrefs into dashboard DOM.
  picker=document.createElement('section');picker.className='ptech-widget-picker';
  picker.id='ptechWidgetPicker';picker.hidden=true;
  picker.setAttribute('aria-label','Katalog kartica');
  const pickerHead=document.createElement('div');pickerHead.className='ptech-widget-picker-head';
  const pickerTitle=text('h3','','Dodaj na dashboard');
  const closePicker=makeButton('×','Zatvori katalog kartica','ptech-picker-close');
  closePicker.addEventListener('click',()=>{pickerOpen=false;renderCatalog();});
  pickerHead.append(pickerTitle,closePicker);
  widgetList=document.createElement('div');widgetList.className='ptech-widget-picker-grid';
  taskFormToggle=text('button','ptech-create-task-toggle','＋ Napravi svoj zadatak');taskFormToggle.type='button';
  taskForm=document.createElement('form');taskForm.className='ptech-personal-form';taskForm.hidden=true;
  const taskName=text('label','','Naziv zadatka');
  const nameInput=document.createElement('input');nameInput.name='title';nameInput.placeholder='Npr. Pripremiti fotografije';
  nameInput.maxLength=100;nameInput.required=true;taskName.append(nameInput);
  const taskDescription=text('label','','Opis (neobavezno)');
  const descriptionInput=document.createElement('textarea');descriptionInput.name='description';descriptionInput.rows=2;
  descriptionInput.maxLength=400;descriptionInput.placeholder='Što želiš napraviti?';taskDescription.append(descriptionInput);
  const targetLabel=text('label','','Otvori povezanu stranicu (neobavezno)');
  const targetInput=document.createElement('select');targetInput.name='target';
  for(const [key,href] of Object.entries(usablePageLinks)){
    const option=document.createElement('option');option.value=key;
    option.textContent=key==='none'?'Bez poveznice':({messages:'Poruke',documents:'Dokumenti',tasks:'Zadaci',projects:'Projekti',profile:'Profil',approve:'Odobrenja dizajna',revision:'Izmjene dizajna'})[key];
    targetInput.append(option);
  }targetLabel.append(targetInput);
  const submit=text('button','ptech-personal-submit','Dodaj zadatak');submit.type='submit';
  const explanation=text('p','ptech-personal-note','Osobni zadaci spremaju se samo u ovom pregledniku. Ne mijenjaju zadatke koje ti je dodijelio administrator.');
  taskForm.append(taskName,taskDescription,targetLabel,submit,explanation);
  taskFormToggle.addEventListener('click',()=>{
    taskForm.hidden=!taskForm.hidden;
    taskFormToggle.setAttribute('aria-expanded',String(!taskForm.hidden));
    if(!taskForm.hidden)nameInput.focus();
  });taskFormToggle.setAttribute('aria-expanded','false');
  taskForm.addEventListener('submit',e=>{
    e.preventDefault();if(!currentUserId||!editing)return;
    if(state.customTasks.length>=40){window.alert('Možeš imati najviše 40 osobnih zadataka.');return;}
    const title=nameInput.value.trim();if(!title)return;
    const task={id:uuid(),title:title.slice(0,100),description:descriptionInput.value.trim().slice(0,400),
      href:usablePageLinks[targetInput.value]||'',done:false};
    state.customTasks.push(task);
    const id=customId(task);titles[id]=task.title;
    const widget=personalNode(task);grid.append(widget);widgets.set(id,widget);
    state.order.push(id);state.dims[id]={w:6,h:4};
    equipWidget(id,widget);placeAddedAtBottom(id);save();taskForm.reset();taskForm.hidden=true;
    taskFormToggle.setAttribute('aria-expanded','false');
    pickerOpen=false;render();revealAddedWidget(id);
  });
  picker.append(pickerHead,text('p','ptech-picker-desc','Odaberi koje dijelove portala želiš imati kao kockice.'),widgetList,taskFormToggle,taskForm);
  hiddenTray.after(picker);

  function renderCatalog(){
    picker.hidden=!editing||!pickerOpen;
    showButton.textContent='＋ Dodaj kockicu';
    showButton.hidden=!editing;
    showButton.setAttribute('aria-expanded',String(editing&&pickerOpen));
    widgetList.replaceChildren();
    if(picker.hidden)return;
    const available=[...primaryIds,...hubIds].filter(id=>state.hidden.includes(id));
    for(const id of available){
      const meta=hubCatalog[id];
      const add=text('button','ptech-catalog-tile','');add.type='button';
      add.append(text('span','ptech-catalog-icon',meta?.icon||'▦'),text('strong','',titles[id]),text('small','',meta?.detail||'Dodaj postojeću karticu'));
      add.addEventListener('click',()=>{
        state.hidden=state.hidden.filter(item=>item!==id);
        state.order=state.order.filter(item=>item!==id);state.order.push(id);
        placeAddedAtBottom(id);pickerOpen=false;render();save();revealAddedWidget(id);
      });widgetList.append(add);
    }
    if(!available.length)widgetList.append(text('p','ptech-tasks-empty','Sve gotove kockice već su na dashboardu. Možeš napraviti vlastiti zadatak.'));
  }

  for(const [id,widget] of widgets)equipWidget(id,widget);
  observeOriginalContent();
  function loadPersonalWidgets(){
    for(const [id,node] of [...widgets])if(id.startsWith('personal-')){tileObserver?.unobserve(node);node.remove();widgets.delete(id);delete titles[id];}
    for(const task of state.customTasks){
      const id=customId(task);titles[id]=task.title;
      const widget=personalNode(task);grid.append(widget);widgets.set(id,widget);
      equipWidget(id,widget);
    }
  }
  // Block navigational/click actions when dashboard editing is enabled.
  grid.addEventListener('click',e=>{
    if(!editing)return;
    if(e.target.closest('.ptech-widget-controls,.ptech-widget-resize,.ptech-action-controls,.ptech-action-add,.ptech-action-picker,.ptech-action-picker-item,.ptech-action-more'))return;
    const target=e.target.closest('a,button,.action-card');
    if(target){e.preventDefault();e.stopPropagation();}
  },true);
  function animateReflow(before){
    if(prefersReducedMotion()||!before)return;
    requestAnimationFrame(()=>{
      for(const [id,node] of widgets){
        if(node.hidden||!before.has(id))continue;
        const a=before.get(id),b=node.getBoundingClientRect();
        const dx=a.left-b.left,dy=a.top-b.top;
        if((Math.abs(dx)>2||Math.abs(dy)>2) && Math.abs(dy)<2000){
          node.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],
            {duration:280,easing:'cubic-bezier(.2,.85,.22,1)'});
        }
      }
    });
  }
  function moveOne(id,delta){
    if(!editing)return;
    if(currentPlacement()){
      const pos=planPositions(requestedPositions()||{})[id];if(!pos)return;
      // Move to a neighboring free cell; on a column edge continue on the next row.
      const cols=actualGridColumns(),w=viewDims(id).w;
      let col=pos.col+delta,row=pos.row;
      if(col<1){col=Math.max(1,cols-w+1);row=Math.max(1,row-1);}
      if(col>cols-w+1){col=1;row++;}
      const updated={...planPositions(requestedPositions()||{}),[id]:{col,row}};
      rememberPositions(planPositions(updated,id));render(true);save();return;
    }
    const visible=state.order.filter(x=>widgets.has(x)&&!state.hidden.includes(x));
    const i=visible.indexOf(id),j=i+delta;if(i<0||j<0||j>=visible.length)return;
    const a=state.order.indexOf(id),b=state.order.indexOf(visible[j]);
    [state.order[a],state.order[b]]=[state.order[b],state.order[a]];
    render(true);save();
  }
  function render(animate=false){
    if(!state)return;
    const before=animate?new Map([...widgets].filter(([,n])=>!n.hidden).map(([id,n])=>[id,n.getBoundingClientRect()])):null;
    for(const [id,widget] of widgets){
      widget.style.order=String(state.order.indexOf(id));
      widget.hidden=state.hidden.includes(id);
      renderSizes(id,widget);
    }
    hiddenTray.replaceChildren();
    for(const id of state.hidden.filter(x=>widgets.has(x))){
      const reveal=text('button','ptech-layout-reveal','＋ '+titles[id]);reveal.type='button';
      reveal.addEventListener('click',()=>{
        state.hidden=state.hidden.filter(x=>x!==id);state.order=state.order.filter(x=>x!==id);
        state.order.push(id);placeAddedAtBottom(id);render(true);save();revealAddedWidget(id);
      });hiddenTray.append(reveal);
    }
    hiddenTray.hidden=true; // V16.2: the catalog replaces redundant inline hidden-widget buttons.
    resetButton.hidden=!editing;hint.hidden=!editing;
    applyGridPreset();
    updateExplicitPositions();
    renderCatalog();renderQuickActions();taskPreviewRender();
    animateReflow(before);
    scheduleDensities();
  }
  function setEdit(value){
    if(zoom)closeZoom();
    const willEdit=Boolean(value)&&Boolean(currentUserId);
    if(willEdit&&!editing)captureInitialPositions();
    editing=willEdit;
    if(!editing){cancelDrag();endResize();pickerOpen=false;actionPickerOpen=false;taskForm.hidden=true;}
    document.body.classList.toggle('ptech-layout-editing',editing);
    button.setAttribute('aria-pressed',String(editing));
    button.textContent=editing?'✓ Gotovo':'✦ Uredi dashboard';
    render();
  }
  button.addEventListener('click',()=>setEdit(!editing));
  densityButtons.forEach(btn=>btn.addEventListener('click',()=>{
    if(!editing||!currentUserId||drag||resize||zoom)return;
    const preset=Number(btn.dataset.gridPreset);
    if(preset<GRID_MIN||preset>GRID_MAX||state.gridPreset===preset&&state.gridRows===preset)return;
    state.gridPreset=preset;state.gridRows=preset;render(true);save();
  }));
  function setCustomGrid(){
    if(!editing||!currentUserId||drag||resize||zoom)return;
    const cols=Number(customColumns?.value),rows=Number(customRows?.value);
    if(!Number.isInteger(cols)||!Number.isInteger(rows)||
       cols<GRID_MIN||cols>GRID_MAX||rows<GRID_MIN||rows>GRID_MAX){
      if(gridStatus)gridStatus.textContent='Upiši cijele brojeve između 6 i 60.';
      (Number.isInteger(cols)&&cols>=GRID_MIN&&cols<=GRID_MAX?customRows:customColumns)?.focus();
      return;
    }
    state.gridPreset=cols;state.gridRows=rows;
    render(true);save();
  }
  applyCustomGrid?.addEventListener('click',setCustomGrid);
  for(const el of [customColumns,customRows])el?.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();setCustomGrid();}
  });
  showButton.addEventListener('click',()=>{
    if(!editing)return;pickerOpen=!pickerOpen;renderCatalog();
    if(pickerOpen)picker.scrollIntoView({behavior:prefersReducedMotion()?'auto':'smooth',block:'nearest'});
  });
  resetButton.addEventListener('click',()=>{
    if(!window.confirm('Želiš vratiti zadani raspored? Osobni zadaci i njihove oznake bit će uklonjeni iz ovog preglednika.'))return;
    state=cloneDefaults();loadPersonalWidgets();pickerOpen=false;render(true);save();
  });
  window.addEventListener('resize',()=>{if(state){applyGridPreset();for(const [id,widget]of widgets)renderSizes(id,widget);updateExplicitPositions();scheduleDensities();}},{passive:true});
  const nameLabel=document.getElementById('userTop');
  if(nameLabel && typeof MutationObserver==='function')new MutationObserver(updateHubSummaries).observe(nameLabel,{characterData:true,childList:true,subtree:true});

  // V16.11: drop into any free cells, not merely before/after another tile.
  // Only overlapping tiles are displaced; otherwise gaps remain exactly where
  // the user leaves them. A visible placeholder previews the final position.
  function startDrag(event,id){
    if(!editing||!currentUserId||drag||resize||zoom||(event.pointerType==='mouse'&&event.button!==0))return;
    const node=widgets.get(id);if(!node||node.hidden)return;
    event.preventDefault();event.stopPropagation();
    drag={id,node,handle:event.currentTarget,pointerId:event.pointerId,
      x:event.clientX,y:event.clientY,pointerX:event.clientX,pointerY:event.clientY,
      pointerType:event.pointerType,started:false,placeholder:null,autoScrollFrame:0,
      originalPositions:planPositions(requestedPositions()||{}),previewPositions:null,
      originalStyle:{position:node.style.position,left:node.style.left,top:node.style.top,
        width:node.style.width,height:node.style.height,zIndex:node.style.zIndex,
        transform:node.style.transform,pointerEvents:node.style.pointerEvents,
        transition:node.style.transition}};
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch(_){ }
    window.addEventListener('pointermove',dragMove,true);
    window.addEventListener('pointerup',dragEnd,true);
    window.addEventListener('pointercancel',dragCancel,true);
    window.addEventListener('blur',dragCancel);
    document.addEventListener('keydown',dragKeydown,true);
  }
  function beginDrag(){
    const d=drag;if(!d||d.started)return;
    d.started=true;
    const rect=d.node.getBoundingClientRect();
    d.offsetX=d.x-rect.left;d.offsetY=d.y-rect.top;
    const placeholder=document.createElement('div');
    placeholder.className='ptech-drop-placeholder';
    placeholder.dataset.ptechDropTarget='true';
    placeholder.setAttribute('aria-hidden','true');
    placeholder.style.setProperty('--ptech-span-cols',String(viewDims(d.id).w));
    placeholder.style.setProperty('--ptech-span-rows',String(viewDims(d.id).h));
    placeholder.append(text('span','ptech-drop-placeholder-icon','▦'),
      text('strong','','Pusti ovdje'),text('small','','Slobodno mjesto u mreži'));
    grid.append(placeholder);d.placeholder=placeholder;
    d.node.classList.add('ptech-widget-floating');
    document.body.classList.add('ptech-drag-active');
    d.node.style.setProperty('position','fixed','important');
    d.node.style.setProperty('left',rect.left+'px','important');
    d.node.style.setProperty('top',rect.top+'px','important');
    d.node.style.setProperty('width',rect.width+'px','important');
    d.node.style.setProperty('height',rect.height+'px','important');
    d.node.style.setProperty('z-index','9998','important');
    d.node.style.setProperty('pointer-events','none','important');
    d.node.style.setProperty('transition','none','important');
    d.node.style.setProperty('transform','translate3d(0,0,0)','important');
    const note=document.createElement('div');note.className='ptech-drop-live-status';
    note.setAttribute('role','status');note.setAttribute('aria-live','polite');
    grid.after(note);d.note=note;
    previewCell(d.originalPositions[d.id]);
    d.handle.setAttribute('aria-grabbed','true');
    if(d.pointerType==='touch')d.autoScrollFrame=requestAnimationFrame(touchAutoScroll);
    scheduleDensities();
  }
  function pointerCell(x,y){
    const d=drag,rect=grid.getBoundingClientRect();
    const stepX=columnStep(),stepY=gridRowStep();
    const w=viewDims(d.id).w;
    const bottom=Math.max(1,...Object.entries(d.originalPositions)
      .map(([id,p])=>p.row+viewDims(id).h));
    return {col:clamp(Math.round((x-rect.left-d.offsetX)/stepX)+1,1,actualGridColumns()-w+1),
      row:clamp(Math.round((y-rect.top-d.offsetY)/stepY)+1,1,bottom+5)};
  }
  function previewCell(target){
    if(!drag||!drag.started||!target)return;
    const d=drag;
    if(d.target?.col===target.col&&d.target?.row===target.row)return;
    const before=new Map(visibleTiles().filter(id=>id!==d.id)
      .map(id=>[id,widgets.get(id)?.getBoundingClientRect()]));
    const requested={...d.originalPositions,[d.id]:target};
    const next=planPositions(requested,d.id);
    setGridCell(d.placeholder,d.id,next[d.id]);
    putPositions(next);
    d.target={...target};d.previewPositions=next;
    const hasCollision=Object.entries(next).some(([id,pos])=>id!==d.id&&
      (pos.col!==d.originalPositions[id]?.col||pos.row!==d.originalPositions[id]?.row));
    d.placeholder.classList.toggle('ptech-drop-displaces',hasCollision);
    if(d.note)d.note.textContent=`${titles[d.id]||'Kartica'} — stupac ${next[d.id].col}, red ${next[d.id].row}${hasCollision?' · ostale kartice se razmiču':''}`;
    if(prefersReducedMotion())return;
    requestAnimationFrame(()=>{
      if(!drag||drag!==d)return;
      for(const [id,from]of before){
        const node=widgets.get(id);if(!node||!from)continue;
        const to=node.getBoundingClientRect(),dx=from.left-to.left,dy=from.top-to.top;
        if(Math.abs(dx)+Math.abs(dy)<3||Math.abs(dy)>1800)continue;
        node._ptechLiveFlip?.cancel();
        const anim=node.animate([{transform:`translate3d(${dx}px,${dy}px,0)`},{transform:'translate3d(0,0,0)'}],
          {duration:210,easing:'cubic-bezier(.17,.85,.22,1)'});
        node._ptechLiveFlip=anim;
        anim.addEventListener('finish',()=>{if(node._ptechLiveFlip===anim)node._ptechLiveFlip=null;},{once:true});
      }
    });
  }
  function dragMove(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(!drag.started&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7)return;
    if(!drag.started)beginDrag();if(!drag)return;
    event.preventDefault();event.stopPropagation();
    const d=drag;d.pointerX=event.clientX;d.pointerY=event.clientY;
    d.node.style.setProperty('transform',`translate3d(${event.clientX-d.x}px,${event.clientY-d.y}px,0)`,'important');
    previewCell(pointerCell(event.clientX,event.clientY));
  }
  function touchAutoScroll(){
    if(!drag||!drag.started||drag.pointerType!=='touch')return;
    const d=drag,top=95,bottom=window.innerHeight-110;
    const dy=d.pointerY<top?-clamp((top-d.pointerY)*.23,4,18):
      d.pointerY>bottom?clamp((d.pointerY-bottom)*.23,4,18):0;
    if(dy){const before=window.scrollY;window.scrollBy(0,dy);
      if(window.scrollY!==before)previewCell(pointerCell(d.pointerX,d.pointerY));}
    d.autoScrollFrame=requestAnimationFrame(touchAutoScroll);
  }
  function dragEnd(event){
    if(!drag||event.pointerId!==drag.pointerId)return;
    event.preventDefault();event.stopPropagation();
    if(!drag.started){clearDrag();return;}
    const positions=drag.previewPositions;
    clearDrag();
    if(positions){rememberPositions(positions);render(true);save();}
    else render();
  }
  function dragCancel(){cancelDrag();}
  function dragKeydown(event){if(event.key==='Escape'&&drag){event.preventDefault();event.stopPropagation();cancelDrag();}}
  function cancelDrag(){if(!drag)return;clearDrag();render(true);}
  function clearDrag(){
    if(!drag)return;const d=drag;drag=null;
    window.removeEventListener('pointermove',dragMove,true);
    window.removeEventListener('pointerup',dragEnd,true);
    window.removeEventListener('pointercancel',dragCancel,true);
    window.removeEventListener('blur',dragCancel);
    document.removeEventListener('keydown',dragKeydown,true);
    try{if(d.handle.hasPointerCapture?.(d.pointerId))d.handle.releasePointerCapture(d.pointerId);}catch(_){ }
    if(d.autoScrollFrame)cancelAnimationFrame(d.autoScrollFrame);
    if(d.started){
      for(const [key,value]of Object.entries(d.originalStyle))d.node.style[key]=value;
      d.node.classList.remove('ptech-widget-floating');
      d.placeholder?.remove();d.note?.remove();
      document.body.classList.remove('ptech-drag-active');
      d.handle.removeAttribute('aria-grabbed');
      for(const node of widgets.values())if(node._ptechLiveFlip){node._ptechLiveFlip.cancel();node._ptechLiveFlip=null;}
    }
    scheduleDensities();
  }
  // Resize is intentionally continuous while the corner is held, not only a +/- step.
  // Keep the grid footprint stable during the gesture so the tile never jumps away
  // from the finger. On release it snaps to grid cells and rearranges neighbors.
  function startResize(e,id){
    if(!editing||!currentUserId||resize||drag || (e.pointerType==='mouse'&&e.button!==0))return;
    const widget=widgets.get(id);
    if(!widget||widget.hidden)return;
    e.preventDefault();
    e.stopPropagation();
    const handle=e.currentTarget;
    const rect=widget.getBoundingClientRect();
    const style=getComputedStyle(grid);
    const colGap=parseFloat(style.columnGap)||0;
    const rowGap=parseFloat(style.rowGap)||0;
    const cols=breakpointColumns();
    const colStep=(grid.clientWidth-colGap*(cols-1))/cols+colGap;
    const rowStep=(parseFloat(style.gridAutoRows)||68)+rowGap;
    const minCols=gridMinCols(id,cols);
    const physicalScale=rowScale();
    const dims=viewDims(id);
    resize={
      id,widget,handle,pointerId:e.pointerId,
      x:e.clientX,y:e.clientY,width:rect.width,height:rect.height,
      cols,colStep,rowStep,colGap,rowGap,minCols,physicalScale,
      nextCols:dims.w,nextRows:dims.h,changed:false,
      oldWidth:widget.style.width,oldHeight:widget.style.height
    };
    widget.classList.add('ptech-widget-resizing');
    handle.setAttribute('aria-grabbed','true');
    document.body.classList.add('ptech-resize-active');
    try{handle.setPointerCapture(e.pointerId);}catch(_){}
    // Window capture still works when the pointer moves beyond the handle/tile,
    // and is also the fallback when Pointer Capture is not supported.
    window.addEventListener('pointermove',resizeMove,true);
    window.addEventListener('pointerup',resizeEnd,true);
    window.addEventListener('pointercancel',resizeCancel,true);
    window.addEventListener('blur',resizeCancel);
    document.addEventListener('keydown',resizeKeydown,true);
  }
  function resizeMove(e){
    if(!resize||resize.pointerId!==e.pointerId)return;
    e.preventDefault();e.stopPropagation();
    const r=resize;
    const minWidth=r.minCols*r.colStep-r.colGap;
    const maxWidth=r.cols*r.colStep-r.colGap;
    const minHeight=gridMinRows()*r.rowStep-r.rowGap;
    const maxHeight=gridMaxRows()*r.rowStep-r.rowGap;
    const width=clamp(r.width+e.clientX-r.x,minWidth,maxWidth);
    const height=clamp(r.height+e.clientY-r.y,minHeight,maxHeight);
    // Move in pixels as the user drags (rather than jumping one grid cell at a time).
    r.widget.style.width=`${width}px`;
    r.widget.style.height=`${height}px`;
    r.nextCols=clamp(Math.round((width+r.colGap)/r.colStep),r.minCols,r.cols);
    r.nextRows=clamp(Math.round((height+r.rowGap)/r.rowStep),gridMinRows(),gridMaxRows());
    const counter=r.widget.querySelector('.ptech-widget-dimensions');
    if(counter)counter.textContent=`${r.nextCols} × ${r.nextRows}`;
    r.changed=r.changed||Math.abs(e.clientX-r.x)>2||Math.abs(e.clientY-r.y)>2;
  }
  function resizeEnd(e){
    if(!resize||resize.pointerId!==e.pointerId)return;
    e.preventDefault();e.stopPropagation();
    const r=resize;
    endResize();
    if(!r.changed)return;
    const d=state.dims[r.id]||{w:6,h:4};
    if(r.cols===2){
      d.m=r.nextCols;
    }else{
      d.w=clamp(Math.round(r.nextCols*12/r.cols*1000)/1000,minColumn(r.id),12);
    }
    d.h=clamp(Math.round(r.nextRows/r.physicalScale*1000)/1000,0.15,MAX_ROWS);
    state.dims[r.id]=d;
    if(currentPlacement())rememberPositions(planPositions(requestedPositions()||{},r.id));
    render(true);
    save();
  }
  function resizeCancel(){
    if(!resize)return;
    endResize();
    // Cancelling the gesture (e.g. touch interrupted) does not save a half-finished size.
    render();
  }
  function resizeKeydown(e){
    if(e.key!=='Escape'||!resize)return;
    e.preventDefault();e.stopPropagation();
    resizeCancel();
  }
  function endResize(){
    if(!resize)return;
    const r=resize;
    resize=null;
    window.removeEventListener('pointermove',resizeMove,true);
    window.removeEventListener('pointerup',resizeEnd,true);
    window.removeEventListener('pointercancel',resizeCancel,true);
    window.removeEventListener('blur',resizeCancel);
    document.removeEventListener('keydown',resizeKeydown,true);
    r.widget.style.width=r.oldWidth;
    r.widget.style.height=r.oldHeight;
    r.widget.classList.remove('ptech-widget-resizing');
    r.handle.removeAttribute('aria-grabbed');
    document.body.classList.remove('ptech-resize-active');
    try{if(r.handle.hasPointerCapture?.(r.pointerId))r.handle.releasePointerCapture(r.pointerId);}catch(_){}
  }
  function taskPreviewRender() {
    if(!taskList||!taskCount)return;
    const open=tasks.filter(task=>task.status!=='done');
    taskCount.textContent=taskError?'!':String(open.length);
    taskCount.title=taskError?'Zadaci nisu dostupni':`${open.length} otvorenih zadataka`;
    taskList.replaceChildren();
    if(taskError) {
      taskList.append(text('p','ptech-tasks-empty','Nije moguće dohvatiti zadatke. Otvori stranicu Zadaci za više informacija.'));
      return;
    }
    if(!tasks.length) {
      taskList.append(text('p','ptech-tasks-empty',currentUserId?'Trenutačno nema dodijeljenih zadataka.':'Učitavanje zadataka...'));
      return;
    }
    const dims=state.dims.tasks || {w:6,h:5};
    const limit=zoom?.id==='tasks'?Math.min(60,Math.max(20,tasks.length)):
      Math.max(1,Math.min(9,Math.floor((dims.h-1)*1.5)));
    const selected=[...tasks].sort((a,b)=>
      (a.status==='done')-(b.status==='done') ||
      String(a.due_date||'9999').localeCompare(String(b.due_date||'9999'))
    ).slice(0,limit);
    for(const task of selected) {
      const row=document.createElement('a');
      row.href='tasks.html';
      row.className='ptech-task-preview-row';
      const body=document.createElement('span');body.className='ptech-task-preview-copy';
      body.append(text('strong','',task.title));
      const meta=task.status==='done'?'Dovršeno':task.due_date?
        `Rok: ${new Date(task.due_date+'T12:00:00').toLocaleDateString('hr-HR')}`:'Za napraviti';
      body.append(text('small','',meta));
      row.append(text('span','ptech-task-preview-dot'+(task.status==='done'?' done':''),'✓'),body,text('span','ptech-task-preview-chevron','›'));
      taskList.appendChild(row);
    }
    if(tasks.length>limit) taskList.append(text('p','ptech-tasks-more',`Još ${tasks.length-limit} zadataka na stranici Moji zadaci.`));
    scheduleDensities();
  }
  async function refreshTasks() {
    if(!api || !currentUserId || taskLoading)return;
    taskLoading=true;
    taskRefresh.disabled=true;
    try {
      const {data,error}=await api.from('ptech_client_tasks')
        .select('id,title,due_date,status')
        .order('created_at',{ascending:false}).limit(100);
      if(error)throw error;
      tasks=data||[];taskError=false;
    } catch (error) {
      taskError=true;
      console.warn('[PTech V16] Zadaci nisu dohvaćeni:',error);
    } finally {taskLoading=false;taskRefresh.disabled=false;taskPreviewRender();}
  }
  taskRefresh?.addEventListener('click',refreshTasks);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible' && currentUserId)refreshTasks();
  });


  window.PTechDashboardV16={
    setUser(userId,client){
      if(typeof userId!=='string'||!userId||!client)return;
      if(currentUserId!==userId){
        if(zoom)closeZoom();
        currentUserId=userId;api=client;state=load();loadPersonalWidgets();
        button.disabled=false;setEdit(false);
      }
      refreshTasks();
    }
  };
  // Handle script.js session initialization completing before this deferred script.
  if(typeof currentSession!=='undefined'&&currentSession?.user?.id&&typeof supabaseClient!=='undefined'){
    window.PTechDashboardV16.setUser(currentSession.user.id,supabaseClient);
  }
  state=state||cloneDefaults();render();
})();
