/* PTech Digital Client Portal V21.1 - inline dashboard layout editor.
 * Edits the SAME V21 cards seen on the homepage. Safe by design:
 * - no Supabase writes or schema changes
 * - doesn't modify the original V16 saved layout or custom tasks
 * - saves a small per-user layout preference only in localStorage
 * - V16 advanced editor remains explicitly accessible
 */
(() => {
  'use strict';
  const home = document.getElementById('v21Home');
  if (!home || document.getElementById('v21InlineEditor')) return;
  const body = document.body;
  const $ = id => document.getElementById(id);
  const IDS = ['welcome','projects','tasks','messages','documents','actions'];
  const LABELS = {
    welcome:'Pozdravna kartica', projects:'Aktivni projekti', tasks:'Moji zadaci',
    messages:'Nedavne poruke', documents:'Dokumenti', actions:'Brze akcije'
  };
  const NODES = {
    welcome: home.querySelector('.v21-welcome'),
    projects: home.querySelector('.v21-projects'),
    tasks: home.querySelector('.v21-summary-card[aria-label="Moji zadaci"]'),
    messages: home.querySelector('.v21-summary-card[aria-label="Nedavne poruke"]'),
    documents: home.querySelector('.v21-summary-card[aria-label="Dokumenti"]'),
    actions: home.querySelector('.v21-actions')
  };
  if (IDS.some(id => !NODES[id])) return;
  const DEFAULT = {
    version:1,order:[...IDS],hidden:[],
    sizes:{welcome:{c:12,r:3},projects:{c:12,r:4},tasks:{c:4,r:4},
      messages:{c:4,r:4},documents:{c:4,r:4},actions:{c:12,r:3}}
  };
  const minColumns = id => ['welcome','projects','actions'].includes(id) ? 6 : 3;
  const clamp = (v,lo,hi) => Math.min(hi,Math.max(lo,Math.round(Number(v)||lo)));
  const deep = input => JSON.parse(JSON.stringify(input));
  const safeText = (el,text) => {if (el) el.textContent = text;};
  function normalize(raw) {
    const result=deep(DEFAULT);
    if (!raw || typeof raw !== 'object' || raw.version !== 1) return result;
    const order=Array.isArray(raw.order)?raw.order.filter(id=>IDS.includes(id)):[];
    result.order=[...new Set([...order,...IDS])];
    result.hidden=Array.isArray(raw.hidden)?[...new Set(raw.hidden.filter(id=>IDS.includes(id)&&id!=='welcome'))]:[];
    for (const id of IDS) {
      result.sizes[id]={
        c:clamp(raw.sizes?.[id]?.c??DEFAULT.sizes[id].c,minColumns(id),12),
        r:clamp(raw.sizes?.[id]?.r??DEFAULT.sizes[id].r,2,10)
      };
    }
    return result;
  }
  function accountId() {
    try {return typeof currentSession !== 'undefined' && currentSession?.user?.id ? String(currentSession.user.id):'';}
    catch (_) {return '';}
  }
  const key = id => `ptech_v21_inline_layout_${id}`;
  function read() {
    const user=accountId();if (!user) return null;
    try {const str=localStorage.getItem(key(user));return str?normalize(JSON.parse(str)):null;}
    catch (_) {return null;}
  }
  function removeSaved() {
    const user=accountId();if(!user)return false;
    try {localStorage.removeItem(key(user));return true;} catch (_) {return false;}
  }
  function isDefault(value) {return JSON.stringify(normalize(value))===JSON.stringify(DEFAULT);}
  function write(value) {
    const user=accountId();if (!user) return false;
    try {localStorage.setItem(key(user),JSON.stringify(normalize(value)));return true;}
    catch (_) {return false;}
  }

  // A compact control strip, not the cluttered 60x60 V16 toolbar.
  const toolbar=document.createElement('section');
  toolbar.id='v21InlineEditor';
  toolbar.className='v21-editor-toolbar v21-surface';
  toolbar.hidden=true;
  toolbar.setAttribute('aria-label','Uređivanje početne stranice');
  toolbar.innerHTML=`
    <div class="v21-editor-copy"><strong>Prilagodi svoju početnu</strong>
      <span>Povuci karticu za premještanje ili donji desni kut za promjenu veličine.</span></div>
    <div class="v21-editor-actions">
      <button type="button" id="v21AddCard" class="v21-editor-button">+ Dodaj karticu</button>
      <button type="button" id="v21DefaultLayout" class="v21-editor-button">Vrati raspored</button>
      <button type="button" id="v21AdvancedEdit" class="v21-editor-button v21-editor-advanced" title="Stariji V16 uređivač sa sitnom mrežom i vlastitim zadacima">Napredne opcije</button>
      <button type="button" id="v21CancelEdit" class="v21-editor-button">Odustani</button>
      <button type="button" id="v21SaveEdit" class="v21-editor-button v21-editor-primary">Spremi</button>
    </div>
    <div id="v21CardPicker" class="v21-card-picker" hidden></div>
    <p class="v21-editor-status" id="v21EditorStatus" role="status" aria-live="polite"></p>`;
  home.insertAdjacentElement('beforebegin',toolbar);
  const picker=$('v21CardPicker'),status=$('v21EditorStatus');
  const ghost=document.createElement('div');ghost.className='v21-drag-ghost';ghost.hidden=true;document.body.appendChild(ghost);
  let edit=false,work=null,lastAccount='',move=null,resize=null,highlight=null;

  function mark(id,text){safeText(status,text||`${LABELS[id]}: pozicija ${work.order.indexOf(id)+1} od ${IDS.length}`);}
  function render(config, customized) {
    const state=normalize(config||DEFAULT);
    const grid=Boolean(customized||edit);
    body.classList.toggle('v21-layout-grid',grid);
    body.classList.toggle('v21-layout-editing',edit);
    for (const id of IDS) {
      const el=NODES[id];
      const dims=state.sizes[id];
      el.style.setProperty('--v21-cols',dims.c);
      el.style.setProperty('--v21-rows',dims.r);
      if (grid) el.style.order=String(state.order.indexOf(id)+1);
      else el.style.removeProperty('order');
      el.hidden=state.hidden.includes(id);
      el.classList.toggle('v21-is-hidden',el.hidden);
      el.setAttribute('data-v21-size',`${dims.c}×${dims.r}`);
      const sizeLabel=el.querySelector('.v21-widget-size');
      if (sizeLabel) sizeLabel.textContent=`${dims.c} × ${dims.r}`;
    }
  }
  function refresh() {render(edit?work:read(),Boolean(edit||read()));}
  function cardTools(id) {
    const el=NODES[id];el.classList.add('v21-edit-card');el.dataset.v21Widget=id;
    const tools=document.createElement('div');tools.className='v21-widget-tools';tools.setAttribute('aria-label',`Uredi karticu ${LABELS[id]}`);
    tools.innerHTML=`<button type="button" class="v21-widget-grip" aria-label="Premjesti karticu ${LABELS[id]} povlačenjem" title="Povuci za premještanje"><span aria-hidden="true">⠿</span></button>
      <span class="v21-widget-size" aria-hidden="true"></span>
      <button type="button" data-v21-action="previous" aria-label="Premjesti karticu ${LABELS[id]} ranije" title="Ranije">←</button>
      <button type="button" data-v21-action="next" aria-label="Premjesti karticu ${LABELS[id]} kasnije" title="Kasnije">→</button>
      <button type="button" data-v21-action="narrow" aria-label="Smanji širinu kartice ${LABELS[id]}" title="Uže">−</button>
      <button type="button" data-v21-action="widen" aria-label="Povećaj širinu kartice ${LABELS[id]}" title="Šire">+</button>
      <button type="button" data-v21-action="hide" aria-label="Sakrij karticu ${LABELS[id]}" title="Sakrij">×</button>`;
    const corner=document.createElement('button');corner.className='v21-resize-corner';corner.type='button';
    corner.title=`Povuci donji desni kut za veličinu kartice ${LABELS[id]}`;
    corner.setAttribute('aria-label',corner.title);
    corner.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21 21 9M15 21l6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    // Keep the welcome card visible: it contains the entry point to this editor.
    if (id==='welcome') tools.querySelector('[data-v21-action=hide]')?.remove();
    el.insertBefore(tools,el.firstChild);el.appendChild(corner);
    tools.addEventListener('click',event=>{
      if (!edit||!work) return;
      const button=event.target.closest('[data-v21-action]');if (!button) return;
      const action=button.dataset.v21Action;
      const pos=work.order.indexOf(id);
      if (action==='previous'||action==='next') {
        const target=clamp(pos+(action==='previous'?-1:1),0,work.order.length-1);
        work.order.splice(pos,1);work.order.splice(target,0,id);
      } else if(action==='narrow') work.sizes[id].c=clamp(work.sizes[id].c-1,minColumns(id),12);
      else if(action==='widen') work.sizes[id].c=clamp(work.sizes[id].c+1,minColumns(id),12);
      else if(action==='hide') work.hidden=Array.from(new Set([...work.hidden,id]));
      render(work,true);updatePicker();mark(id,'Promjena je privremena. Klikni Spremi da je sačuvaš.');
    });
    const grip=tools.querySelector('.v21-widget-grip');
    grip.addEventListener('pointerdown',event=>{
      if (!edit||event.button!==0) return;
      move={id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,active:false,target:''};
      grip.setPointerCapture(event.pointerId);event.preventDefault();
    });
    grip.addEventListener('pointermove',event=>{
      if (!move||move.id!==id||event.pointerId!==move.pointerId) return;
      if(!move.active&&Math.hypot(event.clientX-move.startX,event.clientY-move.startY)>7) {
        move.active=true;body.classList.add('v21-dragging');ghost.hidden=false;ghost.textContent=`⠿  ${LABELS[id]}`;
      }
      if(!move.active) return;
      ghost.style.left=`${Math.min(window.innerWidth-200,Math.max(8,event.clientX+15))}px`;
      ghost.style.top=`${Math.max(8,event.clientY+15)}px`;
      const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.v21-edit-card');
      if (highlight&&highlight!==target) highlight.classList.remove('v21-drop-target');
      highlight=target&&target!==NODES[id]&& !target.hidden?target:null;
      highlight?.classList.add('v21-drop-target');
      move.target=highlight?.dataset.v21Widget||'';
    });
    const endMove=event=>{
      if(!move||move.id!==id||(event.pointerId!==undefined&&move.pointerId!==event.pointerId))return;
      if(move.active&&move.target&&work) {
        const before=work.order.indexOf(id),after=work.order.indexOf(move.target);
        work.order.splice(before,1);work.order.splice(after,0,id);
        render(work,true);mark(id,'Kartica je premještena. Klikni Spremi za potvrdu.');
      }
      highlight?.classList.remove('v21-drop-target');highlight=null;
      ghost.hidden=true;move=null;body.classList.remove('v21-dragging');
    };
    grip.addEventListener('pointerup',endMove);
    grip.addEventListener('pointercancel',endMove);
    grip.addEventListener('lostpointercapture',()=>{if(move?.id===id)endMove({});});
    corner.addEventListener('pointerdown',event=>{
      if(!edit||!work||event.button!==0)return;
      const grid=home.getBoundingClientRect();
      const gap=16,cell=(grid.width-gap*11)/12;
      resize={id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,
        startC:work.sizes[id].c,startR:work.sizes[id].r,cell:Math.max(30,cell+gap)};
      corner.setPointerCapture(event.pointerId);body.classList.add('v21-resizing-card');event.preventDefault();
    });
    corner.addEventListener('pointermove',event=>{
      if(!resize||resize.id!==id||resize.pointerId!==event.pointerId)return;
      work.sizes[id].c=clamp(resize.startC+Math.round((event.clientX-resize.startX)/resize.cell),minColumns(id),12);
      work.sizes[id].r=clamp(resize.startR+Math.round((event.clientY-resize.startY)/88),2,10);
      render(work,true);
    });
    const endResize=event=>{
      if(!resize||resize.id!==id||(event.pointerId!==undefined&&resize.pointerId!==event.pointerId))return;
      resize=null;body.classList.remove('v21-resizing-card');mark(id,'Veličina je prilagođena. Klikni Spremi za potvrdu.');
    };
    corner.addEventListener('pointerup',endResize);
    corner.addEventListener('pointercancel',endResize);
    corner.addEventListener('lostpointercapture',()=>{if(resize?.id===id)endResize({});});
    corner.addEventListener('keydown',event=>{
      if(!edit||!work)return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
        event.preventDefault();
        if(event.key==='ArrowUp')work.sizes[id].r=clamp(work.sizes[id].r-1,2,10);
        if(event.key==='ArrowDown')work.sizes[id].r=clamp(work.sizes[id].r+1,2,10);
        if(event.key==='ArrowLeft')work.sizes[id].c=clamp(work.sizes[id].c-1,minColumns(id),12);
        if(event.key==='ArrowRight')work.sizes[id].c=clamp(work.sizes[id].c+1,minColumns(id),12);
        render(work,true);mark(id,`Veličina: ${work.sizes[id].c} stupaca i ${work.sizes[id].r} redaka.`);
      }
    });
  }
  IDS.forEach(cardTools);

  function updatePicker(){
    picker.replaceChildren();
    if(!work)return;
    const hidden=IDS.filter(id=>work.hidden.includes(id));
    if(!hidden.length){picker.append(document.createTextNode('Sve su kartice već prikazane.'));return;}
    for(const id of hidden){const button=document.createElement('button');button.type='button';button.textContent=`+ ${LABELS[id]}`;
      button.addEventListener('click',()=>{work.hidden=work.hidden.filter(item=>item!==id);picker.hidden=true;render(work,true);updatePicker();mark(id,`${LABELS[id]} je ponovno dodana.`);NODES[id].scrollIntoView({behavior:'smooth',block:'nearest'});});
      picker.appendChild(button);
    }
  }
  function exitEdit(keep) {
    edit=false;toolbar.hidden=true;picker.hidden=true;
    if(keep){render(work,true);}
    else{const saved=read();render(saved,Boolean(saved));}
    work=null;ghost.hidden=true;body.classList.remove('v21-dragging','v21-resizing-card');
    $('v21Edit')?.setAttribute('aria-pressed','false');
  }
  function enterEdit(){
    if(body.classList.contains('ptech-layout-editing'))return;
    // Return from the optional legacy personal view before entering modern editing.
    body.classList.remove('ptech-home-personal');
    const previous=read();work=normalize(previous||DEFAULT);edit=true;
    toolbar.hidden=false;render(work,true);updatePicker();
    safeText(status,'Kartice ostaju kao na Početnoj. Promjene se spremaju samo za vaš račun.');
    $('v21Edit')?.setAttribute('aria-pressed','true');
    toolbar.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  window.addEventListener('ptech:v21-edit',enterEdit);
  $('v21AddCard').addEventListener('click',()=>{picker.hidden=!picker.hidden;updatePicker();});
  $('v21CancelEdit').addEventListener('click',()=>exitEdit(false));
  $('v21SaveEdit').addEventListener('click',()=>{
    if(!edit||!work)return;
    if (isDefault(work)) {
      if (!removeSaved()) {safeText(status,'Raspored nije vraćen. Provjeri prijavu i lokalnu pohranu preglednika.');return;}
      exitEdit(false);
      return;
    }
    if(!write(work)) {safeText(status,'Raspored nije spremljen. Provjeri prijavu i dopušta li preglednik lokalno spremanje.');return;}
    exitEdit(true);
  });
  $('v21DefaultLayout').addEventListener('click',()=>{
    if(!edit)return;
    if(!window.confirm('Vratiti zadani raspored Početne? Ovo ne briše zadatke ni V16 raspored.'))return;
    work=deep(DEFAULT);render(work,true);updatePicker();safeText(status,'Vraćen je zadani raspored. Klikni Spremi za potvrdu.');
  });
  $('v21AdvancedEdit').addEventListener('click',()=>{
    if(!edit)return;
    if(!window.confirm('Otvoriti napredni V16 uređivač? Nespremljene promjene ove Početne neće biti zadržane.'))return;
    const advanced=$('ptechLayoutEdit');
    exitEdit(false);
    if(advanced && !advanced.disabled) advanced.click();
    else safeText(status,'Napredni uređivač bit će dostupan nakon učitavanja računa.');
  });

  let appliedAccount='';
  function restore() {
    const user=accountId();
    if(!user||user===appliedAccount||edit)return;
    appliedAccount=user;
    const saved=read();render(saved,Boolean(saved));
  }
  const userLabel=$('userTop');
  if(userLabel)new MutationObserver(restore).observe(userLabel,{subtree:true,childList:true,characterData:true});
  window.addEventListener('pageshow',restore);
  restore();
})();
