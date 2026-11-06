
/* =====================================================
   PTECH DIGITAL — DOCUMENTS.JS V8
   Existing documents + private client uploads
===================================================== */

/* SUPABASE */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* ELEMENTS */

const $ = id => document.getElementById(id);

const clientName = $("clientName");
const logoutButton = $("logoutButton");
const themeToggle = $("themeToggle");
const documentSearch = $("documentSearch");
const projectFilter = $("projectFilter");
const typeFilter = $("typeFilter");
const documentsCount = $("documentsCount");
const documentsTotal = $("documentsTotal");
const documentsList = $("documentsList");
const documentsMessage = $("documentsMessage");
const messagesUnreadBadge = $("messagesUnreadBadge");

const uploadOverlay = $("uploadOverlay");
const openUploadButton = $("openUploadButton");
const closeUploadButton = $("closeUploadButton");
const cancelUploadButton = $("cancelUploadButton");
const uploadForm = $("uploadForm");
const uploadProject = $("uploadProject");
const uploadCategory = $("uploadCategory");
const uploadTitle = $("uploadTitle");
const uploadFiles = $("uploadFiles");
const uploadDropzone = $("uploadDropzone");
const uploadFileList = $("uploadFileList");
const uploadNote = $("uploadNote");
const uploadNoteCounter = $("uploadNoteCounter");
const uploadStatus = $("uploadStatus");
const submitUploadButton = $("submitUploadButton");

const UPLOAD_BUCKET = "client-uploads";
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MIME_TYPES = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    zip: "application/zip"
};

const ALLOWED_CATEGORIES = [
    "Dizajn",
    "Zahtjev za izmjenom",
    "Potvrda o plaćanju",
    "Materijali",
    "Ugovor",
    "Račun",
    "Ponuda",
    "Brief",
    "Ostalo"
];

/* STATE */

let currentSession = null;
let allProjects = [];
let allDocuments = [];
let selectedFiles = [];
let uploadBusy = false;
let supportRealtimeChannel = null;
let renderVersion = 0;
let lastFocusedElement = null;

/* HELPERS */

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
    if (value < 1048576) {
        return `${(value / 1024).toFixed(1)} KB`;
    }
    return `${(value / 1048576).toFixed(1)} MB`;
}

function getFileType(name) {
    return String(name || "")
        .split(".")
        .pop()
        .toLowerCase();
}

function getFileLabel(name) {
    const ext = getFileType(name);

    if (ext === "pdf") return "PDF";
    if (["doc", "docx"].includes(ext)) return "DOC";
    if (["xls", "xlsx"].includes(ext)) return "XLS";
    if (["ppt", "pptx"].includes(ext)) return "PPT";
    if (["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) return "IMG";
    if (["zip", "rar", "7z"].includes(ext)) return "ZIP";

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

function projectLabel(project) {
    return project.type ||
        project.name ||
        `Projekt #${project.id}`;
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

function showUploadStatus(message, type = "") {
    if (!uploadStatus) return;

    uploadStatus.hidden = false;
    uploadStatus.className = `upload-status ${type}`;
    uploadStatus.textContent = message;
}

function hideUploadStatus() {
    if (!uploadStatus) return;
    uploadStatus.hidden = true;
    uploadStatus.textContent = "";
    uploadStatus.className = "upload-status";
}

/* THEME */

function applyTheme(theme, save = true) {
    const finalTheme = theme === "light" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", finalTheme);
    document.body.classList.toggle(
        "light-mode",
        finalTheme === "light"
    );

    if (themeToggle) {
        themeToggle.checked = finalTheme === "light";
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.content = finalTheme === "light"
            ? "#fffaf5"
            : "#192337";
    }

    if (save) {
        try {
            localStorage.setItem("theme", finalTheme);
        } catch (error) {}
    }
}

function loadTheme() {
    let saved = "dark";

    try {
        saved = localStorage.getItem("theme") ||
            localStorage.getItem("ptech-theme") ||
            "dark";
    } catch (error) {}

    applyTheme(saved, false);
}

themeToggle?.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "light" : "dark");
});

loadTheme();

/* LOGOUT */

logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
        if (supportRealtimeChannel) {
            await supabaseClient.removeChannel(supportRealtimeChannel);
            supportRealtimeChannel = null;
        }

        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;

        window.location.href = "login.html";
    } catch (error) {
        console.error("Logout error:", error);
        logoutButton.disabled = false;
        showMessage("Odjava trenutno nije moguća. Pokušajte ponovno.");
    }
});

/* PROFILE */

async function loadProfile() {
    if (!currentSession) return;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, display_name")
        .eq("id", currentSession.user.id)
        .maybeSingle();

    if (error) console.error("Profile error:", error);

    if (clientName) {
        clientName.textContent =
            data?.display_name ||
            currentSession.user.email?.split("@")[0] ||
            "Klijent";
    }
}

/* PROJECTS */

async function loadProjects() {
    if (!currentSession) return false;

    const { data, error } = await supabaseClient
        .from("projects")
        .select("id, name, type, created_at")
        .eq("user_id", currentSession.user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Projects error:", error);
        showMessage("Projekte nije moguće učitati.");
        return false;
    }

    allProjects = data || [];

    buildProjectFilter();
    buildUploadProjectOptions();

    return true;
}

function buildProjectFilter() {
    if (!projectFilter) return;

    projectFilter.replaceChildren();

    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Svi projekti";
    projectFilter.appendChild(option);

    for (const project of allProjects) {
        const item = document.createElement("option");
        item.value = String(project.id);
        item.textContent = projectLabel(project);
        projectFilter.appendChild(item);
    }
}

function buildUploadProjectOptions() {
    if (!uploadProject) return;

    uploadProject.replaceChildren();

    const initial = document.createElement("option");
    initial.value = "";
    initial.textContent = "Odaberite projekt";
    uploadProject.appendChild(initial);

    for (const project of allProjects) {
        const option = document.createElement("option");
        option.value = String(project.id);
        option.textContent = projectLabel(project);
        uploadProject.appendChild(option);
    }
}

/* EXISTING DATABASE DOCUMENTS */

async function loadDatabaseDocuments() {
    const { data, error } = await supabaseClient
        .from("project_documents")
        .select("id, created_at, project_id, name, file_url, document_type, file_size")
        .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
        ...item,
        source: "database",
        bucket: "project-documents"
    }));
}

/* EXISTING PROJECT MATERIALS */

async function loadMaterialDocuments() {
    if (!currentSession || !allProjects.length) return [];

    const userId = currentSession.user.id;
    const bucket = supabaseClient.storage.from("project-materials");
    const materials = [];

    const clientFolder =
        `${safePathPart(clientName?.textContent)}--${userId}`;

    for (const project of allProjects) {
        const path = `${clientFolder}/projekt-${project.id}`;
        let offset = 0;
        const limit = 100;

        while (true) {
            const { data: files, error } = await bucket.list(path, {
                limit,
                offset,
                sortBy: {
                    column: "created_at",
                    order: "desc"
                }
            });

            if (error) {
                console.error("Materials error:", path, error);
                throw error;
            }

            const batch = files || [];

            for (const file of batch) {
                if (!file.id && !file.metadata) continue;

                const filePath = `${path}/${file.name}`;

                materials.push({
                    id: `material:${filePath}`,
                    created_at: file.created_at || file.updated_at || null,
                    project_id: project.id,
                    name: file.name,
                    original_file_name: file.name,
                    file_url: filePath,
                    document_type: "Dizajn",
                    file_size: file.metadata?.size || 0,
                    source: "materials",
                    bucket: "project-materials"
                });
            }

            if (batch.length < limit) break;
            offset += limit;
        }
    }

    return materials;
}

/* NEW CLIENT UPLOADS */

async function loadClientUploads() {
    if (!currentSession) return [];

    const { data, error } = await supabaseClient
        .from("client_uploads")
        .select(`
            id,
            created_at,
            project_id,
            title,
            category,
            note,
            original_file_name,
            file_path,
            file_size
        `)
        .eq("user_id", currentSession.user.id)
        .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
        id: item.id,
        created_at: item.created_at,
        project_id: item.project_id,
        name: item.title || item.original_file_name,
        original_file_name: item.original_file_name,
        file_url: item.file_path,
        document_type: item.category,
        file_size: item.file_size,
        note: item.note,
        source: "client",
        bucket: UPLOAD_BUCKET
    }));
}

/* COMBINED DOCUMENT LIST */

async function loadDocuments() {
    if (!documentsList) return;

    documentsList.innerHTML = `
        <div class="documents-empty">
            Učitavanje dokumenata...
        </div>
    `;

    const results = await Promise.allSettled([
        loadDatabaseDocuments(),
        loadMaterialDocuments(),
        loadClientUploads()
    ]);

    const combined = [];
    let hasError = false;

    for (const result of results) {
        if (result.status === "fulfilled") {
            combined.push(...result.value);
        } else {
            hasError = true;
            console.error("Document source error:", result.reason);
        }
    }

    const projectMap = new Map(
        allProjects.map(project => [String(project.id), project])
    );

    allDocuments = combined
        .filter(item => projectMap.has(String(item.project_id)))
        .map(item => ({
            ...item,
            project: projectMap.get(String(item.project_id))
        }))
        .sort((a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        );

    if (documentsTotal) {
        documentsTotal.textContent = String(allDocuments.length);
    }

    if (hasError) {
        showMessage(
            "Dio dokumenata nije moguće učitati. Provjerite Supabase tablice i Storage pravila.",
            "error"
        );
    } else {
        hideMessage();
    }

    await applyFilters();
}

/* SIGNED URL */

async function getDocumentUrl(item, download = false) {
    if (!item.file_url) return null;

    const value = String(item.file_url);

    if (value.startsWith("https://") ||
        value.startsWith("http://")) {
        return value;
    }

    const bucketName = item.bucket || "project-documents";

    const options = download
        ? { download: item.original_file_name || item.name || true }
        : undefined;

    const { data, error } = await supabaseClient.storage
        .from(bucketName)
        .createSignedUrl(value, 3600, options);

    if (error) {
        console.error("Signed URL error:", error);
        return null;
    }

    return data?.signedUrl || null;
}

/* RENDER */

async function renderDocuments(items) {
    if (!documentsList) return;

    const version = ++renderVersion;

    if (documentsCount) {
        documentsCount.textContent = String(items.length);
    }

    if (!items.length) {
        documentsList.innerHTML = `
            <div class="documents-empty">
                Trenutno nema dokumenata koji odgovaraju filterima.
            </div>
        `;
        return;
    }

    documentsList.innerHTML = `
        <div class="documents-empty">
            Priprema dokumenata...
        </div>
    `;

    const cards = await Promise.all(items.map(async item => {
        const [openUrl, downloadUrl] = await Promise.all([
            getDocumentUrl(item, false),
            getDocumentUrl(item, true)
        ]);

        const projectName = projectLabel(item.project);
        const category = item.document_type || "Ostalo";

        const sourceLabel =
            item.source === "materials" ? " · Poslani materijal" :
            item.source === "client" ? " · Učitao klijent" :
            "";

        const note = item.note
            ? `<small>Napomena: ${escapeHtml(item.note)}</small>`
            : "";

        const openButton = openUrl ? `
            <a href="${escapeHtml(openUrl)}"
               target="_blank"
               rel="noopener noreferrer"
               class="document-open-button">
                Otvori
                <svg viewBox="0 0 24 24">
                    <path d="M14 5h5v5M10 14L19 5M19 13v6H5V5h6"/>
                </svg>
            </a>
        ` : "";

        const downloadButton = downloadUrl ? `
            <a href="${escapeHtml(downloadUrl)}"
               class="document-download-button">
                Preuzmi
                <svg viewBox="0 0 24 24">
                    <path d="M12 3v12M7 10l5 5 5-5M5 20h14"/>
                </svg>
            </a>
        ` : "";

        const unavailable = (!openUrl && !downloadUrl)
            ? `<span class="document-unavailable">Nedostupno</span>`
            : "";

        return `
            <article class="document-card">
                <div class="document-main">
                    <div class="document-icon">
                        ${getFileLabel(item.original_file_name || item.name)}
                    </div>
                    <div class="document-info">
                        <strong>${escapeHtml(item.name || "Dokument")}</strong>
                        <span>${escapeHtml(projectName)}</span>
                        <small>
                            ${escapeHtml(category + sourceLabel)}
                            · ${escapeHtml(formatDate(item.created_at))}
                            · ${escapeHtml(formatBytes(item.file_size))}
                        </small>
                        ${note}
                    </div>
                </div>
                <div class="document-actions">
                    ${openButton}
                    ${downloadButton}
                    ${unavailable}
                </div>
            </article>
        `;
    }));

    if (version !== renderVersion) return;

    documentsList.innerHTML = cards.join("");
}

/* FILTERS */

async function applyFilters() {
    const search = String(documentSearch?.value || "")
        .trim().toLowerCase();

    const projectId = projectFilter?.value || "";
    const type = typeFilter?.value || "";

    const filtered = allDocuments.filter(item => {
        const searchValue = `
            ${item.name || ""}
            ${item.original_file_name || ""}
            ${item.note || ""}
            ${item.project?.name || ""}
            ${item.project?.type || ""}
            ${item.document_type || ""}
        `.toLowerCase();

        return (
            (!search || searchValue.includes(search)) &&
            (!projectId || String(item.project_id) === projectId) &&
            (!type || String(item.document_type || "Ostalo")
                .toLowerCase() === type.toLowerCase())
        );
    });

    await renderDocuments(filtered);
}

documentSearch?.addEventListener("input", applyFilters);
projectFilter?.addEventListener("change", applyFilters);
typeFilter?.addEventListener("change", applyFilters);

/* =====================================================
   FULLSCREEN UPLOAD
===================================================== */

function setUploadBusy(busy) {
    uploadBusy = busy;

    if (submitUploadButton) {
        submitUploadButton.disabled = busy;
    }

    if (cancelUploadButton) {
        cancelUploadButton.disabled = busy;
    }

    if (closeUploadButton) {
        closeUploadButton.disabled = busy;
    }

    if (uploadProject) uploadProject.disabled = busy;
    if (uploadCategory) uploadCategory.disabled = busy;
    if (uploadTitle) uploadTitle.disabled = busy;
    if (uploadNote) uploadNote.disabled = busy;
    if (uploadFiles) uploadFiles.disabled = busy;

    uploadFileList?.querySelectorAll("button").forEach(button => {
        button.disabled = busy;
    });
}

function openUpload() {
    if (!uploadOverlay || !currentSession) return;

    lastFocusedElement = document.activeElement;

    uploadOverlay.hidden = false;
    document.body.classList.add("upload-open");

    if (projectFilter?.value) {
        uploadProject.value = projectFilter.value;
    }

    hideUploadStatus();
    closeUploadButton?.focus();
}

function closeUpload() {
    if (uploadBusy || !uploadOverlay) return;

    uploadOverlay.hidden = true;
    document.body.classList.remove("upload-open");

    uploadForm?.reset();
    selectedFiles = [];

    renderSelectedFiles();
    hideUploadStatus();

    if (lastFocusedElement?.isConnected) {
        lastFocusedElement.focus();
    }
}

openUploadButton?.addEventListener("click", openUpload);
closeUploadButton?.addEventListener("click", closeUpload);
cancelUploadButton?.addEventListener("click", closeUpload);

document.addEventListener("keydown", event => {
    if (!uploadOverlay || uploadOverlay.hidden) return;

    if (event.key === "Escape" && !uploadBusy) {
        closeUpload();
        return;
    }

    if (event.key !== "Tab") return;

    const elements = [...uploadOverlay.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]'
    )].filter(element =>
        element.getClientRects().length > 0
    );

    if (!elements.length) return;

    const first = elements[0];
    const last = elements[elements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

/* FILE SELECTION */

function fileKey(file) {
    return `${file.name}:${file.size}:${file.lastModified}`;
}

function addFiles(files) {
    if (uploadBusy) return;

    const incoming = Array.from(files || []);
    const next = [...selectedFiles];

    for (const file of incoming) {
        const extension = getFileType(file.name);

        if (!Object.hasOwn(MIME_TYPES, extension)) {
            showUploadStatus(
                `Nepodržana vrsta datoteke: ${file.name}`,
                "error"
            );
            return;
        }

        if (file.size === 0 || file.size > MAX_FILE_SIZE) {
            showUploadStatus(
                `Datoteka ${file.name} mora imati između 1 B i 10 MB.`,
                "error"
            );
            return;
        }

        if (next.some(existing => fileKey(existing) === fileKey(file))) {
            continue;
        }

        if (next.length >= MAX_FILES) {
            showUploadStatus(
                "Možete učitati najviše 5 datoteka odjednom.",
                "error"
            );
            return;
        }

        next.push(file);
    }

    selectedFiles = next;
    hideUploadStatus();
    renderSelectedFiles();
}

function renderSelectedFiles() {
    if (!uploadFileList) return;

    uploadFileList.replaceChildren();

    selectedFiles.forEach((file, index) => {
        const row = document.createElement("div");
        row.className = "upload-selected-file";

        const info = document.createElement("div");
        info.className = "upload-selected-info";

        const name = document.createElement("strong");
        name.textContent = file.name;

        const size = document.createElement("span");
        size.textContent = formatBytes(file.size);

        info.append(name, size);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "upload-remove-file";
        remove.textContent = "Ukloni";
        remove.disabled = uploadBusy;
        remove.setAttribute(
            "aria-label",
            `Ukloni datoteku ${file.name}`
        );

        remove.addEventListener("click", () => {
            selectedFiles.splice(index, 1);
            renderSelectedFiles();
        });

        row.append(info, remove);
        uploadFileList.appendChild(row);
    });
}

uploadFiles?.addEventListener("change", event => {
    addFiles(event.target.files);
    uploadFiles.value = "";
});

/* DRAG AND DROP */

if (uploadDropzone) {
    ["dragenter", "dragover"].forEach(eventName => {
        uploadDropzone.addEventListener(eventName, event => {
            event.preventDefault();
            if (!uploadBusy) uploadDropzone.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach(eventName => {
        uploadDropzone.addEventListener(eventName, event => {
            event.preventDefault();
            uploadDropzone.classList.remove("drag-over");
        });
    });

    uploadDropzone.addEventListener("drop", event => {
        if (uploadBusy) return;
        addFiles(event.dataTransfer?.files);
    });
}

/* NOTE COUNTER */

uploadNote?.addEventListener("input", () => {
    if (uploadNoteCounter) {
        uploadNoteCounter.textContent =
            String(uploadNote.value.length);
    }
});

/* SUBMIT */

uploadForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (uploadBusy) return;

    if (!currentSession) {
        showUploadStatus("Sesija je istekla. Prijavite se ponovno.", "error");
        return;
    }

    const projectId = String(uploadProject?.value || "");
    const category = uploadCategory?.value || "";
    const title = uploadTitle?.value.trim() || "";
    const note = uploadNote?.value.trim() || "";

    const ownsProject = allProjects.some(
        project => String(project.id) === projectId
    );

    if (!ownsProject) {
        showUploadStatus("Odaberite svoj projekt.", "error");
        return;
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
        showUploadStatus("Odaberite vrstu dokumenta.", "error");
        return;
    }

    if (!selectedFiles.length) {
        showUploadStatus("Odaberite barem jednu datoteku.", "error");
        return;
    }

    if (title.length > 150 || note.length > 1000) {
        showUploadStatus("Naziv ili napomena predugački su.", "error");
        return;
    }

    setUploadBusy(true);
    hideUploadStatus();

    const userId = currentSession.user.id;
    const storage = supabaseClient.storage.from(UPLOAD_BUCKET);

    let uploadedCount = 0;
    let failedCount = 0;

    for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];
        const extension = getFileType(file.name);

        showUploadStatus(
            `Učitavanje datoteke ${index + 1} od ${selectedFiles.length}: ${file.name}`
        );

        const filePath =
            `${userId}/projekt-${projectId}/${crypto.randomUUID()}.${extension}`;

        try {
            const { error: uploadError } = await storage.upload(
                filePath,
                file,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: MIME_TYPES[extension]
                }
            );

            if (uploadError) throw uploadError;

            const displayTitle =
                title && selectedFiles.length === 1
                    ? title
                    : file.name;

            const { error: databaseError } = await supabaseClient
                .from("client_uploads")
                .insert({
                    user_id: userId,
                    project_id: projectId,
                    title: displayTitle,
                    category,
                    note: note || null,
                    original_file_name: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    content_type: MIME_TYPES[extension]
                });

            if (databaseError) {
                const { error: cleanupError } =
                    await storage.remove([filePath]);

                if (cleanupError) {
                    console.error("Upload cleanup error:", cleanupError);
                }

                throw databaseError;
            }

            uploadedCount++;

        } catch (error) {
            failedCount++;
            console.error("Client upload error:", error);
        }
    }

    setUploadBusy(false);

    if (uploadedCount > 0) {
        await loadDocuments();

        showMessage(
            `${uploadedCount} datoteka uspješno učitano.`,
            "success"
        );
    }

    if (failedCount === 0) {
        closeUpload();
        return;
    }

    showUploadStatus(
        `Uspješno učitano: ${uploadedCount}. Neuspješno: ${failedCount}. Provjerite Supabase pravila i pokušajte ponovno samo s neuspjelim datotekama.`,
        "error"
    );

    if (uploadedCount > 0) {
        const successfullyProcessed = selectedFiles.slice(0, 0);
        // Zadržavamo popis radi pregleda pogreške.
        // Prije novog slanja korisnik može ukloniti već poslane datoteke.
        void successfullyProcessed;
    }
});

/* =====================================================
   UNREAD MESSAGES
===================================================== */

async function loadMessagesUnreadCount() {
    if (!messagesUnreadBadge || !currentSession) return;

    const { count, error } = await supabaseClient
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentSession.user.id)
        .eq("sender_role", "admin")
        .is("client_read_at", null);

    if (error) {
        console.error("Unread messages error:", error);
        return;
    }

    const unread = count || 0;

    messagesUnreadBadge.hidden = unread === 0;
    messagesUnreadBadge.textContent =
        unread > 99 ? "99+" : String(unread);
}

function subscribeToSupportRealtime() {
    if (!currentSession || supportRealtimeChannel) return;

    supportRealtimeChannel = supabaseClient
        .channel(`documents-support-${currentSession.user.id}`)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "support_messages",
                filter: `user_id=eq.${currentSession.user.id}`
            },
            loadMessagesUnreadCount
        )
        .subscribe();
}

/* =====================================================
   PARTICLES
===================================================== */

function createDocumentParticles() {
    const container = $("documentsParticles");
    if (!container) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    container.replaceChildren();

    for (let i = 0; i < 34; i++) {
        const particle = document.createElement("span");
        particle.className = "documents-particle";

        particle.style.setProperty(
            "--particle-top",
            `${Math.random() * 96 + 2}%`
        );

        particle.style.setProperty(
            "--particle-width",
            `${Math.random() * 65 + 30}px`
        );

        particle.style.setProperty(
            "--particle-duration",
            `${Math.random() * 10 + 12}s`
        );

        particle.style.setProperty(
            "--particle-delay",
            `${Math.random() * -22}s`
        );

        particle.style.setProperty(
            "--particle-opacity",
            String(Math.random() * .35 + .3)
        );

        container.appendChild(particle);
    }
}

/* REFRESH */

document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible" && currentSession) {
        await loadMessagesUnreadCount();
        if (!uploadBusy) await loadDocuments();
    }
});

/* START */

async function startDocuments() {
    hideMessage();

    try {
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

        const projectsLoaded = await loadProjects();

        if (!projectsLoaded) {
            documentsList.innerHTML = `
                <div class="documents-empty">
                    Projekte nije moguće učitati.
                </div>
            `;
            return;
        }

        await loadDocuments();
        await loadMessagesUnreadCount();
        subscribeToSupportRealtime();

    } catch (error) {
        console.error("Documents init error:", error);
        showMessage("Došlo je do pogreške pri učitavanju dokumenata.");
    }
}

createDocumentParticles();
startDocuments();
