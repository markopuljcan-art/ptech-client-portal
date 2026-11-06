/* PTech Digital · Client Portal · V14.2
 * Stvarni pregled datoteke iz project_designs + Storage project-designs.
 * Odobrenje: design_approvals. Zahtjev za izmjenu: design_revision_messages.
 * Nema demo slika ni automatskih promjena projekta.
 */
(() => {
  "use strict";

  const SUPABASE_URL = "https://agivwsbczzvvuzszcvxz.supabase.co";
  const SUPABASE_KEY = "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";
  const $ = (id) => document.getElementById(id);
  const ui = {
    projectTitle: $("approveProjectTitle"), projectName: $("approveProjectName"), projectStatus: $("approveProjectStatus"),
    projectPackage: $("approveProjectPackage"), projectDeadline: $("projectDeadline"), back: $("backToProject"),
    designDate: $("designDate"), approvalState: $("approvalState"), previewTag: $("previewTag"),
    preview: $("designPreview"), designInfo: $("designInfo"), fileName: $("designFileName"),
    previewLink: $("openDesignPreview"), zoomIn: $("zoomIn"), zoomOut: $("zoomOut"), zoomReset: $("zoomReset"),
    approve: $("approveDesignButton"), revision: $("requestRevisionButton"), message: $("approvalMessage"),
    comment: $("revisionMessage"), counter: $("revisionCharCount"), history: $("revisionHistoryLink"),
    theme: $("themeToggle"), dialog: $("confirmApprovalDialog"), cancel: $("cancelApproval"), confirm: $("confirmApproval")
  };

  const urlProjectId = new URLSearchParams(window.location.search).get("id");
  const projectId = urlProjectId && /^\d+$/.test(urlProjectId) && Number(urlProjectId) > 0 ? Number(urlProjectId) : null;
  let client = null;
  let session = null;
  let project = null;
  let currentDesign = null;
  let image = null;
  let zoom = 1;
  let isBusy = false;
  let isApproved = false;
  let canApprove = false;
  let previewReady = false;
  let approvalCheckPassed = false;

  function themeApply(theme) {
    const light = theme !== "dark";
    document.body.classList.toggle("light-mode", light);
    if (ui.theme) ui.theme.checked = light;
    try { localStorage.setItem("theme", light ? "light" : "dark"); } catch (_) {}
  }
  try { themeApply(localStorage.getItem("theme") === "dark" ? "dark" : "light"); }
  catch (_) { themeApply("light"); }
  ui.theme?.addEventListener("change", () => themeApply(ui.theme.checked ? "light" : "dark"));

  function dateLabel(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return "—";
    return new Intl.DateTimeFormat("hr-HR", {day:"2-digit",month:"2-digit",year:"numeric"}).format(d);
  }
  function fileLabel(path) {
    const s = String(path || "").split("/").pop() || "Datoteka dizajna";
    try { return decodeURIComponent(s); } catch (_) { return s; }
  }
  function statusText(value) { return String(value || "").trim().toLowerCase(); }
  function showMessage(text, type = "error") {
    ui.message.hidden = false;
    ui.message.className = "approval-message " + type;
    ui.message.textContent = text;
    ui.message.setAttribute("role", type === "error" ? "alert" : "status");
  }
  function clearMessage() { ui.message.hidden = true; ui.message.textContent = ""; }
  function setState(text) { ui.approvalState.textContent = text; }
  function setBusy(busy) {
    isBusy = !!busy;
    ui.approve.disabled = isBusy || !canApprove || isApproved;
    ui.revision.disabled = isBusy || !currentDesign || isApproved;
    ui.comment.disabled = isBusy || !currentDesign || isApproved;
    ui.approve.setAttribute("aria-busy", isBusy ? "true" : "false");
    ui.revision.setAttribute("aria-busy", isBusy ? "true" : "false");
  }
  function disableAll() { canApprove = false; setBusy(false); }
  function approvedState() {
    approvalCheckPassed = true;
    isApproved = true;
    canApprove = false;
    setState("Dizajn odobren");
    ui.previewTag.textContent = "Odobreno";
    ui.previewTag.className = "preview-tag approved";
    ui.approve.querySelector("strong").textContent = "Dizajn odobren";
    ui.approve.querySelector("small").textContent = "Ova verzija je potvrđena";
    setBusy(false);
  }
  function pendingState() {
    approvalCheckPassed = true;
    isApproved = false;
    canApprove = !!currentDesign && previewReady;
    setState("Čeka tvoju odluku");
    ui.previewTag.textContent = "Čeka pregled";
    ui.previewTag.className = "preview-tag";
    ui.approve.querySelector("strong").textContent = "Odobri dizajn";
    ui.approve.querySelector("small").textContent = "Potvrdi i nastavi izradu";
    setBusy(false);
  }

  function showLoading() {
    ui.preview.setAttribute("aria-busy", "true");
    ui.preview.innerHTML = '<div class="preview-loading" aria-hidden="true"><div class="preview-loading-bar"></div><div class="preview-loading-box"></div><div class="preview-loading-footer"></div></div>';
    ui.designInfo.textContent = "Dohvaćam posljednju dostavljenu datoteku…";
    ui.previewLink.hidden = true;
  }
  function showEmpty(text, heading = "Dizajn još nije dostavljen") {
    previewReady = false; approvalCheckPassed = false;
    disableAll(); image = null; currentDesign = null;
    ui.preview.setAttribute("aria-busy", "false");
    const empty = document.createElement("div");
    empty.className = "empty-preview";
    empty.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="9" width="34" height="28" rx="4"/><path d="m12 31 10-11 7 7 6-6 6 7M17 17h.01M17 42h14"/></svg>';
    const title = document.createElement("strong"); title.textContent = heading;
    const sub = document.createElement("span"); sub.textContent = text;
    empty.append(title, sub);
    ui.preview.replaceChildren(empty);
    ui.previewTag.textContent = "Nije dostupno";
    ui.designInfo.textContent = "Nema datoteke za pregled";
    ui.previewLink.hidden = true;
    ui.fileName.textContent = "Datoteka nije dostavljena";
    ui.designDate.textContent = "—";
    setState("Čeka dostavu");
    updateZoomControls();
  }

  function updateZoomControls() {
    const available = !!image;
    ui.zoomIn.disabled = !available || zoom >= 2;
    ui.zoomOut.disabled = !available || zoom <= 0.75;
    ui.zoomReset.disabled = !available;
    ui.zoomReset.textContent = Math.round(zoom * 100) + "%";
    if (image) image.style.transform = `scale(${zoom})`;
  }
  function zoomTo(next) { zoom = Math.max(0.75, Math.min(2, Math.round(next * 4) / 4)); updateZoomControls(); }
  ui.zoomIn.addEventListener("click", () => zoomTo(zoom + .25));
  ui.zoomOut.addEventListener("click", () => zoomTo(zoom - .25));
  ui.zoomReset.addEventListener("click", () => zoomTo(1));
  ui.comment.addEventListener("input", () => { ui.counter.textContent = ui.comment.value.length + " / 500"; });

  function renderProject(p) {
    project = p;
    ui.projectTitle.textContent = p.type || p.name || "Projekt";
    ui.projectName.textContent = p.name && p.name !== p.type ? p.name : "";
    ui.projectStatus.textContent = p.status || "—";
    ui.projectStatus.className = "approve-status" + (/zavr/i.test(statusText(p.status)) ? " finished" : "");
    ui.projectPackage.textContent = p.package || "—";
    ui.projectDeadline.textContent = dateLabel(p.deadline);
    ui.back.href = `project.html?id=${encodeURIComponent(p.id)}`;
  }

  function markPreviewReady() {
    previewReady = true;
    ui.preview.setAttribute("aria-busy", "false");
    if (approvalCheckPassed && !isApproved && currentDesign) {
      canApprove = true;
      setBusy(false);
    }
  }

  async function renderFile(design) {
    const { data, error } = await client.storage.from("project-designs").createSignedUrl(design.file_path, 3600);
    if (error || !data?.signedUrl) {
      showEmpty("Pregled datoteke trenutačno nije dostupan. Pokušaj ponovno kasnije ili kontaktiraj podršku.", "Datoteka se ne može otvoriti");
      return false;
    }
    const signedUrl = data.signedUrl;
    const path = String(design.file_path || "");
    const pdf = /\.pdf(?:\?.*)?$/i.test(path);
    const visualImage = /\.(?:png|jpe?g|webp|gif|avif)(?:\?.*)?$/i.test(path);
    if (!pdf && !visualImage) {
      showEmpty("Ovaj format nije podržan za pregled u portalu. Obrati se podršci za preglednu verziju.", "Nepodržan format datoteke");
      return false;
    }
    currentDesign = design;
    previewReady = false; approvalCheckPassed = false;
    zoom = 1; image = null;
    const wrapper = document.createElement("div");
    wrapper.className = "design-image-wrapper";
    if (pdf) {
      const iframe = document.createElement("iframe");
      iframe.className = "design-pdf";
      iframe.title = "Dostavljeni PDF dizajn";
      iframe.addEventListener("load", () => markPreviewReady(), {once:true});
      iframe.src = signedUrl;
      wrapper.append(iframe);
      ui.preview.setAttribute("aria-busy", "true");
    } else {
      image = document.createElement("img");
      image.alt = "Dostavljeni dizajn projekta " + (project?.type || project?.name || "");
      image.className = "design-image";
      image.decoding = "async";
      image.addEventListener("load", () => markPreviewReady(), {once:true});
      image.addEventListener("error", () => {
        showEmpty("Slika nije dostupna za prikaz. Obrati se podršci.", "Pogreška pri otvaranju slike");
      }, {once:true});
      image.src = signedUrl;
      wrapper.append(image);
      ui.preview.setAttribute("aria-busy", "true");
    }
    ui.preview.replaceChildren(wrapper);
    ui.fileName.textContent = fileLabel(path);
    ui.fileName.title = fileLabel(path);
    ui.designDate.textContent = dateLabel(design.created_at);
    ui.previewLink.href = signedUrl;
    ui.previewLink.hidden = false;
    ui.designInfo.textContent = "Prikazana je najnovija datoteka koju je dostavio PTech Digital.";
    ui.history.href = `revision.html?id=${encodeURIComponent(project.id)}&design=${encodeURIComponent(design.id)}`;
    ui.history.hidden = false;
    updateZoomControls();
    return true;
  }

  async function loadStatus(design) {
    const { data, error } = await client.from("design_approvals")
      .select("id,status,design_id,approved_at")
      .eq("project_id", project.id).eq("user_id", session.user.id)
      .eq("design_id", design.id).maybeSingle();
    if (error) {
      disableAll(); setState("Provjera odobrenja nije dostupna");
      showMessage("Ne mogu provjeriti je li dizajn već odobren. Pokušaj ponovno učitati stranicu.");
      return;
    }
    if (data?.status === "approved" || statusText(design.status) === "approved") approvedState();
    else pendingState();
  }

  async function loadPage() {
    showLoading(); disableAll(); clearMessage();
    if (!projectId) {
      showEmpty("Vrati se na Početnu i otvori projekt putem opcije Odobri dizajn.", "Projekt nije odabran");
      showMessage("Nedostaje oznaka projekta u poveznici.");
      return;
    }
    if (!window.supabase?.createClient) {
      showEmpty("Nije moguće učitati vezu s portalom. Provjeri internetsku vezu i osvježi stranicu.", "Veza nije dostupna");
      return;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    try {
      const authResult = await client.auth.getSession();
      session = authResult.data?.session;
      if (authResult.error || !session?.user?.id) { window.location.assign("login.html"); return; }
      const {data:p, error:projectError} = await client.from("projects")
        .select("id,type,name,status,user_id,package,deadline").eq("id",projectId).maybeSingle();
      if (projectError || !p || (p.user_id && p.user_id !== session.user.id)) {
        showEmpty("Ovaj projekt ne postoji ili nemaš pravo pristupa.", "Projekt nije dostupan");
        showMessage("Projekt nije dostupan.");
        return;
      }
      renderProject(p);
      const {data:designs, error:designError} = await client.from("project_designs")
        .select("id,project_id,file_path,status,created_at")
        .eq("project_id",p.id).order("created_at",{ascending:false}).limit(1);
      if (designError) {
        showEmpty("Trenutačno nije moguće dohvatiti predloženi dizajn.", "Pogreška pri učitavanju");
        return;
      }
      if (!designs?.length || !designs[0].file_path) {
        showEmpty("Kada ti PTech Digital dostavi sliku ili PDF dizajna, pojavit će se ovdje.");
        return;
      }
      if (await renderFile(designs[0])) await loadStatus(designs[0]);
    } catch (err) {
      console.error("Greška prilikom otvaranja odobrenja dizajna:", err);
      showEmpty("Pokušaj ponovno osvježiti stranicu.", "Učitavanje nije uspjelo");
      showMessage("Došlo je do pogreške pri dohvaćanju podataka.");
    }
  }

  ui.approve.addEventListener("click", () => {
    if (isBusy || !canApprove || isApproved || !currentDesign) return;
    if (typeof ui.dialog.showModal === "function") ui.dialog.showModal();
    else if (window.confirm("Odobriti dostavljeni dizajn?")) void approveNow();
  });
  ui.cancel.addEventListener("click", () => ui.dialog.close());
  ui.dialog.addEventListener("click", (event) => { if (event.target === ui.dialog) ui.dialog.close(); });
  ui.confirm.addEventListener("click", () => void approveNow());

  async function approveNow() {
    if (isBusy || !canApprove || isApproved || !currentDesign || !session || !project) return;
    if (ui.dialog.open) ui.dialog.close();
    clearMessage(); setBusy(true);
    try {
      const {data:existing, error:readError} = await client.from("design_approvals")
        .select("id,status,design_id").eq("project_id",project.id)
        .eq("user_id",session.user.id).eq("design_id",currentDesign.id).maybeSingle();
      if (readError) throw readError;
      if (existing?.status === "approved") { approvedState(); showMessage("Ova verzija dizajna je već odobrena.", "success"); return; }
      if (existing) {
        throw new Error("Postoji zapis odobrenja s drugim statusom. Obrati se podršci.");
      }
      const {error:saveError} = await client.from("design_approvals").insert({
        project_id:project.id, design_id:currentDesign.id, user_id:session.user.id, status:"approved"
      });
      if (saveError) throw saveError;
      // Ako RLS ne dopušta klijentu promjenu statusa dizajna, zapis u design_approvals ostaje izvor potvrde.
      const {error:updateError} = await client.from("project_designs")
        .update({status:"approved"}).eq("id",currentDesign.id);
      if (updateError) console.warn("Potvrda je zabilježena, ali status dizajna nije ažuriran:", updateError);
      approvedState();
      showMessage("Dizajn je uspješno odobren. Hvala na potvrdi!", "success");
    } catch (error) {
      console.error("Neuspjelo odobrenje dizajna:", error);
      showMessage("Nije moguće spremiti odobrenje. Pokušaj ponovno ili se javi podršci.");
    } finally { setBusy(false); }
  }

  ui.revision.addEventListener("click", async () => {
    if (isBusy || isApproved || !currentDesign || !session || !project) return;
    clearMessage();
    const text = ui.comment.value.trim();
    if (text.length < 3) {
      showMessage("Napiši što želiš promijeniti (najmanje 3 znaka).");
      ui.comment.focus();
      return;
    }
    if (text.length > 500) { showMessage("Komentar može imati najviše 500 znakova."); ui.comment.focus(); return; }
    setBusy(true);
    try {
      const {error} = await client.from("design_revision_messages").insert({
        project_id:project.id, design_id:Number(currentDesign.id), user_id:session.user.id,
        sender_role:"client", message:text
      });
      if (error) throw error;
      ui.comment.value = "";
      ui.counter.textContent = "0 / 500";
      setState("Zahtjev za izmjenu poslan");
      showMessage("Zahtjev za izmjenu je poslan. Komunikaciju možeš pratiti kroz poveznicu 'Otvori razgovor o izmjenama'.", "success");
    } catch (error) {
      console.error("Neuspjelo slanje zahtjeva za izmjenu:", error);
      showMessage("Nije moguće poslati zahtjev. Pokušaj ponovno ili se obrati podršci.");
    } finally { setBusy(false); }
  });

  void loadPage();
})();
