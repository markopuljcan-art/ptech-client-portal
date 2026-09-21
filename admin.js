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

const pendingDesignsCount =
    document.getElementById(
        "pendingDesignsCount"
    );

const revisionRequestedCount =
    document.getElementById(
        "revisionRequestedCount"
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
   GROUP REVISION THREADS
========================= */

function groupRevisionThreads(
    messages
) {

    const groups = {};


    for (const message of messages) {

        const key =
            `${message.project_id}-${message.design_id}`;


        if (!groups[key]) {

            groups[key] = {

                project_id:
                    message.project_id,

                design_id:
                    message.design_id,

                project:
                    message.projects,

                messages: []
            };
        }


        groups[key].messages.push(
            message
        );
    }


    const threads =
        Object.values(groups);


    for (const thread of threads) {

        thread.messages.sort(
            (a, b) =>
                new Date(a.created_at) -
                new Date(b.created_at)
        );


        thread.lastMessage =
            thread.messages[
                thread.messages.length - 1
            ];


        thread.waitingForAdmin =
            thread.lastMessage
                ?.sender_role ===
            "client";
    }


    threads.sort(
        (a, b) =>
            new Date(
                b.lastMessage.created_at
            ) -
            new Date(
                a.lastMessage.created_at
            )
    );


    return threads;
}


/* =========================
   LOAD REVISION THREADS
========================= */

async function getRevisionThreads() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "design_revision_messages"
            )
            .select(`
                id,
                created_at,
                project_id,
                design_id,
                user_id,
                sender_role,
                message,
                projects (
                    id,
                    name,
                    type
                )
            `)
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Greška kod učitavanja razgovora:",
            error
        );

        return {
            threads: [],
            error
        };
    }


    return {
        threads:
            groupRevisionThreads(
                data || []
            ),

        error: null
    };
}


/* =========================
   STATISTIKA
========================= */

async function loadStats(
    revisionThreads
) {

    /* =========================
       AKTIVNI PROJEKTI
    ========================= */

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


    /* =========================
       ČEKA ODGOVOR ADMINA
    ========================= */

    const pendingThreads =
        revisionThreads.filter(
            thread =>
                thread.waitingForAdmin
        );


    if (pendingRevisionsCount) {

        pendingRevisionsCount.textContent =
            pendingThreads.length;
    }


    /* =========================
       ODOBRENI DIZAJNI
    ========================= */

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


    /* =========================
       ČEKA ODLUKU KLIJENTA
    ========================= */

    const {
        count: pendingDesignCount,
        error: pendingDesignsError
    } =
        await supabaseClient
            .from("project_designs")
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


    if (pendingDesignsError) {

        console.error(
            "Greška kod brojanja dizajna na čekanju:",
            pendingDesignsError
        );
    }


    if (pendingDesignsCount) {

        pendingDesignsCount.textContent =
            pendingDesignCount ?? 0;
    }


    /* =========================
       TRAŽENE IZMJENE
    ========================= */

    const {
        count: revisionRequestedDesigns,
        error: revisionRequestedError
    } =
        await supabaseClient
            .from("project_designs")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "status",
                "revision_requested"
            );


    if (revisionRequestedError) {

        console.error(
            "Greška kod brojanja traženih izmjena:",
            revisionRequestedError
        );
    }


    if (revisionRequestedCount) {

        revisionRequestedCount.textContent =
            revisionRequestedDesigns ?? 0;
    }


    /* =========================
       KLIJENTI
    ========================= */

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
   NAJNOVIJI ZAHTJEVI
========================= */

function loadLatestRevisions(
    revisionThreads
) {

    if (!latestRevisions) {
        return;
    }


    if (
        !revisionThreads ||
        revisionThreads.length === 0
    ) {

        latestRevisions.innerHTML = `
            <div class="admin-empty">
                Trenutno nema novih zahtjeva.
            </div>
        `;

        return;
    }


    const latest =
        revisionThreads.slice(
            0,
            5
        );


    latestRevisions.innerHTML =
        latest
            .map(
                thread => {

                    const project =
                        thread.project;


                    const title =
                        project?.type ||
                        project?.name ||
                        `Projekt #${thread.project_id}`;


                    const lastMessage =
                        thread.lastMessage;


                    const waiting =
                        thread.waitingForAdmin;


                    const badge =
                        waiting
                            ? "Na čekanju"
                            : "Odgovoreno";


                    return `
                        <a
                            href="admin-revisions.html"
                            class="admin-list-item"
                        >

                            <div class="admin-list-main">

                                <strong>
                                    ${escapeHtml(
                                        title
                                    )}
                                </strong>

                                <span>
                                    Dizajn #${thread.design_id}
                                    •
                                    ${escapeHtml(
                                        lastMessage
                                            ?.message ||
                                        ""
                                    )}
                                </span>

                            </div>

                            <span
                                class="
                                    admin-list-badge
                                    ${
                                        waiting
                                            ? ""
                                            : "answered"
                                    }
                                "
                            >
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
                                        project.name ||
                                        ""
                                    )}
                                    •
                                    ${formatDate(
                                        project.created_at
                                    )}
                                </span>

                            </div>

                            <span
                                class="admin-list-badge"
                            >
                                ${escapeHtml(
                                    project.status ||
                                    "-"
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


    if (
        role !== "admin"
    ) {

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


    /* =========================
       CHAT THREADOVI
    ========================= */

    const {
        threads,
        error: revisionThreadsError
    } =
        await getRevisionThreads();


    if (revisionThreadsError) {

        if (
            pendingRevisionsCount
        ) {

            pendingRevisionsCount.textContent =
                "0";
        }


        if (latestRevisions) {

            latestRevisions.innerHTML = `
                <div class="admin-empty">
                    Zahtjeve nije moguće učitati.
                </div>
            `;
        }
    }


    /* =========================
       DASHBOARD
    ========================= */

    await Promise.all([

        loadStats(
            threads
        ),

        loadRecentProjects()

    ]);


    loadLatestRevisions(
        threads
    );
}


/* =========================
   INIT
========================= */

startAdmin();
