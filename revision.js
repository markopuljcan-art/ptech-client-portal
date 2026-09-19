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
        "revisionProjectTitle"
    );

const projectName =
    document.getElementById(
        "revisionProjectName"
    );

const projectStatus =
    document.getElementById(
        "revisionProjectStatus"
    );

const backToApproval =
    document.getElementById(
        "backToApproval"
    );

const revisionForm =
    document.getElementById(
        "revisionForm"
    );

const revisionMessage =
    document.getElementById(
        "revisionMessage"
    );

const characterCount =
    document.getElementById(
        "characterCount"
    );

const submitButton =
    document.getElementById(
        "submitRevisionButton"
    );

const messageBox =
    document.getElementById(
        "revisionMessageBox"
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
   MESSAGE
========================= */

function showMessage(
    message,
    type = "success"
) {

    if (!messageBox) {
        return;
    }

    messageBox.hidden =
        false;

    messageBox.className =
        `revision-message ${type}`;

    messageBox.textContent =
        message;
}


function hideMessage() {

    if (!messageBox) {
        return;
    }

    messageBox.hidden =
        true;

    messageBox.className =
        "revision-message";

    messageBox.textContent =
        "";
}


/* =========================
   STATUS
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
   CHARACTER COUNT
========================= */

function updateCharacterCount() {

    if (
        !revisionMessage ||
        !characterCount
    ) {
        return;
    }

    characterCount.textContent =
        `${revisionMessage.value.length} / 1500`;
}


if (revisionMessage) {

    revisionMessage.addEventListener(
        "input",
        updateCharacterCount
    );

    updateCharacterCount();
}


/* =========================
   DISABLE FORM
========================= */

function disableForm() {

    if (revisionMessage) {
        revisionMessage.disabled = true;
    }

    if (submitButton) {
        submitButton.disabled = true;
    }
}


/* =========================
   ENABLE FORM
========================= */

function enableForm() {

    if (revisionMessage) {
        revisionMessage.disabled = false;
    }

    if (submitButton) {
        submitButton.disabled = false;
    }
}


/* =========================
   SETUP FORM
========================= */

function setupRevisionForm(
    project,
    session
) {

    if (!revisionForm) {
        return;
    }


    revisionForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            hideMessage();


            const message =
                revisionMessage.value.trim();


            if (!message) {

                showMessage(
                    "Napiši što želiš izmijeniti.",
                    "error"
                );

                revisionMessage.focus();

                return;
            }


            if (message.length < 5) {

                showMessage(
                    "Opis izmjene je prekratak.",
                    "error"
                );

                revisionMessage.focus();

                return;
            }


            submitButton.disabled =
                true;

            submitButton.textContent =
                "Šaljem...";


            /* =========================
               SPREMI U SUPABASE
            ========================= */

            const {
                error
            } =
                await supabaseClient
                    .from(
                        "design_revisions"
                    )
                    .insert({
                        project_id:
                            project.id,

                        user_id:
                            session.user.id,

                        message:
                            message,

                        status:
                            "pending"
                    });


            if (error) {

                console.error(
                    "Greška kod slanja zahtjeva:",
                    error
                );

                showMessage(
                    "Zahtjev nije moguće poslati. Pokušaj ponovno.",
                    "error"
                );

                submitButton.disabled =
                    false;

                submitButton.textContent =
                    "Pošalji zahtjev";

                return;
            }


            /* =========================
               SUCCESS
            ========================= */

            showMessage(
                "Zahtjev za izmjenu je uspješno poslan.",
                "success"
            );


            revisionMessage.value =
                "";

            updateCharacterCount();


            revisionMessage.disabled =
                true;

            submitButton.disabled =
                true;

            submitButton.textContent =
                "Zahtjev poslan";
        }
    );
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


    /* =========================
       PROVJERA ID-a
    ========================= */

    if (!projectId) {

        showMessage(
            "Projekt nije odabran.",
            "error"
        );

        disableForm();

        return;
    }


    /* =========================
       BACK LINK
    ========================= */

    if (backToApproval) {

        backToApproval.href =
            `approve.html?id=${projectId}`;
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

        disableForm();

        return;
    }


    if (!project) {

        showMessage(
            "Projekt nije pronađen.",
            "error"
        );

        disableForm();

        return;
    }


    /* =========================
       PROVJERA KORISNIKA
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

        disableForm();

        return;
    }


    /* =========================
       RENDER PROJEKTA
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


    /* =========================
       FORMA
    ========================= */

    enableForm();

    setupRevisionForm(
        project,
        session
    );
}


/* =========================
   START
========================= */

loadProject();
