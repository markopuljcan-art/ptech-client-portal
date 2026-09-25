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

const clientName =
    document.getElementById(
        "clientName"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

const projectsGrid =
    document.getElementById(
        "projectsGrid"
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

const messagesUnreadBadge =
    document.getElementById(
        "messagesUnreadBadge"
    );


let currentSession = null;

let projects = [];

let supportRealtimeChannel = null;


/* =========================
   HELPERS
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


function normalizeText(value) {

    return String(value || "")
        .trim()
        .toLowerCase();
}


function getStatusClass(status) {

    const normalized =
        normalizeText(status);


    if (
        normalized === "završeno" ||
        normalized === "zavrseno"
    ) {

        return "done";
    }


    if (
        normalized === "na čekanju" ||
        normalized === "na cekanju"
    ) {

        return "waiting";
    }


    return "progress";
}


/* =========================
   THEME
========================= */

function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            "theme"
        );


    if (
        savedTheme === "light"
    ) {

        document.body.classList.add(
            "light-mode"
        );


        if (themeToggle) {

            themeToggle.checked =
                true;
        }
    }
}


themeToggle
    ?.addEventListener(
        "change",
        () => {

            if (
                themeToggle.checked
            ) {

                document.body.classList.add(
                    "light-mode"
                );


                localStorage.setItem(
                    "theme",
                    "light"
                );

            } else {

                document.body.classList.remove(
                    "light-mode"
                );


                localStorage.setItem(
                    "theme",
                    "dark"
                );
            }
        }
    );


loadTheme();


/* =========================
   LOGOUT
========================= */

logoutButton
    ?.addEventListener(
        "click",
        async () => {

            if (
                supportRealtimeChannel
            ) {

                await supabaseClient
                    .removeChannel(
                        supportRealtimeChannel
                    );
            }


            await supabaseClient
                .auth
                .signOut();


            window.location.href =
                "login.html";
        }
    );


/* =========================
   PROFILE
========================= */

async function loadProfile() {

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
                currentSession.user.id
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
        clientName &&
        data?.display_name
    ) {

        clientName.textContent =
            data.display_name;
    }
}


/* =========================
   LOAD PROJECTS
========================= */

async function loadProjects() {

    const {
        data,
        error
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
                package,
                created_at
            `)
            .eq(
                "user_id",
                currentSession.user.id
            )
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


        projectsGrid.innerHTML = `
            <div class="projects-empty">
                Projekte trenutno nije moguće učitati.
            </div>
        `;


        return;
    }


    projects =
        data || [];


    if (projectsCount) {

        projectsCount.textContent =
            projects.length;
    }


    await loadLatestActivities();

    renderProjects();
}


/* =========================
   LATEST ACTIVITIES
========================= */

async function loadLatestActivities() {

    if (
        projects.length === 0
    ) {
        return;
    }


    const projectIds =
        projects.map(
            project =>
                project.id
        );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("activities")
            .select(`
                project_id,
                activity_date
            `)
            .in(
                "project_id",
                projectIds
            )
            .not(
                "activity_date",
                "is",
                null
            )
            .order(
                "activity_date",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Activities error:",
            error
        );

        return;
    }


    const latestByProject =
        new Map();


    for (
        const activity
        of data || []
    ) {

        const key =
            String(
                activity.project_id
            );


        if (
            !latestByProject.has(
                key
            )
        ) {

            latestByProject.set(
                key,
                activity.activity_date
            );
        }
    }


    projects =
        projects.map(
            project => ({

                ...project,

                latestActivity:
                    latestByProject.get(
                        String(project.id)
                    ) ||
                    null
            })
        );
}


/* =========================
   RENDER PROJECTS
========================= */

function renderProjects() {

    if (!projectsGrid) {
        return;
    }


    const search =
        normalizeText(
            projectSearch?.value
        );


    const selectedStatus =
        normalizeText(
            projectStatusFilter?.value
        );


    const filtered =
        projects.filter(
            project => {

                const combinedText =
                    normalizeText(
                        `
                        ${project.type || ""}
                        ${project.name || ""}
                        ${project.package || ""}
                        ${project.status || ""}
                        `
                    );


                const projectStatus =
                    normalizeText(
                        project.status
                    );


                const matchesSearch =
                    !search ||
                    combinedText.includes(
                        search
                    );


                const matchesStatus =
                    !selectedStatus ||
                    projectStatus ===
                        selectedStatus;


                return (
                    matchesSearch &&
                    matchesStatus
                );
            }
        );


    if (
        filtered.length === 0
    ) {

        projectsGrid.innerHTML = `
            <div class="projects-empty">
                Nema projekata koji odgovaraju odabranom filtru.
            </div>
        `;


        return;
    }


    projectsGrid.innerHTML =
        filtered
            .map(
                project => {

                    const progress =
                        Math.max(
                            0,
                            Math.min(
                                100,
                                Number(
                                    project.progress
                                ) || 0
                            )
                        );


                    const statusClass =
                        getStatusClass(
                            project.status
                        );


                    return `

                        <a
                            href="project.html?id=${encodeURIComponent(
                                project.id
                            )}"
                            class="project-card"
                        >


                            <!-- TOP -->

                            <div class="project-card-top">


                                <div class="project-title-block">


                                    <div class="project-icon">

                                        <svg viewBox="0 0 24 24">

                                            <rect
                                                x="3"
                                                y="4"
                                                width="18"
                                                height="13"
                                                rx="2">
                                            </rect>

                                            <path
                                                d="M8 21h8">
                                            </path>

                                            <path
                                                d="M12 17v4">
                                            </path>

                                        </svg>

                                    </div>


                                    <div>

                                        <h2>
                                            ${escapeHtml(
                                                project.type ||
                                                "Projekt"
                                            )}
                                        </h2>

                                        <p>
                                            ${escapeHtml(
                                                project.name ||
                                                ""
                                            )}
                                        </p>

                                    </div>


                                </div>


                                <span
                                    class="
                                        project-status
                                        ${statusClass}
                                    "
                                >
                                    ${escapeHtml(
                                        project.status ||
                                        "-"
                                    )}
                                </span>


                            </div>


                            <!-- INFO -->

                            <div class="project-info-grid">


                                <div class="project-info">

                                    <span>
                                        Paket
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            project.package ||
                                            "-"
                                        )}
                                    </strong>

                                </div>


                                <div class="project-info">

                                    <span>
                                        Rok
                                    </span>

                                    <strong>
                                        ${formatDate(
                                            project.deadline
                                        )}
                                    </strong>

                                </div>


                            </div>


                            <!-- PROGRESS -->

                            <div class="project-progress">


                                <div class="project-progress-top">

                                    <span>
                                        Napredak
                                    </span>

                                    <strong>
                                        ${progress}%
                                    </strong>

                                </div>


                                <div class="project-progress-track">

                                    <div
                                        class="project-progress-bar"
                                        style="width:${progress}%"
                                    >
                                    </div>

                                </div>


                            </div>


                            <!-- FOOTER -->

                            <div class="project-card-footer">


                                <span class="project-update">

                                    Zadnje ažurirano:

                                    ${
                                        project.latestActivity
                                            ? formatDate(
                                                project.latestActivity
                                            )
                                            : "-"
                                    }

                                </span>


                                <span class="project-open">

                                    Otvori projekt

                                    <span>
                                        →
                                    </span>

                                </span>


                            </div>


                        </a>
                    `;
                }
            )
            .join("");
}


/* =========================
   FILTERS
========================= */

projectSearch
    ?.addEventListener(
        "input",
        renderProjects
    );


projectStatusFilter
    ?.addEventListener(
        "change",
        renderProjects
    );


/* =========================
   UNREAD MESSAGES
========================= */

async function loadMessagesUnreadCount() {

    if (
        !messagesUnreadBadge ||
        !currentSession
    ) {
        return;
    }


    const {
        count,
        error
    } =
        await supabaseClient
            .from(
                "support_messages"
            )
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


    if (
        unreadCount > 0
    ) {

        messagesUnreadBadge.hidden =
            false;


        messagesUnreadBadge.textContent =
            unreadCount > 99
                ? "99+"
                : String(
                    unreadCount
                );

    } else {

        messagesUnreadBadge.hidden =
            true;


        messagesUnreadBadge.textContent =
            "0";
    }
}


/* =========================
   REALTIME SUPPORT
========================= */

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
                `my-projects-support-${currentSession.user.id}`
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
   VISIBILITY
========================= */

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState ===
                "visible" &&
            currentSession
        ) {

            await loadMessagesUnreadCount();
        }
    }
);


/* =========================
   START
========================= */

async function startMyProjects() {

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


    currentSession =
        session;


    await Promise.all([

        loadProfile(),

        loadProjects(),

        loadMessagesUnreadCount()

    ]);


    subscribeToSupportRealtime();
}


/* =========================
   INIT
========================= */

startMyProjects();
