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


/* =========================
   PROJECT ID
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const projectId =
    params.get("id");


/* =========================
   FORMAT DATUMA
========================= */

function formatDate(value) {

    if (!value) {
        return "-";
    }

    const raw =
        String(value).slice(0, 10);

    const date =
        new Date(
            raw + "T00:00:00"
        );

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
   STATUS
========================= */

function getStatusClass(status) {

    const value =
        String(status || "")
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


/* =========================
   PACKAGE INFO
========================= */

function getPackageInfo(packageName) {

    const normalized =
        String(packageName || "")
            .toLowerCase()
            .trim();

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

        title:
            packageName
                ? `${packageName} paket`
                : "Paket",

        description:
            "Detalji paketa trenutno nisu dostupni.",

        features: []
    };
}


/* =========================
   DEADLINE INFO
========================= */

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

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    const deadlineDate =
        new Date(
            String(deadline).slice(0, 10) +
            "T00:00:00"
        );

    const difference =
        deadlineDate.getTime() -
        today.getTime();

    const daysLeft =
        Math.ceil(
            difference /
            (1000 * 60 * 60 * 24)
        );

    if (daysLeft < 0) {

        return {
            daysLeft:
                Math.abs(daysLeft),

            status:
                "Rok je prošao",

            statusText:
                "Planirani datum završetka projekta je prekoračen.",

            className:
                "deadline-late"
        };
    }

    if (daysLeft <= 30) {

        return {
            daysLeft,

            status:
                "Rok se približava",

            statusText:
                "Projekt ulazi u završnu fazu.",

            className:
                "deadline-soon"
        };
    }

    return {
        daysLeft,

        status:
            "Projekt je u roku",

        statusText:
            "Projekt teče prema planu.",

        className:
            "deadline-good"
    };
}


/* =========================
   THEME
========================= */

const savedTheme =
    localStorage.getItem("theme");

if (
    savedTheme === "light"
) {

    document.body.classList.add(
        "light-mode"
    );

    if (themeToggle) {
        themeToggle.checked = true;
    }
}


if (themeToggle) {

    themeToggle.addEventListener(
        "change",
        function () {

            document.body.classList.toggle(
                "light-mode",
                themeToggle.checked
            );

            localStorage.setItem(
                "theme",
                themeToggle.checked
                    ? "light"
                    : "dark"
            );
        }
    );
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
                "index.html";
        }
    );
}


/* =========================
   INIT
========================= */

async function initProjectPage() {

    const {
        data: {
            session
        }
    } =
        await supabaseClient
            .auth
            .getSession();


    if (!session) {

        window.location.href =
            "index.html";

        return;
    }


    /* USER */

    const {
        data: profile
    } =
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
            session.user.email
                .split("@")[0];
    }


    /* ID */

    if (!projectId) {

        showProjectError(
            "Projekt nije odabran."
        );

        return;
    }


    /* PROJEKT */

    const {
        data: project,
        error
    } =
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
        project.user_id !==
        session.user.id
    ) {

        showProjectError(
            "Projekt nije dostupan."
        );

        return;
    }


    renderProject(
        project
    );

    renderDeadlineCard(
        project
    );

    await loadActivities(
        project.id
    );
}


/* =========================
   ERROR
========================= */

function showProjectError(message) {

    if (projectContainer) {

        projectContainer.innerHTML = `

            <div class="project-back-row">

                <a
                    href="form.html"
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


/* =========================
   PROJECT
========================= */

function renderProject(project) {

    if (!projectContainer) {
        return;
    }


    const progress =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    project.progress || 0
                )
            )
        );


    const statusClass =
        getStatusClass(
            project.status
        );


    const packageInfo =
        getPackageInfo(
            project.package
        );


    const packageFeaturesHTML =
        packageInfo.features.length
            ? packageInfo.features
                .map(
                    feature => `

                        <div class="package-feature">

                            <span class="package-check">
                                ✓
                            </span>

                            <span>
                                ${escapeHtml(feature)}
                            </span>

                        </div>
                    `
                )
                .join("")
            : "";


    projectContainer.innerHTML = `

        <div class="project-back-row">

            <a
                href="form.html"
                class="project-back"
            >
                <span>‹</span>
                Natrag
            </a>

        </div>


        <section class="project-detail-hero">


            <!-- NASLOV -->

            <div class="project-detail-heading">

                <div class="project-main">

                    <div class="project-icon">

                        <svg viewBox="0 0 24 24">

                            <rect
                                x="3"
                                y="4"
                                width="18"
                                height="13"
                                rx="2">
                            </rect>

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
                    class="
                        status-badge
                        ${statusClass}
                    "
                >

                    ${escapeHtml(
                        project.status || "-"
                    )}

                </div>

            </div>


            <!-- SAMO NAPREDAK + ZADNJE AŽURIRANO -->

            <div class="project-stats">


                <!-- NAPREDAK -->

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
                                    style="
                                        width:
                                        ${progress}%;
                                    "
                                >
                                </div>

                            </div>


                            <strong>
                                ${progress}%
                            </strong>

                        </div>

                    </div>

                </div>


                <!-- ZADNJE AŽURIRANO -->

                <div class="stat-card">

                    <div class="stat-icon">

                        <svg viewBox="0 0 24 24">

                            <path
                                d="M20 11a8 8 0 1 1-2.34-5.66">
                            </path>

                            <path
                                d="M20 4v7h-7">
                            </path>

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


        </section>
    `;
}


/* =========================
   AKTIVNOSTI
========================= */

async function loadActivities(
    currentProjectId
) {

    if (!activitiesContainer) {
        return;
    }


    const {
        data: activities,
        error
    } =
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

        return;
    }


    if (
        !activities ||
        activities.length === 0
    ) {

        activitiesContainer.innerHTML = `

            <div class="empty-state">
                Trenutno nema aktivnosti.
            </div>
        `;

        return;
    }


    activitiesContainer.innerHTML =
        "";


    activities.forEach(
        activity => {

            const status =
                String(
                    activity.status || ""
                )
                    .toLowerCase()
                    .trim();


            let statusClass =
                "activity-waiting";

            let icon =
                "○";


            if (
                status === "završeno" ||
                status === "zavrseno"
            ) {

                statusClass =
                    "activity-done";

                icon = "✓";
            }

            else if (
                status === "u tijeku" ||
                status === "u izradi"
            ) {

                statusClass =
                    "activity-progress";

                icon = "↻";
            }


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                `activity-item ${statusClass}`;


            item.innerHTML = `

                <div class="activity-icon">
                    ${icon}
                </div>


                <div class="activity-content">

                    <strong class="activity-title">

                        ${escapeHtml(
                            activity.title || "-"
                        )}

                    </strong>


                    <span class="activity-date">

                        ${formatDate(
                            activity.activity_date
                        )}

                    </span>

                </div>
            `;


            activitiesContainer
                .appendChild(
                    item
                );
        }
    );


    /* ZADNJE AŽURIRANO */

    const withDate =
        activities
            .filter(
                activity =>
                    activity.activity_date
            )
            .sort(
                (a, b) =>
                    new Date(
                        b.activity_date
                    ) -
                    new Date(
                        a.activity_date
                    )
            );


    const lastUpdated =
        document.getElementById(
            "lastUpdated"
        );


    if (
        lastUpdated &&
        withDate.length
    ) {

        lastUpdated.textContent =
            formatDate(
                withDate[0]
                    .activity_date
            );
    }

    else if (lastUpdated) {

        lastUpdated.textContent =
            "-";
    }
}


/* =========================
   ROK PROJEKTA
========================= */

function renderDeadlineCard(project) {

    if (!deadlineContainer) {
        return;
    }


    const deadlineInfo =
        getDeadlineInfo(
            project.deadline
        );


    let badgeText =
        "● Nije postavljen";


    if (
        deadlineInfo.className ===
        "deadline-good"
    ) {

        badgeText =
            "● U planu";
    }

    else if (
        deadlineInfo.className ===
        "deadline-soon"
    ) {

        badgeText =
            "● Uskoro";
    }

    else if (
        deadlineInfo.className ===
        "deadline-late"
    ) {

        badgeText =
            "● Prošao";
    }


    deadlineContainer.innerHTML = `

        <div
            class="
                deadline-card
                ${deadlineInfo.className}
            "
        >

            <div class="deadline-card-top">

                <div class="deadline-title-wrap">

                    <div class="deadline-main-icon">

                        <svg viewBox="0 0 24 24">

                            <rect
                                x="3"
                                y="5"
                                width="18"
                                height="16"
                                rx="2">
                            </rect>

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


            <div class="deadline-main-date">

                ${formatDate(
                    project.deadline
                )}

            </div>


            <div class="deadline-meta-grid">


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


                <div class="deadline-meta-item">

                    <span class="deadline-meta-label">
                        Napredak projekta
                    </span>

                    <strong>

                        ${Math.max(
                            0,
                            Math.min(
                                100,
                                Number(
                                    project.progress || 0
                                )
                            )
                        )}%

                    </strong>

                    <small>
                        Trenutni ukupni napredak projekta.
                    </small>

                </div>

            </div>

        </div>
    `;
}


/* =========================
   START
========================= */

initProjectPage();
