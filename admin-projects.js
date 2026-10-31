const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================
   ELEMENTI
========================= */

const projectsList =
    document.getElementById(
        "projectsList"
    );

const projectsCount =
    document.getElementById(
        "projectsCount"
    );

const projectSearch =
    document.getElementById(
        "projectSearch"
    );

const projectStatusFilter =
    document.getElementById(
        "projectStatusFilter"
    );

const designStatusFilter =
    document.getElementById(
        "designStatusFilter"
    );

const projectsMessage =
    document.getElementById(
        "projectsMessage"
    );

const adminUserName =
    document.getElementById(
        "adminUserName"
    );

const logoutButton =
    document.getElementById(
        "adminLogoutButton"
    );


let allProjects = [];


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================
   FORMAT DATE
========================= */

function formatDate(value) {

    if (!value) {
        return "-";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "-";
    }

    return date.toLocaleDateString(
        "hr-HR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


/* =========================
   PROJECT STATUS
========================= */

function getProjectStatusClass(status) {

    const value =
        String(status || "")
            .trim()
            .toLowerCase();


    if (
        value === "završeno" ||
        value === "zavrseno"
    ) {
        return "completed";
    }


    if (
        value === "na čekanju" ||
        value === "na cekanju"
    ) {
        return "waiting";
    }


    return "active";
}


/* =========================
   DESIGN STATUS
========================= */

function getDesignStatusLabel(status) {

    switch (status) {

        case "approved":
            return "Odobreno";

        case "revision_requested":
            return "Tražene izmjene";

        case "pending":
            return "Čeka odluku";

        default:
            return "Bez dizajna";
    }
}


function getDesignStatusClass(status) {

    switch (status) {

        case "approved":
            return "approved";

        case "revision_requested":
            return "revision";

        case "pending":
            return "pending";

        default:
            return "none";
    }
}


/* =========================
   LOGOUT
========================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            await supabaseClient
                .auth
                .signOut();

            window.location.href =
                "login.html";
        }
    );
}


/* =========================
   ADMIN CHECK
========================= */

async function checkAdmin(session) {

    const {
        data,
        error
    } =
        await supabaseClient
            .rpc(
                "is_admin_user",
                {
                    check_user_id:
                        session.user.id
                }
            );


    if (error) {

        console.error(
            "Admin check error:",
            error
        );

        return false;
    }


    return data === true;
}


/* =========================
   ADMIN PROFILE
========================= */

async function loadAdminProfile(
    session
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "display_name"
            )
            .eq(
                "id",
                session.user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Profile error:",
            error
        );

        return;
    }


    if (
        adminUserName &&
        data?.display_name
    ) {

        adminUserName.textContent =
            data.display_name;
    }
}


/* =========================
   LOAD PROJECTS
========================= */

async function loadProjects() {

    projectsList.innerHTML = `
        <div class="admin-empty">
            Učitavanje projekata...
        </div>
    `;


    const {
        data: projects,
        error
    } =
        await supabaseClient
            .from("projects")
            .select(`
                id,
                name,
                type,
                status,
                created_at,
                user_id,
                progress,
                deadline,
                package
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Projects error:",
            error
        );

        projectsList.innerHTML = `
            <div class="admin-empty">
                Projekte nije moguće učitati.
            </div>
        `;

        return;
    }


    if (
        !projects ||
        projects.length === 0
    ) {

        allProjects = [];

        projectsCount.textContent =
            "0";

        projectsList.innerHTML = `
            <div class="admin-empty">
                Trenutno nema projekata.
            </div>
        `;

        return;
    }


    /* =========================
       CLIENT PROFILES
    ========================= */

    const userIds =
        [
            ...new Set(
                projects
                    .map(
                        project =>
                            project.user_id
                    )
                    .filter(Boolean)
            )
        ];


    const {
        data: profiles
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                display_name
            `)
            .in(
                "id",
                userIds
            );


    const profileMap = {};


    for (
        const profile
        of profiles || []
    ) {

        profileMap[
            profile.id
        ] =
            profile.display_name ||
            "Klijent";
    }


    /* =========================
       DESIGNS
    ========================= */

    const projectIds =
        projects.map(
            project =>
                project.id
        );


    const {
        data: designs
    } =
        await supabaseClient
            .from("project_designs")
            .select(`
                id,
                project_id,
                status,
                created_at
            `)
            .in(
                "project_id",
                projectIds
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    const latestDesignByProject =
        new Map();


    for (
        const design
        of designs || []
    ) {

        if (
            !latestDesignByProject.has(
                design.project_id
            )
        ) {

            latestDesignByProject.set(
                design.project_id,
                design
            );
        }
    }


    /* =========================
       COMBINE
    ========================= */

    allProjects =
        projects.map(
            project => {

                const design =
                    latestDesignByProject.get(
                        project.id
                    ) ||
                    null;


                return {

                    ...project,

                    client_name:
                        profileMap[
                            project.user_id
                        ] ||
                        "Klijent",

                    latest_design:
                        design
                };
            }
        );


    projectsCount.textContent =
        allProjects.length;


    buildProjectStatusFilter();


    renderProjects(
        allProjects
    );
}


/* =========================
   STATUS FILTER OPTIONS
========================= */

function buildProjectStatusFilter() {

    if (!projectStatusFilter) {
        return;
    }


    const statuses =
        [
            ...new Set(
                allProjects
                    .map(
                        project =>
                            project.status
                    )
                    .filter(Boolean)
            )
        ];


    projectStatusFilter.innerHTML = `
        <option value="">
            Svi statusi projekta
        </option>
    `;


    for (const status of statuses) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            status;

        option.textContent =
            status;


        projectStatusFilter.appendChild(
            option
        );
    }
}


/* =========================
   RENDER
========================= */

function renderProjects(projects) {

    if (
        !projects ||
        projects.length === 0
    ) {

        projectsList.innerHTML = `
            <div class="admin-empty">
                Nema projekata koji odgovaraju odabranim filterima.
            </div>
        `;

        return;
    }


    projectsList.innerHTML =
        projects
            .map(
                project => {

                    const design =
                        project.latest_design;


                    const designStatus =
                        design?.status ||
                        "no_design";


                    return `

                        <article class="project-admin-card">

                            <div class="project-admin-main">

                                <div class="project-admin-top">

                                    <div>

                                        <span class="project-admin-label">
                                            Projekt
                                        </span>

                                        <h3>
                                            ${escapeHtml(
                                                project.type ||
                                                project.name ||
                                                `Projekt #${project.id}`
                                            )}
                                        </h3>

                                        <p>
                                            ${escapeHtml(
                                                project.name ||
                                                ""
                                            )}
                                        </p>

                                    </div>


                                    <span
                                        class="
                                            project-status-badge
                                            ${getProjectStatusClass(
                                                project.status
                                            )}
                                        "
                                    >
                                        ${escapeHtml(
                                            project.status ||
                                            "-"
                                        )}
                                    </span>

                                </div>


                                <div class="project-admin-details">

                                    <div>

                                        <span>
                                            Klijent
                                        </span>

                                        <strong>
                                            ${escapeHtml(
                                                project.client_name
                                            )}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Kreirano
                                        </span>

                                        <strong>
                                            ${formatDate(
                                                project.created_at
                                            )}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Zadnja verzija
                                        </span>

                                        <strong>
                                            ${
                                                design
                                                    ? `Dizajn #${design.id}`
                                                    : "Nema dizajna"
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Status dizajna
                                        </span>

                                        <strong
                                            class="
                                                design-status-text
                                                ${getDesignStatusClass(
                                                    designStatus
                                                )}
                                            "
                                        >
                                            ${getDesignStatusLabel(
                                                designStatus
                                            )}
                                        </strong>

                                    </div>

                                </div>

                            </div>


                            <div class="project-admin-actions">
                                <button type="button" class="project-action-secondary v32-edit-action"
                                  data-edit-admin-project="${project.id}">Uredi projekt</button>

                                ${
                                    design

                                        ? `
                                            <a
                                                href="approve.html?id=${project.id}"
                                                class="project-action-secondary"
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                Pregled dizajna
                                            </a>
                                        `

                                        : ""
                                }


                                <a
                                    href="admin-projects.html?project=${encodeURIComponent(project.id)}"
                                    class="project-action-primary"
                                >
                                    Prikaži karticu
                                </a>

                            </div>

                        </article>
                    `;
                }
            )
            .join("");
}


/* =========================
   FILTER
========================= */

function applyFilters() {

    const search =
        String(
            projectSearch?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const projectStatus =
        projectStatusFilter
            ?.value ||
        "";


    const designStatus =
        designStatusFilter
            ?.value ||
        "";


    const params = new URLSearchParams(window.location.search);
    const requestedProject = params.get("project");
    const requestedClient = params.get("client");
    const filterSpecificProject = requestedProject && /^\d+$/.test(requestedProject) &&
        search === requestedProject.toLowerCase();
    const filterSpecificClient = requestedClient && /^[0-9a-f-]{36}$/i.test(requestedClient);

    const filtered =
        allProjects.filter(
            project => {

                const haystack =
                    `
                        ${project.id || ""}
                        ${project.name || ""}
                        ${project.type || ""}
                        ${project.client_name || ""}
                    `
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    haystack.includes(
                        search
                    );


                // Query link from the dashboard focuses the exact project.
                const matchesProjectId = !filterSpecificProject ||
                    String(project.id) === requestedProject;

                const matchesProjectStatus =
                    !projectStatus ||
                    project.status ===
                    projectStatus;


                const currentDesignStatus =
                    project.latest_design
                        ?.status ||
                    "no_design";


                const matchesDesignStatus =
                    !designStatus ||
                    currentDesignStatus ===
                    designStatus;


                return (
                    matchesSearch &&
                    (!filterSpecificClient || project.user_id === requestedClient) &&
                    matchesProjectId &&
                    matchesProjectStatus &&
                    matchesDesignStatus
                );
            }
        );


    renderProjects(
        filtered
    );
}


/* =========================
   FILTER EVENTS
========================= */

if (projectSearch) {

    projectSearch.addEventListener(
        "input",
        applyFilters
    );

    // Admin dashboard links to a specific project card.
    const requestedProjectId = new URLSearchParams(window.location.search).get("project");
    if (requestedProjectId && /^\d+$/.test(requestedProjectId)) {
        projectSearch.value = requestedProjectId;
    }
}


if (projectStatusFilter) {

    projectStatusFilter.addEventListener(
        "change",
        applyFilters
    );
}


if (designStatusFilter) {

    designStatusFilter.addEventListener(
        "change",
        applyFilters
    );
}


/* =========================
   START
========================= */

async function startProjects() {

    const {
        data: {
            session
        },
        error
    } =
        await supabaseClient
            .auth
            .getSession();


    if (
        error ||
        !session
    ) {

        window.location.href =
            "login.html";

        return;
    }


    const isAdmin =
        await checkAdmin(
            session
        );


    if (!isAdmin) {

        window.location.href =
            "form.html";

        return;
    }


    await loadAdminProfile(
        session
    );


    await loadProjects();
    await loadAdminClientsForEditor();
    openRequestedProjectEditor();
}


/* =========================
   INIT
========================= */

startProjects();


/* =====================================================
   ADMIN CONSOLE V3.2: UPRAVLJANJE PROJEKTIMA
   Spremanje ide isključivo kroz admin RPC. Bez javnog
   INSERT/UPDATE granta klijentima.
===================================================== */

const v32 = id => document.getElementById(id);
const editorOverlay = v32("projectEditorOverlay");
let availableProjectClients = [];
let editingProjectBusy = false;
let projectEditorReturnFocus = null;

function v32ShowError(message) {
    const el = v32("projectEditorMessage");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
}
function v32ClearError() {
    const el = v32("projectEditorMessage");
    if (el) { el.textContent = ""; el.hidden = true; }
}

async function loadAdminClientsForEditor() {
    const { data, error } = await supabaseClient.from("profiles")
        .select("id,display_name,role")
        .eq("role", "client")
        .order("display_name", { ascending: true });
    if (error) {
        console.error("PTech V3.2 - lista klijenata:", error);
        availableProjectClients = [];
    } else {
        availableProjectClients = data || [];
    }
    const select = v32("editProjectClient");
    if (!select) return;
    select.replaceChildren(new Option("Odaberi klijenta", ""));
    for (const user of availableProjectClients) {
        const label = user.display_name || `Klijent (${user.id.slice(0,8)}...)`;
        select.add(new Option(label, user.id));
    }
}

function openAdminProjectEditor(project = null, chosenClient = "") {
    if (!editorOverlay) return;
    projectEditorReturnFocus = document.activeElement;
    v32("projectManageForm").reset();
    v32ClearError();
    v32("editProjectId").value = project?.id == null ? "" : String(project.id);
    v32("projectEditorHeading").textContent = project ? "Uredi projekt" : "Novi projekt";
    v32("saveProjectButton").textContent = project ? "Spremi promjene" : "Dodaj projekt";
    v32("editProjectName").value = project?.name || "";
    v32("editProjectType").value = project?.type || "";
    v32("editProjectStatus").value = project?.status || "U tijeku";
    v32("editProjectProgress").value = String(project?.progress ?? 0);
    v32("editProjectDeadline").value = project?.deadline || "";
    v32("editProjectPackage").value = project?.package || "";
    const targetUser = project?.user_id || chosenClient;
    const clientSelect = v32("editProjectClient");
    if (targetUser && !Array.from(clientSelect.options).some(opt => opt.value === targetUser)) {
        clientSelect.add(new Option("Trenutačno dodijeljeni klijent", targetUser));
    }
    clientSelect.value = targetUser || "";
    editorOverlay.hidden = false;
    document.body.classList.add("v32-dialog-open");
    v32("editProjectName").focus();
}
function closeAdminProjectEditor() {
    if (editingProjectBusy || !editorOverlay) return;
    editorOverlay.hidden = true;
    document.body.classList.remove("v32-dialog-open");
    projectEditorReturnFocus?.focus?.();
}
function openRequestedProjectEditor() {
    const params = new URLSearchParams(location.search);
    const id = params.get("edit");
    const userId = params.get("newClient");
    if (id && /^\d+$/.test(id)) {
        const project = allProjects.find(p => String(p.id) === id);
        if (project) openAdminProjectEditor(project);
    } else if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
        openAdminProjectEditor(null, userId);
    }
}

v32("newAdminProject")?.addEventListener("click", () => openAdminProjectEditor());
v32("closeProjectEditor")?.addEventListener("click", closeAdminProjectEditor);
v32("cancelProjectEditor")?.addEventListener("click", closeAdminProjectEditor);
editorOverlay?.addEventListener("click", event => {
    if (event.target === editorOverlay) closeAdminProjectEditor();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && editorOverlay && !editorOverlay.hidden) closeAdminProjectEditor();
});
projectsList?.addEventListener("click", event => {
    const edit = event.target.closest("[data-edit-admin-project]");
    if (!edit) return;
    const project = allProjects.find(p => String(p.id) === edit.dataset.editAdminProject);
    if (project) openAdminProjectEditor(project);
});

v32("projectManageForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    if (editingProjectBusy) return;
    v32ClearError();
    const projectName = v32("editProjectName").value.trim();
    const clientId = v32("editProjectClient").value;
    const status = v32("editProjectStatus").value.trim();
    const progressText = v32("editProjectProgress").value.trim();
    const progress = Number(progressText);
    if (!projectName || !clientId || !status || !progressText || !Number.isInteger(progress) || progress < 0 || progress > 100) {
        v32ShowError("Provjeri naziv, klijenta, status i napredak (0–100).");
        return;
    }
    const save = v32("saveProjectButton");
    editingProjectBusy = true;
    save.disabled = true;
    save.textContent = "Spremanje...";
    const rawId = v32("editProjectId").value;
    const payload = {
        p_id: rawId ? Number(rawId) : null,
        p_user_id: clientId,
        p_name: projectName,
        p_type: v32("editProjectType").value.trim() || null,
        p_status: status,
        p_progress: progress,
        p_deadline: v32("editProjectDeadline").value || null,
        p_package: v32("editProjectPackage").value.trim() || null
    };
    try {
        const { data, error } = await supabaseClient.rpc("ptech_admin_project_upsert", payload);
        if (error) throw error;
        editorOverlay.hidden = true;
        document.body.classList.remove("v32-dialog-open");
        await loadProjects();
        // Nemoj ostaviti stari ID filter nakon spremanja.
        const params = new URLSearchParams(location.search);
        if (params.has("edit") || params.has("newClient")) {
            params.delete("edit"); params.delete("newClient");
            history.replaceState(null, "", location.pathname + (params.toString() ? "?"+params : ""));
        }
        projectSearch.value = "";
        applyFilters();
        const notice = v32("projectsMessage");
        if (notice) {
            notice.textContent = `Projekt #${data} uspješno je spremljen.`;
            notice.hidden = false;
        }
        projectEditorReturnFocus?.focus?.();
    } catch (error) {
        console.error("Spremanje projekta:", error);
        if (/function|schema cache|does not exist|404/i.test(error.message || "")) {
            v32ShowError("Nedostaje administratorska SQL funkcija. Pokreni SQL iz mape supabase/ i pokušaj ponovno.");
        } else {
            v32ShowError(error.message || "Projekt nije spremljen. Pokušaj ponovno.");
        }
    } finally {
        editingProjectBusy = false;
        save.disabled = false;
        save.textContent = rawId ? "Spremi promjene" : "Dodaj projekt";
    }
});
