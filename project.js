
/* ==========================================
   PTECH DIGITAL CLIENT PORTAL
   PROJECT.JS — V53

   PREMIUM PROJECT DETAILS
   PREMIUM ACTIVITIES TIMELINE

   Zadrzane postojece funkcionalnosti:
   - Supabase Auth
   - Projekti
   - Paket
   - Napredak
   - Rok projekta
   - Aktivnosti
   - Light / Dark mode
   - Logout
   - Neprocitane poruke
   - Realtime obavijesti
========================================== */


/* ==========================================
   1. SUPABASE
========================================== */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* ==========================================
   2. ELEMENTI
========================================== */

const logoutButton =
    document.getElementById("logoutButton");

const themeToggle =
    document.getElementById("themeToggle");

const userTop =
    document.getElementById("userTop");

const projectContainer =
    document.getElementById("projectDetail");

const activitiesContainer =
    document.getElementById("projectActivities");

const deadlineContainer =
    document.getElementById("projectDeadlineDetails");

const messagesUnreadBadge =
    document.getElementById("messagesUnreadBadge");


/* ==========================================
   3. GLOBAL
========================================== */

let currentSession = null;

let supportRealtimeChannel = null;


/* ==========================================
   4. PROJECT ID
========================================== */

const params = new URLSearchParams(
    window.location.search
);

const projectId = params.get("id");


/* ==========================================
   5. FORMAT DATE
========================================== */

function formatDate(value) {

    if (!value) {
        return "-";
    }

    const raw = String(value).slice(0, 10);

    const date = new Date(
        raw + "T00:00:00"
    );

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


/* ==========================================
   6. ESCAPE HTML
========================================== */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* ==========================================
   7. STATUS PROJEKTA
========================================== */

function getStatusClass(status) {

    const value = String(status || "")
        .toLowerCase()
        .trim();

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


/* ==========================================
   8. PACKAGE INFO
========================================== */

function getPackageInfo(packageName) {

    const normalized = String(
        packageName || ""
    ).toLowerCase().trim();

    const packages = {

        classic: {

            title: "Classic paket",

            description:
                "Pouzdan paket za standardne projekte i osnovne potrebe.",

            features: [
                "Standardna izrada projekta",
                "Osnovna podrška",
                "Redovna ažuriranja"
            ]
        },

        premium: {

            title: "Premium paket",

            description:
                "Napredni paket s dodatnim mogućnostima i većom razinom podrške.",

            features: [
                "Prioritetna podrška",
                "Više izmjena tijekom izrade",
                "Napredna optimizacija"
            ]
        }

    };

    return packages[normalized] || {

        title: packageName
            ? `${packageName} paket`
            : "Paket",

        description:
            "Detalji paketa trenutno nisu dostupni.",

        features: []
    };
}


/* ==========================================
   9. DEADLINE INFO
========================================== */

function getDeadlineInfo(deadline) {

    if (!deadline) {

        return {
            daysLeft: null,
            status: "Rok nije postavljen",
            statusText:
                "Datum završetka još nije definiran.",
            className: "deadline-neutral"
        };
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(
        String(deadline).slice(0, 10) +
        "T00:00:00"
    );

    if (Number.isNaN(deadlineDate.getTime())) {

        return {
            daysLeft: null,
            status: "Rok nije postavljen",
            statusText:
                "Datum završetka nije ispravan.",
            className: "deadline-neutral"
        };
    }

    const difference =
        deadlineDate.getTime() -
        today.getTime();

    const daysLeft = Math.ceil(
        difference / (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) {

        return {
            daysLeft: Math.abs(daysLeft),
            status: "Rok je prošao",
            statusText:
                "Planirani datum završetka projekta je prekoračen.",
            className: "deadline-late"
        };
    }

    if (daysLeft <= 30) {

        return {
            daysLeft,
            status: "Rok se približava",
            statusText:
                "Projekt ulazi u završnu fazu.",
            className: "deadline-soon"
        };
    }

    return {
        daysLeft,
        status: "Projekt je u roku",
        statusText:
            "Projekt teče prema planu.",
        className: "deadline-good"
    };
}


/* ==========================================
   10. LIGHT / DARK MODE
========================================== */

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

    try {
        localStorage.setItem(
            "theme",
            finalTheme
        );
    } catch (error) {
        // Tema i dalje radi u trenutnoj kartici.
    }
}


function loadTheme() {

    let savedTheme = "dark";

    try {
        savedTheme =
            localStorage.getItem("theme");
    } catch (error) {
        // Koristimo zadanu temu.
    }

    applyTheme(
        savedTheme === "light"
            ? "light"
            : "dark"
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


/* ==========================================
   11. LOGOUT
========================================== */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            try {

                if (supportRealtimeChannel) {

                    await supabaseClient
                        .removeChannel(
                            supportRealtimeChannel
                        );

                    supportRealtimeChannel = null;
                }

                await supabaseClient.auth.signOut();

                window.location.href =
                    "login.html";

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );
            }
        }
    );
}


/* ==========================================
   12. UNREAD SUPPORT MESSAGES
========================================== */

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


/* ==========================================
   13. REALTIME SUPPORT
========================================== */

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
                `project-support-${currentSession.user.id}`
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


/* ==========================================
   14. INIT PROJECT PAGE
========================================== */

async function initProjectPage() {

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {

        window.location.href =
            "login.html";

        return;
    }

    currentSession = session;

    /* USER */

    const { data: profile } =
        await supabaseClient
            .from("profiles")
            .select("display_name")
            .eq(
                "id",
                session.user.id
            )
            .maybeSingle();

    if (userTop) {

        userTop.textContent =
            profile?.display_name ||
            session.user.email?.split("@")[0] ||
            "Klijent";
    }

    /* SUPPORT */

    await loadMessagesUnreadCount();

    subscribeToSupportRealtime();

    /* PROJECT ID */

    if (!projectId) {

        showProjectError(
            "Projekt nije odabran."
        );

        return;
    }

    /* LOAD PROJECT */

    const { data: project, error } =
        await supabaseClient
            .from("projects")
            .select(`
                id,
                name,
                type,
                status,
                progress,
                deadline,
                package,
                user_id
            `)
            .eq(
                "id",
                projectId
            )
            .maybeSingle();

    if (error) {

        console.error(
            "Greška kod projekta:",
            error
        );

        showProjectError(
            "Projekt se ne može učitati."
        );

        return;
    }

    if (!project) {

        showProjectError(
            "Projekt nije pronađen."
        );

        return;
    }

    if (
        project.user_id &&
        project.user_id !== session.user.id
    ) {

        showProjectError(
            "Projekt nije dostupan."
        );

        return;
    }

    /* RENDER */

    renderProject(project);

    renderDeadlineCard(project);

    await loadActivities(project.id);
}


/* ==========================================
   15. PROJECT ERROR
========================================== */

function showProjectError(message) {

    if (projectContainer) {

        projectContainer.innerHTML = `

            <div class="project-back-row">

                <a
                    href="my-projects.html"
                    class="project-back"
                >
                    <span>‹</span>
                    Natrag
                </a>

            </div>

            <div class="empty-state">
                ${escapeHtml(message)}
            </div>
        `;
    }

    if (activitiesContainer) {
        activitiesContainer.innerHTML = "";
    }

    if (deadlineContainer) {
        deadlineContainer.innerHTML = "";
    }
}


/* ==========================================
   16. RENDER PROJECT
========================================== */

function renderProject(project) {

    if (!projectContainer) {
        return;
    }

    const progress = Math.max(
        0,
        Math.min(
            100,
            Number(project.progress || 0)
        )
    );

    const safeProgress =
        Number.isFinite(progress)
            ? progress
            : 0;

    const statusClass =
        getStatusClass(project.status);

    const packageInfo =
        getPackageInfo(project.package);

    const packageFeaturesHTML =
        packageInfo.features.length

            ? packageInfo.features
                .map(function (feature) {

                    return `

                        <div class="package-feature">

                            <span class="package-check">
                                ✓
                            </span>

                            <span>
                                ${escapeHtml(feature)}
                            </span>

                        </div>
                    `;

                })
                .join("")

            : "";

    const safeProjectId =
        encodeURIComponent(
            String(project.id)
        );

    projectContainer.innerHTML = `

        <!-- BACK -->

        <div class="project-back-row">

            <a
                href="my-projects.html"
                class="project-back"
            >
                <span>‹</span>
                Natrag na projekte
            </a>

        </div>


        <!-- PROJECT HERO -->

        <section class="project-detail-hero">


            <!-- PROJECT HEADER -->

            <div class="project-detail-heading">

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


                    <div class="project-title-area">

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


                <div
                    class="status-badge ${statusClass}"
                >
                    ${escapeHtml(
                        project.status || "-"
                    )}
                </div>

            </div>


            <!-- STATS -->

            <div class="project-stats">


                <!-- PROGRESS -->

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
                                    style="width: ${safeProgress}%"
                                ></div>

                            </div>

                            <strong>
                                ${safeProgress}%
                            </strong>

                        </div>

                    </div>

                </div>


                <!-- LAST UPDATED -->

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

                        <strong id="lastUpdated">
                            -
                        </strong>

                    </div>

                </div>

            </div>


            <!-- PACKAGE -->

            <div class="package-info-card">

                <div class="package-info-top">

                    <div>

                        <span class="package-info-label">
                            Tvoj paket
                        </span>

                        <h3>
                            ${escapeHtml(
                                packageInfo.title
                            )}
                        </h3>

                    </div>

                    <span class="package-info-badge">
                        ${escapeHtml(
                            project.package || "-"
                        )}
                    </span>

                </div>

                <p class="package-info-description">
                    ${escapeHtml(
                        packageInfo.description
                    )}
                </p>

                ${
                    packageFeaturesHTML
                        ? `
                            <div class="package-features">
                                ${packageFeaturesHTML}
                            </div>
                        `
                        : ""
                }

            </div>


            <!-- ACTIONS -->

            <div class="project-actions-card">


                <a
                    href="approve.html?id=${safeProjectId}"
                    class="project-action-button"
                >

                    <span class="project-action-icon">
                        ✓
                    </span>

                    <span>

                        <strong>
                            Odobrenje dizajna
                        </strong>

                        <small>
                            Pregledaj i potvrdi trenutni dizajn
                        </small>

                    </span>

                </a>


                <a
                    href="documents.html"
                    class="project-action-button"
                >

                    <span class="project-action-icon">
                        □
                    </span>

                    <span>

                        <strong>
                            Dokumenti
                        </strong>

                        <small>
                            Pregledaj dokumente projekta
                        </small>

                    </span>

                </a>

            </div>

        </section>
    `;
}


/* ==========================================
   17. PREMIUM ACTIVITY STATUS
========================================== */

function getActivityStatusData(rawStatus) {

    const status = String(rawStatus || "")
        .toLowerCase()
        .trim();

    if (
        status === "završeno" ||
        status === "zavrseno" ||
        status === "dovršeno" ||
        status === "dovrseno"
    ) {

        return {
            className: "done",
            label: "Dovršeno",
            icon: "✓"
        };
    }

    if (
        status === "u tijeku" ||
        status === "u izradi"
    ) {

        return {
            className: "progress",
            label: "U tijeku",
            icon: "↻"
        };
    }

    return {
        className: "planned",
        label: "Planirano",
        icon: "○"
    };
}


/* ==========================================
   18. ACTIVITY DESCRIPTIONS

   Ovi opisi sluze za vizualni prikaz
   kao na referentnoj slici.

   Za poznate naslove imamo opis.
   Za ostale prikazujemo neutralan opis
   prema stvarnom statusu aktivnosti.

   Napomena:
   Opisi nisu dodatna polja iz baze.
========================================== */

function getActivityDescription(
    title,
    rawStatus
) {

    const normalizedTitle = String(title || "")
        .toLowerCase()
        .trim();

    /* Tekstovi prema referentnom dizajnu */

    const descriptions = {

        "izrada html i css obrasca":
            "Dovršen osnovni izgled forme i priprema za povezivanje s backendom.",

        "kreiranje backenda":
            "Postavljena baza podataka i API rute za prijavu i upravljanje podacima.",

        "kreiranje backhenda":
            "Postavljena baza podataka i API rute za prijavu i upravljanje podacima.",

        "seo optimizacija":
            "Na redu je optimizacija stranice za bolje pozicioniranje na tražilicama.",

        "testiranje i završne izmjene":
            "Testiranje svih funkcionalnosti i finalne prilagodbe prije lansiranja.",

        "testiranje i zavrsne izmjene":
            "Testiranje svih funkcionalnosti i finalne prilagodbe prije lansiranja."
    };

    if (descriptions[normalizedTitle]) {
        return descriptions[normalizedTitle];
    }

    const status = getActivityStatusData(rawStatus);

    if (status.className === "done") {

        return "Aktivnost je označena kao dovršena.";
    }

    if (status.className === "progress") {

        return "Rad na ovoj aktivnosti je u tijeku.";
    }

    return "Aktivnost je planirana za sljedeću fazu projekta.";
}


/* ==========================================
   19. PREMIUM ACTIVITIES TIMELINE

   Vizualno kao na mockupu:

   [KRUG] [ NASLOV + OPIS | DATUM | STATUS ]

   Ucitava stvarne aktivnosti iz Supabasea.
========================================== */

async function loadActivities(currentProjectId) {

    if (!activitiesContainer) {
        return;
    }

    /* SUPABASE QUERY */

    const { data: activities, error } =
        await supabaseClient
            .from("activities")
            .select(`
                title,
                status,
                position,
                activity_date
            `)
            .eq(
                "project_id",
                currentProjectId
            )
            .order(
                "position",
                {
                    ascending: true
                }
            );

    /* ERROR */

    if (error) {

        console.error(
            "Greška kod aktivnosti:",
            error
        );

        activitiesContainer.innerHTML = `

            <div class="empty-state">
                Aktivnosti se ne mogu učitati.
            </div>
        `;

        const lastUpdated =
            document.getElementById("lastUpdated");

        if (lastUpdated) {
            lastUpdated.textContent = "-";
        }

        return;
    }

    /* NO ACTIVITIES */

    if (
        !activities ||
        activities.length === 0
    ) {

        activitiesContainer.innerHTML = `

            <div class="empty-state">
                Trenutno nema aktivnosti.
            </div>
        `;

        const lastUpdated =
            document.getElementById("lastUpdated");

        if (lastUpdated) {
            lastUpdated.textContent = "-";
        }

        return;
    }

    /* CLEAR */

    activitiesContainer.replaceChildren();

    /* RENDER ACTIVITIES */

    activities.forEach(function (activity) {

        const statusData =
            getActivityStatusData(
                activity.status
            );

        const description =
            getActivityDescription(
                activity.title,
                activity.status
            );

        const item =
            document.createElement("div");

        item.className =
            `activity-item ${statusData.className}`;

        item.innerHTML = `

            <!-- TIMELINE NODE -->

            <div class="activity-node">

                <span
                    class="activity-node-dot"
                    aria-hidden="true"
                >
                    ${statusData.icon}
                </span>

            </div>


            <!-- ACTIVITY BUBBLE -->

            <div class="activity-row">


                <!-- TITLE + DESCRIPTION -->

                <div class="activity-text">

                    <strong class="activity-title">
                        ${escapeHtml(
                            activity.title || "-"
                        )}
                    </strong>

                    <p class="activity-description">
                        ${escapeHtml(description)}
                    </p>

                </div>


                <!-- DATE + STATUS -->

                <div class="activity-side">


                    <!-- DATE PILL -->

                    <span class="activity-date-pill">

                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >

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

                        ${escapeHtml(
                            formatDate(
                                activity.activity_date
                            )
                        )}

                    </span>


                    <!-- STATUS PILL -->

                    <span
                        class="activity-status-pill ${statusData.className}"
                    >

                        <span
                            class="status-dot"
                            aria-hidden="true"
                        ></span>

                        ${statusData.label}

                    </span>

                </div>

            </div>
        `;

        activitiesContainer.appendChild(item);
    });


    /* ======================================
       LAST UPDATED

       Zadrzavamo originalnu logiku:
       najnoviji datum aktivnosti.
    ====================================== */

    const withDate = activities
        .filter(
            activity =>
                activity.activity_date
        )
        .sort(
            function (a, b) {

                return (
                    new Date(b.activity_date) -
                    new Date(a.activity_date)
                );
            }
        );

    const lastUpdated =
        document.getElementById("lastUpdated");

    if (lastUpdated) {

        lastUpdated.textContent =
            withDate.length
                ? formatDate(
                    withDate[0].activity_date
                )
                : "-";
    }
}


/* ==========================================
   20. RENDER DEADLINE CARD
========================================== */

function renderDeadlineCard(project) {

    if (!deadlineContainer) {
        return;
    }

    const deadlineInfo =
        getDeadlineInfo(
            project.deadline
        );

    let badgeText = "● Nije postavljen";

    if (
        deadlineInfo.className ===
        "deadline-good"
    ) {

        badgeText = "● U planu";
    }

    else if (
        deadlineInfo.className ===
        "deadline-soon"
    ) {

        badgeText = "● Uskoro";
    }

    else if (
        deadlineInfo.className ===
        "deadline-late"
    ) {

        badgeText = "● Prošao";
    }

    const deadlineProgress = Math.max(
        0,
        Math.min(
            100,
            Number(project.progress || 0)
        )
    );

    const safeDeadlineProgress =
        Number.isFinite(deadlineProgress)
            ? deadlineProgress
            : 0;

    deadlineContainer.innerHTML = `

        <div
            class="deadline-card ${deadlineInfo.className}"
        >

            <!-- HEADER -->

            <div class="deadline-card-top">

                <div class="deadline-title-wrap">

                    <div class="deadline-main-icon">

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

                        <h3>
                            Rok projekta
                        </h3>

                        <p>
                            Planirani datum završetka projekta
                        </p>

                    </div>

                </div>


                <span class="deadline-badge">
                    ${badgeText}
                </span>

            </div>


            <!-- DEADLINE DATE -->

            <div class="deadline-main-date">

                ${formatDate(
                    project.deadline
                )}

            </div>


            <!-- DEADLINE STATS -->

            <div class="deadline-meta-grid">


                <!-- DAYS LEFT -->

                <div class="deadline-meta-item">

                    <span class="deadline-meta-label">
                        Preostalo vremena
                    </span>

                    <strong>

                        ${
                            deadlineInfo.daysLeft !== null
                                ? `${deadlineInfo.daysLeft} dana`
                                : "-"
                        }

                    </strong>

                </div>


                <!-- STATUS -->

                <div class="deadline-meta-item">

                    <span class="deadline-meta-label">
                        Status roka
                    </span>

                    <strong>
                        ${escapeHtml(
                            deadlineInfo.status
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            deadlineInfo.statusText
                        )}
                    </small>

                </div>


                <!-- PROGRESS -->

                <div class="deadline-meta-item">

                    <span class="deadline-meta-label">
                        Napredak projekta
                    </span>

                    <strong>
                        ${safeDeadlineProgress}%
                    </strong>

                    <small>
                        Trenutni ukupni napredak projekta.
                    </small>

                </div>

            </div>

        </div>
    `;
}


/* ==========================================
   21. VISIBILITY

   Kad se korisnik vrati na karticu,
   osvjezavamo broj neprocitanih poruka.
========================================== */

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


/* ==========================================
   22. START
========================================== */

initProjectPage();


/* ==========================================
   END — PTECH DIGITAL PROJECT.JS V53
========================================== */
