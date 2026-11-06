
/* =====================================================
   PTECH DIGITAL CLIENT PORTAL
   MY-PROJECTS.JS — V2

   - Supabase Auth
   - Korisnicki profil
   - Dohvat projekata
   - Pretraga i filteri
   - Napredak i rokovi
   - Zadnja aktivnost
   - Light / Dark mode
   - Logout
   - Neprocitane poruke
   - Realtime obavijesti
   - Animirani particles
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

const projectsGrid =
    document.getElementById("projectsGrid");

const projectsCount =
    document.getElementById("projectsCount");

const projectSearch =
    document.getElementById("projectSearch");

const projectStatusFilter =
    document.getElementById("projectStatusFilter");

const messagesUnreadBadge =
    document.getElementById("messagesUnreadBadge");


/* =====================================================
   GLOBAL
===================================================== */

let currentSession = null;
let projects = [];
let supportRealtimeChannel = null;


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

    if (!value) {
        return "-";
    }

    const raw = String(value).slice(0, 10);
    const date = new Date(raw + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
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

    const normalized = normalizeText(status);

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


/* =====================================================
   LIGHT / DARK MODE
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
            localStorage.setItem(
                "theme",
                finalTheme
            );
        } catch (error) {
            // Tema radi i bez spremanja.
        }
    }
}


function loadTheme() {

    let savedTheme = "dark";

    try {
        savedTheme =
            localStorage.getItem("theme");
    } catch (error) {
        // Zadana tema je dark.
    }

    applyTheme(
        savedTheme === "light" ? "light" : "dark",
        false
    );
}


if (themeToggle) {
    themeToggle.addEventListener(
        "change",
        function () {
            applyTheme(
                themeToggle.checked
                    ? "light"
                    : "dark"
            );
        }
    );
}

loadTheme();


/* =====================================================
   LOGOUT
===================================================== */

if (logoutButton) {
    logoutButton.addEventListener(
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

                console.error(
                    "Logout error:",
                    error
                );

                logoutButton.disabled = false;
            }
        }
    );
}


/* =====================================================
   PROFILE
===================================================== */

async function loadProfile() {

    if (!currentSession) return;

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select("display_name")
            .eq("id", currentSession.user.id)
            .maybeSingle();

    if (error) {
        console.error(
            "Profile error:",
            error
        );
    }

    if (clientName) {
        clientName.textContent =
            data?.display_name ||
            currentSession.user.email?.split("@")[0] ||
            "Klijent";
    }
}


/* =====================================================
   LOAD PROJECTS
===================================================== */

async function loadProjects() {

    if (!currentSession || !projectsGrid) {
        return;
    }

    const { data, error } =
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
                { ascending: false }
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

    projects = data || [];

    if (projectsCount) {
        projectsCount.textContent =
            String(projects.length);
    }

    /*
       Najprije prikazi projekte.
       Aktivnosti ucitavamo dodatno.
    */

    renderProjects();

    await loadLatestActivities();

    renderProjects();
}


/* =====================================================
   LATEST ACTIVITIES
===================================================== */

async function loadLatestActivities() {

    if (!projects.length) {
        return;
    }

    const projectIds = projects.map(
        project => project.id
    );

    const { data, error } =
        await supabaseClient
            .from("activities")
            .select(`
                project_id,
                activity_date
            `)
            .in("project_id", projectIds)
            .not("activity_date", "is", null)
            .order(
                "activity_date",
                { ascending: false }
            );

    if (error) {
        console.error(
            "Activities error:",
            error
        );
        return;
    }

    const latestByProject = new Map();

    for (const activity of data || []) {

        const key = String(
            activity.project_id
        );

        if (!latestByProject.has(key)) {
            latestByProject.set(
                key,
                activity.activity_date
            );
        }
    }

    projects = projects.map(
        project => ({
            ...project,

            latestActivity:
                latestByProject.get(
                    String(project.id)
                ) || null
        })
    );
}


/* =====================================================
   RENDER PROJECTS
===================================================== */

function renderProjects() {

    if (!projectsGrid) return;

    const search = normalizeText(
        projectSearch?.value
    );

    const selectedStatus = normalizeText(
        projectStatusFilter?.value
    );

    const filtered = projects.filter(
        project => {

            const combinedText = normalizeText(`
                ${project.type || ""}
                ${project.name || ""}
                ${project.package || ""}
                ${project.status || ""}
            `);

            const projectStatus = normalizeText(
                project.status
            );

            const matchesSearch =
                !search ||
                combinedText.includes(search);

            const matchesStatus =
                !selectedStatus ||
                projectStatus === selectedStatus;

            return matchesSearch && matchesStatus;
        }
    );

    /* EMPTY */

    if (!filtered.length) {

        projectsGrid.innerHTML = `
            <div class="projects-empty">
                ${
                    projects.length === 0
                        ? "Trenutno nemate dodanih projekata."
                        : "Nema projekata koji odgovaraju odabranom filtru."
                }
            </div>
        `;

        return;
    }

    /* CARDS */

    projectsGrid.innerHTML = filtered.map(
        project => {

            const rawProgress =
                Number(project.progress || 0);

            const progress =
                Number.isFinite(rawProgress)
                    ? Math.max(
                        0,
                        Math.min(100, rawProgress)
                    )
                    : 0;

            const statusClass =
                getStatusClass(project.status);

            const safeProjectId =
                encodeURIComponent(
                    String(project.id)
                );

            const latestDate =
                project.latestActivity
                    ? formatDate(project.latestActivity)
                    : "-";

            return `

                <a
                    href="project.html?id=${safeProjectId}"
                    class="project-card"
                    aria-label="Otvori projekt ${escapeHtml(
                        project.type ||
                        project.name ||
                        "Projekt"
                    )}"
                >

                    <!-- HEADER -->

                    <div class="project-card-top">

                        <div class="project-title-block">

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

                            <div>

                                <h2>
                                    ${escapeHtml(
                                        project.type ||
                                        project.name ||
                                        "Projekt"
                                    )}
                                </h2>

                                <p>
                                    ${escapeHtml(
                                        project.name || ""
                                    )}
                                </p>

                            </div>

                        </div>

                        <span
                            class="project-status ${statusClass}"
                        >
                            ${escapeHtml(
                                project.status || "-"
                            )}
                        </span>

                    </div>


                    <!-- PACKAGE + DEADLINE -->

                    <div class="project-info-grid">

                        <div class="project-info">

                            <span>Paket</span>

                            <strong>
                                ${escapeHtml(
                                    project.package || "-"
                                )}
                            </strong>

                        </div>

                        <div class="project-info">

                            <span>Rok projekta</span>

                            <strong>
                                ${formatDate(
                                    project.deadline
                                )}
                            </strong>

                        </div>

                    </div>


                    <!-- PROGRESS BUBBLE -->

                    <div class="project-progress">

                        <div class="project-progress-top">

                            <span>Napredak projekta</span>

                            <strong>
                                ${progress}%
                            </strong>

                        </div>

                        <div class="project-progress-track">

                            <div
                                class="project-progress-bar"
                                style="width: ${progress}%"
                            ></div>

                        </div>

                    </div>


                    <!-- FOOTER -->

                    <div class="project-card-footer">

                        <span class="project-update">

                            Zadnje ažurirano:
                            <strong>${latestDate}</strong>

                        </span>

                        <span class="project-open">

                            Otvori projekt

                            <span aria-hidden="true">
                                →
                            </span>

                        </span>

                    </div>

                </a>
            `;
        }
    ).join("");
}


/* =====================================================
   SEARCH + FILTER
===================================================== */

if (projectSearch) {
    projectSearch.addEventListener(
        "input",
        renderProjects
    );
}

if (projectStatusFilter) {
    projectStatusFilter.addEventListener(
        "change",
        renderProjects
    );
}


/* =====================================================
   UNREAD MESSAGES
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
                async function () {
                    await loadMessagesUnreadCount();
                }
            )
            .subscribe();
}


/* =====================================================
   PARTICLES
===================================================== */

function createProjectParticles() {

    const container =
        document.getElementById(
            "projectsParticles"
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

    for (let i = 0; i < count; i++) {

        const particle =
            document.createElement("span");

        particle.className =
            "projects-particle";

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
   VISIBILITY
===================================================== */

document.addEventListener(
    "visibilitychange",
    async function () {

        if (
            document.visibilityState === "visible" &&
            currentSession
        ) {
            await loadMessagesUnreadCount();
        }
    }
);


/* =====================================================
   START
===================================================== */

async function startMyProjects() {

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

        await Promise.all([
            loadProfile(),
            loadProjects(),
            loadMessagesUnreadCount()
        ]);

        subscribeToSupportRealtime();

    } catch (error) {

        console.error(
            "My Projects init error:",
            error
        );

        if (projectsGrid) {
            projectsGrid.innerHTML = `
                <div class="projects-empty">
                    Došlo je do pogreške pri učitavanju.
                    Pokušajte osvježiti stranicu.
                </div>
            `;
        }
    }
}


/* =====================================================
   INIT
===================================================== */

createProjectParticles();

startMyProjects();


/* =====================================================
   END — MY-PROJECTS.JS V2
===================================================== */
