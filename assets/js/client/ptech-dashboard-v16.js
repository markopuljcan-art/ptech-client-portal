/* PTech Digital Client Portal V16.1 - editable client dashboard and customizable quick actions.
 * No external drag/drop dependency and no database changes.
 * Layout preferences are stored per user in this browser (not cloud-synced).
 * Task preview reads ptech_client_tasks through the existing Supabase RLS rules.
 */
(() => {
  'use strict';

  const grid = document.getElementById('ptechDashboardGrid');
  if (!grid) return;
  document.body.classList.add('ptech-dashboard-v16');

  const button = document.getElementById('ptechLayoutEdit');
  const resetButton = document.getElementById('ptechLayoutReset');
  const showButton = document.getElementById('ptechLayoutShow');
  const hint = document.getElementById('ptechLayoutHint');
  const hiddenTray = document.getElementById('ptechHiddenWidgets');
  const taskList = document.getElementById('ptechDashboardTasksList');
  const taskCount = document.getElementById('ptechDashboardTasksCount');
  const taskRefresh = document.getElementById('ptechDashboardTasksRefresh');

  // Existing action nodes keep their original Supabase project handlers.
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
  const actionIds = Object.keys(actionCatalog);
  const actionSlots = new Map();
  let actionPickerOpen = false;
  let actionPicker, actionAddButton, actionCount, emptyActions;


  const titles = {
    projects: 'Aktivni projekti', tasks: 'Moji zadaci',
    actions: 'Brze akcije', messages: 'Nedavne poruke', documents: 'Korisni dokumenti'
  };
  const ids = Object.keys(titles);
  const widgets = new Map(ids.map(id => [id, grid.querySelector(`[data-widget-id="${id}"]`)]));
  if ([...widgets.values()].some(widget => !widget)) return;
  const sizes = ['small', 'medium', 'large'];
  const defaults = {
    order: ['projects','tasks','actions','messages','documents'],
    sizes: {projects:'large',tasks:'medium',actions:'medium',messages:'medium',documents:'medium'},
    hidden: [],
    actionOrder: [...actionIds],
    hiddenActions: ['projects','tasks','documents','profile']
  };

  let currentUserId = null;
  let api = null;
  let editing = false;
  let state = cloneDefaults();
  let tasks = [];
  let taskError = false;
  let taskLoading = false;
  let drag = null;

  function cloneDefaults() {
    return {order:[...defaults.order],sizes:{...defaults.sizes},hidden:[],
      actionOrder:[...defaults.actionOrder],hiddenActions:[...defaults.hiddenActions]};
  }
  function validId(id) {return Object.hasOwn(titles,id);}
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return cloneDefaults();
    const order = Array.isArray(raw.order) ? [...new Set(raw.order.filter(validId))] : [];
    for (const id of ids) if (!order.includes(id)) order.push(id);
    const sizesOut = {...defaults.sizes};
    for (const id of ids) if (sizes.includes(raw.sizes?.[id])) sizesOut[id]=raw.sizes[id];
    const hidden = Array.isArray(raw.hidden) ? raw.hidden.filter(validId) : [];
    const actionOrder = Array.isArray(raw.actionOrder) ?
      [...new Set(raw.actionOrder.filter(id=>Object.hasOwn(actionCatalog,id)))] : [...defaults.actionOrder];
    for (const id of actionIds) if (!actionOrder.includes(id)) actionOrder.push(id);
    const hiddenActions = Array.isArray(raw.hiddenActions) ?
      [...new Set(raw.hiddenActions.filter(id=>Object.hasOwn(actionCatalog,id)))] : [...defaults.hiddenActions];
    return {order,sizes:sizesOut,hidden,actionOrder,hiddenActions};
  }
  function storageKey() {return currentUserId ? `ptech_v16_dashboard_layout_${currentUserId}` : null;}
  function save() {
    try {if(storageKey()) localStorage.setItem(storageKey(),JSON.stringify(state));}
    catch (error) {console.warn('[PTech V16] Spremanje rasporeda nije dostupno:',error);}
  }
  function load() {
    try {const raw=storageKey() && localStorage.getItem(storageKey());return normalize(raw?JSON.parse(raw):null);}
    catch (_) {return cloneDefaults();}
  }
  function text(tag,cls,content) {
    const element = document.createElement(tag);
    if(cls) element.className=cls;
    element.textContent=content;
    return element;
  }
  function makeButton(label,action,cls='') {
    const control = text('button','ptech-widget-tool '+cls,label);
    control.type = 'button';
    control.setAttribute('aria-label',action);
    control.title=action;
    return control;
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

  // Prepend editing controls without changing original markup or dashboard logic.
  for (const [id, widget] of widgets) {
    const controls = document.createElement('div');
    controls.className = 'ptech-widget-controls';
    controls.setAttribute('aria-label',`Uređivanje kartice ${titles[id]}`);
    const move = makeButton('⠿',`Premjesti karticu ${titles[id]}`,'ptech-widget-move');
    move.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight ArrowUp ArrowDown');
    move.addEventListener('pointerdown',e=>startDrag(e,id));
    move.addEventListener('keydown',e=>{
      if(!editing || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      moveOne(id,e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1);
    });
    const left = makeButton('←',`Pomakni ${titles[id]} ranije`);
    left.addEventListener('click',()=>moveOne(id,-1));
    const right = makeButton('→',`Pomakni ${titles[id]} kasnije`);
    right.addEventListener('click',()=>moveOne(id,1));
    const shrink = makeButton('−',`Smanji karticu ${titles[id]}`);
    shrink.addEventListener('click',()=>changeSize(id,-1));
    const grow = makeButton('+',`Povećaj karticu ${titles[id]}`);
    grow.addEventListener('click',()=>changeSize(id,1));
    const hide = makeButton('×',`Sakrij karticu ${titles[id]}`,'ptech-widget-hide');
    hide.addEventListener('click',()=>{
      state.hidden=[...new Set([...state.hidden,id])];render();save();
    });
    controls.append(move,left,right,shrink,grow,hide);
    widget.prepend(controls);
  }

  function moveOne(id,delta) {
    if(!editing) return;
    const visible = state.order.filter(item=>!state.hidden.includes(item));
    const i=visible.indexOf(id),j=i+delta;
    if(i<0 || j<0 || j>=visible.length) return;
    const other=visible[j];
    const ai=state.order.indexOf(id),bi=state.order.indexOf(other);
    [state.order[ai],state.order[bi]]=[state.order[bi],state.order[ai]];
    render();save();
  }
  function changeSize(id,delta) {
    if(!editing) return;
    const i=sizes.indexOf(state.sizes[id]);
    state.sizes[id]=sizes[Math.max(0,Math.min(sizes.length-1,i+delta))];
    render();save();
  }
  function render() {
    for(const [id,widget] of widgets) {
      widget.style.order=String(state.order.indexOf(id));
      widget.dataset.widgetSize=state.sizes[id];
      widget.hidden=state.hidden.includes(id);
      const controls=widget.querySelector('.ptech-widget-controls');
      if(controls) {
        controls.querySelector('[aria-label^="Smanji"]').disabled=state.sizes[id]==='small';
        controls.querySelector('[aria-label^="Povećaj"]').disabled=state.sizes[id]==='large';
      }
    }
    hiddenTray.replaceChildren();
    for(const id of state.hidden) {
      const reveal = text('button','ptech-layout-reveal','+ '+titles[id]);
      reveal.type='button';
      reveal.addEventListener('click',()=>{
        state.hidden=state.hidden.filter(value=>value!==id);
        render();save();
      });
      hiddenTray.appendChild(reveal);
    }
    hiddenTray.hidden=!editing||!state.hidden.length;
    showButton.hidden=!editing;
    showButton.disabled=!state.hidden.length;
    resetButton.hidden=!editing;
    hint.hidden=!editing;
    renderQuickActions();
    taskPreviewRender();
  }
  function setEdit(value) {
    editing=Boolean(value);
    if(!editing) {endDrag();actionPickerOpen=false;}
    document.body.classList.toggle('ptech-layout-editing',editing);
    button.setAttribute('aria-pressed',String(editing));
    button.textContent=editing?'✓ Gotovo':'✦ Uredi raspored';
    render();
  }
  button.addEventListener('click',()=>setEdit(!editing));
  resetButton.addEventListener('click',()=>{
    if(!window.confirm('Želiš vratiti zadani raspored kartica i brzih akcija?')) return;
    state=cloneDefaults();render();save();
  });
  showButton.addEventListener('click',()=>{
    hiddenTray.hidden=false;
    hiddenTray.scrollIntoView({behavior:'smooth',block:'nearest'});
  });

  // Pointer drag: works with mouse, touch and stylus; arrow buttons are fallback.
  function startDrag(event,id) {
    if(!editing || !currentUserId || event.button!==0 || drag) return;
    const handle=event.currentTarget;
    drag={id,handle,pointerId:event.pointerId,x:event.clientX,y:event.clientY,started:false,target:null};
    handle.setPointerCapture?.(event.pointerId);
    handle.addEventListener('pointermove',dragMove);
    handle.addEventListener('pointerup',dragEnd);
    handle.addEventListener('pointercancel',dragEnd);
  }
  function dragMove(e) {
    if(!drag || e.pointerId!==drag.pointerId) return;
    if(!drag.started && Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7) return;
    drag.started=true;
    e.preventDefault();
    widgets.get(drag.id)?.classList.add('ptech-widget-dragging');
    for(const widget of widgets.values()) widget.classList.remove('ptech-widget-target');
    const hovered=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-widget-id]');
    const target=hovered?.dataset.widgetId;
    if(target && target!==drag.id && !state.hidden.includes(target)) {
      drag.target=target;
      hovered.classList.add('ptech-widget-target');
    } else drag.target=null;
  }
  function dragEnd(e) {
    if(!drag || (e && e.pointerId!==drag.pointerId)) return;
    const {id,target}=drag;
    endDrag();
    if(!target || target===id) return;
    const next=state.order.filter(item=>item!==id);
    next.splice(next.indexOf(target),0,id);
    state.order=next;
    render();save();
  }
  function endDrag() {
    if(!drag)return;
    const {handle,pointerId}=drag;
    try {if(handle.hasPointerCapture?.(pointerId))handle.releasePointerCapture(pointerId);} catch (_){}
    handle.removeEventListener('pointermove',dragMove);
    handle.removeEventListener('pointerup',dragEnd);
    handle.removeEventListener('pointercancel',dragEnd);
    for(const widget of widgets.values()) widget.classList.remove('ptech-widget-dragging','ptech-widget-target');
    drag=null;
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
    const size=state.sizes.tasks;
    const limit=size==='small'?1:size==='medium'?3:6;
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
      if(typeof userId!=='string'||!userId || !client)return;
      if(currentUserId!==userId){
        currentUserId=userId;
        api=client;
        state=load();
        button.disabled=false;
        setEdit(false);
      }
      refreshTasks();
    }
  };
  // Ako getSession() zavrsi prije nego sto se ucita ova deferred skripta,
  // nadoknadi inicijalizaciju pomocu vec postojecih varijabli dashboarda.
  if (typeof currentSession !== 'undefined' && currentSession?.user?.id &&
      typeof supabaseClient !== 'undefined') {
    window.PTechDashboardV16.setUser(currentSession.user.id,supabaseClient);
  }
  render();
})();
