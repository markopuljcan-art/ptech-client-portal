"use strict";

/* PTech Digital | Profil V4
   Existing Supabase auth, projects, documents and support flows preserved.
   Push subscriptions and preferences are active; delivery runs through Supabase Edge Functions.
*/
const SUPABASE_URL = "https://agivwsbczzvvuzszcvxz.supabase.co";
const SUPABASE_KEY = "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// Enter ONLY the public VAPID key generated with web-push. Never put the private key here.
const PTECH_VAPID_PUBLIC_KEY = "BCHPYHoWaiLMmcqnDV3TpqrBqHNVmGUrPOvovVvkXoUY4s22q93AXvCdSPPZe2dF8LCKQStdpbCuFB_Hs24MqqQ";
const el = id => document.getElementById(id);
let currentSession = null;
let currentDisplayName = "Klijent";
let profileCreatedISO = null;
let ownedProjects = [];
let supportRealtimeChannel = null;
let previousFocus = null;

const SVG_DOC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5zM15 3v5h4M9 12h6M9 16h6"/></svg>';
const SVG_FOLDER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 2h9v11H3z"/></svg>';
const SVG_UPLOAD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 17v3h16v-3"/></svg>';

function escapeHTML(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function formatDate(value, withTime = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("hr-HR", withTime
        ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
        : { day: "2-digit", month: "2-digit", year: "numeric" });
}
function initials(value) {
    return (String(value || "K").trim().split(/\s+/).slice(0, 2)
        .map(part => part.charAt(0).toLocaleUpperCase("hr-HR")).join("")) || "K";
}
function setText(id, value) { if (el(id)) el(id).textContent = String(value ?? "—"); }
function setStatus(id, message, kind = "") {
    const node = el(id);
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("error", kind === "error");
    node.classList.toggle("success", kind === "success");
}
function setLoading(button, loading) {
    if (!button) return;
    button.disabled = loading;
    button.setAttribute("aria-busy", String(loading));
}

function setupTheme() {
    let theme = "dark";
    try { theme = (localStorage.getItem("theme") || localStorage.getItem("ptech-theme")) === "light" ? "light" : "dark"; } catch (_) {}
    applyTheme(theme);
    el("themeToggle")?.addEventListener("change", event => {
        const next = event.target.checked ? "light" : "dark";
        applyTheme(next);
        try { localStorage.setItem("theme", next); } catch (_) {}
    });
}
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.classList.toggle("light-mode", theme === "light");
    if (el("themeToggle")) el("themeToggle").checked = theme === "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "light" ? "#fffaf5" : "#1b2232";
}
function setupParticles() {
    const container = el("profileParticles");
    if (!container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const positions = [8, 21, 35, 49, 64, 78, 91];
    container.replaceChildren();
    positions.forEach((top, i) => {
        const particle = document.createElement("span");
        particle.className = "profile-particle";
        particle.style.setProperty("--top", `${top}%`);
        particle.style.setProperty("--width", `${72 + (i * 37) % 102}px`);
        particle.style.setProperty("--duration", `${17 + (i * 3) % 7}s`);
        particle.style.setProperty("--delay", `${-3 * i}s`);
        container.appendChild(particle);
    });
}
async function logout() {
    try { await disablePushOnDevice(true); } catch (error) {
        console.warn("Push uređaj nije odjavljen:", error);
        // Do not prevent the user from signing out if push cleanup fails.
    }
    if (supportRealtimeChannel) {
        try { await supabaseClient.removeChannel(supportRealtimeChannel); } catch (error) { console.warn(error); }
        supportRealtimeChannel = null;
    }
    const { error } = await supabaseClient.auth.signOut();
    if (error) { alert("Odjava nije uspjela. Pokušajte ponovno."); return; }
    window.location.href = "login.html";
}
function applyProfile(name, email, created) {
    currentDisplayName = name;
    setText("clientName", name);
    setText("profileName", name);
    setText("profileDisplayName", name);
    setText("profileEmail", email);
    setText("profileEmailRow", email);
    setText("profileAvatar", initials(name));
    setText("profileCreatedAt", formatDate(created));
    setText("profileCreatedAtRow", formatDate(created));
}
async function loadProfile() {
    const user = currentSession.user;
    const { data: profile, error } = await supabaseClient.from("profiles")
        .select("id, display_name, role, created_at")
        .eq("id", user.id).maybeSingle();
    if (error) console.error("Profile fetch:", error);
    const name = profile?.display_name || user.email?.split("@")[0] || "Klijent";
    profileCreatedISO = profile?.created_at || user.created_at;
    applyProfile(name, user.email || "—", profileCreatedISO);
    setText("profileLastSignIn", formatDate(user.last_sign_in_at, true));
    setText("profileEmailVerified", user.email_confirmed_at || user.confirmed_at ? "Potvrđena" : "Nije potvrđena");
}
async function loadProjects() {
    const userId = currentSession.user.id;
    // Created_at is optional: the app still works if the column is not present.
    let response = await supabaseClient.from("projects")
        .select("id, type, name, created_at")
        .eq("user_id", userId);
    if (response.error) {
        console.warn("Projects with dates:", response.error);
        response = await supabaseClient.from("projects")
            .select("id, type, name").eq("user_id", userId);
    }
    if (response.error) {
        console.error("Projects:", response.error);
        setText("profileProjectsCount", "—");
        return;
    }
    ownedProjects = response.data || [];
    setText("profileProjectsCount", ownedProjects.length);
}
function sanitizeMaterialsFolderName(value) {
    return String(value || "klijent").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/g, "") || "klijent";
}
async function loadDocumentsAndActivity() {
    const projectIds = ownedProjects.map(p => p.id);
    const projectLookup = new Map(ownedProjects.map(p => [String(p.id), p]));
    const userId = currentSession.user.id;
    const events = [];
    const projectName = id => {
        const project = projectLookup.get(String(id));
        return project?.name || project?.type || `Projekt ${id}`;
    };
    for (const project of ownedProjects) {
        if (project.created_at) events.push({ date: project.created_at, type: "project", title: "Projekt je kreiran", description: projectName(project.id) });
    }
    if (!projectIds.length) {
        setText("profileDocumentsCount", 0);
        renderActivity(events);
        return;
    }
    const [projectDocs, clientDocs] = await Promise.all([
        supabaseClient.from("project_documents")
            .select("id, name, project_id, created_at", { count: "exact" }).in("project_id", projectIds)
            .order("created_at", { ascending: false }).limit(7),
        supabaseClient.from("client_uploads")
            .select("id, title, original_file_name, project_id, created_at", { count: "exact" })
            .eq("user_id", userId).in("project_id", projectIds)
            .order("created_at", { ascending: false }).limit(7)
    ]);
    if (projectDocs.error) console.error("Project documents:", projectDocs.error);
    if (clientDocs.error) console.error("Client uploads:", clientDocs.error);
    let count = (projectDocs.count || 0) + (clientDocs.count || 0);
    let hasDocumentError = Boolean(projectDocs.error || clientDocs.error);
    for (const doc of projectDocs.data || []) {
        events.push({ date: doc.created_at, type: "document", title: "Dodan projektni dokument", description: `${doc.name || "Dokument"} · ${projectName(doc.project_id)}` });
    }
    for (const doc of clientDocs.data || []) {
        events.push({ date: doc.created_at, type: "upload", title: "Poslan dokument", description: `${doc.title || doc.original_file_name || "Dokument"} · ${projectName(doc.project_id)}` });
    }
    // Match the Dashboard's project-materials storage paths. Failure must not crash Profile.
    const folder = `${sanitizeMaterialsFolderName(currentDisplayName)}--${userId}`;
    const bucket = supabaseClient.storage.from("project-materials");
    const results = await Promise.allSettled(ownedProjects.map(async project => {
        const { data, error } = await bucket.list(`${folder}/projekt-${project.id}`, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
        if (error) throw error;
        return (data || []).filter(file => file.id || file.metadata).map(file => ({
            date: file.created_at || file.updated_at, type: "upload", title: "Dodani materijali",
            description: `${file.name} · ${projectName(project.id)}`
        }));
    }));
    for (const result of results) {
        if (result.status === "fulfilled") {
            count += result.value.length;
            events.push(...result.value);
        } else {
            hasDocumentError = true;
            console.warn("Project materials:", result.reason);
        }
    }
    setText("profileDocumentsCount", hasDocumentError ? "—" : count);
    renderActivity(events);
}
function renderActivity(events) {
    const root = el("profileActivityList");
    if (!root) return;
    const sorted = events.filter(item => item.date && Number.isFinite(new Date(item.date).getTime()))
        .sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    if (!sorted.length) { root.innerHTML = '<p class="activity-empty">Još nema zabilježenih aktivnosti za prikaz.</p>'; return; }
    root.innerHTML = sorted.map(event => {
        const icon = event.type === "project" ? SVG_FOLDER : event.type === "upload" ? SVG_UPLOAD : SVG_DOC;
        return `<article class="activity-item"><span class="activity-icon">${icon}</span><div><strong>${escapeHTML(event.title)}</strong><p>${escapeHTML(event.description)}</p><time datetime="${escapeHTML(event.date)}">${escapeHTML(formatDate(event.date, true))}</time></div></article>`;
    }).join("");
}
function loadNotificationPreferences() {
    const prefs = currentSession.user.user_metadata?.ptech_notification_preferences || {};
    if (el("notifyMessages")) el("notifyMessages").checked = prefs.messages ?? true;
    if (el("notifyProjects")) el("notifyProjects").checked = prefs.projects ?? true;
    if (el("notifyDocuments")) el("notifyDocuments").checked = prefs.documents ?? true;
}
async function saveNotificationPreferences() {
    if (!currentSession) return;
    const button = el("saveNotificationsButton");
    setLoading(button, true);
    setStatus("notificationsStatus", "Spremanje...");
    const preferences = {
        messages: Boolean(el("notifyMessages")?.checked),
        projects: Boolean(el("notifyProjects")?.checked),
        documents: Boolean(el("notifyDocuments")?.checked)
    };
    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            data: { ptech_notification_preferences: preferences }
        });
        if (error) throw error;
        if (data?.user) currentSession.user = data.user;
        setStatus("notificationsStatus", "Postavke obavijesti uspješno su spremljene.", "success");
    } catch (error) {
        console.error("Notification preferences:", error);
        setStatus("notificationsStatus", "Spremanje nije uspjelo. Pokušajte ponovno.", "error");
    } finally { setLoading(button, false); }
}
/* ================================================
   PTECH DIGITAL | PROFILE V4: PUSH DEVICE SUBSCRIPTION
   Server delivery is handled by the deployed Edge Functions.
   Never place the PRIVATE VAPID key here.
================================================ */

let pushRegistrationPromise = null;

function hasPushSupport() {
    return window.isSecureContext && "serviceWorker" in navigator &&
        "PushManager" in window && "Notification" in window;
}

function publicVapidBytes() {
    const key = PTECH_VAPID_PUBLIC_KEY.trim();
    if (!key || key.includes("OVDJE_ZALIJEPI")) {
        throw new Error("Najprije upišite javni VAPID ključ u profile.js.");
    }
    const padding = "=".repeat((4 - (key.length % 4)) % 4);
    const base64 = (key + padding).replace(/-/g, "+").replace(/_/g, "/");
    let bytes;
    try {
        bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    } catch (_) {
        throw new Error("Javni VAPID ključ nije ispravan Base64URL zapis.");
    }
    if (bytes.length !== 65 || bytes[0] !== 4) {
        throw new Error("Javni VAPID ključ nije ispravne duljine.");
    }
    return bytes;
}

function equalPushKeys(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
}

function deviceRegistration() {
    if (!pushRegistrationPromise) {
        pushRegistrationPromise = navigator.serviceWorker.register("./sw.js", {
            scope: "./", updateViaCache: "none"
        }).catch(error => {
            pushRegistrationPromise = null;
            throw error;
        });
    }
    return pushRegistrationPromise;
}

function showPushDeviceState(message, registered = false) {
    setText("pushDeviceState", message);
    const enable = el("enablePushButton");
    const disable = el("disablePushButton");
    if (enable) enable.hidden = registered;
    if (disable) disable.hidden = !registered;
}

async function ownSubscriptionRow(subscription) {
    if (!subscription || !currentSession?.user?.id) return null;
    const { data, error } = await supabaseClient
        .from("ptech_push_subscriptions")
        .select("id")
        .eq("user_id", currentSession.user.id)
        .eq("endpoint", subscription.endpoint)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function refreshPushDeviceState() {
    const enable = el("enablePushButton");
    if (!hasPushSupport()) {
        showPushDeviceState("Push obavijesti nisu dostupne u ovom pregledniku. Na iPhoneu otvorite aplikaciju dodanu na početni zaslon.");
        if (enable) enable.disabled = true;
        return;
    }
    if (Notification.permission === "denied") {
        showPushDeviceState("Obavijesti su blokirane u postavkama uređaja.");
        if (enable) enable.disabled = true;
        return;
    }
    if (!PTECH_VAPID_PUBLIC_KEY || PTECH_VAPID_PUBLIC_KEY.includes("OVDJE_ZALIJEPI")) {
        showPushDeviceState("Potrebno je postaviti javni VAPID ključ.");
        if (enable) enable.disabled = true;
        return;
    }
    try {
        const reg = await deviceRegistration();
        const subscription = await reg.pushManager.getSubscription();
        const ownRow = await ownSubscriptionRow(subscription);
        if (ownRow && Notification.permission === "granted") {
            showPushDeviceState("Obavijesti su uključene na ovom uređaju.", true);
        } else if (subscription && !ownRow) {
            showPushDeviceState("Ovaj uređaj nije povezan s vašim računom. Za uključivanje pritisnite gumb.");
        } else {
            showPushDeviceState("Obavijesti nisu uključene na ovom uređaju.");
        }
        if (enable) enable.disabled = false;
    } catch (error) {
        console.error("Push state:", error);
        showPushDeviceState("Provjera uređaja nije uspjela.");
        setStatus("pushDeviceStatus", "Provjerite internetsku vezu i učitajte stranicu ponovno.", "error");
    }
}

async function enablePushOnDevice() {
    if (!currentSession) return;
    if (!hasPushSupport()) {
        setStatus("pushDeviceStatus", "Ovaj preglednik ne podržava push obavijesti.", "error");
        return;
    }

    let vapidKey;
    try {
        vapidKey = publicVapidBytes();
    } catch (error) {
        setStatus("pushDeviceStatus", error.message, "error");
        return;
    }

    const button = el("enablePushButton");
    setLoading(button, true);
    setStatus("pushDeviceStatus", "Tražimo dopuštenje za obavijesti...");

    try {
        // Important on iPhone: request permission directly within the click flow.
        const permission = Notification.permission === "granted"
            ? "granted" : await Notification.requestPermission();
        if (permission !== "granted") {
            throw new Error("Dopuštenje nije odobreno. Provjerite postavke obavijesti.");
        }

        const reg = await deviceRegistration();
        let subscription = await reg.pushManager.getSubscription();
        if (subscription) {
            const oldKey = subscription.options?.applicationServerKey;
            const oldBytes = oldKey ? new Uint8Array(oldKey) : null;
            // A browser subscription with a different VAPID key must be replaced.
            if (!equalPushKeys(oldBytes, vapidKey)) {
                const unsubscribed = await subscription.unsubscribe();
                if (!unsubscribed) {
                    throw new Error("Stara pretplata se nije mogla ukloniti.");
                }
                subscription = null;
            }
        }
        if (!subscription) {
            subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidKey
            });
        }

        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
            throw new Error("Preglednik nije vratio ispravne push ključeve.");
        }

        // Re-check account to ensure the subscription is not attached to a stale session.
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user || user.id !== currentSession.user.id) {
            throw new Error("Prijava je istekla. Prijavite se ponovno.");
        }

        const { error } = await supabaseClient
            .from("ptech_push_subscriptions")
            .upsert({
                user_id: user.id,
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth_key: json.keys.auth,
                updated_at: new Date().toISOString()
            }, { onConflict: "endpoint" });

        if (error) {
            if (error.code === "23505" || error.code === "42501") {
                throw new Error("Ovaj uređaj može biti povezan s drugim računom. Isključite obavijesti na starom računu i pokušajte ponovno.");
            }
            throw error;
        }

        showPushDeviceState("Obavijesti su uključene na ovom uređaju.", true);
        setStatus("pushDeviceStatus",
            "Obavijesti su uključene na ovom uređaju.",
            "success");
    } catch (error) {
        console.error("Push registration:", error);
        setStatus("pushDeviceStatus", error.message ||
            "Registracija nije uspjela. Pokušajte ponovno.", "error");
    } finally {
        setLoading(button, false);
        if (Notification.permission === "denied") {
            showPushDeviceState("Obavijesti su blokirane u postavkama uređaja.");
            if (button) button.disabled = true;
        }
    }
}

async function disablePushOnDevice(silent = false) {
    if (!hasPushSupport() || !currentSession) return;
    const button = el("disablePushButton");
    if (!silent) {
        setLoading(button, true);
        setStatus("pushDeviceStatus", "Odjavljujemo ovaj uređaj...");
    }
    try {
        const reg = await navigator.serviceWorker.getRegistration("./");
        const subscription = await reg?.pushManager.getSubscription();
        const ownRow = await ownSubscriptionRow(subscription);
        if (ownRow) {
            const { error } = await supabaseClient
                .from("ptech_push_subscriptions")
                .delete()
                .eq("id", ownRow.id)
                .eq("user_id", currentSession.user.id);
            if (error) throw error;
        }
        if (subscription) {
            const unsubscribed = await subscription.unsubscribe();
            if (!unsubscribed) {
                throw new Error("Preglednik nije uspio isključiti pretplatu. Provjerite postavke uređaja.");
            }
        }
        if (!silent) {
            showPushDeviceState("Obavijesti su isključene na ovom uređaju.");
            setStatus("pushDeviceStatus", "Obavijesti su isključene na ovom uređaju.", "success");
        }
    } catch (error) {
        console.error("Push unsubscription:", error);
        if (!silent) setStatus("pushDeviceStatus",
            "Isključivanje nije uspjelo. Pokušajte ponovno.", "error");
        throw error;
    } finally {
        if (!silent) setLoading(button, false);
    }
}

function openModal(id, focusId) {
    const modal = el(id);
    if (!modal) return;
    previousFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    setStatus("passwordStatus", "");
    requestAnimationFrame(() => el(focusId)?.focus());
}
function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    previousFocus?.focus?.();
}
function setupModals() {
    el("changePasswordButton")?.addEventListener("click", () => {
        el("passwordForm")?.reset();
        openModal("passwordModal", "newPassword");
    });
    document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", () => closeModal(btn.closest(".modal-backdrop"))));
    document.querySelectorAll(".modal-backdrop").forEach(modal => modal.addEventListener("mousedown", event => {
        if (event.target === modal) closeModal(modal);
    }));
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            const opened = document.querySelector(".modal-backdrop:not([hidden])");
            if (opened) closeModal(opened);
        }
    });
    el("passwordForm")?.addEventListener("submit", async event => {
        event.preventDefault();
        const password = el("newPassword").value;
        const repeat = el("confirmPassword").value;
        if (password.length < 8) { setStatus("passwordStatus", "Lozinka mora imati barem 8 znakova.", "error"); return; }
        if (password !== repeat) { setStatus("passwordStatus", "Lozinke se ne podudaraju.", "error"); return; }
        const button = event.currentTarget.querySelector('[type="submit"]');
        setLoading(button, true);
        setStatus("passwordStatus", "Spremanje...");
        try {
            const { error } = await supabaseClient.auth.updateUser({ password });
            if (error) throw error;
            event.currentTarget.reset();
            setStatus("passwordStatus", "Lozinka je uspješno promijenjena.", "success");
        } catch (error) {
            console.error("Change password:", error);
            setStatus("passwordStatus", error?.message || "Promjena lozinke nije uspjela. Pokušajte ponovno.", "error");
        } finally { setLoading(button, false); }
    });
}
async function loadUnreadMessages() {
    if (!currentSession) return;
    const { count, error } = await supabaseClient.from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentSession.user.id).eq("sender_role", "admin").is("client_read_at", null);
    if (error) { console.warn("Unread messages:", error); return; }
    const unread = count || 0;
    for (const id of ["messagesUnreadBadge", "desktopUnreadBadge"]) {
        const badge = el(id);
        if (!badge) continue;
        badge.hidden = unread === 0;
        badge.textContent = unread > 99 ? "99+" : String(unread);
    }
}
function subscribeToSupportRealtime() {
    if (!currentSession || supportRealtimeChannel) return;
    supportRealtimeChannel = supabaseClient.channel(`profile-support-${currentSession.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `user_id=eq.${currentSession.user.id}` }, loadUnreadMessages)
        .subscribe();
}
async function startProfile() {
    if (!window.supabase) { alert("Supabase biblioteka nije učitana. Osvježite stranicu."); return; }
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) { window.location.href = "login.html"; return; }
    currentSession = session;
    loadNotificationPreferences();
    refreshPushDeviceState().catch(error => console.error("Push initialization:", error));
    await loadProfile();
    await loadProjects();
    await Promise.all([loadDocumentsAndActivity(), loadUnreadMessages()]);
    subscribeToSupportRealtime();
}
setupTheme();
setupParticles();
setupModals();
el("logoutButton")?.addEventListener("click", logout);
el("saveNotificationsButton")?.addEventListener("click", saveNotificationPreferences);
el("enablePushButton")?.addEventListener("click", enablePushOnDevice);
el("disablePushButton")?.addEventListener("click", () => disablePushOnDevice().catch(() => {}));
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && currentSession) {
        loadUnreadMessages();
        refreshPushDeviceState().catch(error => console.warn("Push refresh:", error));
    }
});
startProfile().catch(error => console.error("Profile initialization:", error));
