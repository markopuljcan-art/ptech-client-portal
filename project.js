const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";


const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// =========================
// HELPERS
// =========================

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


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function setStatus(
    element,
    status
) {

    element.textContent =
        status || "-";


    element.classList.remove(
        "status-progress",
        "status-done",
        "status-waiting"
    );


    if (
        status === "U izradi"
    ) {

        element.classList.add(
            "status-progress"
        );

    }

    else if (
        status === "Završeno"
    ) {

        element.classList.add(
            "status-done"
        );

    }

    else if (
        status === "Na čekanju"
    ) {

        element.classList.add(
            "status-waiting"
        );

    }

}


// =========================
// AKTIVNOSTI
// =========================

async function loadActivities(
    projectId
) {

    const container =
        document.getElementById(
            "projectActivities"
        );


    const {
        data: activities,
        error
    } =
        await supabaseClient

            .from("activities")

            .select(
                `
                title,
                status,
                position,
                activity_date
                `
            )

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


    if (
        error
    ) {

        console.error(
            "Greška kod aktivnosti:",
            error
        );


        container.innerHTML = `
            <div class="no-projects">
                Aktivnosti se ne mogu učitati.
            </div>
        `;


        return;

    }


    if (
        !activities ||
        activities.length === 0
    ) {

        container.innerHTML = `
            <div class="no-projects">
                Trenutno nema aktivnosti.
            </div>
        `;


        return;

    }


    container.innerHTML =
        "";


    activities.forEach(
        function (
            activity
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.classList.add(
                "activity-item"
            );


            const icon =
                document.createElement(
                    "span"
                );


            icon.classList.add(
                "activity-icon"
            );


            // =========================
            // ZAVRŠENO
            // =========================

            if (
                activity.status ===
                "Završeno"
            ) {

                item.classList.add(
                    "activity-done"
                );


                icon.innerHTML = `
                    <svg viewBox="0 0 24 24">

                        <circle
                            cx="12"
                            cy="12"
                            r="9">
                        </circle>

                        <path
                            d="M8 12.5l2.5 2.5L16 9">
                        </path>

                    </svg>
                `;

            }


            // =========================
            // U TIJEKU
            // =========================

            else if (
                activity.status ===
                "U tijeku"
            ) {

                item.classList.add(
                    "activity-progress"
                );


                icon.innerHTML = `
                    <svg viewBox="0 0 24 24">

                        <circle
                            cx="12"
                            cy="12"
                            r="8">
                        </circle>

                        <path
                            d="M12 4a8 8 0 0 1 8 8">
                        </path>

                    </svg>
                `;

            }


            // =========================
            // ČEKANJE
            // =========================

            else {

                item.classList.add(
                    "activity-waiting"
                );


                icon.innerHTML = `
                    <svg viewBox="0 0 24 24">

                        <circle
                            cx="12"
                            cy="12"
                            r="8">
                        </circle>

                    </svg>
                `;

            }


            const content =
                document.createElement(
                    "div"
                );


            content.classList.add(
                "activity-content"
            );


            const title =
                document.createElement(
                    "strong"
                );


            title.classList.add(
                "activity-title"
            );


            title.textContent =
                activity.title;


            const date =
                document.createElement(
                    "span"
                );


            date.classList.add(
                "activity-date"
            );


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


            container.appendChild(
                item
            );

        }
    );

}


// =========================
// ZADNJE AŽURIRANO
// =========================

async function loadLatestUpdate(
    projectId
) {

    const element =
        document.getElementById(
            "projectUpdated"
        );


    const {
        data,
        error
    } =
        await supabaseClient

            .from("activities")

            .select(
                "activity_date"
            )

            .eq(
                "project_id",
                projectId
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
            )

            .limit(1);


    if (
        error ||
        !data ||
        data.length === 0
    ) {

        element.textContent =
            "-";

        return;

    }


    element.textContent =
        formatDate(
            data[0].activity_date
        );

}


// =========================
// DOKUMENTI
// =========================

async function loadDocuments(
    projectId
) {

    const container =
        document.getElementById(
            "projectDocuments"
        );


    const {
        data: documents,
        error
    } =
        await supabaseClient

            .from("project_documents")

            .select(
                `
                id,
                name,
                file_url,
                created_at
                `
            )

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


    if (
        error
    ) {

        console.error(
            "Greška kod dokumenata:",
            error
        );


        container.innerHTML = `
            <div class="no-projects">
                Dokumenti se ne mogu učitati.
            </div>
        `;


        return;

    }


    if (
        !documents ||
        documents.length === 0
    ) {

        container.innerHTML = `
            <div class="no-projects">
                Trenutno nema dokumenata.
            </div>
        `;


        return;

    }


    container.innerHTML =
        "";


    documents.forEach(
        function (
            documentItem
        ) {

            const item =
                document.createElement(
                    "a"
                );


            item.classList.add(
                "project-document-card"
            );


            item.target =
                "_blank";


            item.rel =
                "noopener noreferrer";


            if (
                documentItem.file_url
            ) {

                item.href =
                    documentItem.file_url;

            }

            else {

                item.href =
                    "#";

            }


            const createdDate =
                documentItem.created_at
                    ? new Date(
                        documentItem.created_at
                    )
                        .toLocaleDateString(
                            "hr-HR"
                        )
                    : "-";


            item.innerHTML = `

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
                        ${escapeHTML(
                            documentItem.name ||
                            "Dokument"
                        )}
                    </strong>

                    <span>
                        ${createdDate}
                    </span>

                </div>


                <span class="project-document-arrow">
                    &gt;
                </span>
            `;


            container.appendChild(
                item
            );

        }
    );

}


// =========================
// GLAVNI LOAD
// =========================

async function loadProject() {

    // =========================
    // SESSION
    // =========================

    const {
        data: {
            session
        }
    } =
        await supabaseClient
            .auth
            .getSession();


    if (
        !session
    ) {

        window.location.href =
            "login.html";

        return;

    }


    // =========================
    // USER
    // =========================

    const {
        data: profile,
        error: profileError
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


    if (
        profileError
    ) {

        console.error(
            "Greška kod profila:",
            profileError
        );

    }


    document
        .getElementById(
            "userTop"
        )
        .textContent =
            profile?.display_name ||
            session.user.email;


    // =========================
    // PROJECT ID IZ URL
    // =========================

    const params =
        new URLSearchParams(
            window.location.search
        );


    const projectId =
        params.get(
            "id"
        );


    if (
        !projectId
    ) {

        window.location.href =
            "form.html";

        return;

    }


    // =========================
    // DOHVATI PROJEKT
    // =========================

    const {
        data: project,
        error
    } =
        await supabaseClient

            .from("projects")

            .select(
                `
                id,
                type,
                name,
                status,
                progress,
                deadline,
                package,
                user_id
                `
            )

            .eq(
                "id",
                projectId
            )

            .eq(
                "user_id",
                session.user.id
            )

            .maybeSingle();


    if (
        error
    ) {

        console.error(
            "Greška kod projekta:",
            error
        );

    }


    if (
        !project
    ) {

        window.location.href =
            "form.html";

        return;

    }


    // =========================
    // PRIKAŽI PROJEKT
    // =========================

    document
        .getElementById(
            "projectType"
        )
        .textContent =
            project.type ||
            "Projekt";


    document
        .getElementById(
            "projectName"
        )
        .textContent =
            project.name ||
            "-";


    document
        .getElementById(
            "projectPackage"
        )
        .textContent =
            project.package ||
            "-";


    document
        .getElementById(
            "projectDeadline"
        )
        .textContent =
            formatDate(
                project.deadline
            );


    // STATUS

    setStatus(
        document.getElementById(
            "projectStatus"
        ),
        project.status
    );


    // =========================
    // PROGRESS
    // =========================

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


    document
        .getElementById(
            "projectProgress"
        )
        .textContent =
            progress;


    const progressBar =
        document.getElementById(
            "projectProgressBar"
        );


    progressBar.style.width =
        "0%";


    setTimeout(
        function () {

            progressBar.style.width =
                progress + "%";

        },
        150
    );


    // =========================
    // OSTALO
    // =========================

    await Promise.all([

        loadLatestUpdate(
            project.id
        ),

        loadActivities(
            project.id
        ),

        loadDocuments(
            project.id
        )

    ]);

}


// =========================
// LOGOUT
// =========================

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        async function () {

            await supabaseClient
                .auth
                .signOut();


            window.location.href =
                "login.html";

        }
    );


// =========================
// THEME
// =========================

const themeToggle =
    document.getElementById(
        "themeToggle"
    );


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


    themeToggle.checked =
        true;

}


themeToggle.addEventListener(
    "change",
    function () {

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

        }

        else {

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


// =========================
// START
// =========================

loadProject();
