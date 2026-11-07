/* PTech Digital Client Portal V16.6 - editor-only tile controls + live grid and adaptive tiles.
 * Safe: project-related operations stay in original script.js; Supabase tasks
 * are read only through existing RLS. Layout and personal notes are local to
 * the signed-in user's browser and are never stored in Supabase.
 */
(() => {
  'use strict';
  const grid = document.getElementById('ptechDashboardGrid');
  if (!grid) return;
  document.body.classList.add('ptech-dashboard-v16', 'ptech-dashboard-v162', 'ptech-dashboard-v164', 'ptech-dashboard-v165', 'ptech-dashboard-v166');
  const button = document.getElementById('ptechLayoutEdit');
  const resetButton = document.getElementById('ptechLayoutReset');
  const showButton = document.getElementById('ptechLayoutShow');
  const hint = document.getElementById('ptechLayoutHint');
  const hiddenTray = document.getElementById('ptechHiddenWidgets');
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
  let actionPickerOpen=false,actionPicker,actionAddButton,actionCount,emptyActions;

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
    customTasks:[]
  };
  let currentUserId=null,api=null,editing=false,state=null;
  let tasks=[],taskError=false,taskLoading=false;
  let drag=null,resize=null,zoom=null;
  let densityFrame=0;
  const tileObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>scheduleDensities()):null;
  let pickerOpen=false,picker,taskForm,widgetList,taskFormToggle;
  const MIN_ROWS=3,MAX_ROWS=11;
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
    actionOrder:[...defaults.actionOrder],hiddenActions:[...defaults.hiddenActions],customTasks:[]
  };}
  function normalize(raw){
    if(!raw||typeof raw!=='object')return cloneDefaults();
    const out=cloneDefaults();
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
      out.dims[id]={w:clamp(Number.isFinite(d?.w)?Math.round(d.w):(raw.sizes?.[id]?oldWidth:fallback.w),3,12),
        h:clamp(Number.isFinite(d?.h)?Math.round(d.h):fallback.h,MIN_ROWS,MAX_ROWS),
        ...(d?.m===1||d?.m===2?{m:d.m}:{})};
    }
    out.actionOrder=Array.isArray(raw.actionOrder)?[...new Set(raw.actionOrder.filter(id=>Object.hasOwn(actionCatalog,id)))]:[...actionIds];
    for(const id of actionIds)if(!out.actionOrder.includes(id))out.actionOrder.push(id);
    out.hiddenActions=Array.isArray(raw.hiddenActions)?[...new Set(raw.hiddenActions.filter(id=>Object.hasOwn(actionCatalog,id)))]:[...defaults.hiddenActions];
    return out;
  }
  function save(){try{if(storageKey())localStorage.setItem(storageKey(),JSON.stringify(state));}
    catch(e){console.warn('[PTech V16.3] Raspored nije spremljen',e);}}
  function load(){try{const raw=storageKey() && localStorage.getItem(storageKey());return normalize(raw?JSON.parse(raw):null);}
    catch(_){return cloneDefaults();}}
  function text(tag,cls,content){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=content;return el;}
  function makeButton(label,action,cls=''){
    const el=text('button',`ptech-widget-tool ${cls}`,label);el.type='button';
    el.setAttribute('aria-label',action);el.title=action;return el;
  }
  function minColumn(id){return id==='projects'||id==='actions'?5:3;}
  function breakpointColumns(){return window.matchMedia('(max-width:720px)').matches?2:
    window.matchMedia('(max-width:1120px)').matches?6:12;}
  function viewDims(id){
    const d=state.dims[id]||{w:6,h:4},bp=breakpointColumns();
    if(bp===12)return {w:clamp(d.w,minColumn(id),12),h:d.h};
    if(bp===6)return {w:clamp(Math.ceil(d.w/2),id==='projects'||id==='actions'?4:2,6),h:d.h};
    const mobileDefault=(id==='projects'||id==='actions'||id==='tasks'||d.w>=10)?2:1;
    return {w:clamp(d.m||mobileDefault,id==='projects'||id==='actions'?2:1,2),h:d.h};
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
    content.append(icon,title);
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
  function applyDensity(widget){
    if(!widget || widget.hidden || !widget.isConnected)return;
    const rect=widget.getBoundingClientRect();
    if(rect.width<10||rect.height<10)return;
    const width=rect.width,height=rect.height;
    const mode=zoom?.widget===widget?'expanded':width<285||height<218?'compact':width>=425&&height>=325?'expanded':'standard';
    if(widget.dataset.widgetDensity!==mode)widget.dataset.widgetDensity=mode;
  }
  function scheduleDensities(){
    if(densityFrame)return;
    densityFrame=requestAnimationFrame(()=>{
      densityFrame=0;
      for(const widget of widgets.values())applyDensity(widget);
      updateHubSummaries();
    });
  }
  function personalNode(task){
    const node=document.createElement('section');node.className='ptech-widget ptech-personal-widget';
    node.dataset.widgetId=customId(task);node.setAttribute('aria-label',task.title);
    const content=document.createElement('div');content.className='ptech-personal-body';
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
  // Scroll occurs inside the tile; the resize handle stays pinned to its corner.
  function equipWidget(id,widget){
    if(widget.dataset.ptechEquipped)return;
    widget.dataset.ptechEquipped='true';
    tileObserver?.observe(widget);
    const content=document.createElement('div');content.className='ptech-tile-inner';
    while(widget.firstChild)content.append(widget.firstChild);
    widget.append(content);
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
      state.dims[id]={...old,w:minColumn(id),h:MIN_ROWS,m:(id==='projects'||id==='actions')?2:1};
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
      }else{d.w=clamp(d.w+delta[0]*(breakpointColumns()===6?2:1),minColumn(id),12);}
      d.h=clamp(d.h+delta[1],MIN_ROWS,MAX_ROWS);state.dims[id]=d;
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
    widget.replaceWith(placeholder);
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
    equipWidget(id,widget);save();taskForm.reset();taskForm.hidden=true;
    taskFormToggle.setAttribute('aria-expanded','false');
    pickerOpen=false;render();widget.scrollIntoView({behavior:prefersReducedMotion()?'auto':'smooth',block:'nearest'});
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
        state.hidden=state.hidden.filter(item=>item!==id);pickerOpen=false;render();save();
      });widgetList.append(add);
    }
    if(!available.length)widgetList.append(text('p','ptech-tasks-empty','Sve gotove kockice već su na dashboardu. Možeš napraviti vlastiti zadatak.'));
  }

  for(const [id,widget] of widgets)equipWidget(id,widget);
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
    if(e.target.closest('.ptech-widget-controls,.ptech-widget-resize,.ptech-action-controls,.ptech-action-add,.ptech-action-picker,.ptech-action-picker-item'))return;
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
        state.hidden=state.hidden.filter(x=>x!==id);render(true);save();
      });hiddenTray.append(reveal);
    }
    hiddenTray.hidden=true; // V16.2: the catalog replaces redundant inline hidden-widget buttons.
    resetButton.hidden=!editing;hint.hidden=!editing;
    renderCatalog();renderQuickActions();taskPreviewRender();
    animateReflow(before);
    scheduleDensities();
  }
  function setEdit(value){
    if(zoom)closeZoom();
    editing=Boolean(value)&&Boolean(currentUserId);
    if(!editing){cancelDrag();endResize();pickerOpen=false;actionPickerOpen=false;taskForm.hidden=true;}
    document.body.classList.toggle('ptech-layout-editing',editing);
    button.setAttribute('aria-pressed',String(editing));
    button.textContent=editing?'✓ Gotovo':'✦ Uredi dashboard';
    render();
  }
  button.addEventListener('click',()=>setEdit(!editing));
  showButton.addEventListener('click',()=>{
    if(!editing)return;pickerOpen=!pickerOpen;renderCatalog();
    if(pickerOpen)picker.scrollIntoView({behavior:prefersReducedMotion()?'auto':'smooth',block:'nearest'});
  });
  resetButton.addEventListener('click',()=>{
    if(!window.confirm('Želiš vratiti zadani raspored? Osobni zadaci i njihove oznake bit će uklonjeni iz ovog preglednika.'))return;
    state=cloneDefaults();loadPersonalWidgets();pickerOpen=false;render(true);save();
  });
  window.addEventListener('resize',()=>{if(state){for(const [id,widget]of widgets)renderSizes(id,widget);scheduleDensities();}},{passive:true});
  const nameLabel=document.getElementById('userTop');
  if(nameLabel && typeof MutationObserver==='function')new MutationObserver(updateHubSummaries).observe(nameLabel,{characterData:true,childList:true,subtree:true});

  // V16.4: Real live rearrangement, like the reference video's snapping tile grid.
  // The real widget follows the pointer. Its previous grid footprint becomes a
  // highlighted placeholder; neighbors reflow BEFORE pointer release.
  // No cloned DOM/IDs and no duplicated Supabase listeners.
  function dragOrder(){
    return state.order.filter(id=>widgets.has(id)&&!state.hidden.includes(id));
  }
  function startDrag(event,id){
    if(!editing||!currentUserId||drag||resize||(event.pointerType==='mouse'&&event.button!==0))return;
    const node=widgets.get(id);
    if(!node||node.hidden)return;
    event.preventDefault();event.stopPropagation();
    drag={id,node,handle:event.currentTarget,pointerId:event.pointerId,
      x:event.clientX,y:event.clientY,started:false,placeholder:null,previewIndex:-1,
      pointerX:event.clientX,pointerY:event.clientY,pointerType:event.pointerType,autoScrollFrame:0,originalOrder:dragOrder(),
      originalStyle:{position:node.style.position,left:node.style.left,top:node.style.top,
        width:node.style.width,height:node.style.height,zIndex:node.style.zIndex,
        transform:node.style.transform,pointerEvents:node.style.pointerEvents,
        transition:node.style.transition}};
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch(_){}
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
    d.rect=rect;
    d.offsetX=d.x-rect.left;
    d.offsetY=d.y-rect.top;
    const placeholder=document.createElement('div');
    placeholder.className='ptech-drop-placeholder';
    placeholder.dataset.ptechDropTarget='true';
    placeholder.setAttribute('aria-hidden','true');
    placeholder.style.setProperty('--ptech-span-cols',String(viewDims(d.id).w));
    placeholder.style.setProperty('--ptech-span-rows',String(viewDims(d.id).h));
    placeholder.append(text('span','ptech-drop-placeholder-icon','▦'),
      text('strong','',`Pusti ovdje`),text('small','','Novo mjesto kartice'));
    grid.append(placeholder);
    d.placeholder=placeholder;
    d.node.classList.add('ptech-widget-floating');
    document.body.classList.add('ptech-drag-active');
    // Fixed positioning removes it from CSS grid while retaining the actual DOM.
    d.node.style.setProperty('position','fixed','important');
    d.node.style.setProperty('left',rect.left+'px','important');
    d.node.style.setProperty('top',rect.top+'px','important');
    d.node.style.setProperty('width',rect.width+'px','important');
    d.node.style.setProperty('height',rect.height+'px','important');
    d.node.style.setProperty('z-index','9998','important');
    d.node.style.setProperty('pointer-events','none','important');
    d.node.style.setProperty('transition','none','important');
    d.node.style.setProperty('transform','translate3d(0,0,0)','important');
    const initial=Math.max(0,d.originalOrder.indexOf(d.id));
    const note=document.createElement('div');note.className='ptech-drop-live-status';
    note.setAttribute('role','status');note.setAttribute('aria-live','polite');
    grid.after(note);d.note=note;
    previewDrop(initial);
    d.handle.setAttribute('aria-grabbed','true');
    if(d.pointerType==='touch')d.autoScrollFrame=requestAnimationFrame(touchAutoScroll);
    scheduleDensities();
  }
  function previewDrop(index){
    if(!drag||!drag.started)return;
    const d=drag;
    const others=d.originalOrder.filter(id=>id!==d.id);
    const next=clamp(index,0,others.length);
    if(d.previewIndex===next)return;
    const before=new Map(others.map(id=>[id,widgets.get(id)?.getBoundingClientRect()]));
    const preview=[...others];preview.splice(next,0,d.id);
    for(let i=0;i<preview.length;i++){
      const id=preview[i];
      if(id===d.id)d.placeholder.style.order=String(i);
      else widgets.get(id).style.order=String(i);
    }
    d.previewIndex=next;
    if(d.note)d.note.textContent=`${titles[d.id]||'Kartica'} — pozicija ${next+1} od ${preview.length}`;
    if(prefersReducedMotion())return;
    requestAnimationFrame(()=>{
      if(!drag||drag!==d)return;
      for(const [id,from] of before){
        const node=widgets.get(id);if(!node||!from)continue;
        const to=node.getBoundingClientRect();
        const dx=from.left-to.left,dy=from.top-to.top;
        if((Math.abs(dx)+Math.abs(dy))<3||Math.abs(dy)>1800)continue;
        if(node._ptechLiveFlip)node._ptechLiveFlip.cancel();
        const a=node.animate([{transform:`translate3d(${dx}px,${dy}px,0)`},{transform:'translate3d(0,0,0)'}],
          {duration:230,easing:'cubic-bezier(.17,.85,.22,1)'});
        node._ptechLiveFlip=a;
        a.addEventListener('finish',()=>{if(node._ptechLiveFlip===a)node._ptechLiveFlip=null;},{once:true});
      }
    });
  }
  function bestDropIndex(x,y){
    const d=drag;if(!d)return 0;
    const others=d.originalOrder.filter(id=>id!==d.id);
    if(!others.length)return 0;
    const candidates=others.map((id,index)=>({id,index,node:widgets.get(id)}))
      .filter(item=>item.node&&!item.node.hidden);
    let target=null;
    const el=document.elementFromPoint(x,y)?.closest('[data-widget-id]');
    if(el && el.dataset.widgetId!==d.id){target=candidates.find(item=>item.id===el.dataset.widgetId);}
    if(!target){
      let best=Infinity;
      for(const item of candidates){
        const r=item.node.getBoundingClientRect();
        const dx=Math.max(r.left-x,0,x-r.right),dy=Math.max(r.top-y,0,y-r.bottom);
        // Weighted proximity prevents a very wide card attracting drops from rows below.
        const dist=dx*dx+dy*dy*1.25;
        if(dist<best){best=dist;target=item;}
      }
    }
    if(!target)return others.length;
    const r=target.node.getBoundingClientRect();
    // Large/full-width tiles split along their height. For smaller tiles use
    // horizontal halves, matching the grid's natural left-to-right packing.
    const vertical=r.width>grid.clientWidth*.78 || (r.height>r.width*1.8 && x>r.left+r.width*.15 && x<r.right-r.width*.15);
    const after=vertical?y>r.top+r.height*.5:x>r.left+r.width*.5;
    return target.index+(after?1:0);
  }
  function dragMove(e){
    if(!drag||e.pointerId!==drag.pointerId)return;
    if(!drag.started&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7)return;
    if(!drag.started)beginDrag();
    if(!drag)return;
    e.preventDefault();e.stopPropagation();
    const d=drag;
    d.pointerX=e.clientX;d.pointerY=e.clientY;
    // Keep the tile under the finger; this does not trigger grid reflow.
    d.node.style.setProperty('transform',`translate3d(${e.clientX-d.x}px,${e.clientY-d.y}px,0)`,'important');
    const target=bestDropIndex(e.clientX,e.clientY);
    previewDrop(target);
    // Mobile auto-scroll runs every frame while the finger rests near an edge.
    // Unlike one-shot scrolling, the user can drag through long dashboards.

  }
  function touchAutoScroll(){
    if(!drag||!drag.started||drag.pointerType!=='touch')return;
    const d=drag;
    const upper=95,lower=window.innerHeight-110;
    const dy=d.pointerY<upper?-clamp((upper-d.pointerY)*.23,4,18):
      d.pointerY>lower?clamp((d.pointerY-lower)*.23,4,18):0;
    if(dy){
      const before=window.scrollY;window.scrollBy(0,dy);
      if(window.scrollY!==before)previewDrop(bestDropIndex(d.pointerX,d.pointerY));
    }
    d.autoScrollFrame=requestAnimationFrame(touchAutoScroll);
  }
  function dragEnd(e){
    if(!drag||e.pointerId!==drag.pointerId)return;
    e.preventDefault();e.stopPropagation();
    if(!drag.started){clearDrag();return;}
    const d=drag;
    const others=d.originalOrder.filter(id=>id!==d.id);
    const next=[...others];next.splice(clamp(d.previewIndex,0,others.length),0,d.id);
    const hidden=state.order.filter(id=>!next.includes(id));
    // Restore before final render to avoid a ghost tile remaining on screen.
    clearDrag();
    state.order=[...next,...hidden];
    render(true);save();
  }
  function dragCancel(){cancelDrag();}
  function dragKeydown(e){if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();cancelDrag();}}
  function cancelDrag(){
    if(!drag)return;
    clearDrag();
    render(true);
  }
  function clearDrag(){
    if(!drag)return;
    const d=drag;
    drag=null;
    window.removeEventListener('pointermove',dragMove,true);
    window.removeEventListener('pointerup',dragEnd,true);
    window.removeEventListener('pointercancel',dragCancel,true);
    window.removeEventListener('blur',dragCancel);
    document.removeEventListener('keydown',dragKeydown,true);
    try{if(d.handle.hasPointerCapture?.(d.pointerId))d.handle.releasePointerCapture(d.pointerId);}catch(_){}
    if(d.autoScrollFrame)cancelAnimationFrame(d.autoScrollFrame);
    if(d.started){
      const n=d.node,s=d.originalStyle;
      // Remove overriding inline styles and restore any previously set values.
      for(const [k,v] of Object.entries(s))n.style[k]=v;
      n.classList.remove('ptech-widget-floating');
      d.placeholder?.remove();d.note?.remove();
      document.body.classList.remove('ptech-drag-active');
      d.handle.removeAttribute('aria-grabbed');
      for(const widget of widgets.values()){
        if(widget._ptechLiveFlip){widget._ptechLiveFlip.cancel();widget._ptechLiveFlip=null;}
      }
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
    const minCols=cols===12?minColumn(id):cols===6?
      (id==='projects'||id==='actions'?4:2):(id==='projects'||id==='actions'?2:1);
    const dims=viewDims(id);
    resize={
      id,widget,handle,pointerId:e.pointerId,
      x:e.clientX,y:e.clientY,width:rect.width,height:rect.height,
      cols,colStep,rowStep,colGap,rowGap,minCols,
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
    const minHeight=MIN_ROWS*r.rowStep-r.rowGap;
    const maxHeight=MAX_ROWS*r.rowStep-r.rowGap;
    const width=clamp(r.width+e.clientX-r.x,minWidth,maxWidth);
    const height=clamp(r.height+e.clientY-r.y,minHeight,maxHeight);
    // Move in pixels as the user drags (rather than jumping one grid cell at a time).
    r.widget.style.width=`${width}px`;
    r.widget.style.height=`${height}px`;
    r.nextCols=clamp(Math.round((width+r.colGap)/r.colStep),r.minCols,r.cols);
    r.nextRows=clamp(Math.round((height+r.rowGap)/r.rowStep),MIN_ROWS,MAX_ROWS);
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
      d.w=r.cols===12?r.nextCols:clamp(r.nextCols*2,minColumn(r.id),12);
    }
    d.h=r.nextRows;
    state.dims[r.id]=d;
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
