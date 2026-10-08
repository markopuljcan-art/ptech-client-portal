
/* =========================================
   PTECH DIGITAL CLIENT PORTAL
   COMPLETE SCRIPT.JS
========================================= */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* =========================================
   GLOBAL
========================================= */

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
const MATERIALS_MAX_FILE_SIZE = 10 * 1024 * 1024;

const MATERIALS_ALLOWED_EXTENSIONS = new Set([
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "avif",
    "heic",
    "heif",
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "zip",
    "txt"
]);

/* =========================================
   ELEMENTS
========================================= */

const projectsSlider =
    document.getElementById("projectsSlider");

const sliderDots =
    document.getElementById("sliderDots");

const currentProject =
    document.getElementById("currentProject");

const totalProjects =
    document.getElementById("totalProjects");

const userTop =
    document.getElementById("userTop");

const userGreeting =
    document.getElementById("userGreeting");

const logoutButton =
    document.getElementById("logoutButton");

const themeToggle =
    document.getElementById("themeToggle");

const approveDesignAction =
    document.getElementById("approveDesignAction");

const revisionAction =
    document.getElementById("revisionAction");

const revisionActionText =
    document.getElementById("revisionActionText");

const actionsProjectLabel =
    document.getElementById("actionsProjectLabel");

const messagesUnreadBadge =
    document.getElementById("messagesUnreadBadge");

/* MATERIALS */

const materialsAction =
    document.getElementById("materialsAction");

const materialsActionText =
    document.getElementById("materialsActionText");

const materialsOverlay =
    document.getElementById("materialsOverlay");

const materialsForm =
    document.getElementById("materialsForm");

const materialsFiles =
    document.getElementById("materialsFiles");

const materialsFileList =
    document.getElementById("materialsFileList");

const materialsProjectName =
    document.getElementById("materialsProjectName");

const materialsStatus =
    document.getElementById("materialsStatus");

const materialsSubmit =
    document.getElementById("materialsSubmit");

const materialsClose =
    document.getElementById("materialsClose");

const materialsCancel =
    document.getElementById("materialsCancel");

const materialsDropzone =
    document.getElementById("materialsDropzone");

/* =========================================
   HELPERS
========================================= */

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

    const raw = String(value).slice(0, 10);
    const date = new Date(raw + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString("hr-HR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getActiveProject() {
    return projects[activeProjectIndex] || null;
}

function getProjectLabel(project) {
    return (
        project?.type ||
        project?.name ||
        "Projekt"
    );
}

function getStatusClass(status) {
    const value = String(status || "")
        .trim()
        .toLowerCase();

    if (
        value === "završeno" ||
        value === "zavrseno"
    ) {
        return "status-done";
    }

    if (
        value === "na čekanju" ||
        value === "na cekanju"
    ) {
        return "status-waiting";
    }

    return "status-progress";
}

/* =========================================
   THEME
========================================= */

function applyTheme(theme) {
    const finalTheme =
        theme === "light" ? "light" : "dark";

    document.body.classList.toggle(
        "light-mode",
        finalTheme === "light"
    );

    if (themeToggle) {
        themeToggle.checked =
            finalTheme === "light";
    }

    localStorage.setItem(
        "theme",
        finalTheme
    );
}

function loadTheme() {
    const savedTheme =
        localStorage.getItem("theme");

    applyTheme(
        savedTheme === "light"
            ? "light"
            : "dark"
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

/* =========================================
   LATEST PROJECT UPDATE
========================================= */

async function loadLatestUpdate(
    projectId,
    element
) {
    if (!projectId || !element) return;

    const { data, error } =
        await supabaseClient
            .from("activities")
            .select("activity_date")
            .eq("project_id", projectId)
            .not("activity_date", "is", null)
            .order("activity_date", {
                ascending: false
            })
            .limit(1);

    if (error) {
        console.error(
            "Greška kod zadnjeg ažuriranja:",
            error
        );

        element.textContent = "-";
        return;
    }

    if (!data || data.length === 0) {
        element.textContent = "-";
        return;
    }

    element.textContent =
        formatDate(data[0].activity_date);
}

/* =========================================
   MATERIALS BUTTON STATE
========================================= */

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
        if (materialsBusy) {
            materialsActionText.textContent =
                "Slanje u tijeku";
        } else if (!available) {
            materialsActionText.textContent =
                "Nema projekta";
        } else {
            materialsActionText.textContent =
                "Učitaj datoteke";
        }
    }
}

/* =========================================
   PROJECT ACTIONS
========================================= */

async function updateProjectActions() {
    const token = ++actionUpdateToken;
    const project = getActiveProject();

    updateMaterialsAction();

    if (!project) {
        if (approveDesignAction) {
            approveDesignAction.href = "#";

            approveDesignAction.setAttribute(
                "aria-disabled",
                "true"
            );
        }

        if (revisionAction) {
            revisionAction.href = "#";

            revisionAction.setAttribute(
                "aria-disabled",
                "true"
            );
        }

        if (revisionActionText) {
            revisionActionText.textContent =
                "Nema dizajna";
        }

        if (actionsProjectLabel) {
            actionsProjectLabel.textContent =
                "Trenutno nema dostupnog projekta.";
        }

        return;
    }

    if (actionsProjectLabel) {
        actionsProjectLabel.textContent =
            `Akcije za: ${getProjectLabel(project)}`;
    }

    /* APPROVE */

    if (approveDesignAction) {
        approveDesignAction.href =
            `approve.html?id=${encodeURIComponent(project.id)}`;

        approveDesignAction.removeAttribute(
            "aria-disabled"
        );
    }

    /* REVISION - LOADING */

    if (revisionAction) {
        revisionAction.href = "#";

        revisionAction.setAttribute(
            "aria-disabled",
            "true"
        );
    }

    if (revisionActionText) {
        revisionActionText.textContent =
            "Provjeravam...";
    }

    /* LATEST DESIGN */

    const { data, error } =
        await supabaseClient
            .from("project_designs")
            .select("id, project_id, created_at")
            .eq("project_id", project.id)
            .order("created_at", {
                ascending: false
            })
            .limit(1);

    if (token !== actionUpdateToken) {
        return;
    }

    if (error || !data || data.length === 0) {
        if (error) {
            console.error(
                "Greška kod provjere dizajna:",
                error
            );
        }

        if (revisionAction) {
            revisionAction.href = "#";

            revisionAction.setAttribute(
                "aria-disabled",
                "true"
            );
        }

        if (revisionActionText) {
            revisionActionText.textContent =
                "Nema dizajna";
        }

        return;
    }

    const design = data[0];

    if (revisionAction) {
        revisionAction.href =
            `revision.html?id=${encodeURIComponent(project.id)}` +
            `&design=${encodeURIComponent(design.id)}`;

        revisionAction.removeAttribute(
            "aria-disabled"
        );
    }

    if (revisionActionText) {
        revisionActionText.textContent =
            "Nova izmjena";
    }
}

/* =========================================
   PREVENT DISABLED LINKS
========================================= */

revisionAction?.addEventListener(
    "click",
    function (event) {
        if (
            revisionAction.getAttribute(
                "aria-disabled"
            ) === "true"
        ) {
            event.preventDefault();
        }
    }
);

approveDesignAction?.addEventListener(
    "click",
    function (event) {
        if (
            approveDesignAction.getAttribute(
                "aria-disabled"
            ) === "true"
        ) {
            event.preventDefault();
        }
    }
);

/* =========================================
   RENDER PROJECTS
========================================= */

function renderProjects() {
    if (
        !projectsSlider ||
        !sliderDots ||
        !currentProject ||
        !totalProjects
    ) {
        return;
    }

    projectsSlider.innerHTML = "";
    sliderDots.innerHTML = "";

    totalProjects.textContent =
        String(projects.length);

    if (projects.length === 0) {
        activeProjectIndex = 0;
        currentProject.textContent = "0";

        projectsSlider.innerHTML = `
            <div class="no-projects">
                Trenutno nema aktivnih projekata.
            </div>
        `;

        updateProjectActions();
        return;
    }

    projects.forEach(function (project, index) {
        const statusClass =
            getStatusClass(project.status);

        const progress = Math.max(
            0,
            Math.min(
                100,
                Number(project.progress) || 0
            )
        );

        const slide =
            document.createElement("div");

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
                                <rect
                                    x="3"
                                    y="4"
                                    width="18"
                                    height="13"
                                    rx="2"
                                ></rect>
                                <path d="M8 21h8"></path>
                                <path d="M12 17v4"></path>
                            </svg>
                        </div>

                        <div class="project-title-wrap">
                            <h3>
                                ${escapeHTML(project.type || "Projekt")}
                            </h3>
                            <p>
                                ${escapeHTML(project.name || "")}
                            </p>
                        </div>

                    </div>

                    <div class="project-heading-right">

                        <span class="status-badge ${statusClass}">
                            ${escapeHTML(project.status || "-")}
                        </span>

                        <span
                            class="project-open-arrow"
                            aria-hidden="true"
                        >
                            &gt;
                        </span>

                    </div>
                </div>

                <div class="project-stats">

                    <div class="stat-card">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24">
                                <rect
                                    x="3"
                                    y="7"
                                    width="18"
                                    height="13"
                                    rx="2"
                                ></rect>
                                <path d="M8 7V5"></path>
                                <path d="M16 7V5"></path>
                                <path d="M8 5h8"></path>
                            </svg>
                        </div>

                        <div>
                            <span class="stat-label">
                                Paket
                            </span>
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
                            <span class="stat-label">
                                Napredak
                            </span>

                            <div class="progress-row">
                                <div class="progress-container">
                                    <div
                                        class="progress-bar"
                                        style="width: ${progress}%"
                                    ></div>
                                </div>

                                <strong>${progress}%</strong>
                            </div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24">
                                <rect
                                    x="3"
                                    y="5"
                                    width="18"
                                    height="16"
                                    rx="2"
                                ></rect>
                                <path d="M8 3v4"></path>
                                <path d="M16 3v4"></path>
                                <path d="M3 10h18"></path>
                            </svg>
                        </div>

                        <div>
                            <span class="stat-label">
                                Rok
                            </span>
                            <strong>
                                ${formatDate(project.deadline)}
                            </strong>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24">
                                <path
                                    d="M20 11a8 8 0 1 1-2.34-5.66"
                                ></path>
                                <path d="M20 4v7h-7"></path>
                            </svg>
                        </div>

                        <div>
                            <span class="stat-label">
                                Zadnje ažurirano
                            </span>

                            <strong class="latest-update">
                                -
                            </strong>
                        </div>
                    </div>

                </div>
            </a>
        `;

        projectsSlider.appendChild(slide);

        const latestUpdate =
            slide.querySelector(".latest-update");

        loadLatestUpdate(
            project.id,
            latestUpdate
        );

        const dot =
            document.createElement("button");

        dot.type = "button";
        dot.className = "slider-dot";

        dot.setAttribute(
            "aria-label",
            `Prikaži projekt ${index + 1}`
        );

        if (index === 0) {
            dot.classList.add("active");
        }

        dot.addEventListener(
            "click",
            function () {
                const slides =
                    projectsSlider.querySelectorAll(
                        ".project-slide"
                    );

                const targetSlide = slides[index];

                if (!targetSlide) return;

                projectsSlider.scrollTo({
                    left: targetSlide.offsetLeft,
                    behavior: "smooth"
                });
            }
        );

        sliderDots.appendChild(dot);
    });

    activeProjectIndex = 0;
    currentProject.textContent = "1";

    updateProjectActions();
}

/* =========================================
   PROJECT SLIDER
========================================= */

function setupProjectSlider() {
    if (!projectsSlider || !currentProject) {
        return;
    }

    let scrollTimeout;

    projectsSlider.addEventListener(
        "scroll",
        function () {
            clearTimeout(scrollTimeout);

            scrollTimeout = setTimeout(
                function () {
                    if (projects.length === 0) {
                        return;
                    }

                    const slides = Array.from(
                        projectsSlider.querySelectorAll(
                            ".project-slide"
                        )
                    );

                    if (slides.length === 0) {
                        return;
                    }

                    let index = 0;
                    let smallestDistance = Infinity;

                    slides.forEach(function (
                        slide,
                        slideIndex
                    ) {
                        const distance = Math.abs(
                            projectsSlider.scrollLeft -
                            slide.offsetLeft
                        );

                        if (distance < smallestDistance) {
                            smallestDistance = distance;
                            index = slideIndex;
                        }
                    });

                    if (activeProjectIndex !== index) {
                        activeProjectIndex = index;
                        updateProjectActions();
                    }

                    currentProject.textContent =
                        String(index + 1);

                    const dots =
                        sliderDots?.querySelectorAll(
                            ".slider-dot"
                        ) || [];

                    dots.forEach(function (
                        dot,
                        dotIndex
                    ) {
                        dot.classList.toggle(
                            "active",
                            dotIndex === index
                        );
                    });
                },
                100
            );
        }
    );
}

/* =========================================
   UNREAD SUPPORT MESSAGES
========================================= */

async function loadMessagesUnreadCount(userId) {
    if (!messagesUnreadBadge || !userId) {
        return;
    }

    const { count, error } =
        await supabaseClient
            .from("support_messages")
            .select("id", {
                count: "exact",
                head: true
            })
            .eq("user_id", userId)
            .eq("sender_role", "admin")
            .is("client_read_at", null);

    if (error) {
        console.error(
            "Greška kod brojanja poruka:",
            error
        );
        return;
    }

    const unreadCount = count || 0;

    if (unreadCount > 0) {
        messagesUnreadBadge.hidden = false;

        messagesUnreadBadge.textContent =
            unreadCount > 99
                ? "99+"
                : String(unreadCount);
    } else {
        messagesUnreadBadge.hidden = true;
        messagesUnreadBadge.textContent = "0";
    }
}

/* =========================================
   SUPPORT REALTIME
========================================= */

function subscribeToSupportRealtime(userId) {
    if (!userId || supportRealtimeChannel) {
        return;
    }

    supportRealtimeChannel =
        supabaseClient
            .channel(`home-support-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "support_messages",
                    filter: `user_id=eq.${userId}`
                },
                async function () {
                    await loadMessagesUnreadCount(
                        userId
                    );
                }
            )
            .subscribe();
}

/* =========================================
   MATERIALS - NAME SANITIZATION
========================================= */

/*
   Storage path:

   ime-klijenta--USER_UUID/
       projekt-PROJECT_ID/
           naziv-JEDINSTVENI_ID.ext

   Prvi folder mora sadrzavati "--"
   prije korisnickog UUID-a jer to
   provjeravaju Supabase RLS pravila.
*/

function sanitizeMaterialsFolderName(value) {
    const normalized = String(value || "klijent")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60)
        .replace(/-$/g, "");

    return normalized || "klijent";
}

function sanitizeMaterialsFileName(value) {
    const raw = String(value || "datoteka");

    const lastDot = raw.lastIndexOf(".");

    const base = lastDot > 0
        ? raw.slice(0, lastDot)
        : raw;

    return (
        sanitizeMaterialsFolderName(base)
            .slice(0, 65) ||
        "datoteka"
    );
}

function getMaterialsExtension(fileName) {
    const name = String(fileName || "");
    const index = name.lastIndexOf(".");

    if (index < 0) return "";

    return name.slice(index + 1).toLowerCase();
}

function createMaterialsUniqueId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    const randomValues = new Uint8Array(16);
    crypto.getRandomValues(randomValues);

    return Array.from(randomValues)
        .map(value =>
            value.toString(16).padStart(2, "0")
        )
        .join("");
}

function buildMaterialsStoragePath(
    userId,
    projectId,
    file
) {
    const clientFolder =
        sanitizeMaterialsFolderName(
            currentUserName
        );

    const projectNumber = Number(projectId);

    if (
        !Number.isSafeInteger(projectNumber) ||
        projectNumber <= 0
    ) {
        throw new Error(
            "Neispravan broj projekta."
        );
    }

    const extension =
        getMaterialsExtension(file.name);

    const safeName =
        sanitizeMaterialsFileName(file.name);

    const uniqueId =
        createMaterialsUniqueId();

    const fileName =
        `${safeName}-${uniqueId}.${extension}`;

    return (
        `${clientFolder}--${userId}/` +
        `projekt-${projectNumber}/` +
        fileName
    );
}

/* =========================================
   MATERIALS - STATUS
========================================= */

function materialsSetStatus(
    message,
    type = ""
) {
    if (!materialsStatus) return;

    materialsStatus.textContent = message;

    materialsStatus.classList.remove(
        "success",
        "error"
    );

    if (type) {
        materialsStatus.classList.add(type);
    }
}

function materialsSetBusy(busy) {
    materialsBusy = Boolean(busy);

    if (materialsSubmit) {
        materialsSubmit.disabled =
            materialsBusy;

        materialsSubmit.textContent =
            materialsBusy
                ? "Slanje u tijeku..."
                : "Pošalji materijale";
    }

    if (materialsClose) {
        materialsClose.disabled =
            materialsBusy;
    }

    if (materialsCancel) {
        materialsCancel.disabled =
            materialsBusy;
    }

    if (materialsFiles) {
        materialsFiles.disabled =
            materialsBusy;
    }

    updateMaterialsAction();
}

/* =========================================
   MATERIALS - FILE VALIDATION
========================================= */

function validateMaterialsFiles(files) {
    if (!files.length) {
        return "Odaberi barem jednu datoteku.";
    }

    if (files.length > MATERIALS_MAX_FILES) {
        return (
            `Možeš poslati najviše ` +
            `${MATERIALS_MAX_FILES} datoteka odjednom.`
        );
    }

    for (const file of files) {
        if (file.size === 0) {
            return (
                `Datoteka "${file.name}" je prazna.`
            );
        }

        if (file.size > MATERIALS_MAX_FILE_SIZE) {
            return (
                `Datoteka "${file.name}" je prevelika. ` +
                `Najviše 10 MB po datoteci.`
            );
        }

        const extension =
            getMaterialsExtension(file.name);

        if (
            !MATERIALS_ALLOWED_EXTENSIONS.has(
                extension
            )
        ) {
            return (
                `Vrsta datoteke "${file.name}" ` +
                `nije podržana.`
            );
        }
    }

    return null;
}

/* =========================================
   MATERIALS - FILE LIST
========================================= */

function renderMaterialsFileList() {
    if (!materialsFileList) return;

    materialsFileList.replaceChildren();

    if (materialsSelectedFiles.length === 0) {
        return;
    }

    materialsSelectedFiles.forEach(
        function (file, index) {
            const item =
                document.createElement("div");

            item.className =
                "materials-file-item";

            const fileName =
                document.createElement("strong");

            fileName.textContent =
                `${index + 1}. ${file.name}`;

            const fileSize =
                document.createElement("span");

            fileSize.textContent =
                ` · ${formatFileSize(file.size)}`;

            item.appendChild(fileName);
            item.appendChild(fileSize);

            materialsFileList.appendChild(item);
        }
    );
}

function setMaterialsSelectedFiles(files) {
    if (materialsBusy) return;

    materialsSelectedFiles =
        Array.from(files || []);

    renderMaterialsFileList();

    const validationError =
        validateMaterialsFiles(
            materialsSelectedFiles
        );

    if (materialsSelectedFiles.length === 0) {
        materialsSetStatus("");
        return;
    }

    if (validationError) {
        materialsSetStatus(
            validationError,
            "error"
        );
    } else {
        materialsSetStatus(
            `Odabrano datoteka: ` +
            `${materialsSelectedFiles.length}`
        );
    }
}

/* =========================================
   MATERIALS - OPEN MODAL
========================================= */

function openMaterialsModal() {
    const project = getActiveProject();

    if (
        !materialsOverlay ||
        !materialsForm
    ) {
        console.error(
            "Prozor za materijale nije pronađen."
        );
        return;
    }

    if (!currentSession) {
        alert("Moraš biti prijavljen.");
        return;
    }

    if (!project) {
        alert("Prvo odaberi projekt.");
        return;
    }

    if (materialsBusy) return;

    materialsProject = {
        id: project.id,
        name: project.name,
        type: project.type
    };

    materialsPreviousFocus =
        document.activeElement;

    if (materialsProjectName) {
        materialsProjectName.textContent =
            `${getProjectLabel(project)}` +
            ` · ${project.name || "Projekt"}` +
            ` · Projekt #${project.id}`;
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

/* =========================================
   MATERIALS - CLOSE MODAL
========================================= */

function closeMaterialsModal() {
    if (!materialsOverlay || materialsBusy) {
        return;
    }

    materialsOverlay.hidden = true;

    document.body.classList.remove(
        "materials-modal-open"
    );

    materialsProject = null;
    materialsSelectedFiles = [];

    if (materialsForm) {
        materialsForm.reset();
    }

    renderMaterialsFileList();
    materialsSetStatus("");

    if (
        materialsPreviousFocus &&
        typeof materialsPreviousFocus.focus ===
            "function"
    ) {
        materialsPreviousFocus.focus();
    }
}

/* =========================================
   MATERIALS - EVENTS
========================================= */

materialsAction?.addEventListener(
    "click",
    function () {
        if (!materialsAction.disabled) {
            openMaterialsModal();
        }
    }
);

materialsClose?.addEventListener(
    "click",
    closeMaterialsModal
);

materialsCancel?.addEventListener(
    "click",
    closeMaterialsModal
);

materialsOverlay?.addEventListener(
    "click",
    function (event) {
        if (event.target === materialsOverlay) {
            closeMaterialsModal();
        }
    }
);

document.addEventListener(
    "keydown",
    function (event) {
        if (
            event.key === "Escape" &&
            materialsOverlay &&
            !materialsOverlay.hidden
        ) {
            closeMaterialsModal();
        }
    }
);

materialsFiles?.addEventListener(
    "change",
    function () {
        setMaterialsSelectedFiles(
            materialsFiles.files
        );
    }
);

/* =========================================
   MATERIALS - DRAG AND DROP
========================================= */

if (materialsDropzone) {
    materialsDropzone.addEventListener(
        "dragover",
        function (event) {
            event.preventDefault();

            if (!materialsBusy) {
                materialsDropzone.classList.add(
                    "dragover"
                );
            }
        }
    );

    materialsDropzone.addEventListener(
        "dragleave",
        function () {
            materialsDropzone.classList.remove(
                "dragover"
            );
        }
    );

    materialsDropzone.addEventListener(
        "drop",
        function (event) {
            event.preventDefault();

            materialsDropzone.classList.remove(
                "dragover"
            );

            if (materialsBusy) return;

            const files =
                event.dataTransfer?.files;

            if (files && files.length > 0) {
                /*
                 * Datoteke cuvamo u vlastitom
                 * popisu jer file input ne mora
                 * dopustati programsko postavljanje.
                 */
                setMaterialsSelectedFiles(files);
            }
        }
    );
}

/* =========================================
   MATERIALS - UPLOAD TO SUPABASE
========================================= */

materialsForm?.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        if (materialsBusy) return;

        if (!materialsProject) {
            materialsSetStatus(
                "Projekt nije odabran.",
                "error"
            );
            return;
        }

        const files =
            [...materialsSelectedFiles];

        const validationError =
            validateMaterialsFiles(files);

        if (validationError) {
            materialsSetStatus(
                validationError,
                "error"
            );
            return;
        }

        materialsSetBusy(true);

        let uploadedCount = 0;

        try {
            /*
             * Ponovno provjeravamo korisnika
             * prije slanja datoteka.
             */
            const {
                data: userData,
                error: userError
            } =
                await supabaseClient.auth.getUser();

            if (
                userError ||
                !userData?.user
            ) {
                throw new Error(
                    "Sesija je istekla. Prijavi se ponovno."
                );
            }

            const userId =
                userData.user.id;

            /*
             * Potvrdimo da projekt pripada
             * trenutno prijavljenom korisniku.
             */
            const {
                data: ownedProject,
                error: projectError
            } =
                await supabaseClient
                    .from("projects")
                    .select("id")
                    .eq("id", materialsProject.id)
                    .eq("user_id", userId)
                    .maybeSingle();

            if (projectError) {
                throw projectError;
            }

            if (!ownedProject) {
                throw new Error(
                    "Nemaš pristup odabranom projektu."
                );
            }

            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                materialsSetStatus(
                    `Šaljem datoteku ${i + 1} od ` +
                    `${files.length}:\n${file.name}`
                );

                const storagePath =
                    buildMaterialsStoragePath(
                        userId,
                        materialsProject.id,
                        file
                    );

                const {
                    error: uploadError
                } =
                    await supabaseClient.storage
                        .from(MATERIALS_BUCKET)
                        .upload(
                            storagePath,
                            file,
                            {
                                upsert: false,
                                cacheControl: "3600",
                                contentType:
                                    file.type ||
                                    "application/octet-stream"
                            }
                        );

                if (uploadError) {
                    throw new Error(
                        `Neuspjelo slanje "${file.name}": ` +
                        uploadError.message
                    );
                }

                uploadedCount++;
            }

            materialsSetStatus(
                `Uspješno poslano ${uploadedCount} ` +
                `od ${files.length} datoteka!\n` +
                `Materijali su spremljeni uz projekt ` +
                `#${materialsProject.id}.`,
                "success"
            );

            materialsSelectedFiles = [];
            renderMaterialsFileList();

            if (materialsForm) {
                materialsForm.reset();
            }
        } catch (error) {
            console.error(
                "Greška kod slanja materijala:",
                error
            );

            let message =
                error?.message ||
                "Nepoznata greška.";

            if (
                /row-level security|policy|403|unauthorized/i
                    .test(message)
            ) {
                message +=
                    "\nProvjeri Storage RLS pravila " +
                    "za bucket project-materials.";
            }

            materialsSetStatus(
                `Poslano ${uploadedCount} od ` +
                `${files.length} datoteka.\n` +
                `Greška: ${message}`,
                "error"
            );
        } finally {
            materialsSetBusy(false);
        }
    }
);

/* =========================================
   DASHBOARD LOAD
========================================= */

async function loadDashboard() {
    const {
        data: { session },
        error: sessionError
    } =
        await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        window.location.href =
            "login.html";
        return;
    }

    currentSession = session;

    updateMaterialsAction();

    /* SUPPORT MESSAGES */

    await loadMessagesUnreadCount(
        session.user.id
    );

    subscribeToSupportRealtime(
        session.user.id
    );

    /* PROFILE */

    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select("display_name")
            .eq("id", session.user.id)
            .maybeSingle();

    if (profileError) {
        console.error(
            "Greška kod profila:",
            profileError
        );
    }

    const userName =
        profile?.display_name ||
        session.user.email?.split("@")[0] ||
        "Klijent";

    currentUserName = userName;

    if (userTop) {
        userTop.textContent = userName;
    }

    if (userGreeting) {
        userGreeting.textContent = userName;
    }

    /* PROJECTS */

    const {
        data,
        error: projectError
    } =
        await supabaseClient
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
            .eq(
                "user_id",
                session.user.id
            );

    if (projectError) {
        console.error(
            "Greška kod projekata:",
            projectError
        );

        projects = [];
        renderProjects();
        return;
    }

    projects = data || [];

    renderProjects();
}

/* =========================================
   LOGOUT
========================================= */

logoutButton?.addEventListener(
    "click",
    async function () {
        if (materialsBusy) {
            alert(
                "Pričekaj završetak slanja materijala."
            );
            return;
        }

        if (supportRealtimeChannel) {
            await supabaseClient.removeChannel(
                supportRealtimeChannel
            );

            supportRealtimeChannel = null;
        }

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";
    }
);

/* =========================================
   VISIBILITY
========================================= */

document.addEventListener(
    "visibilitychange",
    async function () {
        if (
            document.visibilityState === "visible" &&
            currentSession
        ) {
            await loadMessagesUnreadCount(
                currentSession.user.id
            );
        }
    }
);

/* =========================================
   START
========================================= */

setupProjectSlider();
updateMaterialsAction();
loadDashboard();
