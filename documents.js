
const SUPABASE_URL = "https://agivwsbczzvvuzszcvxz.supabase.co";
const SUPABASE_KEY = "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const clientName = document.getElementById("clientName");
const logoutButton = document.getElementById("logoutButton");
const themeToggle = document.getElementById("themeToggle");
const documentSearch = document.getElementById("documentSearch");
const projectFilter = document.getElementById("projectFilter");
const typeFilter = document.getElementById("typeFilter");
const documentsCount = document.getElementById("documentsCount");
const documentsList = document.getElementById("documentsList");
const documentsMessage = document.getElementById("documentsMessage");
const messagesUnreadBadge = document.querySelector(".nav-notification");

let currentSession = null;
let allProjects = [];
let allDocuments = [];
let supportRealtimeChannel = null;
let renderVersion = 0;

/* =========================
   TEMA
========================= */

function applyTheme(theme) {
    const finalTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", finalTheme);
    localStorage.setItem("ptech-theme", finalTheme);
}

function loadTheme() {
    applyTheme(localStorage.getItem("ptech-theme"));
}

themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
});

loadTheme();

/* =========================
   ODJAVA
========================= */

logoutButton?.addEventListener("click", async () => {
    if (supportRealtimeChannel) {
        await supabaseClient.removeChannel(supportRealtimeChannel);
        supportRealtimeChannel = null;
    }

    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
});

/* =========================
   POMOĆNE FUNKCIJE
========================= */

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("hr-HR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatBytes(bytes) {
    const value = Number(bytes || 0);

    if (value < 1024) return `${value} B`;

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(name) {
    return String(name || "").split(".").pop().toLowerCase();
}

function getFileLabel(name) {
    const extension = getFileType(name);

    if (extension === "pdf") return "PDF";
    if (["doc", "docx"].includes(extension)) return "DOC";
    if (["xls", "xlsx"].includes(extension)) return "XLS";
    if (["ppt", "pptx"].includes(extension)) return "PPT";

    if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(extension)) {
        return "IMG";
    }

    if (["zip", "rar", "7z"].includes(extension)) return "ZIP";

    return "FILE";
}

function safePathPart(value) {
    return String(value || "klijent")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "klijent";
}

function showMessage(message, type = "error") {
    if (!documentsMessage) return;

    documentsMessage.hidden = false;
    documentsMessage.className = `documents-message ${type}`;
    documentsMessage.textContent = message;
}

function hideMessage() {
    if (!documentsMessage) return;

    documentsMessage.hidden = true;
    documentsMessage.className = "documents-message";
    documentsMessage.textContent = "";
}

/* =========================
   PROFIL
========================= */

async function loadProfile() {
    if (!currentSession) return;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, display_name")
        .eq("id", currentSession.user.id)
        .maybeSingle();

    if (error) {
        console.error("Profile error:", error);
        return;
    }

    if (data?.display_name && clientName) {
        clientName.textContent = data.display_name;
    }
}

/* =========================
   PROJEKTI
========================= */

async function loadProjects() {
    if (!currentSession) return;

    const { data, error } = await supabaseClient
        .from("projects")
        .select("id, name, type, created_at")
        .eq("user_id", currentSession.user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Projects error:", error);
        showMessage("Projekte nije moguće učitati.");
        return;
    }

    allProjects = data || [];
    buildProjectFilter();
}

function buildProjectFilter() {
    if (!projectFilter) return;

    projectFilter.innerHTML = '<option value="">Svi projekti</option>';

    for (const project of allProjects) {
        const option = document.createElement("option");

        option.value = String(project.id);
        option.textContent =
            project.type ||
            project.name ||
            `Projekt #${project.id}`;

        projectFilter.appendChild(option);
    }
}

/* =========================
   POSTOJEĆI DOKUMENTI
   TABLICA project_documents
========================= */

async function loadDatabaseDocuments() {
    const { data, error } = await supabaseClient
        .from("project_documents")
        .select(`
            id,
            created_at,
            project_id,
            name,
            file_url,
            document_type,
            file_size
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Documents database error:", error);
        throw error;
    }

    return (data || []).map(item => ({
        ...item,
        source: "database",
        bucket: "project-documents"
    }));
}

/* =========================
   POSLANI MATERIJALI
   BUCKET project-materials
========================= */

async function loadMaterialDocuments() {
    if (!currentSession || !allProjects.length) return [];

    const userId = currentSession.user.id;
    const bucket = supabaseClient.storage.from("project-materials");

    /*
       Struktura:
       petra--UUID/projekt-2/datoteka.pdf

       Najprije tražimo korisničku mapu.
       Tako nije važno je li ime Petra,
       Petar ili neki drugi naziv profila.
    */

    const { data: rootItems, error: rootError } =
        await bucket.list("", {
            limit: 1000,
            offset: 0
        });

    if (rootError) {
        console.error("Materials root error:", rootError);
        throw rootError;
    }

    const userFolders = (rootItems || [])
        .filter(item =>
            item.name &&
            item.name.endsWith(`--${userId}`)
        )
        .map(item => item.name);

    /*
       Dodatna mogućnost ako Supabase ne vrati
       virtualne mape u korijenu.
    */

    const profileFolder =
        `${safePathPart(clientName?.textContent)}--${userId}`;

    if (!userFolders.includes(profileFolder)) {
        userFolders.push(profileFolder);
    }

    const materials = [];

    for (const folder of userFolders) {
        for (const project of allProjects) {
            const projectPath =
                `${folder}/projekt-${project.id}`;

            let offset = 0;
            const limit = 100;

            while (true) {
                const { data: files, error } =
                    await bucket.list(projectPath, {
                        limit,
                        offset,
                        sortBy: {
                            column: "created_at",
                            order: "desc"
                        }
                    });

                if (error) {
                    console.error(
                        "Materials folder error:",
                        projectPath,
                        error
                    );

                    /*
                       Ne prekidamo sve ostale projekte
                       zbog jedne nedostupne mape.
                    */
                    break;
                }

                const batch = files || [];

                for (const file of batch) {
                    /*
                       Preskačemo podmape.
                       Datoteke imaju metadata ili id.
                    */
                    if (!file.id && !file.metadata) continue;

                    const filePath =
                        `${projectPath}/${file.name}`;

                    materials.push({
                        id: `material:${filePath}`,
                        created_at:
                            file.created_at ||
                            file.updated_at ||
                            null,
                        project_id: project.id,
                        name: file.name,
                        file_url: filePath,
                        document_type: "Dizajn",
                        file_size:
                            file.metadata?.size ||
                            0,
                        source: "materials",
                        bucket: "project-materials"
                    });
                }

                if (batch.length < limit) break;

                offset += limit;
            }
        }
    }

    return materials;
}

/* =========================
   UČITAVANJE SVIH DOKUMENATA
========================= */

async function loadDocuments() {
    if (!documentsList) return;

    documentsList.innerHTML = `
        <div class="documents-empty">
            Učitavanje dokumenata...
        </div>
    `;

    const results = await Promise.allSettled([
        loadDatabaseDocuments(),
        loadMaterialDocuments()
    ]);

    const databaseResult = results[0];
    const materialsResult = results[1];

    const databaseDocuments =
        databaseResult.status === "fulfilled"
            ? databaseResult.value
            : [];

    const materialDocuments =
        materialsResult.status === "fulfilled"
            ? materialsResult.value
            : [];

    if (databaseResult.status === "rejected") {
        console.error(
            "Database documents failed:",
            databaseResult.reason
        );
    }

    if (materialsResult.status === "rejected") {
        console.error(
            "Materials loading failed:",
            materialsResult.reason
        );
    }

    const projectMap = Object.fromEntries(
        allProjects.map(project => [
            String(project.id),
            project
        ])
    );

    const combined = [
        ...databaseDocuments,
        ...materialDocuments
    ];

    /*
       Prikazujemo samo dokumente projekata
       koje je korisnik učitao iz svoje baze.
    */

    allDocuments = combined
        .filter(item =>
            Boolean(projectMap[String(item.project_id)])
        )
        .map(item => ({
            ...item,
            project:
                projectMap[String(item.project_id)]
        }))
        .sort((a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        );

    if (
        databaseResult.status === "rejected" ||
        materialsResult.status === "rejected"
    ) {
        showMessage(
            "Dio dokumenata nije moguće učitati. Provjeri pristup Storage bucketu.",
            "error"
        );
    } else {
        hideMessage();
    }

    applyFilters();
}

/* =========================
   PRIVATNI LINKOVI
========================= */

async function getDocumentUrl(item, download = false) {
    if (!item.file_url) return null;

    const value = String(item.file_url);

    /*
       Postojeći dokumenti mogu već imati
       gotov javni URL.
    */

    if (
        value.startsWith("https://") ||
        value.startsWith("http://")
    ) {
        return value;
    }

    const bucketName =
        item.bucket ||
        "project-documents";

    const options = download
        ? { download: item.name || true }
        : undefined;

    const { data, error } = await supabaseClient
        .storage
        .from(bucketName)
        .createSignedUrl(
            value,
            3600,
            options
        );

    if (error) {
        console.error(
            "Signed URL error:",
            bucketName,
            value,
            error
        );
        return null;
    }

    return data?.signedUrl || null;
}

/* =========================
   PRIKAZ DOKUMENATA
========================= */

async function renderDocuments(documents) {
    if (!documentsList) return;

    const version = ++renderVersion;

    if (documentsCount) {
        documentsCount.textContent = String(documents.length);
    }

    if (!documents.length) {
        documentsList.innerHTML = `
            <div class="documents-empty">
                Trenutno nema dokumenata.
            </div>
        `;
        return;
    }

    documentsList.innerHTML = `
        <div class="documents-empty">
            Priprema dokumenata...
        </div>
    `;

    const cards = await Promise.all(
        documents.map(async item => {
            const [openUrl, downloadUrl] = await Promise.all([
                getDocumentUrl(item, false),
                getDocumentUrl(item, true)
            ]);

            const projectName =
                item.project?.type ||
                item.project?.name ||
                "Projekt";

            const category =
                item.document_type ||
                "Ostalo";

            const materialLabel =
                item.source === "materials"
                    ? " · Poslani materijal"
                    : "";

            const openButton = openUrl
                ? `
                    <a
                        href="${escapeHtml(openUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="document-open-button"
                    >
                        Otvori

                        <svg viewBox="0 0 24 24">
                            <path d="M14 5h5v5"></path>
                            <path d="M10 14L19 5"></path>
                            <path d="M19 13v6H5V5h6"></path>
                        </svg>
                    </a>
                `
                : "";

            const downloadButton = downloadUrl
                ? `
                    <a
                        href="${escapeHtml(downloadUrl)}"
                        class="document-download-button"
                    >
                        Preuzmi

                        <svg viewBox="0 0 24 24">
                            <path d="M12 3v12"></path>
                            <path d="M7 10l5 5 5-5"></path>
                            <path d="M5 20h14"></path>
                        </svg>
                    </a>
                `
                : "";

            const unavailable =
                !openUrl && !downloadUrl
                    ? `
                        <span class="document-unavailable">
                            Nedostupno
                        </span>
                    `
                    : "";

            return `
                <article class="document-card">

                    <div class="document-main">

                        <div class="document-icon">
                            ${getFileLabel(item.name)}
                        </div>

                        <div class="document-info">

                            <strong>
                                ${escapeHtml(item.name || "Dokument")}
                            </strong>

                            <span>
                                ${escapeHtml(projectName)}
                            </span>

                            <small>
                                ${escapeHtml(category + materialLabel)}
                                •
                                ${formatDate(item.created_at)}
                                •
                                ${formatBytes(item.file_size)}
                            </small>

                        </div>

                    </div>

                    <div class="document-actions">
                        ${openButton}
                        ${downloadButton}
                        ${unavailable}
                    </div>

                </article>
            `;
        })
    );

    /*
       Ako je korisnik u međuvremenu
       promijenio filter, ne prikazujemo
       rezultat prethodnog filtriranja.
    */

    if (version !== renderVersion) return;

    documentsList.innerHTML = cards.join("");
}

/* =========================
   FILTERI
========================= */

function applyFilters() {
    const search = String(
        documentSearch?.value || ""
    ).trim().toLowerCase();

    const projectId =
        projectFilter?.value || "";

    const type =
        typeFilter?.value || "";

    const filtered = allDocuments.filter(item => {
        const searchValue = `
            ${item.name || ""}
            ${item.project?.name || ""}
            ${item.project?.type || ""}
            ${item.document_type || ""}
        `.toLowerCase();

        const matchesSearch =
            !search ||
            searchValue.includes(search);

        const matchesProject =
            !projectId ||
            String(item.project_id) === projectId;

        const matchesType =
            !type ||
            String(item.document_type || "Ostalo") === type;

        return (
            matchesSearch &&
            matchesProject &&
            matchesType
        );
    });

    renderDocuments(filtered);
}

documentSearch?.addEventListener("input", applyFilters);
projectFilter?.addEventListener("change", applyFilters);
typeFilter?.addEventListener("change", applyFilters);

/* =========================
   NEPROČITANE PORUKE
========================= */

async function loadMessagesUnreadCount() {
    if (!messagesUnreadBadge || !currentSession) return;

    const { count, error } = await supabaseClient
        .from("support_messages")
        .select("id", {
            count: "exact",
            head: true
        })
        .eq("user_id", currentSession.user.id)
        .eq("sender_role", "admin")
        .is("client_read_at", null);

    if (error) {
        console.error("Unread support error:", error);
        return;
    }

    const unreadCount = count || 0;

    messagesUnreadBadge.hidden =
        unreadCount === 0;

    messagesUnreadBadge.textContent =
        unreadCount > 99
            ? "99+"
            : String(unreadCount);
}

/* =========================
   REALTIME PORUKE
========================= */

function subscribeToSupportRealtime() {
    if (!currentSession || supportRealtimeChannel) return;

    supportRealtimeChannel = supabaseClient
        .channel(
            `documents-support-${currentSession.user.id}`
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "support_messages",
                filter:
                    `user_id=eq.${currentSession.user.id}`
            },
            async () => {
                await loadMessagesUnreadCount();
            }
        )
        .subscribe();
}

/* =========================
   POVRATAK NA STRANICU
========================= */

document.addEventListener(
    "visibilitychange",
    async () => {
        if (
            document.visibilityState === "visible" &&
            currentSession
        ) {
            await loadMessagesUnreadCount();
            await loadDocuments();
        }
    }
);

/* =========================
   POKRETANJE
========================= */

async function startDocuments() {
    hideMessage();

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error || !session) {
        window.location.href = "login.html";
        return;
    }

    currentSession = session;

    await loadProfile();
    await loadProjects();
    await loadDocuments();
    await loadMessagesUnreadCount();

    subscribeToSupportRealtime();
}

startDocuments();
