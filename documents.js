
/* =====================================================
   PTECH DIGITAL CLIENT PORTAL
   DOCUMENTS.JS — V6

   - Supabase Auth
   - Korisnicki profil
   - Projekti
   - Project documents
   - Private project materials
   - Signed URLs
   - Pregled i preuzimanje
   - Pretraga i filteri
   - Light / Dark mode
   - Logout
   - Neprocitane poruke
   - Realtime
   - Particles
===================================================== */


/* =====================================================
   SUPABASE
===================================================== */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* =====================================================
   ELEMENTI
===================================================== */

const clientName =
    document.getElementById("clientName");

const logoutButton =
    document.getElementById("logoutButton");

const themeToggle =
    document.getElementById("themeToggle");

const documentSearch =
    document.getElementById("documentSearch");

const projectFilter =
    document.getElementById("projectFilter");

const typeFilter =
    document.getElementById("typeFilter");

const documentsCount =
    document.getElementById("documentsCount");

const documentsTotal =
    document.getElementById("documentsTotal");

const documentsList =
    document.getElementById("documentsList");

const documentsMessage =
    document.getElementById("documentsMessage");

const messagesUnreadBadge =
    document.getElementById("messagesUnreadBadge");


/* =====================================================
   GLOBAL
===================================================== */

let currentSession = null;
let allProjects = [];
let allDocuments = [];

let supportRealtimeChannel = null;
let renderVersion = 0;


/* =====================================================
   HELPERS
===================================================== */

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

    const text = String(value);

    const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
        ? new Date(text + "T00:00:00")
        : new Date(text);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString("hr-HR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}


function formatBytes(bytes) {
    const value = Number(bytes || 0);

    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}


function getFileType(name) {
    return String(name || "")
        .split(".")
        .pop()
        .toLowerCase();
}


function getFileLabel(name) {
    const extension = getFileType(name);

    if (extension === "pdf") return "PDF";

    if (
        ["doc", "docx"].includes(extension)
    ) {
        return "DOC";
    }

    if (
        ["xls", "xlsx"].includes(extension)
    ) {
        return "XLS";
    }

    if (
        ["ppt", "pptx"].includes(extension)
    ) {
        return "PPT";
    }

    if (
        [
            "jpg",
            "jpeg",
            "png",
            "webp",
            "gif",
            "svg"
        ].includes(extension)
    ) {
        return "IMG";
    }

    if (
        ["zip", "rar", "7z"].includes(extension)
    ) {
        return "ZIP";
    }

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


/* =====================================================
   STATUS MESSAGES
===================================================== */

function showMessage(message, type = "error") {
    if (!documentsMessage) return;

    documentsMessage.hidden = false;

    documentsMessage.className =
        `documents-message ${type}`;

    documentsMessage.textContent = message;
}


function hideMessage() {
    if (!documentsMessage) return;

    documentsMessage.hidden = true;
    documentsMessage.className = "documents-message";
    documentsMessage.textContent = "";
}


/* =====================================================
   LIGHT / DARK MODE
   ISTA POSTAVKA KAO OSTATAK PORTALA
===================================================== */

function applyTheme(theme, save = true) {
    const finalTheme =
        theme === "light" ? "light" : "dark";

    document.documentElement.setAttribute(
        "data-theme",
        finalTheme
    );

    document.body.classList.toggle(
        "light-mode",
        finalTheme === "light"
    );

    if (themeToggle) {
        themeToggle.checked =
            finalTheme === "light";
    }

    const themeColor = document.querySelector(
        'meta[name="theme-color"]'
    );

    if (themeColor) {
        themeColor.content =
            finalTheme === "light"
                ? "#fffaf5"
                : "#192337";
    }

    if (save) {
        try {
            localStorage.setItem("theme", finalTheme);
        } catch (error) {
            // Tema i dalje radi u trenutnoj kartici.
        }
    }
}


function loadTheme() {
    let savedTheme = "dark";

    try {
        savedTheme =
            localStorage.getItem("theme") ||
            localStorage.getItem("ptech-theme") ||
            "dark";
    } catch (error) {
        // Koristi se zadana tema.
    }

    applyTheme(
        savedTheme === "light" ? "light" : "dark",
        false
    );
}


themeToggle?.addEventListener(
    "change",
    function () {
        applyTheme(
            themeToggle.checked
                ? "light"
                : "dark"
        );
    }
);

loadTheme();


/* =====================================================
   LOGOUT
===================================================== */

logoutButton?.addEventListener(
    "click",
    async function () {
        logoutButton.disabled = true;

        try {
            if (supportRealtimeChannel) {
                await supabaseClient.removeChannel(
                    supportRealtimeChannel
                );

                supportRealtimeChannel = null;
            }

            const { error } =
                await supabaseClient.auth.signOut();

            if (error) {
                throw error;
            }

            window.location.href = "login.html";

        } catch (error) {
            console.error("Logout error:", error);

            logoutButton.disabled = false;

            showMessage(
                "Odjava trenutno nije moguća. Pokušajte ponovno."
            );
        }
    }
);


/* =====================================================
   PROFIL
===================================================== */

async function loadProfile() {
    if (!currentSession) return;

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select("id, display_name")
            .eq("id", currentSession.user.id)
            .maybeSingle();

    if (error) {
        console.error("Profile error:", error);
    }

    if (clientName) {
        clientName.textContent =
            data?.display_name ||
            currentSession.user.email?.split("@")[0] ||
            "Klijent";
    }
}


/* =====================================================
   PROJEKTI
===================================================== */

async function loadProjects() {
    if (!currentSession) return false;

    const { data, error } =
        await supabaseClient
            .from("projects")
            .select(
                "id, name, type, created_at"
            )
            .eq(
                "user_id",
                currentSession.user.id
            )
            .order(
                "created_at",
                { ascending: false }
            );

    if (error) {
        console.error("Projects error:", error);

        showMessage(
            "Projekte nije moguće učitati."
        );

        return false;
    }

    allProjects = data || [];

    buildProjectFilter();

    return true;
}


function buildProjectFilter() {
    if (!projectFilter) return;

    projectFilter.replaceChildren();

    const defaultOption =
        document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent = "Svi projekti";

    projectFilter.appendChild(defaultOption);

    for (const project of allProjects) {
        const option =
            document.createElement("option");

        option.value =
            String(project.id);

        option.textContent =
            project.type ||
            project.name ||
            `Projekt #${project.id}`;

        projectFilter.appendChild(option);
    }
}


/* =====================================================
   PROJECT DOCUMENTS — BAZA
===================================================== */

async function loadDatabaseDocuments() {
    const { data, error } =
        await supabaseClient
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
            .order(
                "created_at",
                { ascending: false }
            );

    if (error) {
        console.error(
            "Documents database error:",
            error
        );

        throw error;
    }

    return (data || []).map(
        item => ({
            ...item,
            source: "database",
            bucket: "project-documents"
        })
    );
}


/* =====================================================
   PROJECT MATERIALS — STORAGE

   Zadrzavamo postojecu strukturu mapa:
   ime-klijenta--user-id/projekt-ID
===================================================== */

async function loadMaterialDocuments() {
    if (
        !currentSession ||
        !allProjects.length
    ) {
        return [];
    }

    const userId =
        currentSession.user.id;

    const bucket =
        supabaseClient.storage.from(
            "project-materials"
        );

    const materials = [];

    const clientFolder =
        `${
            safePathPart(clientName?.textContent)
        }--${userId}`;

    for (const project of allProjects) {
        const projectPath =
            `${clientFolder}/projekt-${project.id}`;

        let offset = 0;
        const limit = 100;

        while (true) {
            const { data: files, error } =
                await bucket.list(
                    projectPath,
                    {
                        limit,
                        offset,
                        sortBy: {
                            column: "created_at",
                            order: "desc"
                        }
                    }
                );

            if (error) {
                console.error(
                    "Materials loading error:",
                    projectPath,
                    error
                );

                throw error;
            }

            const batch = files || [];

            for (const file of batch) {
                if (
                    !file.id &&
                    !file.metadata
                ) {
                    continue;
                }

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
                        file.metadata?.size || 0,
                    source: "materials",
                    bucket: "project-materials"
                });
            }

            if (batch.length < limit) {
                break;
            }

            offset += limit;
        }
    }

    return materials;
}


/* =====================================================
   UCITAVANJE DOKUMENATA
===================================================== */

async function loadDocuments() {
    if (!documentsList) return;

    documentsList.innerHTML = `
        <div class="documents-empty">
            Učitavanje dokumenata...
        </div>
    `;

    const results =
        await Promise.allSettled([
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

    if (
        databaseResult.status === "rejected"
    ) {
        console.error(
            "Database documents error:",
            databaseResult.reason
        );
    }

    if (
        materialsResult.status === "rejected"
    ) {
        console.error(
            "Material documents error:",
            materialsResult.reason
        );
    }

    /*
       Prikazujemo samo dokumente koji
       pripadaju projektima prijavljenog klijenta.

       Pristup samim datotekama dodatno ovisi
       o Supabase RLS i Storage pravilima.
    */

    const projectMap = new Map(
        allProjects.map(project => [
            String(project.id),
            project
        ])
    );

    const combined = [
        ...databaseDocuments,
        ...materialDocuments
    ];

    allDocuments = combined
        .filter(item =>
            projectMap.has(
                String(item.project_id)
            )
        )
        .map(item => ({
            ...item,

            project: projectMap.get(
                String(item.project_id)
            )
        }))
        .sort((a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        );

    if (documentsTotal) {
        documentsTotal.textContent =
            String(allDocuments.length);
    }

    if (
        databaseResult.status === "rejected" ||
        materialsResult.status === "rejected"
    ) {
        showMessage(
            "Dio dokumenata nije moguće učitati. Provjerite pristup Storage bucketu.",
            "error"
        );
    } else {
        hideMessage();
    }

    await applyFilters();
}


/* =====================================================
   PRIVATNI LINKOVI
===================================================== */

async function getDocumentUrl(
    item,
    download = false
) {
    if (!item.file_url) {
        return null;
    }

    const value =
        String(item.file_url);

    /*
       Postojeci dokumenti mogu imati
       spremljen gotov URL.
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
        ? {
            download: item.name || true
        }
        : undefined;

    const { data, error } =
        await supabaseClient
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


/* =====================================================
   RENDER DOKUMENATA
===================================================== */

async function renderDocuments(items) {
    if (!documentsList) return;

    const version =
        ++renderVersion;

    if (documentsCount) {
        documentsCount.textContent =
            String(items.length);
    }

    if (!items.length) {
        documentsList.innerHTML = `
            <div class="documents-empty">
                Trenutno nema dokumenata koji
                odgovaraju odabranim filterima.
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
        items.map(
            async item => {

                const [
                    openUrl,
                    downloadUrl
                ] = await Promise.all([
                    getDocumentUrl(
                        item,
                        false
                    ),
                    getDocumentUrl(
                        item,
                        true
                    )
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

                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path d="M14 5h5v5"></path>
                                <path d="M10 14L19 5"></path>
                                <path d="M19 13v6H5V5h6"></path>
                            </svg>
                        </a>
                    `
                    : "";

                const downloadButton =
                    downloadUrl
                        ? `
                            <a
                                href="${escapeHtml(downloadUrl)}"
                                class="document-download-button"
                            >
                                Preuzmi

                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
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
                                    ${escapeHtml(
                                        item.name ||
                                        "Dokument"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(projectName)}
                                </span>

                                <small>
                                    ${escapeHtml(
                                        category + materialLabel
                                    )}

                                    ·

                                    ${escapeHtml(
                                        formatDate(
                                            item.created_at
                                        )
                                    )}

                                    ·

                                    ${escapeHtml(
                                        formatBytes(
                                            item.file_size
                                        )
                                    )}
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
            }
        )
    );

    /*
       Ne prikazuj stari rezultat ako je
       korisnik u meduvremenu promijenio filter.
    */

    if (version !== renderVersion) {
        return;
    }

    documentsList.innerHTML =
        cards.join("");
}


/* =====================================================
   FILTERI
===================================================== */

async function applyFilters() {
    const search = String(
        documentSearch?.value || ""
    ).trim().toLowerCase();

    const projectId =
        projectFilter?.value || "";

    const type =
        typeFilter?.value || "";

    const filtered = allDocuments.filter(
        item => {

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
                String(item.project_id) ===
                    projectId;

            const matchesType =
                !type ||
                String(
                    item.document_type || "Ostalo"
                ).toLowerCase() ===
                    type.toLowerCase();

            return (
                matchesSearch &&
                matchesProject &&
                matchesType
            );
        }
    );

    await renderDocuments(filtered);
}


documentSearch?.addEventListener(
    "input",
    applyFilters
);

projectFilter?.addEventListener(
    "change",
    applyFilters
);

typeFilter?.addEventListener(
    "change",
    applyFilters
);


/* =====================================================
   NEPROCITANE PORUKE
===================================================== */

async function loadMessagesUnreadCount() {
    if (
        !messagesUnreadBadge ||
        !currentSession
    ) {
        return;
    }

    const { count, error } =
        await supabaseClient
            .from("support_messages")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "user_id",
                currentSession.user.id
            )
            .eq(
                "sender_role",
                "admin"
            )
            .is(
                "client_read_at",
                null
            );

    if (error) {
        console.error(
            "Unread support error:",
            error
        );

        return;
    }

    const unreadCount =
        count || 0;

    messagesUnreadBadge.hidden =
        unreadCount === 0;

    messagesUnreadBadge.textContent =
        unreadCount > 99
            ? "99+"
            : String(unreadCount);
}


/* =====================================================
   REALTIME SUPPORT
===================================================== */

function subscribeToSupportRealtime() {
    if (
        !currentSession ||
        supportRealtimeChannel
    ) {
        return;
    }

    supportRealtimeChannel =
        supabaseClient
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
                async function () {
                    await loadMessagesUnreadCount();
                }
            )
            .subscribe();
}


/* =====================================================
   PARTICLES
===================================================== */

function createDocumentParticles() {
    const container =
        document.getElementById(
            "documentsParticles"
        );

    if (!container) return;

    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    container.replaceChildren();

    const count = 34;

    for (
        let index = 0;
        index < count;
        index++
    ) {
        const particle =
            document.createElement("span");

        particle.className =
            "documents-particle";

        particle.style.setProperty(
            "--particle-top",
            (Math.random() * 96 + 2) + "%"
        );

        particle.style.setProperty(
            "--particle-width",
            (Math.random() * 65 + 30) + "px"
        );

        particle.style.setProperty(
            "--particle-duration",
            (Math.random() * 10 + 12) + "s"
        );

        particle.style.setProperty(
            "--particle-delay",
            (Math.random() * -22) + "s"
        );

        particle.style.setProperty(
            "--particle-opacity",
            String(
                Math.random() * 0.35 + 0.3
            )
        );

        container.appendChild(particle);
    }
}


/* =====================================================
   POVRATAK NA STRANICU
===================================================== */

document.addEventListener(
    "visibilitychange",
    async function () {
        if (
            document.visibilityState === "visible" &&
            currentSession
        ) {
            await loadMessagesUnreadCount();
            await loadDocuments();
        }
    }
);


/* =====================================================
   POKRETANJE
===================================================== */

async function startDocuments() {
    hideMessage();

    try {
        const {
            data: { session },
            error
        } =
            await supabaseClient.auth.getSession();

        if (error || !session) {
            window.location.href =
                "login.html";

            return;
        }

        currentSession = session;

        await loadProfile();

        const projectsLoaded =
            await loadProjects();

        if (!projectsLoaded) {
            if (documentsList) {
                documentsList.innerHTML = `
                    <div class="documents-empty">
                        Projekte trenutno nije moguće učitati.
                    </div>
                `;
            }

            return;
        }

        await loadDocuments();

        await loadMessagesUnreadCount();

        subscribeToSupportRealtime();

    } catch (error) {
        console.error(
            "Documents init error:",
            error
        );

        showMessage(
            "Došlo je do pogreške pri učitavanju dokumenata."
        );

        if (documentsList) {
            documentsList.innerHTML = `
                <div class="documents-empty">
                    Pokušajte osvježiti stranicu.
                </div>
            `;
        }
    }
}


/* =====================================================
   INIT
===================================================== */

createDocumentParticles();

startDocuments();


/* =====================================================
   END — DOCUMENTS.JS V6
===================================================== */
