/* PTech Digital Client Portal V16.2 - Control Center grid and personal widgets.
 * Safe: project-related operations stay in original script.js; Supabase tasks
 * are read only through existing RLS. Layout and personal notes are local to
 * the signed-in user's browser and are never stored in Supabase.
 */
(() => {
  'use strict';
  const grid = document.getElementById('ptechDashboardGrid');
  if (!grid) return;
  document.body.classList.add('ptech-dashboard-v16', 'ptech-dashboard-v162');
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
  let drag=null,resize=null;
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
    catch(e){console.warn('[PTech V16.2] Raspored nije spremljen',e);}}
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
    const counter=widget.querySelector('.ptech-widget-dimensions');
    if(counter)counter.textContent=`${d.w} × ${d.h}`;
  }
  function hubNode(id,meta){
    const node=document.createElement('section');node.className='ptech-widget ptech-hub-widget';
    node.dataset.widgetId=id;node.setAttribute('aria-label',meta.title);
    const content=document.createElement('div');content.className='ptech-hub-body';
    const icon=text('span','ptech-hub-icon',meta.icon);icon.setAttribute('aria-hidden','true');
    content.append(icon,text('h2','',meta.title),text('p','',meta.detail));
    const link=text('a','ptech-hub-link','Otvori →');link.href=meta.href;
    content.append(link);node.append(content);return node;
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
        widgets.delete(id);widget.remove();
      }else if(!state.hidden.includes(id))state.hidden.push(id);
      render();save();
    });
    controls.append(handle,label,prev,next,hide);
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
    widget.append(controls,grip);
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
    for(const [id,node] of [...widgets])if(id.startsWith('personal-')){node.remove();widgets.delete(id);delete titles[id];}
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
  }
  function setEdit(value){
    editing=Boolean(value)&&Boolean(currentUserId);
    if(!editing){endDrag();endResize();pickerOpen=false;actionPickerOpen=false;taskForm.hidden=true;}
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
  window.addEventListener('resize',()=>{if(state)for(const [id,widget]of widgets)renderSizes(id,widget);},{passive:true});

  function startDrag(event,id){
    if(!editing||!currentUserId||event.button!==0||drag||resize)return;
    event.preventDefault();
    const handle=event.currentTarget;
    drag={id,handle,pointerId:event.pointerId,x:event.clientX,y:event.clientY,target:null,started:false,ghost:null};
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener('pointermove',dragMove);
    handle.addEventListener('pointerup',dragEnd);
    handle.addEventListener('pointercancel',dragEnd);
  }
  function dragMove(e){
    if(!drag||e.pointerId!==drag.pointerId)return;
    if(!drag.started&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return;
    if(!drag.started){
      drag.started=true;
      widgets.get(drag.id)?.classList.add('ptech-widget-dragging');
      const ghost=text('div','ptech-drag-ghost',titles[drag.id]);document.body.append(ghost);drag.ghost=ghost;
    }
    e.preventDefault();
    drag.ghost.style.left=`${e.clientX+13}px`;drag.ghost.style.top=`${e.clientY+13}px`;
    for(const node of widgets.values())node.classList.remove('ptech-widget-target');
    const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-widget-id]');
    const target=el?.dataset.widgetId;
    drag.target=target&&target!==drag.id&&!state.hidden.includes(target)?target:null;
    if(drag.target)el.classList.add('ptech-widget-target');
  }
  function dragEnd(e){
    if(!drag||(e&&e.pointerId!==drag.pointerId))return;
    const {id,target}=drag;endDrag();
    if(!target)return;
    const order=state.order.filter(x=>x!==id);order.splice(order.indexOf(target),0,id);
    state.order=order;render(true);save();
  }
  function endDrag(){
    if(!drag)return;const {handle,pointerId,ghost}=drag;
    try{if(handle.hasPointerCapture?.(pointerId))handle.releasePointerCapture(pointerId);}catch(_){}
    handle.removeEventListener('pointermove',dragMove);handle.removeEventListener('pointerup',dragEnd);
    handle.removeEventListener('pointercancel',dragEnd);
    ghost?.remove();for(const node of widgets.values())node.classList.remove('ptech-widget-dragging','ptech-widget-target');
    drag=null;
  }
  function startResize(e,id){
    if(!editing||!currentUserId||e.button!==0||resize||drag)return;
    e.preventDefault();e.stopPropagation();
    const handle=e.currentTarget,el=widgets.get(id),d=viewDims(id);
    const rect=grid.getBoundingClientRect(),gap=parseFloat(getComputedStyle(grid).columnGap)||14;
    const cols=breakpointColumns(),colWidth=(rect.width-gap*(cols-1))/cols+gap;
    const rowHeight=parseFloat(getComputedStyle(grid).gridAutoRows)||68;
    const rowStep=rowHeight+(parseFloat(getComputedStyle(grid).rowGap)||gap);
    resize={id,handle,pointerId:e.pointerId,x:e.clientX,y:e.clientY,w:d.w,h:d.h,cols,colWidth,rowStep,changed:false};
    el.classList.add('ptech-widget-resizing');
    handle.setPointerCapture?.(e.pointerId);
    handle.addEventListener('pointermove',resizeMove);handle.addEventListener('pointerup',resizeEnd);
    handle.addEventListener('pointercancel',resizeEnd);
  }
  function resizeMove(e){
    if(!resize||resize.pointerId!==e.pointerId)return;
    e.preventDefault();
    const r=resize,cols=r.cols;
    const min=cols===12?minColumn(r.id):cols===6?(r.id==='projects'||r.id==='actions'?4:2):(r.id==='projects'||r.id==='actions'?2:1);
    const nextCol=clamp(r.w+Math.round((e.clientX-r.x)/r.colWidth),min,cols);
    const nextRow=clamp(r.h+Math.round((e.clientY-r.y)/r.rowStep),MIN_ROWS,MAX_ROWS);
    if(nextCol===r.w&&nextRow===r.h&&!r.changed)return;
    const d=state.dims[r.id]||{w:6,h:4};
    if(cols===2)d.m=nextCol;
    else d.w=cols===12?nextCol:clamp(nextCol*2,minColumn(r.id),12);
    d.h=nextRow;state.dims[r.id]=d;
    renderSizes(r.id,widgets.get(r.id));
    r.changed=true;
  }
  function resizeEnd(e){if(!resize||(e&&e.pointerId!==resize.pointerId))return;endResize();render();save();}
  function endResize(){
    if(!resize)return;const {id,handle,pointerId}=resize;
    try{if(handle.hasPointerCapture?.(pointerId))handle.releasePointerCapture(pointerId);}catch(_){}
    handle.removeEventListener('pointermove',resizeMove);handle.removeEventListener('pointerup',resizeEnd);
    handle.removeEventListener('pointercancel',resizeEnd);
    widgets.get(id)?.classList.remove('ptech-widget-resizing');resize=null;
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
    const limit=Math.max(1,Math.min(9,Math.floor((dims.h-1)*1.5)));
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
