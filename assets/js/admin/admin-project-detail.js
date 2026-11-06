/* PTech Digital V9 | read-only project workspace
   Uses existing Supabase tables & RLS. Never fabricates historical actions.
   Optional status audit requires migration; see UPUTE-V9.txt. */
(() => {
  'use strict';
  const client = window.supabase.createClient(
    'https://agivwsbczzvvuzszcvxz.supabase.co',
    'sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE'
  );
  const $ = (id) => document.getElementById(id);
  const text = (id, value) => { const node = $(id); if (node) node.textContent = String(value ?? '—'); };
  const safe = (value) => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const date = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.valueOf()) ? '—' : d.toLocaleDateString('hr-HR', { day:'2-digit', month:'2-digit', year:'numeric' });
  };
  const time = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.valueOf()) ? '—' : d.toLocaleTimeString('hr-HR', {hour:'2-digit',minute:'2-digit'});
  };
  const statusName = (status) => ({
    pending: 'Čeka odluku', approved: 'Odobreno',
    revision_requested: 'Tražene izmjene'
  })[status] || status || 'Nije određeno';
  const id = new URLSearchParams(window.location.search).get('id');
  const state = { events: [], filter: 'all', expanded: false, queriesFailed: [] };

  function tell(message, type = 'info') {
    const node = $('v9Notice');
    node.hidden = false;
    node.textContent = message;
    node.dataset.state = type;
  }
  async function query(promise, label) {
    try {
      const response = await promise;
      if (response.error) throw response.error;
      return response.data || [];
    } catch (error) {
      console.warn(`PTech V9: ${label} nije dostupan`, error);
      state.queriesFailed.push(label);
      return [];
    }
  }
  function setAnchor(id, link) {
    if ($(id)) $(id).href = link;
  }
  function renderList(id, rows, kind) {
    const node = $(id);
    const names = {
      design: 'Još nema verzija dizajna. Nova verzija pojavit će se ovdje nakon učitavanja.',
      doc: 'Za ovaj projekt još nema učitanih dokumenata.',
      message: 'Nema poruka o izmjenama povezanih s ovim projektom.'
    };
    if (!rows.length) {
      node.innerHTML = `<p class="v9-empty">${names[kind]}</p>`;
      return;
    }
    const cls = kind === 'doc' ? 'file-text' : kind === 'message' ? 'message-square' : 'layers';
    node.innerHTML = rows.slice(0, 9).map(row => {
      const title = kind === 'doc' ? row.fileName
        : kind === 'message' ? (row.sender_role === 'admin' ? 'Odgovor administratora' : 'Poruka klijenta')
        : `Dizajn #${row.id}`;
      const note = kind === 'doc'
        ? `${row.source === 'client' ? 'Poslao klijent' : 'Dodao administrator'} · ${date(row.created_at)}`
        : kind === 'message'
        ? `${date(row.created_at)} u ${time(row.created_at)} · ${String(row.message || '').slice(0, 105)}`
        : `${date(row.created_at)} · Trenutačni status: ${statusName(row.status)}`;
      const tag = kind === 'design' ? statusName(row.status) : kind === 'doc' ? row.category : '';
      return `<div class="v9-list-row"><span class="v9-list-icon" aria-hidden="true">${icon(cls)}</span><div class="v9-list-copy"><strong>${safe(title)}</strong><span>${safe(note)}</span></div>${tag ? `<span class="v9-mini-badge">${safe(tag)}</span>` : ''}</div>`;
    }).join('');
    if (rows.length > 9) {
      node.insertAdjacentHTML('beforeend', `<p class="v9-list-more">Prikazano 9 od ${rows.length} zapisa. Cijeli redoslijed je u Povijesti događaja.</p>`);
    }
  }
  function icon(name) {
    const paths = {
      'file-text': '<path d="M8 2h7l5 5v15H4V2h4Z"/><path d="M15 2v5h5M8 12h8M8 16h8"/>',
      'message-square': '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H7l-4 2v-6.2A8.5 8.5 0 1 1 21 11.5Z"/>',
      layers: '<path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
      activity: '<path d="M2 12h5l3-7 4 14 3-7h5"/>',
      check: '<path d="m4 12 5 5L20 6"/>'
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.activity}</svg>`;
  }
  function makeEvents(project, designs, documents, messages, auditRows) {
    const events = [];
    if (project.created_at) events.push({ key:`project-${project.id}`, type:'project', when:project.created_at,
      title:'Projekt je kreiran', detail:'Početak ovog projekta u PTech Digital portalu.', icon:'calendar' });
    for (const d of designs) events.push({ key:`design-${d.id}`, type:'design', when:d.created_at,
      title:'Učitana verzija dizajna', detail:`Dizajn #${d.id} · trenutačni status: ${statusName(d.status)}`, icon:'layers' });
    for (const d of documents) events.push({ key:`doc-${d.source}-${d.id}`, type:'document', when:d.created_at,
      title:d.source === 'client' ? 'Klijent je učitao dokument' : 'Dodan projektni dokument',
      detail:d.fileName, icon:'file-text' });
    for (const m of messages) events.push({ key:`revision-${m.id}`, type:'message', when:m.created_at,
      title:m.sender_role === 'admin' ? 'Odgovor na zahtjev za izmjene' : 'Poruka o izmjenama od klijenta',
      detail:String(m.message || '').slice(0, 200) || 'Poruka bez teksta', icon:'message-square' });
    for (const a of auditRows) {
      if (!a.created_at) continue;
      events.push({ key:`audit-${a.id}`, type:'status', when:a.created_at,
        title:a.event_type === 'progress_changed' ? 'Promijenjen napredak projekta' : 'Promijenjen status projekta',
        detail:`${a.old_value ?? '—'} → ${a.new_value ?? '—'}`, icon:'activity' });
    }
    const valid = events.filter(e => e.when && !Number.isNaN(new Date(e.when).valueOf()));
    valid.sort((a,b) => new Date(b.when)-new Date(a.when));
    state.events = valid;
    text('v9AllCount', valid.length);
    const perType = { document:'v9DocEvents', design:'v9DesignEvents', message:'v9MessageEvents', status:'v9StatusEvents' };
    for (const [type, elementId] of Object.entries(perType)) text(elementId, valid.filter(e => e.type === type).length);
    renderTimeline();
  }
  function renderTimeline() {
    const host = $('v9ActivityList');
    const subset = state.events.filter(e => state.filter === 'all' || e.type === state.filter);
    const limited = state.expanded ? subset : subset.slice(0, 7);
    if (!subset.length) {
      host.innerHTML = `<div class="v9-empty v9-history-empty">${state.filter === 'all'
        ? 'Za ovaj projekt još nema zabilježenih događaja.'
        : 'Nema zabilježenih događaja u odabranoj kategoriji.'}</div>`;
    } else {
      let prevDay = '';
      host.innerHTML = limited.map(event => {
        const day = date(event.when);
        const group = day !== prevDay ? `<div class="v9-day-label">${safe(day)}</div>` : '';
        prevDay = day;
        return `${group}<article class="v9-history-event v9-event-${event.type}">
          <div class="v9-event-marker">${icon(event.icon)}</div>
          <div class="v9-event-body"><div class="v9-event-top"><strong>${safe(event.title)}</strong><time>${safe(time(event.when))}</time></div><p>${safe(event.detail)}</p></div>
        </article>`;
      }).join('');
    }
    const more = $('v9ShowAll');
    more.hidden = subset.length <= 7;
    more.textContent = state.expanded ? 'Prikaži manje' : `Prikaži sve (${subset.length})`;
    $('v9TimelineHelp').textContent = `Ukupno ${subset.length} događaja u odabranom prikazu. Prikazuju se samo zapisi povezani s ovim projektom.`;
  }
  function setupInteractions() {
    document.querySelectorAll('[data-event-filter]').forEach(button => button.addEventListener('click', () => {
      state.filter = button.dataset.eventFilter;
      state.expanded = false;
      document.querySelectorAll('[data-event-filter]').forEach(x => {
        const active = x === button;
        x.classList.toggle('is-active', active);
        x.setAttribute('aria-pressed', String(active));
      });
      renderTimeline();
    }));
    $('v9ShowAll').addEventListener('click', () => { state.expanded = !state.expanded; renderTimeline(); });
    const sections = [...document.querySelectorAll('[data-v9-section]')];
    const sectionLinks = document.querySelectorAll('.v9-section-nav a[href^="#"]');
    sectionLinks.forEach(anchor => anchor.addEventListener('click', () => {
      sectionLinks.forEach(x => x.classList.toggle('is-active', x === anchor));
    }));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(items => {
        const best = items.filter(x => x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
        if (!best) return;
        sectionLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${best.target.id}`));
      }, {rootMargin:'-165px 0px -50% 0px', threshold:[0,.1,.25]});
      sections.forEach(section => io.observe(section));
    }
  }
  async function main() {
    setupInteractions();
    if (!id || !/^\d+$/.test(id)) { tell('Projekt nije odabran. Vrati se na Projekte i klikni „Prikaži karticu”.','error'); return; }
    const {data:{user}, error:authError} = await client.auth.getUser();
    if (authError || !user) { location.replace('login.html'); return; }
    const {data:isAdmin, error:roleError} = await client.rpc('is_admin_user', {check_user_id:user.id});
    if (roleError || isAdmin !== true) { tell('Ova stranica dostupna je samo administratoru.','error'); return; }
    const {data:project,error:projectError} = await client.from('projects')
      .select('id,name,type,status,progress,created_at,deadline,package,user_id').eq('id', Number(id)).maybeSingle();
    if (projectError || !project) { tell('Projekt nije pronađen ili mu nemaš pravo pristupiti.','error'); return; }
    const projectTitle = project.type || project.name || `Projekt #${project.id}`;
    text('v9Name', projectTitle); text('v9Subtitle', project.name || 'Projekt bez podnaslova');
    text('v9ProjectStatus', project.status || 'Nije određen'); text('v9DateCreated', date(project.created_at));
    text('v9Deadline', date(project.deadline)); text('v9DeadlineDetails', date(project.deadline)); text('v9ProjectIdDetails', project.id); text('v9Type',project.type||'—');
    text('v9Package',project.package||'—'); text('v9Id',project.id);
    const progress = Number.isFinite(Number(project.progress)) ? Math.max(0,Math.min(100,Number(project.progress))) : 0;
    text('v9Progress',`${progress}%`); text('v9ProgressText',`${progress}%`);
    $('v9ProgressBar').style.width = `${progress}%`;
    $('v9ProgressMeter').setAttribute('aria-valuenow',String(progress));
    setAnchor('v9EditLink','admin-projects.html?edit='+encodeURIComponent(project.id));
    setAnchor('v9MessageLink','admin-support.html?client='+encodeURIComponent(project.user_id || ''));
    setAnchor('v9DocsLink','admin-documents.html');
    setAnchor('v9RequestsLink','admin-revisions.html');
    let profileName = 'Klijent';
    if (project.user_id) {
      const {data:profile,error:profileError} = await client.from('profiles').select('display_name')
        .eq('id',project.user_id).maybeSingle();
      if (!profileError) profileName = profile?.display_name || 'Klijent';
    }
    text('v9Client',profileName);

    const [designs,adminDocs,clientDocs,messages] = await Promise.all([
      query(client.from('project_designs').select('id,status,created_at').eq('project_id',project.id).order('created_at',{ascending:false}).limit(200),'project_designs'),
      query(client.from('project_documents').select('id,name,document_type,created_at').eq('project_id',project.id).order('created_at',{ascending:false}).limit(200),'project_documents'),
      query(client.from('client_uploads').select('id,title,original_file_name,category,created_at').eq('project_id',String(project.id)).order('created_at',{ascending:false}).limit(200),'client_uploads'),
      query(client.from('design_revision_messages').select('id,created_at,design_id,sender_role,message').eq('project_id',project.id).order('created_at',{ascending:false}).limit(200),'design_revision_messages')
    ]);
    const documents = [
      ...adminDocs.map(d=>({...d,fileName:d.name||'Projektni dokument',category:d.document_type||'Dokument',source:'admin'})),
      ...clientDocs.map(d=>({...d,fileName:d.original_file_name||d.title||'Klijentski dokument',source:'client'}))
    ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const latest = designs[0];
    text('v9LatestDesign', latest ? `#${latest.id}` : 'Nema verzije');
    text('v9DesignStatus', latest ? statusName(latest.status) : 'Bez dizajna');
    text('v9VersionCount',state.queriesFailed.includes('project_designs')?'—':designs.length);
    text('v9DocumentCount',state.queriesFailed.includes('project_documents')||state.queriesFailed.includes('client_uploads')?'—':documents.length);
    text('v9RevisionCount',state.queriesFailed.includes('design_revision_messages')?'—':messages.length);
    renderList('v9DesignList',designs,'design');
    renderList('v9DocumentList',documents,'doc');
    renderList('v9RevisionList',messages,'message');

    let instruction = 'Pregledaj projektne podatke i sljedeće korake.';
    let action = 'Uredi projekt';
    let actionLink = 'admin-projects.html?edit='+encodeURIComponent(project.id);
    if (designs.length === 0) {
      instruction = 'Za projekt još nema verzije dizajna. Kada je učitaš kroz Zahtjeve za izmjene, pojavit će se ovdje.';
      action = 'Otvori zahtjeve za izmjene'; actionLink = 'admin-revisions.html';
    } else if (latest.status === 'pending') {
      instruction = 'Posljednja verzija čeka odluku klijenta. Njezin trenutačni status vidljiv je u odjeljku Verzije.';
      action = 'Pregledaj verzije'; actionLink = '#v9Designs';
    } else if (latest.status === 'revision_requested') {
      instruction = 'Klijent je zatražio izmjene dizajna. Pregledaj poruke o izmjenama i pripremi novu verziju.';
      action = 'Pregledaj poruke o izmjenama'; actionLink = '#v9Revisions';
    } else if (latest.status === 'approved') {
      instruction = 'Posljednja verzija dizajna je odobrena. Provjeri napredak i sljedeće projektne obveze.';
      action = 'Ažuriraj napredak'; actionLink = 'admin-projects.html?edit='+encodeURIComponent(project.id);
    }
    text('v9NextStepText', instruction);
    text('v9NextStepButton',action);
    setAnchor('v9NextStepButton',actionLink);

    // Audit is optional. Before the SQL migration the table does not exist:
    // that is expected, NOT an application error.
    let audits = [];
    let auditEnabled = false;
    try {
      const { data: auditRows, error: auditError } = await client
        .from('ptech_project_events')
        .select('id,created_at,event_type,old_value,new_value')
        .eq('project_id',project.id)
        .order('created_at',{ascending:false})
        .limit(200);
      if (!auditError) { auditEnabled = true; audits = auditRows || []; }
    } catch (_) { /* history table not installed */ }
    makeEvents(project,designs,documents,messages,audits);
    $('v9StatusNotice').textContent = auditEnabled
      ? 'Promjene statusa uključene su u povijest kada ih sustav zabilježi.'
      : 'Prikazuje se trenutačni status. Starije promjene statusa nisu dostupne bez evidencije promjena.';
    if (state.queriesFailed.length) {
      tell(`Upozorenje: dio podataka nije moguće učitati (${[...new Set(state.queriesFailed)].join(', ')}). Provjeri Supabase dozvole.`, 'warning');
    } else {
      $('v9Notice').hidden = true;
    }
    $('v9Page').hidden = false;
  }
  main().catch(error => {
    console.error('PTech projekt V9:',error);
    tell('Došlo je do pogreške pri učitavanju detalja. Osvježi stranicu ili provjeri prijavu.', 'error');
  });
})();
