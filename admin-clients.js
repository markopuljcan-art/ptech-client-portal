/* PTech Digital Admin Console V3.2 - Klijenti (read-only) */
(() => {
"use strict";
const db = window.supabase.createClient(
    "https://agivwsbczzvvuzszcvxz.supabase.co",
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE"
);
const el = id => document.getElementById(id);
const list = el("clientsList");
const notice = el("clientsNotice");
const search = el("clientSearch");
let clientRows = [];
const escapeHtml = x => String(x ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const showNotice = message => {notice.textContent=message;notice.hidden=false;};
const initials = name => String(name||"K").trim().split(/\s+/).slice(0,2).map(p=>p[0]||"").join("").toUpperCase();
function render() {
    const query = search.value.trim().toLowerCase();
    const rows = clientRows.filter(row => (row.name+" "+row.id).toLowerCase().includes(query));
    el("clientCount").textContent = String(clientRows.length);
    if (!rows.length) {
        list.innerHTML = '<p class="admin-empty">Nema klijenata za ovaj upit.</p>';
        return;
    }
    list.innerHTML = rows.map(row => `
        <article class="v32-client-card">
            <div class="v32-client-head">
                <span class="v32-client-avatar" aria-hidden="true">${escapeHtml(initials(row.name))}</span>
                <div class="v32-client-name"><h4>${escapeHtml(row.name)}</h4>
                    <p>Korisnički račun · ${escapeHtml(row.id.slice(0,8))}…</p></div>
            </div>
            <div class="v32-client-meta"><span><b>${row.total}</b> projekata</span>
                <span><b>${row.active}</b> aktivnih</span></div>
            <div class="v32-client-actions">
                <a href="admin-projects.html?newClient=${encodeURIComponent(row.id)}">+ Novi projekt</a>
                <a href="admin-projects.html?client=${encodeURIComponent(row.id)}">Prikaži projekte</a>
            </div>
        </article>`).join("");
}
async function load() {
    notice.hidden = true;
    list.innerHTML='<div class="admin-empty">Učitavanje klijenata...</div>';
    const {data:{session},error:sessError} = await db.auth.getSession();
    if (sessError || !session) { location.replace("login.html");return; }
    const check = await db.rpc("is_admin_user",{check_user_id:session.user.id});
    if (check.error || check.data!==true) {location.replace("form.html");return;}
    // Prikaži ime administratora i na novoj stranici.
    const ownProfile = await db.from("profiles").select("display_name")
        .eq("id",session.user.id).maybeSingle();
    if (ownProfile.data?.display_name && el("adminUserName")) {
        el("adminUserName").textContent = ownProfile.data.display_name;
    }
    const [profileResult,projectResult] = await Promise.all([
        db.from("profiles").select("id,display_name,role").eq("role","client").order("display_name"),
        db.from("projects").select("id,user_id,status")
    ]);
    if (profileResult.error || projectResult.error) {
        console.error("Admin clients loading",profileResult.error||projectResult.error);
        showNotice("Nije moguće učitati sve klijente. Provjeri administratorske SELECT politike za profiles i projects.");
        list.innerHTML='<div class="admin-empty">Podaci nisu dostupni.</div>';
        return;
    }
    const counts = new Map();
    for (const project of projectResult.data||[]) {
        if (!project.user_id) continue;
        const count=counts.get(project.user_id)||{total:0,active:0};
        count.total++;
        if (!['završeno','zavrseno'].includes(String(project.status||'').trim().toLowerCase())) count.active++;
        counts.set(project.user_id,count);
    }
    clientRows=(profileResult.data||[]).map(profile => ({
        id:profile.id,name:profile.display_name||"Klijent",
        total:counts.get(profile.id)?.total||0,
        active:counts.get(profile.id)?.active||0
    }));
    render();
}
search?.addEventListener("input",render);
el("refreshClients")?.addEventListener("click",load);
load();
})();
