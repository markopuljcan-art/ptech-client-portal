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

const documentsContainer =
    document.getElementById("projectDocuments");


/* =========================
   PROJECT ID IZ URL-a
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

    const date =
        new Date(
            value + "T00:00:00"
        );

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
   THEME
========================= */

const savedTheme =
    localStorage.getItem("theme");

if (savedTheme === "light") {

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

            await supabaseClient.auth.signOut();

            window.location.href =
                "index.html";
        }
    );
}


/* =========================
   UČITAJ STRANICU
========================= */

async function initProjectPage() {

    const {
        data: { session }
    } =
        await supabaseClient.auth.getSession();


    if (!session) {

        window.location.href =
            "index.html";

        return;
    }


    /* USER */

    const metadata =
        session.user.user_metadata || {};

    const userName =
        metadata.full_name ||
        metadata.name ||
        session.user.email
            .split("@")[0];

    if (userTop) {
        userTop.textContent =
            userName;
    }


    /* NEMA ID-a */

    if (!projectId) {

        if (projectContainer) {

            projectContainer.innerHTML = `
                <div class="empty-state">
                    Projekt nije pronađen.
                </div>
            `;
        }

        return;
    }


    /* =========================
       PROJEKT
    ========================= */

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
                package
            `)
            .eq(
                "id",
                projectId
            )
            .eq(
                "user_id",
                session.user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Greška kod projekta:",
            error
        );

        return;
    }


    if (!project) {

        projectContainer.innerHTML = `
            <div class="empty-state">
                Projekt nije pronađen.
            </div>
        `;

        return;
    }


    renderProject(project);

    await loadActivities(
        project.id
    );

    await loadDocuments(
        project.id
    );
}


/* =========================
   RENDER PROJEKTA
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
                            ${escapeHtml(project.name)}
                        </h2>

                        <p>
                            ${escapeHtml(project.type || "")}
                        </p>

                    </div>

                </div>


                <div
                    class="
                        status-badge
                        ${statusClass}
                    "
                >
                    ${escapeHtml(project.status || "-")}
                </div>

            </div>


            <div class="project-stats">


                <!-- PAKET -->

                <div class="stat-card">

                    <div class="stat-icon">
                        ▣
                    </div>

                    <div>

                        <span class="stat-label">
                            Paket
                        </span>

                        <strong class="package-value">
                            ${escapeHtml(project.package || "-")}
                        </strong>

                    </div>

                </div>


                <!-- NAPREDAK -->

                <div class="stat-card">

                    <div class="stat-icon">
                        ▥
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


                <!-- ROK -->

                <div class="stat-card">

                    <div class="stat-icon">
                        ◫
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


                <!-- ZADNJE AŽURIRANO -->

                <div class="stat-card">

                    <div class="stat-icon">
                        ↻
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

        </section>
    `;
}


/* =========================
   AKTIVNOSTI
========================= */

async function loadActivities(projectId) {

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
                projectId
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


    activitiesContainer.innerHTML = "";


    activities.forEach(
        function (activity) {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "activity-item";


            const icon =
                document.createElement(
                    "div"
                );

            icon.className =
                "activity-icon";


            const status =
                String(
                    activity.status || ""
                )
                    .toLowerCase()
                    .trim();


            if (
                status === "završeno" ||
                status === "zavrseno"
            ) {

                item.classList.add(
                    "activity-done"
                );

                icon.textContent = "✓";

            } else if (
                status === "u tijeku" ||
                status === "u izradi"
            ) {

                item.classList.add(
                    "activity-progress"
                );

                icon.textContent = "↻";

            } else {

                item.classList.add(
                    "activity-waiting"
                );

                icon.textContent = "○";
            }


            const content =
                document.createElement(
                    "div"
                );

            content.className =
                "activity-content";


            const title =
                document.createElement(
                    "strong"
                );

            title.className =
                "activity-title";

            title.textContent =
                activity.title || "-";


            const date =
                document.createElement(
                    "span"
                );

            date.className =
                "activity-date";

            date.textContent =
                formatDate(
                    activity.activity_date
                );


            content.appendChild(
                title
            );

            content.appendChild(
                date
            );


            item.appendChild(
                icon
            );

            item.appendChild(
                content
            );


            activitiesContainer.appendChild(
                item
            );
        }
    );


    /* ZADNJE AŽURIRANO */

    const datedActivities =
        activities.filter(
            activity =>
                activity.activity_date
        );


    if (datedActivities.length) {

        datedActivities.sort(
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


        if (lastUpdated) {

            lastUpdated.textContent =
                formatDate(
                    datedActivities[0]
                        .activity_date
                );
        }
    }
}


/* =========================
   DOKUMENTI
========================= */

async function loadDocuments(projectId) {

    if (!documentsContainer) {
        return;
    }


    const {
        data: documents,
        error
    } =
        await supabaseClient
            .from("project_documents")
            .select(`
                name,
                file_url,
                created_at
            `)
            .eq(
                "project_id",
                projectId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Greška kod dokumenata:",
            error
        );

        documentsContainer.innerHTML = `
            <div class="empty-state">
                Dokumenti se ne mogu učitati.
            </div>
        `;

        return;
    }


    if (
        !documents ||
        documents.length === 0
    ) {

        documentsContainer.innerHTML = `
            <div class="empty-state">
                Trenutno nema dokumenata.
            </div>
        `;

        return;
    }


    documentsContainer.innerHTML = "";


    for (
        const documentItem
        of documents
    ) {

        const {
            data: signedData,
            error: signedError
        } =
            await supabaseClient
                .storage
                .from(
                    "project-documents"
                )
                .createSignedUrl(
                    documentItem.file_url,
                    600
                );


        const card =
            document.createElement(
                signedError
                    ? "div"
                    : "a"
            );


        card.className =
            "project-document-card";


        if (!signedError) {

            card.href =
                signedData.signedUrl;

            card.target =
                "_blank";

            card.rel =
                "noopener noreferrer";
        }


        card.innerHTML = `

            <div class="project-document-icon">
                ↓
            </div>

            <div class="project-document-content">

                <strong>
                    ${escapeHtml(documentItem.name)}
                </strong>

                <span>
                    ${formatDate(
                        String(
                            documentItem.created_at
                        ).slice(0, 10)
                    )}
                </span>

            </div>

            <div class="project-document-arrow">
                ›
            </div>
        `;


        documentsContainer.appendChild(
            card
        );
    }
}


/* =========================
   START
========================= */

initProjectPage();
