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
                user_id
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
                                    href="project.html?id=${project.id}"
                                    class="project-action-primary"
                                >
                                    Otvori projekt
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


    const filtered =
        allProjects.filter(
            project => {

                const haystack =
                    `
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
}


/* =========================
   INIT
========================= */

startProjects();
