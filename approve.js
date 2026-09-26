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
   PROJECT ID
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const projectId =
    params.get("id");


/* =========================
   TRENUTNI DIZAJN
========================= */

let currentDesign = null;


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

    projectStatus.style.color = "";
    projectStatus.style.borderColor = "";
    projectStatus.style.background = "";


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

const themeToggle =
    document.getElementById(
        "themeToggle"
    );


function loadTheme() {

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

            themeToggle.checked =
                true;
        }
    }
}


themeToggle
    ?.addEventListener(
        "change",
        () => {

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

            } else {

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


loadTheme();

/* =========================
   ACTIONS
========================= */

function disableActions() {

    if (approveButton) {
        approveButton.disabled = true;
    }

    if (revisionButton) {
        revisionButton.disabled = true;
    }
}


function enableActions() {

    if (approveButton) {
        approveButton.disabled = false;
    }

    if (revisionButton) {
        revisionButton.disabled = false;
    }
}


/* =========================
   APPROVED STATE
========================= */

function renderApprovedState() {

    if (approveButton) {

        approveButton.disabled =
            true;

        approveButton.innerHTML = `

            <span class="approval-button-icon">
                ✓
            </span>

            <span>

                <strong>
                    Dizajn odobren
                </strong>

                <small>
                    Ova verzija dizajna je potvrđena
                </small>

            </span>
        `;
    }


    if (revisionButton) {

        revisionButton.disabled =
            false;
    }
}


/* =========================
   RESET APPROVE BUTTON
========================= */

function renderPendingState() {

    if (!approveButton) {
        return;
    }

    approveButton.disabled =
        false;

    approveButton.innerHTML = `

        <span class="approval-button-icon">
            ✓
        </span>

        <span>

            <strong>
                Odobri dizajn
            </strong>

            <small>
                Potvrdi da možemo nastaviti
            </small>

        </span>
    `;
}


/* =========================
   DESIGN PLACEHOLDER
========================= */

function renderDesignPlaceholder(text) {

    if (!designPreview) {
        return;
    }

    designPreview.innerHTML = `

        <div class="empty-preview">

            <span>
                ${text}
            </span>

        </div>
    `;
}


/* =========================
   UČITAJ ZADNJI DIZAJN
========================= */

async function loadProjectDesign(project) {

    if (!designPreview) {
        return null;
    }


    renderDesignPlaceholder(
        "Učitavanje dizajna..."
    );


    const {
        data: designs,
        error
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
            .eq(
                "project_id",
                project.id
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
            "Greška kod dohvaćanja dizajna:",
            error
        );

        renderDesignPlaceholder(
            "Dizajn se trenutno ne može učitati."
        );

        return null;
    }


    if (
        !designs ||
        designs.length === 0
    ) {

        renderDesignPlaceholder(
            "Trenutno nema dodanog pregleda dizajna."
        );

        return null;
    }


    const design =
        designs[0];


    currentDesign =
        design;


    if (!design.file_path) {

        renderDesignPlaceholder(
            "Datoteka dizajna nije pronađena."
        );

        return null;
    }


    /* SIGNED URL */

    const {
        data: signedData,
        error: signedError
    } =
        await supabaseClient
            .storage
            .from(
                "project-designs"
            )
            .createSignedUrl(
                design.file_path,
                3600
            );


    if (signedError) {

        console.error(
            "Greška kod signed URL-a:",
            signedError
        );

        renderDesignPlaceholder(
            "Slika dizajna se trenutno ne može prikazati."
        );

        return null;
    }


    if (!signedData?.signedUrl) {

        renderDesignPlaceholder(
            "Slika dizajna nije dostupna."
        );

        return null;
    }


    /* PRIKAZ */

    designPreview.innerHTML = `

        <div class="design-image-wrapper">

            <img
                src="${signedData.signedUrl}"
                alt="Pregled dizajna projekta"
                class="design-image"
            >

        </div>
    `;


    return design;
}


/* =========================
   PROVJERI JE LI OVA
   VERZIJA ODOBRENA
========================= */

async function loadExistingApproval(
    project,
    session,
    design
) {

    if (!design) {
        return false;
    }


    const {
        data: approval,
        error
    } =
        await supabaseClient
            .from(
                "design_approvals"
            )
            .select(`
                id,
                status,
                approved_at,
                design_id
            `)
            .eq(
                "project_id",
                project.id
            )
            .eq(
                "user_id",
                session.user.id
            )
            .eq(
                "design_id",
                design.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Greška kod učitavanja odobrenja:",
            error
        );

        return false;
    }


    if (!approval) {

        renderPendingState();

        return false;
    }


    renderApprovedState();


    showMessage(
        "Ova verzija dizajna je već odobrena.",
        "success"
    );


    return true;
}


/* =========================
   SETUP ACTIONS
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


                if (!currentDesign) {

                    showMessage(
                        "Nema dostupnog dizajna za odobrenje.",
                        "error"
                    );

                    return;
                }


                approveButton.disabled =
                    true;


                /* =========================
                   PROVJERI POSTOJI LI VEĆ
                   ODOBRENJE ZA TU VERZIJU
                ========================= */

                const {
                    data: existingApproval,
                    error: existingError
                } =
                    await supabaseClient
                        .from(
                            "design_approvals"
                        )
                        .select(`
                            id,
                            design_id,
                            status
                        `)
                        .eq(
                            "project_id",
                            project.id
                        )
                        .eq(
                            "user_id",
                            session.user.id
                        )
                        .eq(
                            "design_id",
                            currentDesign.id
                        )
                        .maybeSingle();


                if (existingError) {

                    console.error(
                        "Greška kod provjere odobrenja:",
                        existingError
                    );

                    showMessage(
                        "Nije moguće provjeriti odobrenje.",
                        "error"
                    );

                    approveButton.disabled =
                        false;

                    return;
                }


                if (existingApproval) {

                    renderApprovedState();

                    showMessage(
                        "Ova verzija dizajna je već odobrena.",
                        "success"
                    );

                    return;
                }


                /* =========================
                   SPREMI ODOBRENJE
                ========================= */

                const {
                    error: insertError
                } =
                    await supabaseClient
                        .from(
                            "design_approvals"
                        )
                        .insert({

                            project_id:
                                project.id,

                            design_id:
                                currentDesign.id,

                            user_id:
                                session.user.id,

                            status:
                                "approved"
                        });


                if (insertError) {

                    console.error(
                        "Greška kod spremanja odobrenja:",
                        insertError
                    );

                    showMessage(
                        "Došlo je do greške prilikom odobrenja dizajna.",
                        "error"
                    );

                    approveButton.disabled =
                        false;

                    return;
                }


                /* =========================
                   UPDATE DESIGN STATUS
                ========================= */

                const {
                    error: designUpdateError
                } =
                    await supabaseClient
                        .from(
                            "project_designs"
                        )
                        .update({

                            status:
                                "approved"
                        })
                        .eq(
                            "id",
                            currentDesign.id
                        );


                if (designUpdateError) {

                    console.error(
                        "Greška kod statusa dizajna:",
                        designUpdateError
                    );
                }


                currentDesign.status =
                    "approved";


                renderApprovedState();


                showMessage(
                    "Ova verzija dizajna je uspješno odobrena.",
                    "success"
                );
            };
    }


    /* =========================
       ZATRAŽI IZMJENU
    ========================= */

    if (revisionButton) {

        revisionButton.onclick =
            function () {

                if (!currentDesign) {

                    showMessage(
                        "Nema dostupnog dizajna za izmjenu.",
                        "error"
                    );

                    return;
                }


                window.location.href =
                    `revision.html?id=${project.id}&design=${currentDesign.id}`;
            };
    }
}


/* =========================
   LOAD PROJECT
========================= */

async function loadProject() {

    hideMessage();


    /* SESSION */

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


    /* ID */

    if (!projectId) {

        showMessage(
            "Projekt nije odabran.",
            "error"
        );

        disableActions();

        return;
    }


    /* BACK */

    if (backToProject) {

        backToProject.href =
            `project.html?id=${projectId}`;
    }


    /* PROJECT */

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


    /* USER CHECK */

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


    /* RENDER */

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


    setupApprovalActions(
        project,
        session
    );


    /* DESIGN */

    const design =
        await loadProjectDesign(
            project
        );


    if (!design) {

        disableActions();

        return;
    }


    /* PROVJERI ODOBRENJE ZA
       KONKRETNU VERZIJU */

    await loadExistingApproval(
        project,
        session,
        design
    );
}


/* =========================
   START
========================= */

loadProject();
