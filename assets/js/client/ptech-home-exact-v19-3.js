/* PTech Digital V19.3 — screenshot-layout home, backed by existing V16 data.
   No Supabase queries, auth code or database logic is replaced here. */
(() => {
  'use strict';
  if (!document.documentElement.classList.contains('ptech-v19')) return;
  const grid = document.getElementById('ptechDashboardGrid');
  const content = document.querySelector('.dashboard-content');
  if (!grid || !content) return;
  const body = document.body;
  const root = document.documentElement;
  const KEY = 'ptech-home-v193-display';
  const safeGet = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const svg = (paths, extra='') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;
  const icons = {
    folder: svg('<path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10H3z"/>'),
    monitor: svg('<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>'),
    check: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>'),
    list: svg('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h1M3 12h1M3 18h1"/>'),
    bolt: svg('<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>'),
    chat: svg('<path d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3l4 3v-3h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/>'),
    pen: svg('<path d="M15 5l4 4M4 20l4.2-.8L19 8.2a2.1 2.1 0 0 0-3-3L5.2 16z"/>'),
    arrows: svg('<path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4"/>'),
    upload: svg('<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>'),
    headset: svg('<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="2" y="13" width="4" height="7" rx="2"/><rect x="18" y="13" width="4" height="7" rx="2"/><path d="M20 20a5 5 0 0 1-5 2h-3"/>'),
    calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    people: svg('<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2M17 5a3 3 0 0 1 0 6m2 9v-2a6 6 0 0 0-3-5"/>'),
    file: svg('<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v6h5M9 13h8m-8 4h8"/>'),
    arrow: svg('<path d="M5 12h14m-6-6 6 6-6 6"/>'),
    download: svg('<path d="M12 3v12m-5-5 5 5 5-5M4 18v3h16v-3"/>'),
    pencil: svg('<path d="m4 20 4.6-1L19 8.6a2.1 2.1 0 0 0-3-3L5.6 16z"/>')
  };

  const markup = `
    <div id="ptechExactHomepage" class="pe-frame" aria-label="Početna PTech Digital portala">
      <div class="pe-hero">
        <div class="pe-hero-copy">
          <p class="pe-overline">DOBRODOŠLI U PTECH DIGITAL</p>
          <h1>Dobar dan, <span id="peFirstName">!</span><span class="pe-exclamation">!</span></h1>
          <p class="pe-subheading">Ovdje pratite svoje projekte, zadatke, komunikaciju i dokumente na jednom mjestu.</p>
        </div>
        <div class="pe-hero-controls"><button type="button" id="pePersonalLayout" class="pe-text-button">Moj raspored</button><button type="button" id="peEditLayout" class="pe-text-button" title="Prilagodi dashboard">${icons.pencil} Uredi</button></div>
      </div>
      <div class="pe-panels">
        <section class="pe-panel pe-projects" aria-labelledby="peProjectsTitle">
          <header class="pe-panel-heading"><span class="pe-heading-icon">${icons.folder}</span><h2 id="peProjectsTitle">AKTIVNI PROJEKTI</h2><div class="pe-project-picker" id="peProjectPicker" hidden><button type="button" id="pePreviousProject" aria-label="Prethodni projekt">‹</button><span id="peProjectPosition">1/1</span><button type="button" id="peNextProject" aria-label="Sljedeći projekt">›</button></div></header>
          <div id="peProjectLoaded" class="pe-project-body" hidden>
            <div class="pe-project-main"><span class="pe-project-symbol">${icons.monitor}</span><div class="pe-project-identity"><strong id="peProjectName">Projekt</strong><span id="peProjectClient">—</span></div><span id="peProjectStatus" class="pe-pill pe-status">—</span><span id="peProjectPackage" class="pe-pill pe-package">—</span><a id="peProjectOpen" class="pe-icon-link" href="my-projects.html" aria-label="Otvori detalje projekta">${icons.arrow}</a></div>
            <div class="pe-progress"><div class="pe-progress-label">Napredak projekta</div><div class="pe-progress-row"><div class="pe-progress-track"><span id="peProgressBar"></span></div><strong id="peProjectProgress">0%</strong></div></div>
            <div class="pe-project-meta"><span>${icons.calendar}<span>Rok isporuke: <strong id="peProjectDue">—</strong></span></span><span>${icons.clock}<span>Zadnje ažuriranje: <strong id="peProjectUpdated">—</strong></span></span></div>
          </div>
          <div id="peProjectEmpty" class="pe-unavailable">Učitavanje projekata...</div>
        </section>
        <section class="pe-panel pe-tasks" aria-labelledby="peTasksTitle"><header class="pe-panel-heading"><span class="pe-heading-icon">${icons.check}</span><h2 id="peTasksTitle">MOJI ZADACI</h2></header>
          <div class="pe-task-center"><div class="pe-task-art" aria-hidden="true">${icons.check}</div><strong id="peTaskHeadline">Učitavanje zadataka...</strong><p id="peTaskDescription">Prikaz obveza za tvoje projekte.</p><a href="tasks.html" class="pe-primary-action">${icons.list} <span id="peTaskButtonText">Pregledaj zadatke</span> ${icons.arrow}</a></div></section>
        <section class="pe-panel pe-actions" aria-labelledby="peActionsTitle"><header class="pe-panel-heading"><span class="pe-heading-icon">${icons.bolt}</span><h2 id="peActionsTitle">BRZE AKCIJE</h2></header><div class="pe-actions-list">
          <button type="button" id="peApprove" class="pe-action"><span class="pe-action-symbol">${icons.pen}</span><span class="pe-action-copy"><strong>Odobri dizajn</strong><small>Pregledaj i odobri predloženi dizajn.</small></span><span class="pe-chevron">›</span></button>
          <button type="button" id="peRevision" class="pe-action"><span class="pe-action-symbol">${icons.arrows}</span><span class="pe-action-copy"><strong>Zatraži izmjenu</strong><small>Pošalji zahtjev za izmjenom.</small></span><span class="pe-chevron">›</span></button>
          <button type="button" id="peMaterials" class="pe-action"><span class="pe-action-symbol">${icons.upload}</span><span class="pe-action-copy"><strong>Dostavi materijale</strong><small>Učitaj potrebne datoteke.</small></span><span class="pe-chevron">›</span></button>
          <a href="messages.html" class="pe-action"><span class="pe-action-symbol">${icons.headset}</span><span class="pe-action-copy"><strong>Kontaktiraj podršku</strong><small>Postavi pitanje našem timu.</small></span><span class="pe-chevron">›</span></a>
        </div></section>
        <section class="pe-panel pe-messages" aria-labelledby="peMessagesTitle"><header class="pe-panel-heading"><span class="pe-heading-icon">${icons.chat}</span><h2 id="peMessagesTitle">NEDAVNE PORUKE</h2></header><div class="pe-recent-item"><span class="pe-recent-symbol pe-people">${icons.people}</span><div class="pe-recent-copy"><strong id="peMessageSender">Učitavanje...</strong><small id="peMessagePreview">Dohvaćanje poruka.</small></div><time id="peMessageDate"></time><span class="pe-unread-dot" id="peMessageDot" hidden></span></div><a class="pe-panel-footer" href="messages.html">Pogledaj sve poruke <span>→</span></a></section>
        <section class="pe-panel pe-documents" aria-labelledby="peDocumentsTitle"><header class="pe-panel-heading"><span class="pe-heading-icon">${icons.folder}</span><h2 id="peDocumentsTitle">DOKUMENTI</h2></header><a class="pe-recent-item pe-document-link" id="peDocumentOpen" href="documents.html"><span class="pe-recent-symbol pe-file">${icons.file}<em id="peDocumentType">DOC</em></span><div class="pe-recent-copy"><strong id="peDocumentName">Učitavanje...</strong><small id="peDocumentDetails">Dohvaćanje dokumenata.</small></div><span class="pe-download-symbol">${icons.download}</span></a><a class="pe-panel-footer" href="documents.html">Pogledaj sve dokumente <span>→</span></a></section>
      </div>
    </div>`;

  function $(id) { return document.getElementById(id); }
  const text = (id, value) => { const node = $(id); if (node && node.textContent !== value) node.textContent = value; };
  const getText = (parent, selector) => parent?.querySelector(selector)?.textContent?.trim() || '';
  function setMode(exact, persist = true) {
    body.classList.toggle('pe-show-exact', exact);
    body.classList.remove('v192-reference-view'); // keep older composition CSS out of the personal editor
    if (persist) { safeSet(KEY, exact ? 'exact' : 'personal'); safeSet('ptech-home-v192-presentation','personal'); }
    const button = $('pePersonalLayout');
    if(button) button.textContent = exact ? 'Moj raspored' : 'Izgled sa slike';
  }
  function renderProjects() {
    const slides = [...document.querySelectorAll('#projectsSlider .project-slide')];
    const position = Math.max(0, (parseInt($('currentProject')?.textContent || '1', 10) || 1) - 1);
    const project = slides[position] || slides[0];
    const card = project?.querySelector('.project-card');
    const empty = $('peProjectEmpty');
    if (!card) {
      $('peProjectLoaded').hidden = true;
      empty.hidden = false;
      const value = $('projectsSlider')?.textContent?.trim() || 'Učitavanje projekata...';
      empty.textContent = value;
      $('peProjectPicker').hidden = true;
      return;
    }
    empty.hidden = true;
    $('peProjectLoaded').hidden = false;
    text('peProjectName', getText(card,'.project-title-wrap h3') || 'Projekt');
    text('peProjectClient', getText(card,'.project-title-wrap p'));
    const status = getText(card,'.status-badge') || '—';
    text('peProjectStatus',status);
    $('peProjectStatus').classList.toggle('pe-status-positive',/tijeku|aktivno|active/i.test(status));
    text('peProjectPackage',getText(card,'.package-name') || '—');
    const pct = getText(card,'.progress-row strong') || '0%';
    text('peProjectProgress',pct);
    $('peProgressBar').style.width = `${Math.max(0,Math.min(100,parseFloat(pct) || 0))}%`;
    text('peProjectDue',getText(card,'.stat-card:nth-child(3) strong') || '—');
    text('peProjectUpdated',getText(card,'.latest-update') || '—');
    const link = card.getAttribute('href');
    $('peProjectOpen').href = (link && /^(?:project\.html\?|\.\/project\.html\?)/.test(link)) ? link : 'my-projects.html';
    $('peProjectPicker').hidden = slides.length <= 1;
    text('peProjectPosition',`${Math.min(position+1,slides.length)}/${slides.length}`);
  }
  function renderTasks() {
    const counter = parseInt($('ptechDashboardTasksCount')?.textContent || '',10);
    const list = $('ptechDashboardTasksList');
    if(!list) return;
    const rows=list.querySelectorAll('.ptech-task-preview-row, .task-row, .task-item');
    if(Number.isFinite(counter) && counter>0) {
      text('peTaskHeadline',counter===1?'Imate 1 otvoreni zadatak':`Imate ${counter} otvorenih zadataka`);
      text('peTaskDescription',rows[0]?.textContent?.replace(/\s+/g,' ').trim().slice(0,125) || 'Pregledaj svoje obveze i rokove.');
      text('peTaskButtonText','Otvori zadatke');
    } else if(counter===0 || /nema dodijeljenih|nema otvorenih|trenutačno nema|trenutno nema/i.test(list.textContent)) {
      text('peTaskHeadline','Nemate otvorenih zadataka');
      text('peTaskDescription','Sve je odrađeno! Trenutno nemate aktivnih zadataka.');
      text('peTaskButtonText','Pregledaj zadatke');
    } else {
      text('peTaskHeadline','Učitavanje zadataka...');
      text('peTaskDescription','Provjeravamo tvoje obveze.');
    }
  }
  function renderMessages() {
    const container = $('recentMessagesList');
    if (!container) return;
    const row = container.querySelector('.overview-row');
    if(!row) {
      text('peMessageSender','PTech Digital tim');
      text('peMessagePreview',container.textContent?.trim() || 'Trenutno nema poruka.');
      text('peMessageDate','');
      $('peMessageDot').hidden = true;
      return;
    }
    const sender=getText(row,'.overview-row-main strong');
    text('peMessageSender',sender==='PTech Digital'?'PTech Digital tim':(sender || 'PTech Digital tim'));
    text('peMessagePreview',getText(row,'.overview-row-main small') || 'Otvori razgovor.');
    text('peMessageDate',getText(row,'.overview-row-date'));
    $('peMessageDot').hidden = true; // no fake unread indicator; backend owns unread state
  }
  function renderDocuments() {
    const container = $('recentDocumentsList');
    if(!container) return;
    const row=container.querySelector('.overview-row');
    if(!row) {
      text('peDocumentName','Dokumenti');
      text('peDocumentDetails',container.textContent?.trim() || 'Trenutno nema dokumenata.');
      text('peDocumentType','DOC');
      $('peDocumentOpen').href='documents.html';
      return;
    }
    const name=getText(row,'.overview-row-main strong') || 'Dokument';
    text('peDocumentName',name);
    const description=getText(row,'.overview-row-main small');
    const date=getText(row,'.overview-row-date');
    text('peDocumentDetails',[description,date].filter(Boolean).join(' · '));
    const extension=name.split('.').pop()?.toUpperCase();
    text('peDocumentType',/^(PDF|DOC|DOCX|PNG|JPG|ZIP)$/.test(extension)?extension.slice(0,3):'FILE');
    // Reuse the already authorized preview URL produced by the existing
    // document loader. Do not create a new signed URL or expose a storage key.
    const sourceUrl=row.getAttribute('href') || '';
    const safeUrl=/^https?:\/\//i.test(sourceUrl) || /^(?:\.\/)?documents\.html(?:[?#]|$)/i.test(sourceUrl);
    $('peDocumentOpen').href=safeUrl?sourceUrl:'documents.html';
    if(safeUrl && /^https?:\/\//i.test(sourceUrl)) {
      $('peDocumentOpen').target='_blank';$('peDocumentOpen').rel='noopener noreferrer';
    } else { $('peDocumentOpen').removeAttribute('target');$('peDocumentOpen').removeAttribute('rel'); }
  }
  function syncActions() {
    const map=[['peApprove','approveDesignAction'],['peRevision','revisionAction'],['peMaterials','materialsAction']];
    for(const [from,to] of map) {
      const source=$(to), target=$(from); if(!source||!target) continue;
      const disabled=source.disabled || source.getAttribute('aria-disabled')==='true' || (source.tagName==='A' && (!source.getAttribute('href') || source.getAttribute('href')==='#'));
      target.disabled=!!disabled;
      target.setAttribute('aria-disabled',String(!!disabled));
      target.title=disabled?'Akcija trenutno nije dostupna za ovaj projekt.':'';
    }
  }
  let pending = false;
  function scheduleSync() {
    if(pending)return;pending=true;
    requestAnimationFrame(()=>{pending=false;renderProjects();renderTasks();renderMessages();renderDocuments();syncActions();
      const name=$('userGreeting')?.textContent?.trim() || '';
      text('peFirstName',name?name.split(/\s+/)[0]:'klijente');
    });
  }
  function init() {
    content.insertAdjacentHTML('afterbegin',markup);
    body.classList.add('ptech-home-exact-v193');
    setMode(safeGet(KEY)!=='personal', false);
    $('pePersonalLayout').addEventListener('click',()=>setMode(false));
    $('peEditLayout').addEventListener('click',()=>{
      setMode(false);
      const edit=$('ptechLayoutEdit');
      if(edit && !edit.disabled) edit.click();
    });
    // In personal view, the original V16 toolbar is available; return through its
    // original switcher, as well as this compact top-bar control.
    const bar=document.querySelector('.ptech-layout-bar');
    if(bar && !$('peBackToReference')) {
      const button=document.createElement('button');button.type='button';button.id='peBackToReference';
      button.className='ptech-layout-button ptech-layout-button-secondary';
      button.textContent='Izgled sa slike';
      button.addEventListener('click',()=>setMode(true));
      bar.querySelector('.ptech-layout-bar-actions')?.prepend(button);
    }
    $('pePreviousProject').addEventListener('click',()=>document.getElementById('previousProjectButton')?.click());
    $('peNextProject').addEventListener('click',()=>document.getElementById('nextProjectButton')?.click());
    [['peApprove','approveDesignAction'],['peRevision','revisionAction'],['peMaterials','materialsAction']].forEach(([from,to])=>{
      $(from).addEventListener('click',()=>{ const source=$(to); if(source && !$(from).disabled)source.click(); });
    });
    const observers=['projectsSlider','currentProject','totalProjects','ptechDashboardTasksList','ptechDashboardTasksCount','recentMessagesList','recentDocumentsList','userGreeting'];
    observers.forEach(id=>{const node=$(id);if(node)new MutationObserver(scheduleSync).observe(node,{childList:true,subtree:true,characterData:true,attributes:id==='projectsSlider',attributeFilter:id==='projectsSlider'?['class']:undefined});});
    // Project dates and action availability update asynchronously, without any
    // added network requests or duplicate Supabase subscriptions.
    const slider=$('projectsSlider'); if(slider){slider.addEventListener('scroll',scheduleSync,{passive:true});}
    const actions=['approveDesignAction','revisionAction','materialsAction'];
    actions.forEach(id=>{const node=$(id);if(node)new MutationObserver(syncActions).observe(node,{attributes:true,attributeFilter:['disabled','href','aria-disabled']});});
    scheduleSync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
