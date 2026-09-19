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

const adminUserName =
    document.getElementById(
        "adminUserName"
    );

const adminWelcomeName =
    document.getElementById(
        "adminWelcomeName"
    );

const logoutButton =
    document.getElementById(
        "adminLogoutButton"
    );

const activeProjectsCount =
    document.getElementById(
        "activeProjectsCount"
    );

const pendingRevisionsCount =
    document.getElementById(
        "pendingRevisionsCount"
    );

const approvedDesignsCount =
    document.getElementById(
        "approvedDesignsCount"
    );

const clientsCount =
    document.getElementById(
        "clientsCount"
    );

const latestRevisions =
    document.getElementById(
        "latestRevisions"
    );

const recentProjects =
    document.getElementById(
        "recentProjects"
    );


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
   FORMAT DATUMA
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
   ADMIN PROFILE
========================= */

async function getAdminProfile(
    session
) {

    const {
        data: profile,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                display_name,
                role
            `)
            .eq(
                "id",
                session.user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Greška kod admin profila:",
            error
        );

        return null;
    }


    return profile;
}


/* =========================
   STATISTIKA
========================= */

async function loadStats() {

    /* AKTIVNI PROJEKTI */

    const {
        count: activeCount,
        error: projectsError
    } =
        await supabaseClient
            .from("projects")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .neq(
                "status",
                "Završeno"
            );


    if (projectsError) {

        console.error(
            "Greška kod brojanja projekata:",
            projectsError
        );
    }


    if (activeProjectsCount) {

        activeProjectsCount.textContent =
            activeCount ?? 0;
    }


    /* ZAHTJEVI NA ČEKANJU */

    const {
        count: revisionsCount,
        error: revisionsError
    } =
        await supabaseClient
            .from("design_revisions")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "status",
                "pending"
            );


    if (revisionsError) {

        console.error(
            "Greška kod brojanja zahtjeva:",
            revisionsError
        );
    }


    if (pendingRevisionsCount) {

        pendingRevisionsCount.textContent =
            revisionsCount ?? 0;
    }


    /* ODOBRENI DIZAJNI */

    const {
        count: approvalsCount,
        error: approvalsError
    } =
        await supabaseClient
            .from("design_approvals")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "status",
                "approved"
            );


    if (approvalsError) {

        console.error(
            "Greška kod brojanja odobrenja:",
            approvalsError
        );
    }


    if (approvedDesignsCount) {

        approvedDesignsCount.textContent =
            approvalsCount ?? 0;
    }


    /* KLIJENTI */

    const {
        count: clientCount,
        error: clientsError
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "role",
                "client"
            );


    if (clientsError) {

        console.error(
            "Greška kod brojanja klijenata:",
            clientsError
        );
    }


    if (clientsCount) {

        clientsCount.textContent =
            clientCount ?? 0;
    }
}


/* =========================
   ZADNJI ZAHTJEVI
========================= */

async function loadLatestRevisions() {

    if (!latestRevisions) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("design_revisions")
            .select(`
                id,
                project_id,
                message,
                status,
                created_at,
                projects (
                    id,
                    name,
                    type
                )
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(5);


    if (error) {

        console.error(
            "Greška kod zadnjih zahtjeva:",
            error
        );

        latestRevisions.innerHTML = `

            <div class="admin-empty">
                Zahtjeve nije moguće učitati.
            </div>
        `;

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        latestRevisions.innerHTML = `

            <div class="admin-empty">
                Trenutno nema novih zahtjeva.
            </div>
        `;

        return;
    }


    latestRevisions.innerHTML =
        data
            .map(
                item => {

                    const project =
                        item.projects;

                    const title =
                        project?.type ||
                        project?.name ||
                        `Projekt #${item.project_id}`;


                    const badge =
                        item.status === "answered"
                            ? "Odgovoreno"
                            : "Na čekanju";


                    return `

                        <a
                            href="admin-revisions.html"
                            class="admin-list-item"
                        >

                            <div class="admin-list-main">

                                <strong>
                                    ${escapeHtml(title)}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        item.message
                                    )}
                                </span>

                            </div>


                            <span class="admin-list-badge">
                                ${badge}
                            </span>

                        </a>
                    `;
                }
            )
            .join("");
}


/* =========================
   NEDAVNI PROJEKTI
========================= */

async function loadRecentProjects() {

    if (!recentProjects) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("projects")
            .select(`
                id,
                name,
                type,
                status,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(5);


    if (error) {

        console.error(
            "Greška kod nedavnih projekata:",
            error
        );

        recentProjects.innerHTML = `

            <div class="admin-empty">
                Projekte nije moguće učitati.
            </div>
        `;

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        recentProjects.innerHTML = `

            <div class="admin-empty">
                Trenutno nema projekata.
            </div>
        `;

        return;
    }


    recentProjects.innerHTML =
        data
            .map(
                project => {

                    return `

                        <a
                            href="project.html?id=${project.id}"
                            class="admin-list-item"
                        >

                            <div class="admin-list-main">

                                <strong>
                                    ${escapeHtml(
                                        project.type ||
                                        project.name ||
                                        "Projekt"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        project.name || ""
                                    )}
                                    •
                                    ${formatDate(
                                        project.created_at
                                    )}
                                </span>

                            </div>


                            <span class="admin-list-badge">
                                ${escapeHtml(
                                    project.status || "-"
                                )}
                            </span>

                        </a>
                    `;
                }
            )
            .join("");
}


/* =========================
   START
========================= */

async function startAdmin() {

    const {
        data: {
            session
        },
        error: sessionError
    } =
        await supabaseClient
            .auth
            .getSession();


    if (
        sessionError ||
        !session
    ) {

        window.location.href =
            "login.html";

        return;
    }


    const profile =
        await getAdminProfile(
            session
        );


    if (!profile) {

        window.location.href =
            "form.html";

        return;
    }


    const role =
        String(
            profile.role || ""
        )
            .trim()
            .toLowerCase();


    if (role !== "admin") {

        window.location.href =
            "form.html";

        return;
    }


    const name =
        profile.display_name ||
        "Admin";


    if (adminUserName) {

        adminUserName.textContent =
            name;
    }


    if (adminWelcomeName) {

        adminWelcomeName.textContent =
            name;
    }


    await Promise.all([
        loadStats(),
        loadLatestRevisions(),
        loadRecentProjects()
    ]);
}


/* =========================
   INIT
========================= */

startAdmin();
