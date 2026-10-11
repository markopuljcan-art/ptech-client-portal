
/* =========================================
   PTECH DIGITAL CLIENT PORTAL
   COMPLETE SCRIPT.JS
   Dashboard + Projects + Materials + Overview
========================================= */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* GLOBAL */

let projects = [];
let activeProjectIndex = 0;
let currentSession = null;
let currentUserName = "Klijent";
let supportRealtimeChannel = null;
let actionUpdateToken = 0;

let materialsBusy = false;
let materialsProject = null;
let materialsSelectedFiles = [];
let materialsPreviousFocus = null;

const MATERIALS_BUCKET = "project-materials";
const MATERIALS_MAX_FILES = 10;
const MATERIALS_MAX_SIZE = 10 * 1024 * 1024;

const MATERIALS_EXTENSIONS = new Set([
    "jpg", "jpeg", "png", "gif", "webp",
    "svg", "avif", "heic", "heif",
    "pdf", "doc", "docx", "xls", "xlsx",
    "ppt", "pptx", "zip", "txt"
]);

/* ELEMENTS */

const el = id => document.getElementById(id);

const projectsSlider = el("projectsSlider");
const sliderDots = el("sliderDots");
const currentProject = el("currentProject");
const totalProjects = el("totalProjects");

const userTop = el("userTop");
const userGreeting = el("userGreeting");
const logoutButton = el("logoutButton");
const themeToggle = el("themeToggle");

const approveDesignAction = el("approveDesignAction");
const revisionAction = el("revisionAction");
const revisionActionText = el("revisionActionText");
const actionsProjectLabel = el("actionsProjectLabel");

const messagesUnreadBadge = el("messagesUnreadBadge");

const materialsAction = el("materialsAction");
const materialsActionText = el("materialsActionText");
const materialsOverlay = el("materialsOverlay");
const materialsForm = el("materialsForm");
const materialsFiles = el("materialsFiles");
const materialsFileList = el("materialsFileList");
const materialsProjectName = el("materialsProjectName");
const materialsStatus = el("materialsStatus");
const materialsSubmit = el("materialsSubmit");
const materialsClose = el("materialsClose");
const materialsCancel = el("materialsCancel");
const materialsDropzone = el("materialsDropzone");

const previousProjectButton = el("previousProjectButton");
const nextProjectButton = el("nextProjectButton");

const recentMessagesList = el("recentMessagesList");
const recentDocumentsList = el("recentDocumentsList");

/* HELPERS */

function escapeHTML(value) {
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

function formatFileSize(bytes) {
    const size = Number(bytes || 0);

    if (size < 1024) return `${size} B`;

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getActiveProject() {
    return projects[activeProjectIndex] || null;
}

function getProjectLabel(project) {
    return project?.type || project?.name || "Projekt";
}

function getStatusClass(status) {
    const value = String(status || "")
        .trim()
        .toLowerCase();

    if (["završeno", "zavrseno"].includes(value)) {
        return "status-done";
    }

    if (["na čekanju", "na cekanju"].includes(value)) {
        return "status-waiting";
    }

    return "status-progress";
}

function showOverviewMessage(container, message) {
    if (!container) return;

    container.replaceChildren();

    const paragraph = document.createElement("p");
    paragraph.className = "overview-empty";
    paragraph.textContent = message;

    container.appendChild(paragraph);
}

/* THEME */

function applyTheme(theme) {
    const finalTheme = theme === "light"
        ? "light"
        : "dark";

    document.body.classList.toggle(
        "light-mode",
        finalTheme === "light"
    );

    if (themeToggle) {
        themeToggle.checked = finalTheme === "light";
    }

    localStorage.setItem("theme", finalTheme);
}

function loadTheme() {
    const saved = localStorage.getItem("theme");

    applyTheme(saved === "light" ? "light" : "dark");
}

themeToggle?.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "light" : "dark");
});

loadTheme();

/* LATEST PROJECT UPDATE */

async function loadLatestUpdate(projectId, element) {
    if (!projectId || !element) return;

    const { data, error } = await supabaseClient
        .from("activities")
        .select("activity_date")
        .eq("project_id", projectId)
        .not("activity_date", "is", null)
        .order("activity_date", { ascending: false })
        .limit(1);

    if (error) {
        console.error("Latest update error:", error);
    }

    element.textContent = data?.length
        ? formatDate(data[0].activity_date)
        : "-";
}

/* PROJECT ACTIONS */

function updateMaterialsAction() {
    if (!materialsAction) return;

    const available =
        Boolean(currentSession) &&
        Boolean(getActiveProject()) &&
        !materialsBusy;

    materialsAction.disabled = !available;

    materialsAction.setAttribute(
        "aria-disabled",
        String(!available)
    );

    if (materialsActionText) {
        materialsActionText.textContent = materialsBusy
            ? "Slanje u tijeku"
            : available
                ? "Učitaj datoteke"
                : "Nema projekta";
    }
}

async function updateProjectActions() {
    const token = ++actionUpdateToken;
    const project = getActiveProject();

    updateMaterialsAction();

    if (actionsProjectLabel) {
        actionsProjectLabel.textContent = project
            ? `Akcije za: ${getProjectLabel(project)}`
            : "Trenutno nema dostupnog projekta.";
    }

    if (approveDesignAction) {
        approveDesignAction.href = project
            ? `approve.html?id=${encodeURIComponent(project.id)}`
            : "#";

        approveDesignAction.setAttribute(
            "aria-disabled",
            String(!project)
        );
    }

    if (revisionAction) {
        revisionAction.href = "#";
        revisionAction.setAttribute("aria-disabled", "true");
    }

    if (revisionActionText) {
        revisionActionText.textContent = project
            ? "Provjeravam..."
            : "Nema dizajna";
    }

    if (!project) return;

    const { data, error } = await supabaseClient
        .from("project_designs")
        .select("id, project_id, created_at")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(1);

    if (token !== actionUpdateToken) return;

    if (error || !data?.length) {
        if (error) console.error("Design error:", error);

        if (revisionActionText) {
            revisionActionText.textContent = "Nema dizajna";
        }

        return;
    }

    if (revisionAction) {
        revisionAction.href =
            `revision.html?id=${encodeURIComponent(project.id)}` +
            `&design=${encodeURIComponent(data[0].id)}`;

        revisionAction.removeAttribute("aria-disabled");
    }

    if (revisionActionText) {
        revisionActionText.textContent = "Nova izmjena";
    }
}

[approveDesignAction, revisionAction].forEach(link => {
    link?.addEventListener("click", event => {
        if (link.getAttribute("aria-disabled") === "true") {
            event.preventDefault();
        }
    });
});

/* PROJECT CARDS */

function renderProjects() {
    if (
        !projectsSlider ||
        !sliderDots ||
        !currentProject ||
        !totalProjects
    ) return;

    projectsSlider.replaceChildren();
    sliderDots.replaceChildren();

    totalProjects.textContent = String(projects.length);

    if (!projects.length) {
        activeProjectIndex = 0;
        currentProject.textContent = "0";

        projectsSlider.innerHTML = `
            <div class="no-projects">
                Trenutno nema aktivnih projekata.
            </div>
        `;

        updateProjectNavigation();
        updateProjectActions();
        return;
    }

    projects.forEach((project, index) => {
        const progress = Math.max(
            0,
            Math.min(100, Number(project.progress) || 0)
        );

        const slide = document.createElement("div");
        slide.className = "project-slide";

        slide.innerHTML = `
            <a
                class="project-card project-card-link"
                href="project.html?id=${encodeURIComponent(project.id)}"
            >
                <div class="project-heading">
                    <div class="project-main">
                        <div class="project-icon">
                            <svg viewBox="0 0 24 24">
                                <rect x="3" y="4" width="18"
                                    height="13" rx="2"></rect>
                                <path d="M8 21h8"></path>
                                <path d="M12 17v4"></path>
                            </svg>
                        </div>

                        <div class="project-title-wrap">
                            <h3>${escapeHTML(project.type || "Projekt")}</h3>
                            <p>${escapeHTML(project.name || "")}</p>
                        </div>
                    </div>

                    <div class="project-heading-right">
                        <span class="status-badge ${getStatusClass(project.status)}">
                            ${escapeHTML(project.status || "-")}
                        </span>

                        <span class="project-open-arrow"
                            aria-hidden="true">&gt;</span>
                    </div>
                </div>

                <div class="project-stats">

                    <div class="stat-card">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24">
                                <rect x="3" y="7" width="18"
                                    height="13" rx="2"></rect>
                                <path d="M8 7V5"></path>
                                <path d="M16 7V5"></path>
                                <path d="M8 5h8"></path>
                            </svg>
                        </div>
                        <div>
                            <span class="stat-label">Paket</span>
                            <strong class="package-name">
                                ${escapeHTML(project.package || "-")}
                            </strong>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M5 20V12"></path>
                                <path d="M10 20V7"></path>
                                <path d="M15 20V4"></path>
                                <path d="M20 20V10"></path>
                            </svg>
                        </div>
                        <div class="progress-info">
                            <span class="stat-label">Napredak</span>
                            <div class="progress-row">
                                <div class="progress-container">
                                    <div class="progress-bar"
                                        style="width:${progress}%"></div>
                                </div>
                                <strong>${progress}%</strong>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24">
                                <rect x="3" y="5" width="18"
                                    height="16" rx="2"></rect>
                                <path d="M8 3v4"></path>
                                <path d="M16 3v4"></path>
                                <path d="M3 10h18"></path>
                            </svg>
                        </div>
                        <div>
                            <span class="stat-label">Rok</span>
                            <strong>${formatDate(project.deadline)}</strong>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M20 11a8 8 0 1 1-2.34-5.66"></path>
                                <path d="M20 4v7h-7"></path>
                            </svg>
                        </div>
                        <div>
                            <span class="stat-label">
                                Zadnje ažurirano
                            </span>
                            <strong class="latest-update">-</strong>
                        </div>
                    </div>

                </div>
            </a>
        `;

        projectsSlider.appendChild(slide);

        loadLatestUpdate(
            project.id,
            slide.querySelector(".latest-update")
        );

        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "slider-dot";
        dot.setAttribute(
            "aria-label",
            `Prikaži projekt ${index + 1}`
        );

        dot.addEventListener("click", () => {
            goToProject(index);
        });

        sliderDots.appendChild(dot);
    });

    activeProjectIndex = 0;
    updateProjectNavigation();
    updateProjectActions();
}

/* PROJECT SLIDER */

function goToProject(index) {
    const slides = Array.from(
        projectsSlider?.querySelectorAll(".project-slide") || []
    );

    if (!slides[index]) return;

    projectsSlider.scrollTo({
        left:
            slides[index].offsetLeft -
            projectsSlider.offsetLeft,
        behavior: "smooth"
    });

    setActiveProject(index);
}

function setActiveProject(index) {
    if (!projects.length) return;

    const nextIndex = Math.max(
        0,
        Math.min(projects.length - 1, index)
    );

    const changed = activeProjectIndex !== nextIndex;
    activeProjectIndex = nextIndex;

    if (currentProject) {
        currentProject.textContent = String(nextIndex + 1);
    }

    sliderDots?.querySelectorAll(".slider-dot")
        .forEach((dot, dotIndex) => {
            dot.classList.toggle(
                "active",
                dotIndex === nextIndex
            );
        });

    updateProjectNavigation();

    if (changed) updateProjectActions();
}

function updateProjectNavigation() {
    const multiple = projects.length > 1;

    if (previousProjectButton) {
        previousProjectButton.hidden = !multiple;
        previousProjectButton.disabled =
            activeProjectIndex === 0;
    }

    if (nextProjectButton) {
        nextProjectButton.hidden = !multiple;
        nextProjectButton.disabled =
            activeProjectIndex >= projects.length - 1;
    }
}

previousProjectButton?.addEventListener("click", () => {
    goToProject(activeProjectIndex - 1);
});

nextProjectButton?.addEventListener("click", () => {
    goToProject(activeProjectIndex + 1);
});

let projectScrollTimeout;

projectsSlider?.addEventListener("scroll", () => {
    clearTimeout(projectScrollTimeout);

    projectScrollTimeout = setTimeout(() => {
        const slides = Array.from(
            projectsSlider.querySelectorAll(".project-slide")
        );

        if (!slides.length) return;

        let nearestIndex = 0;
        let smallestDistance = Infinity;

        slides.forEach((slide, index) => {
            const distance = Math.abs(
                projectsSlider.scrollLeft -
                (slide.offsetLeft - projectsSlider.offsetLeft)
            );

            if (distance < smallestDistance) {
                smallestDistance = distance;
                nearestIndex = index;
            }
        });

        setActiveProject(nearestIndex);
    }, 100);
});

/* UNREAD MESSAGES */

async function loadMessagesUnreadCount(userId) {
    if (!userId) return;

    const { count, error } = await supabaseClient
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("sender_role", "admin")
        .is("client_read_at", null);

    if (error) {
        console.error("Unread messages error:", error);
        return;
    }

    const unread = count || 0;

    if (messagesUnreadBadge) {
        messagesUnreadBadge.hidden = unread === 0;
        messagesUnreadBadge.textContent =
            unread > 99 ? "99+" : String(unread);
    }

    const sidebarIndicator = document.querySelector(
        ".sidebar-message-indicator"
    );

    if (sidebarIndicator) {
        sidebarIndicator.hidden = unread === 0;
    }
}

/* RECENT MESSAGES */

async function loadRecentMessages() {
    if (!recentMessagesList || !currentSession) return;

    const { data, error } = await supabaseClient
        .from("support_messages")
        .select("*")
        .eq("user_id", currentSession.user.id)
        .order("created_at", { ascending: false })
        .limit(4);

    if (error) {
        console.error("Recent messages error:", error);

        showOverviewMessage(
            recentMessagesList,
            "Poruke trenutno nisu dostupne."
        );
        return;
    }

    if (!data?.length) {
        showOverviewMessage(
            recentMessagesList,
            "Trenutno nema poruka."
        );
        return;
    }

    recentMessagesList.innerHTML = data.map(item => {
        const isAdmin = item.sender_role === "admin";

        const sender = isAdmin
            ? "PTech Digital"
            : "Vi";

        const message =
            item.message ??
            item.content ??
            item.body ??
            "Poruka";

        return `
            <a class="overview-row" href="messages.html">
                <span class="overview-avatar">
                    ${isAdmin ? "P" : "V"}
                </span>

                <span class="overview-row-main">
                    <strong>${escapeHTML(sender)}</strong>
                    <small>${escapeHTML(message)}</small>
                </span>

                <time class="overview-row-date">
                    ${formatDate(item.created_at)}
                </time>
            </a>
        `;
    }).join("");
}

/* RECENT DOCUMENTS */

async function loadRecentDocuments() {
    if (!recentDocumentsList || !currentSession) return;

    const projectIds = projects.map(project => project.id);

    if (!projectIds.length) {
        showOverviewMessage(
            recentDocumentsList,
            "Trenutno nema dokumenata."
        );
        return;
    }

    const { data, error } = await supabaseClient
        .from("project_documents")
        .select(`
            id,
            name,
            created_at,
            project_id,
            file_size
        `)
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(4);

    if (error) {
        console.error("Recent documents error:", error);

        showOverviewMessage(
            recentDocumentsList,
            "Dokumenti trenutno nisu dostupni."
        );
        return;
    }

    if (!data?.length) {
        showOverviewMessage(
            recentDocumentsList,
            "Trenutno nema dokumenata."
        );
        return;
    }

    recentDocumentsList.innerHTML = data.map(item => {
        const name = item.name || "Dokument";

        const extension = name.split(".")
            .pop()
            .toUpperCase();

        const type = extension.length <= 4
            ? extension
            : "FILE";

        return `
            <div class="overview-row">
                <span class="overview-file-icon">
                    ${escapeHTML(type)}
                </span>

                <span class="overview-row-main">
                    <strong>${escapeHTML(name)}</strong>
                    <small>
                        ${formatFileSize(item.file_size)}
                    </small>
                </span>

                <time class="overview-row-date">
                    ${formatDate(item.created_at)}
                </time>

                <a
                    class="overview-download"
                    href="documents.html"
                    title="Otvori dokumente"
                    aria-label="Otvori dokumente"
                >&darr;</a>
            </div>
        `;
    }).join("");
}

/* SUPPORT REALTIME */

function subscribeToSupportRealtime(userId) {
    if (!userId || supportRealtimeChannel) return;

    supportRealtimeChannel = supabaseClient
        .channel(`home-support-${userId}`)
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "support_messages",
                filter: `user_id=eq.${userId}`
            },
            async () => {
                await Promise.all([
                    loadMessagesUnreadCount(userId),
                    loadRecentMessages()
                ]);
            }
        )
        .subscribe();
}

/* MATERIALS HELPERS */

function sanitizeMaterialsFolderName(value) {
    return String(value || "klijent")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60)
        .replace(/-$/g, "") || "klijent";
}

function getMaterialsExtension(name) {
    const index = String(name || "").lastIndexOf(".");

    return index >= 0
        ? name.slice(index + 1).toLowerCase()
        : "";
}

function createMaterialsUniqueId() {
    return crypto.randomUUID();
}

function buildMaterialsStoragePath(userId, projectId, file) {
    const number = Number(projectId);

    if (!Number.isSafeInteger(number) || number <= 0) {
        throw new Error("Neispravan broj projekta.");
    }

    const extension = getMaterialsExtension(file.name);

    const base = file.name.slice(
        0,
        file.name.length - extension.length - 1
    );

    const safeName = sanitizeMaterialsFolderName(base)
        .slice(0, 65);

    const folder = sanitizeMaterialsFolderName(
        currentUserName
    );

    return (
        `${folder}--${userId}/` +
        `projekt-${number}/` +
        `${safeName}-${createMaterialsUniqueId()}.${extension}`
    );
}

function materialsSetStatus(message, type = "") {
    if (!materialsStatus) return;

    materialsStatus.textContent = message;

    materialsStatus.classList.remove(
        "success",
        "error"
    );

    if (type) materialsStatus.classList.add(type);
}

function materialsSetBusy(busy) {
    materialsBusy = Boolean(busy);

    if (materialsSubmit) {
        materialsSubmit.disabled = materialsBusy;
        materialsSubmit.textContent = materialsBusy
            ? "Slanje u tijeku..."
            : "Pošalji materijale";
    }

    if (materialsClose) {
        materialsClose.disabled = materialsBusy;
    }

    if (materialsCancel) {
        materialsCancel.disabled = materialsBusy;
    }

    if (materialsFiles) {
        materialsFiles.disabled = materialsBusy;
    }

    updateMaterialsAction();
}

function validateMaterialsFiles(files) {
    if (!files.length) {
        return "Odaberi barem jednu datoteku.";
    }

    if (files.length > MATERIALS_MAX_FILES) {
        return "Možeš poslati najviše 10 datoteka odjednom.";
    }

    for (const file of files) {
        if (file.size === 0) {
            return `Datoteka "${file.name}" je prazna.`;
        }

        if (file.size > MATERIALS_MAX_SIZE) {
            return `Datoteka "${file.name}" je prevelika. Najviše 10 MB.`;
        }

        const extension = getMaterialsExtension(file.name);

        if (!MATERIALS_EXTENSIONS.has(extension)) {
            return `Vrsta datoteke "${file.name}" nije podržana.`;
        }
    }

    return null;
}

function renderMaterialsFileList() {
    if (!materialsFileList) return;

    materialsFileList.replaceChildren();

    materialsSelectedFiles.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "materials-file-item";

        const name = document.createElement("strong");
        name.textContent = `${index + 1}. ${file.name}`;

        const size = document.createElement("span");
        size.textContent = ` · ${formatFileSize(file.size)}`;

        item.append(name, size);
        materialsFileList.appendChild(item);
    });
}

function setMaterialsSelectedFiles(files) {
    if (materialsBusy) return;

    materialsSelectedFiles = Array.from(files || []);

    renderMaterialsFileList();

    if (!materialsSelectedFiles.length) {
        materialsSetStatus("");
        return;
    }

    const error = validateMaterialsFiles(
        materialsSelectedFiles
    );

    if (error) {
        materialsSetStatus(error, "error");
    } else {
        materialsSetStatus(
            `Odabrano datoteka: ${materialsSelectedFiles.length}`
        );
    }
}

/* MATERIALS MODAL */

function openMaterialsModal() {
    const project = getActiveProject();

    if (!materialsOverlay || !materialsForm) return;

    if (!currentSession || !project || materialsBusy) {
        return;
    }

    materialsProject = {
        id: project.id,
        name: project.name,
        type: project.type
    };

    materialsPreviousFocus = document.activeElement;

    if (materialsProjectName) {
        materialsProjectName.textContent =
            `${getProjectLabel(project)} · ` +
            `${project.name || "Projekt"} · ` +
            `Projekt #${project.id}`;
    }

    materialsForm.reset();
    materialsSelectedFiles = [];
    renderMaterialsFileList();
    materialsSetStatus("");

    materialsOverlay.hidden = false;

    document.body.classList.add(
        "materials-modal-open"
    );

    materialsClose?.focus();
}

function closeMaterialsModal() {
    if (!materialsOverlay || materialsBusy) return;

    materialsOverlay.hidden = true;

    document.body.classList.remove(
        "materials-modal-open"
    );

    materialsProject = null;
    materialsSelectedFiles = [];

    materialsForm?.reset();
    renderMaterialsFileList();
    materialsSetStatus("");

    materialsPreviousFocus?.focus?.();
}

materialsAction?.addEventListener(
    "click",
    openMaterialsModal
);

materialsClose?.addEventListener(
    "click",
    closeMaterialsModal
);

materialsCancel?.addEventListener(
    "click",
    closeMaterialsModal
);

materialsOverlay?.addEventListener("click", event => {
    if (event.target === materialsOverlay) {
        closeMaterialsModal();
    }
});

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        materialsOverlay &&
        !materialsOverlay.hidden
    ) {
        closeMaterialsModal();
    }
});

materialsFiles?.addEventListener("change", () => {
    setMaterialsSelectedFiles(materialsFiles.files);
});

materialsDropzone?.addEventListener("dragover", event => {
    event.preventDefault();

    if (!materialsBusy) {
        materialsDropzone.classList.add("dragover");
    }
});

materialsDropzone?.addEventListener("dragleave", () => {
    materialsDropzone.classList.remove("dragover");
});

materialsDropzone?.addEventListener("drop", event => {
    event.preventDefault();

    materialsDropzone.classList.remove("dragover");

    if (!materialsBusy && event.dataTransfer?.files) {
        setMaterialsSelectedFiles(event.dataTransfer.files);
    }
});

/* UPLOAD MATERIALS */

materialsForm?.addEventListener("submit", async event => {
    event.preventDefault();

    if (materialsBusy) return;

    if (!materialsProject || !currentSession) {
        materialsSetStatus(
            "Projekt nije odabran.",
            "error"
        );
        return;
    }

    const files = [...materialsSelectedFiles];
    const validationError = validateMaterialsFiles(files);

    if (validationError) {
        materialsSetStatus(validationError, "error");
        return;
    }

    materialsSetBusy(true);

    let uploadedCount = 0;

    try {
        const {
            data: userData,
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError || !userData?.user) {
            throw new Error(
                "Sesija je istekla. Prijavi se ponovno."
            );
        }

        const userId = userData.user.id;

        const {
            data: ownedProject,
            error: projectError
        } = await supabaseClient
            .from("projects")
            .select("id")
            .eq("id", materialsProject.id)
            .eq("user_id", userId)
            .maybeSingle();

        if (projectError) throw projectError;

        if (!ownedProject) {
            throw new Error(
                "Nemaš pristup odabranom projektu."
            );
        }

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            materialsSetStatus(
                `Šaljem ${i + 1} od ${files.length}: ${file.name}`
            );

            const path = buildMaterialsStoragePath(
                userId,
                materialsProject.id,
                file
            );

            const { error } = await supabaseClient.storage
                .from(MATERIALS_BUCKET)
                .upload(path, file, {
                    upsert: false,
                    cacheControl: "3600",
                    contentType:
                        file.type || "application/octet-stream"
                });

            if (error) {
                throw new Error(
                    `Neuspjelo slanje "${file.name}": ${error.message}`
                );
            }

            uploadedCount++;
        }

        materialsSetStatus(
            `Uspješno poslano ${uploadedCount} od ` +
            `${files.length} datoteka!`,
            "success"
        );

        materialsSelectedFiles = [];
        materialsForm.reset();
        renderMaterialsFileList();

    } catch (error) {
        console.error("Materials upload error:", error);

        materialsSetStatus(
            `Poslano ${uploadedCount} od ${files.length}. ` +
            `Greška: ${error.message || "Nepoznata greška."}`,
            "error"
        );

    } finally {
        materialsSetBusy(false);
    }
});

/* DASHBOARD LOAD */

async function loadDashboard() {
    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        window.location.href = "login.html";
        return;
    }

    currentSession = session;

    updateMaterialsAction();

    await loadMessagesUnreadCount(session.user.id);

    subscribeToSupportRealtime(session.user.id);

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Profile error:", profileError);
    }

    currentUserName =
        profile?.display_name ||
        session.user.email?.split("@")[0] ||
        "Klijent";

    if (userTop) {
        userTop.textContent = currentUserName;
    }

    if (userGreeting) {
        userGreeting.textContent = currentUserName;
    }

    const {
        data,
        error: projectError
    } = await supabaseClient
        .from("projects")
        .select(`
            id,
            type,
            name,
            status,
            progress,
            deadline,
            package
        `)
        .eq("user_id", session.user.id);

    if (projectError) {
        console.error("Projects error:", projectError);
        projects = [];
    } else {
        projects = data || [];
    }

    renderProjects();

    await Promise.all([
        loadRecentMessages(),
        loadRecentDocuments()
    ]);
}

/* LOGOUT */

logoutButton?.addEventListener("click", async () => {
    if (materialsBusy) {
        alert("Pričekaj završetak slanja materijala.");
        return;
    }

    if (supportRealtimeChannel) {
        await supabaseClient.removeChannel(
            supportRealtimeChannel
        );

        supportRealtimeChannel = null;
    }

    await supabaseClient.auth.signOut();

    window.location.href = "login.html";
});

/* REFRESH ON RETURN */

document.addEventListener(
    "visibilitychange",
    async () => {
        if (
            document.visibilityState === "visible" &&
            currentSession
        ) {
            await Promise.all([
                loadMessagesUnreadCount(
                    currentSession.user.id
                ),
                loadRecentMessages(),
                loadRecentDocuments()
            ]);
        }
    }
);

/* START */

updateMaterialsAction();
loadDashboard();
