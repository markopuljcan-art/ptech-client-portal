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

const projectTitle =
    document.getElementById(
        "approveProjectTitle"
    );

const projectName =
    document.getElementById(
        "approveProjectName"
    );

const projectStatus =
    document.getElementById(
        "approveProjectStatus"
    );

const designPreview =
    document.getElementById(
        "designPreview"
    );

const backToProject =
    document.getElementById(
        "backToProject"
    );

const approveButton =
    document.getElementById(
        "approveDesignButton"
    );

const revisionButton =
    document.getElementById(
        "requestRevisionButton"
    );

const approvalMessage =
    document.getElementById(
        "approvalMessage"
    );


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
   MESSAGE
========================= */

function showMessage(
    message,
    type = "success"
) {

    if (!approvalMessage) {
        return;
    }

    approvalMessage.hidden =
        false;

    approvalMessage.className =
        `approval-message ${type}`;

    approvalMessage.textContent =
        message;
}


function hideMessage() {

    if (!approvalMessage) {
        return;
    }

    approvalMessage.hidden =
        true;

    approvalMessage.className =
        "approval-message";

    approvalMessage.textContent =
        "";
}


/* =========================
   STATUS STYLE
========================= */

function renderStatus(status) {

    if (!projectStatus) {
        return;
    }

    const value =
        String(status || "")
            .toLowerCase()
            .trim();

    projectStatus.textContent =
        status || "-";


    projectStatus.style.color =
        "";

    projectStatus.style.borderColor =
        "";

    projectStatus.style.background =
        "";


    if (
        value === "završeno" ||
        value === "zavrseno"
    ) {

        projectStatus.style.color =
            "#4edb7b";

        projectStatus.style.borderColor =
            "rgba(46, 204, 113, 0.35)";

        projectStatus.style.background =
            "rgba(46, 204, 113, 0.08)";

        return;
    }


    if (
        value === "na čekanju" ||
        value === "na cekanju"
    ) {

        projectStatus.style.color =
            "#aaa";

        projectStatus.style.borderColor =
            "rgba(160, 160, 160, 0.30)";

        projectStatus.style.background =
            "rgba(160, 160, 160, 0.07)";

        return;
    }


    projectStatus.style.color =
        "#ff9a35";

    projectStatus.style.borderColor =
        "rgba(255, 122, 0, 0.35)";

    projectStatus.style.background =
        "rgba(255, 122, 0, 0.08)";
}


/* =========================
   DESIGN PREVIEW
========================= */

function renderDesignPreview(project) {

    if (!designPreview) {
        return;
    }


    /*
        Trenutno još nemamo
        design_url / design_image
        stupac u bazi.

        Zato zasad prikazujemo
        placeholder.

        Kasnije samo dodamo
        field u projects tablicu
        i ovdje ga renderiramo.
    */


    designPreview.innerHTML = `

        <div class="empty-preview">

            <span>
                Trenutno nema dodanog pregleda dizajna za ovaj projekt.
            </span>

        </div>
    `;
}


/* =========================
   LOAD PROJECT
========================= */

async function loadProject() {

    hideMessage();


    /* =========================
       SESSION
    ========================= */

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
            "login.html";

        return;
    }


    /* =========================
       ID PROVJERA
    ========================= */

    if (!projectId) {

        showMessage(
            "Projekt nije odabran.",
            "error"
        );

        disableActions();

        return;
    }


    /* =========================
       BACK LINK
    ========================= */

    if (backToProject) {

        backToProject.href =
            `project.html?id=${projectId}`;
    }


    /* =========================
       PROJECT
    ========================= */

    const {
        data: project,
        error
    } =
        await supabaseClient
            .from("projects")
            .select(`
                id,
                type,
                name,
                status,
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

        showMessage(
            "Projekt se ne može učitati.",
            "error"
        );

        disableActions();

        return;
    }


    if (!project) {

        showMessage(
            "Projekt nije pronađen.",
            "error"
        );

        disableActions();

        return;
    }


    /* =========================
       FRONTEND PROVJERA USERA
    ========================= */

    if (
        project.user_id &&
        project.user_id !==
        session.user.id
    ) {

        showMessage(
            "Ovaj projekt nije dostupan.",
            "error"
        );

        disableActions();

        return;
    }


    /* =========================
       RENDER
    ========================= */

    if (projectTitle) {

        projectTitle.textContent =
            project.type ||
            project.name ||
            "Projekt";
    }


    if (projectName) {

        projectName.textContent =
            project.name || "";
    }


    renderStatus(
        project.status
    );


    renderDesignPreview(
        project
    );


    setupApprovalActions(
        project,
        session
    );
}


/* =========================
   DISABLE ACTIONS
========================= */

function disableActions() {

    if (approveButton) {
        approveButton.disabled = true;
    }

    if (revisionButton) {
        revisionButton.disabled = true;
    }
}


/* =========================
   ENABLE ACTIONS
========================= */

function enableActions() {

    if (approveButton) {
        approveButton.disabled = false;
    }

    if (revisionButton) {
        revisionButton.disabled = false;
    }
}


/* =========================
   APPROVAL ACTIONS
========================= */

function setupApprovalActions(
    project,
    session
) {

    enableActions();


    /* =========================
       ODOBRI DIZAJN
    ========================= */

    if (approveButton) {

        approveButton.onclick =
            async function () {

                hideMessage();

                approveButton.disabled =
                    true;

                revisionButton.disabled =
                    true;


                /*
                    Trenutno još nemamo
                    posebnu approvals tablicu.

                    Zato zasad samo
                    potvrđujemo klik.

                    U sljedećem koraku
                    možemo napraviti
                    design_approvals tablicu
                    i stvarno zapisivati:
                    - project_id
                    - user_id
                    - status
                    - approved_at
                */


                try {

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                350
                            )
                    );


                    showMessage(
                        "Dizajn je odobren.",
                        "success"
                    );


                    approveButton.innerHTML = `

                        <span class="approval-button-icon">
                            ✓
                        </span>

                        <span>

                            <strong>
                                Dizajn odobren
                            </strong>

                            <small>
                                Potvrda je zaprimljena
                            </small>

                        </span>
                    `;


                } catch (error) {

                    console.error(
                        "Greška kod odobrenja:",
                        error
                    );

                    showMessage(
                        "Došlo je do greške prilikom odobrenja.",
                        "error"
                    );

                    enableActions();
                }
            };
    }


    /* =========================
       ZATRAŽI IZMJENU
    ========================= */

    if (revisionButton) {

        revisionButton.onclick =
            function () {

                window.location.href =
                    `revision.html?id=${project.id}`;
            };
    }
}


/* =========================
   START
========================= */

loadProject();
