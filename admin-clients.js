/* PTech Digital Admin V3.3 — Klijenti, zahtjevi i pozivnice.
   Admin privilegije i slanje pozivnica provjeravaju se NA SERVERU. */
(() => {
  "use strict";
  const db = window.supabase.createClient(
    "https://agivwsbczzvvuzszcvxz.supabase.co",
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE"
  );
  const $ = id => document.getElementById(id);
  const escapeHtml = s => String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;")
      .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const initials = name => String(name || "K").trim().split(/\s+/).slice(0,2)
      .map(p => p[0] || "").join("").toUpperCase();
  const dateFmt = d => d ? new Date(d).toLocaleDateString("hr-HR") : "—";
  let allClients = [];
  let allProjects = [];
  let requests = [];
  let busy = false;

  function message(text, error=false) {
    const el = $("clientsNotice");
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle("v33-error",error);
  }
  function status(text) {$("v33StatusLine").textContent=text;}
  function showTab(tab) {
    for (const name of ["Clients","Requests","Invite"]) {
      const selected = name === tab;
      $("panel"+name).hidden = !selected;
      $("tab"+name).classList.toggle("active",selected);
      $("tab"+name).setAttribute("aria-selected",String(selected));
    }
    location.hash = tab === "Requests" ? "zahtjevi" : tab === "Invite" ? "pozivnica" : "klijenti";
    message("");
  }
  for (const t of ["Clients","Requests","Invite"]) {
    $("tab"+t).addEventListener("click",()=>showTab(t));
  }

  async function invoke(action, extra={}) {
    const {data,error} = await db.functions.invoke("ptech-admin-clients", {
      body:{action,...extra}
    });
    if (error) {
      const response = error.context;
      let reason = "Poslužiteljska funkcija nije dostupna. Provjeri Deploy i prijavu.";
      try {
        const body = await response?.json?.();
        if (body?.error) reason = body.error;
      } catch (_) { /* network / non-JSON */ }
      throw new Error(reason);
    }
    if (!data?.success) throw new Error(data?.error || "Operacija nije uspjela.");
    return data;
  }

  function renderClients() {
    const q = $("clientSearch").value.trim().toLocaleLowerCase("hr-HR");
    const filtered = allClients.filter(c => `${c.name} ${c.email||""}`.toLocaleLowerCase("hr-HR").includes(q));
    $("clientCount").textContent = String(allClients.length);
    $("clientsList").innerHTML = filtered.length ? filtered.map(c=>{
      const projects = allProjects.filter(p=>p.user_id===c.id);
      const active = projects.filter(p=>!['završeno','zavrseno'].includes(String(p.status||'').toLowerCase())).length;
      return `<article class="v32-client-card">
        <div class="v32-client-head"><span class="v32-client-avatar" aria-hidden="true">${escapeHtml(initials(c.name))}</span>
          <div class="v32-client-name"><h4>${escapeHtml(c.name)}</h4><p>${escapeHtml(c.email||'E-mail nije dostupan')}</p></div></div>
        <div class="v32-client-meta"><span><b>${projects.length}</b> projekata</span>
          <span><b>${active}</b> aktivnih</span><span>${c.confirmed?'Aktivan račun':'Pozvan / nije potvrđen'}</span></div>
        <div class="v32-client-actions"><button type="button" data-client-detail="${escapeHtml(c.id)}">Detalji klijenta</button>
          <a href="admin-projects.html?client=${encodeURIComponent(c.id)}">Projekti</a>
          <a href="admin-projects.html?newClient=${encodeURIComponent(c.id)}">+ Novi projekt</a></div>
      </article>`;
    }).join('') : '<p class="admin-empty">Nema klijenata za ovaj upit.</p>';
  }

  function renderRequests() {
    const pending = requests.filter(r=>r.status==='pending').length;
    $("pendingRequestsBadge").hidden = !pending;
    $("pendingRequestsBadge").textContent = String(pending);
    const labels = {pending:'Čeka odluku',approved:'Pozivnica poslana',rejected:'Odbijeno'};
    $("registrationRequests").innerHTML = requests.length ? requests.map(r => `
      <article class="v33-request-card">
        <div class="v33-request-main"><div><strong>${escapeHtml(r.email)}</strong>
          <p>${escapeHtml(labels[r.status]||r.status)} · ${dateFmt(r.requested_at)} · ${Number(r.request_count||1)} zahtjev(a)</p></div>
          <span class="v33-status v33-status-${escapeHtml(r.status)}">${escapeHtml(labels[r.status]||r.status)}</span></div>
        ${r.status==='pending'?`<div class="v33-request-actions">
          <button type="button" class="v33-primary-btn" data-approve="${escapeHtml(r.id)}">Odobri i pošalji pozivnicu</button>
          <button type="button" class="v33-danger-btn" data-reject="${escapeHtml(r.id)}">Odbij zahtjev</button>
        </div>`:""}
      </article>`).join('') : '<p class="admin-empty">Trenutačno nema zahtjeva za pristup.</p>';
  }

  function openDetail(id) {
    const c = allClients.find(x=>x.id===id);
    if (!c) return;
    const projects = allProjects.filter(p=>p.user_id===id);
    $("clientDetailTitle").textContent = c.name;
    $("clientDetailContent").innerHTML = `
      <dl class="v33-detail-list"><div><dt>E-mail</dt><dd>${escapeHtml(c.email || 'Nije dostupan')}</dd></div>
      <div><dt>Pristup</dt><dd>${c.confirmed ? 'E-mail je potvrđen' : 'Pozivnica ili potvrda je na čekanju'}</dd></div>
      <div><dt>Ukupno projekata</dt><dd>${projects.length}</dd></div></dl>
      <h4>Povezani projekti</h4><div class="v33-detail-projects">
      ${projects.length?projects.map(p=>`<a href="admin-projects.html?client=${encodeURIComponent(id)}">
          <strong>${escapeHtml(p.name||'Projekt')}</strong><span>${escapeHtml(p.status||'Bez statusa')} · ${Number(p.progress||0)} %</span>
        </a>`).join(''):'<p>Nema projekata.</p>'}</div>
      <div class="v33-detail-links"><a href="admin-projects.html?newClient=${encodeURIComponent(id)}">+ Novi projekt</a>
        <a href="admin-support.html">Otvori podršku</a><a href="admin-documents.html">Dokumenti</a></div>
      <p class="v33-small-note">Pristup i lozinke mijenjaju se samo administratorskim postupkom. Ova stranica ne deaktivira korisničke račune.</p>`;
    $("clientDetailOverlay").hidden = false;
    document.body.classList.add("v33-dialog-open");
    $("closeClientDetail").focus();
  }
  function closeDetail(){ $("clientDetailOverlay").hidden = true; document.body.classList.remove("v33-dialog-open"); }
  $("closeClientDetail").addEventListener("click",closeDetail);
  $("clientDetailOverlay").addEventListener("click",ev=>{if(ev.target===$("clientDetailOverlay"))closeDetail();});
  document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!$("clientDetailOverlay").hidden)closeDetail();});
  $("clientsList").addEventListener("click",ev=>{
    const btn=ev.target.closest("[data-client-detail]");
    if (btn) openDetail(btn.dataset.clientDetail);
  });
  $("clientSearch").addEventListener("input",renderClients);
  $("refreshClients").addEventListener("click",load);
  $("refreshRequests").addEventListener("click",load);

  async function load() {
    status("Učitavanje računa i registracijskih zahtjeva…");
    message("");
    try {
      const {data:{session}} = await db.auth.getSession();
      if (!session) { location.replace("login.html");return; }
      const check = await db.rpc("is_admin_user",{check_user_id:session.user.id});
      if (check.error || check.data!==true) {location.replace("form.html");return;}
      const result = await invoke("list");
      allClients = result.clients || [];
      allProjects = result.projects || [];
      requests = result.requests || [];
      renderClients(); renderRequests();
      status(result.truncated ? "Prikaz je ograničen na prvih 1000 korisnika. Kontaktiraj podršku za paginaciju." :
        `Učitano ${allClients.length} klijenata i ${requests.length} zahtjeva.`);
      const own=await db.from("profiles").select("display_name").eq("id",session.user.id).maybeSingle();
      if (own.data?.display_name && $("adminUserName")) $("adminUserName").textContent=own.data.display_name;
    } catch(err) {console.error(err); status(""); message(err.message,true);}
  }

  async function actionBusy(fn) {
    if (busy) return;
    busy = true;
    document.querySelectorAll("#panelRequests button, #panelInvite button").forEach(el=>el.disabled=true);
    message("");
    try {const confirmation=await fn();await load();if(confirmation)message(confirmation);}
    catch(err) {console.error(err);message(err.message,true);}
    finally {busy=false;document.querySelectorAll("#panelRequests button, #panelInvite button").forEach(el=>el.disabled=false);}
  }
  $("registrationRequests").addEventListener("click",e=>{
    const approve=e.target.closest("[data-approve]");
    const reject=e.target.closest("[data-reject]");
    if (approve) {
      const req=requests.find(r=>r.id===approve.dataset.approve);
      if (!req || !confirm(`Poslati pozivnicu na ${req.email}?`)) return;
      actionBusy(async()=>{await invoke("approve",{requestId:req.id}); showTab("Requests");return "Pozivnica je poslana.";});
    } else if(reject) {
      const req=requests.find(r=>r.id===reject.dataset.reject);
      if (!req || !confirm(`Odbiti zahtjev za ${req.email}?`)) return;
      actionBusy(async()=>{await invoke("reject",{requestId:req.id});showTab("Requests");return "Zahtjev je odbijen.";});
    }
  });
  $("inviteClientForm").addEventListener("submit",e=>{
    e.preventDefault();if(!e.target.reportValidity())return;
    const email=$("inviteClientEmail").value.trim();
    const name=$("inviteClientName").value.trim();
    if (!confirm(`Poslati pozivnicu na ${email}?`)) return;
    actionBusy(async()=>{
      await invoke("invite",{email,name});
      $("inviteClientForm").reset();
      showTab("Invite");
      return `Pozivnica je poslana na ${email}.`;
    });
  });
  const hash=location.hash;
  showTab(hash==="#zahtjevi"?"Requests":hash==="#pozivnica"?"Invite":"Clients");
  load();
})();
