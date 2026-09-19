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
   ZADNJI ZAHTJEV
========================= */

const latestRevisionCard =
    document.getElementById(
        "latestRevisionCard"
    );

const latestRevisionStatus =
    document.getElementById(
        "latestRevisionStatus"
    );

const latestRevisionText =
    document.getElementById(
        "latestRevisionText"
    );

const latestRevisionDate =
    document.getElementById(
        "latestRevisionDate"
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
   FORMAT DATUMA
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
   STATUS PROJEKTA
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
   FORMA
========================= */

function disableForm() {

    if (revisionMessage) {

        revisionMessage.disabled =
            true;
    }


    if (submitButton) {

        submitButton.disabled =
            true;
    }
}


function enableForm() {

    if (revisionMessage) {

        revisionMessage.disabled =
            false;
    }


    if (submitButton) {

        submitButton.disabled =
            false;
    }
}


/* =========================
   STATUS ZAHTJEVA
========================= */

function getRevisionStatusLabel(status) {

    const value =
        String(status || "")
            .toLowerCase()
            .trim();


    if (
        value === "answered" ||
        value === "resolved" ||
        value === "completed" ||
        value === "done"
    ) {

        return "Odgovoreno";
    }


    if (
        value === "in_progress" ||
        value === "in progress"
    ) {

        return "U obradi";
    }


    return "Na čekanju";
}


function getRevisionStatusClass(status) {

    const value =
        String(status || "")
            .toLowerCase()
            .trim();


    if (
        value === "answered" ||
        value === "resolved" ||
        value === "completed" ||
        value === "done"
    ) {

        return "status-resolved";
    }


    return "status-pending";
}


/* =========================
   ADMIN ODGOVOR
========================= */

function renderAdminReply(revision) {

    if (!latestRevisionCard) {
        return;
    }


    /*
        Ako već postoji stari odgovor
        u DOM-u, prvo ga uklanjamo.
    */

    const oldReply =
        latestRevisionCard.querySelector(
            ".client-admin-reply"
        );


    if (oldReply) {

        oldReply.remove();
    }


    /*
        Ako nema admin odgovora,
        ništa ne prikazujemo.
    */

    if (!revision.admin_reply) {
        return;
    }


    const replyBox =
        document.createElement(
            "div"
        );


    replyBox.className =
        "client-admin-reply";


    const replyTitle =
        document.createElement(
            "strong"
        );


    replyTitle.textContent =
        "Odgovor tima";


    const replyText =
        document.createElement(
            "p"
        );


    replyText.textContent =
        revision.admin_reply;


    const replyDate =
        document.createElement(
            "span"
        );


    replyDate.textContent =
        `Odgovoreno: ${formatDateTime(
            revision.replied_at
        )}`;


    replyBox.appendChild(
        replyTitle
    );


    replyBox.appendChild(
        replyText
    );


    replyBox.appendChild(
        replyDate
    );


    latestRevisionCard.appendChild(
        replyBox
    );
}


/* =========================
   ZADNJI ZAHTJEV
========================= */

async function loadLatestRevision(
    project,
    session
) {

    if (!latestRevisionCard) {
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
                message,
                status,
                created_at,
                admin_reply,
                replied_at
            `)
            .eq(
                "project_id",
                project.id
            )
            .eq(
                "user_id",
                session.user.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1);


    if (error) {

        console.error(
            "Greška kod učitavanja zadnjeg zahtjeva:",
            error
        );


        latestRevisionCard.hidden =
            true;


        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        latestRevisionCard.hidden =
            true;


        return;
    }


    const revision =
        data[0];


    latestRevisionCard.hidden =
        false;


    /* TEKST ZAHTJEVA */

    if (latestRevisionText) {

        latestRevisionText.textContent =
            revision.message || "-";
    }


    /* DATUM */

    if (latestRevisionDate) {

        latestRevisionDate.textContent =
            `Poslano: ${formatDateTime(
                revision.created_at
            )}`;
    }


    /* STATUS */

    if (latestRevisionStatus) {

        latestRevisionStatus.textContent =
            getRevisionStatusLabel(
                revision.status
            );


        latestRevisionStatus.className =
            `latest-revision-status ${getRevisionStatusClass(
                revision.status
            )}`;
    }


    /* ADMIN ODGOVOR */

    renderAdminReply(
        revision
    );
}


/* =========================
   SETUP FORME
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


            submitButton.disabled =
                false;


            submitButton.textContent =
                "Pošalji novi zahtjev";


            /*
                Nakon slanja odmah
                učitamo novi zadnji zahtjev.
            */

            await loadLatestRevision(
                project,
                session
            );
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
       ID
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
       BACK
    ========================= */

    if (backToApproval) {

        backToApproval.href =
            `approve.html?id=${projectId}`;
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
       USER CHECK
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


    /* =========================
       ZADNJI ZAHTJEV
    ========================= */

    await loadLatestRevision(
        project,
        session
    );
}


/* =========================
   START
========================= */

loadProject();
