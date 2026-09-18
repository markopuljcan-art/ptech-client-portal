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
   THEME
========================= */

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
   START
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



    /* =========================
       USER
    ========================= */

    const {
        data: profile
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


    if (userTop) {

        userTop.textContent =
            profile?.display_name ||
            session.user.email
                .split("@")[0];

    }



    /* =========================
       ID PROVJERA
    ========================= */

    if (!projectId) {

        showProjectError(
            "Projekt nije odabran."
        );

        return;
    }



    /* =========================
       DOHVATI PROJEKT
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



    /*
        DODATNA FRONTEND PROVJERA.

        RLS u Supabaseu i dalje treba
        ostati glavna zaštita.
    */

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



    /* =========================
       PRIKAŽI
    ========================= */

    renderProject(
        project
    );


    await Promise.all([

        loadActivities(
            project.id
        ),

        loadDocuments(
            project.id
        )

    ]);

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

        activitiesContainer.innerHTML =
            "";
    }


    if (documentsContainer) {

        documentsContainer.innerHTML =
            "";
    }

}



/* =========================
   RENDER PROJEKTA
========================= */

function renderProject(project) {

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



            <div class="project-stats">


                <!-- PAKET -->

                <div class="stat-card">

                    <div class="stat-icon">

                        <svg viewBox="0 0 24 24">

                            <rect
                                x="3"
                                y="7"
                                width="18"
                                height="13"
                                rx="2">
                            </rect>

                            <path
                                d="M8 7V5">
                            </path>

                            <path
                                d="M16 7V5">
                            </path>

                            <path
                                d="M8 5h8">
                            </path>

                        </svg>

                    </div>


                    <div>

                        <span class="stat-label">
                            Paket
                        </span>

                        <strong class="package-value">

                            ${escapeHtml(
                                project.package || "-"
                            )}

                        </strong>

                    </div>

                </div>



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



                <!-- ROK -->

                <div class="stat-card">

                    <div class="stat-icon">

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

                        <span class="stat-label">
                            Rok
                        </span>

                        <strong>
                            ${formatDate(
                                project.deadline
                            )}
                        </strong>

                    </div>

                </div>



                <!-- ZADNJE -->

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


        </section>
    `;

}



/* =========================
   AKTIVNOSTI
========================= */

async function loadActivities(
    currentProjectId
) {

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

                icon =
                    "✓";

            }

            else if (
                status === "u tijeku" ||
                status === "u izradi"
            ) {

                statusClass =
                    "activity-progress";

                icon =
                    "↻";

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
                item =>
                    item.activity_date
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

}



/* =========================
   DOKUMENTI
========================= */

async function loadDocuments(
    currentProjectId
) {

    const {
        data: documents,
        error
    } =
        await supabaseClient

            .from(
                "project_documents"
            )

            .select(`
                id,
                name,
                file_url,
                created_at
            `)

            .eq(
                "project_id",
                currentProjectId
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



    documentsContainer.innerHTML =
        "";



    for (
        const documentItem
        of documents
    ) {

        const card =
            document.createElement(
                "a"
            );


        card.className =
            "project-document-card";


        let documentUrl =
            "#";


        if (
            documentItem.file_url
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


            if (
                !signedError &&
                signedData?.signedUrl
            ) {

                documentUrl =
                    signedData.signedUrl;

            }

        }


        card.href =
            documentUrl;


        if (
            documentUrl !== "#"
        ) {

            card.target =
                "_blank";

            card.rel =
                "noopener noreferrer";

        }


        card.innerHTML = `

            <div class="project-document-icon">

                <svg viewBox="0 0 24 24">

                    <path
                        d="M6 3h8l4 4v14H6z">
                    </path>

                    <path
                        d="M14 3v5h5">
                    </path>

                </svg>

            </div>


            <div class="project-document-content">

                <strong>

                    ${escapeHtml(
                        documentItem.name ||
                        "Dokument"
                    )}

                </strong>


                <span>

                    ${formatDate(
                        documentItem.created_at
                    )}

                </span>

            </div>


            <span class="project-document-arrow">
                ›
            </span>
        `;


        documentsContainer
            .appendChild(
                card
            );

    }

}



initProjectPage();
