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

const approvalsList =
    document.getElementById(
        "approvalsList"
    );

const approvalCount =
    document.getElementById(
        "approvalCount"
    );

const approvalsMessage =
    document.getElementById(
        "approvalsMessage"
    );

const adminUserName =
    document.getElementById(
        "adminUserName"
    );

const logoutButton =
    document.getElementById(
        "adminLogoutButton"
    );


/* =========================
   ESCAPE
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
   DATE
========================= */

function formatDateTime(value) {

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

    return date.toLocaleString(
        "hr-HR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================
   MESSAGE
========================= */

function showMessage(
    message,
    type = "error"
) {

    if (!approvalsMessage) {
        return;
    }

    approvalsMessage.hidden =
        false;

    approvalsMessage.className =
        `approvals-message ${type}`;

    approvalsMessage.textContent =
        message;
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
            .select("display_name")
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
   SIGNED IMAGE
========================= */

async function createDesignUrl(
    filePath
) {

    if (!filePath) {
        return null;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .storage
            .from(
                "project-designs"
            )
            .createSignedUrl(
                filePath,
                3600
            );


    if (error) {

        console.error(
            "Signed URL error:",
            error
        );

        return null;
    }


    return data?.signedUrl || null;
}


/* =========================
   LOAD APPROVALS
========================= */

async function loadApprovals() {

    if (!approvalsList) {
        return;
    }


    approvalsList.innerHTML = `
        <div class="admin-empty">
            Učitavanje odobrenja...
        </div>
    `;


    /* =========================
       APPROVAL RECORDS
    ========================= */

    const {
        data: approvals,
        error: approvalsError
    } =
        await supabaseClient
            .from("design_approvals")
            .select(`
                id,
                project_id,
                design_id,
                user_id,
                status,
                approved_at
            `)
            .eq(
                "status",
                "approved"
            )
            .order(
                "approved_at",
                {
                    ascending: false
                }
            );


    if (approvalsError) {

        console.error(
            "Approvals error:",
            approvalsError
        );

        approvalsList.innerHTML = `
            <div class="admin-empty">
                Odobrenja nije moguće učitati.
            </div>
        `;

        return;
    }


    if (
        !approvals ||
        approvals.length === 0
    ) {

        if (approvalCount) {
            approvalCount.textContent =
                "0";
        }

        approvalsList.innerHTML = `
            <div class="admin-empty">
                Trenutno nema odobrenih dizajna.
            </div>
        `;

        return;
    }


    if (approvalCount) {

        approvalCount.textContent =
            approvals.length;
    }


    /* =========================
       IDS
    ========================= */

    const projectIds =
        [
            ...new Set(
                approvals.map(
                    item =>
                        item.project_id
                )
            )
        ];


    const designIds =
        [
            ...new Set(
                approvals.map(
                    item =>
                        item.design_id
                )
            )
        ];


    const userIds =
        [
            ...new Set(
                approvals.map(
                    item =>
                        item.user_id
                )
            )
        ];


    /* =========================
       PROJECTS
    ========================= */

    const {
        data: projects
    } =
        await supabaseClient
            .from("projects")
            .select(`
                id,
                name,
                type
            `)
            .in(
                "id",
                projectIds
            );


    const projectMap =
        {};


    for (
        const project
        of projects || []
    ) {

        projectMap[
            project.id
        ] =
            project;
    }


    /* =========================
       DESIGNS
    ========================= */

    const {
        data: designs
    } =
        await supabaseClient
            .from("project_designs")
            .select(`
                id,
                project_id,
                file_path,
                status,
                created_at
            `)
            .in(
                "id",
                designIds
            );


    const designMap =
        {};


    for (
        const design
        of designs || []
    ) {

        designMap[
            design.id
        ] =
            design;
    }


    /* =========================
       CLIENTS
    ========================= */

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


    const profileMap =
        {};


    for (
        const profile
        of profiles || []
    ) {

        profileMap[
            profile.id
        ] =
            profile;
    }


    /* =========================
       BUILD CARDS
    ========================= */

    const cards = [];


    for (
        const approval
        of approvals
    ) {

        const project =
            projectMap[
                approval.project_id
            ];


        const design =
            designMap[
                approval.design_id
            ];


        const client =
            profileMap[
                approval.user_id
            ];


        const imageUrl =
            await createDesignUrl(
                design?.file_path
            );


        const projectTitle =
            project?.type ||
            project?.name ||
            `Projekt #${approval.project_id}`;


        cards.push(`

            <article class="approval-card">


                <!-- PREVIEW -->

                <div class="approval-preview">

                    ${
                        imageUrl

                            ? `
                                <img
                                    src="${imageUrl}"
                                    alt="Odobreni dizajn"
                                >
                            `

                            : `
                                <div class="approval-preview-empty">
                                    Nema pregleda
                                </div>
                            `
                    }

                </div>


                <!-- INFO -->

                <div class="approval-info">

                    <div class="approval-top">

                        <div>

                            <span class="approval-label">
                                Projekt
                            </span>

                            <h3>
                                ${escapeHtml(
                                    projectTitle
                                )}
                            </h3>

                            <p>
                                ${escapeHtml(
                                    project?.name ||
                                    ""
                                )}
                            </p>

                        </div>


                        <span class="approval-status">
                            ✓ Odobreno
                        </span>

                    </div>


                    <div class="approval-details">


                        <div>

                            <span>
                                Klijent
                            </span>

                            <strong>
                                ${escapeHtml(
                                    client?.display_name ||
                                    "Klijent"
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Verzija
                            </span>

                            <strong>
                                Dizajn #${approval.design_id}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Datum odobrenja
                            </span>

                            <strong>
                                ${formatDateTime(
                                    approval.approved_at
                                )}
                            </strong>

                        </div>


                    </div>


                    <div class="approval-actions">

                        ${
                            imageUrl

                                ? `
                                    <a
                                        href="${imageUrl}"
                                        target="_blank"
                                        rel="noopener"
                                        class="approval-view-button"
                                    >
                                        Otvori dizajn
                                    </a>
                                `

                                : ""
                        }


                        <a
                            href="admin-revisions.html"
                            class="approval-secondary-button"
                        >
                            Povijest razgovora
                        </a>

                    </div>

                </div>

            </article>
        `);
    }


    approvalsList.innerHTML =
        cards.join("");
}


/* =========================
   START
========================= */

async function startApprovals() {

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


    await loadApprovals();
}


/* =========================
   INIT
========================= */

startApprovals();
