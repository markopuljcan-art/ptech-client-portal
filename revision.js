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

const conversationContainer =
    document.getElementById(
        "revisionConversation"
    );


/* =========================
   URL PARAMS
========================= */

const params =
    new URLSearchParams(
        window.location.search
    );

const projectId =
    params.get("id");

const designId =
    params.get("design");


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
   MESSAGE BOX
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
   CHAT RENDER
========================= */

function renderConversation(messages) {

    if (!conversationContainer) {
        return;
    }


    if (
        !messages ||
        messages.length === 0
    ) {

        conversationContainer.innerHTML = `

            <div class="conversation-empty">
                Još nema poruka za ovu verziju dizajna.
            </div>
        `;

        return;
    }


    conversationContainer.innerHTML =
        messages
            .map(
                message => {

                    const isAdmin =
                        message.sender_role ===
                        "admin";

                    const senderLabel =
                        isAdmin
                            ? "PTech Digital"
                            : "Ti";

                    return `

                        <div
                            class="
                                conversation-message
                                ${
                                    isAdmin
                                        ? "admin-message-item"
                                        : "client-message-item"
                                }
                            "
                        >

                            <div class="conversation-message-top">

                                <strong>
                                    ${senderLabel}
                                </strong>

                                <span>
                                    ${formatDateTime(
                                        message.created_at
                                    )}
                                </span>

                            </div>

                            <p>
                                ${escapeHtml(
                                    message.message
                                )}
                            </p>

                        </div>
                    `;
                }
            )
            .join("");


    conversationContainer.scrollTop =
        conversationContainer.scrollHeight;
}


/* =========================
   LOAD CHAT
========================= */

async function loadConversation(
    project
) {

    if (!conversationContainer) {
        return;
    }


    conversationContainer.innerHTML = `

        <div class="conversation-empty">
            Učitavanje razgovora...
        </div>
    `;


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
                message
            `)
            .eq(
                "project_id",
                project.id
            )
            .eq(
                "design_id",
                Number(designId)
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Greška kod razgovora:",
            error
        );

        conversationContainer.innerHTML = `

            <div class="conversation-empty">
                Razgovor nije moguće učitati.
            </div>
        `;

        return;
    }


    renderConversation(
        data || []
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
                    "Napiši poruku.",
                    "error"
                );

                revisionMessage.focus();

                return;
            }


            if (message.length < 3) {

                showMessage(
                    "Poruka je prekratka.",
                    "error"
                );

                revisionMessage.focus();

                return;
            }


            if (!designId) {

                showMessage(
                    "Verzija dizajna nije odabrana.",
                    "error"
                );

                return;
            }


            submitButton.disabled =
                true;

            submitButton.textContent =
                "Šaljem...";


            /* =========================
               SPREMI PORUKU
            ========================= */

            const {
                error
            } =
                await supabaseClient
                    .from(
                        "design_revision_messages"
                    )
                    .insert({

                        project_id:
                            project.id,

                        design_id:
                            Number(
                                designId
                            ),

                        user_id:
                            session.user.id,

                        sender_role:
                            "client",

                        message:
                            message
                    });


            if (error) {

                console.error(
                    "Greška kod slanja poruke:",
                    error
                );

                showMessage(
                    "Poruku nije moguće poslati.",
                    "error"
                );

                submitButton.disabled =
                    false;

                submitButton.textContent =
                    "Pošalji poruku";

                return;
            }


            /* =========================
               UPDATE DESIGN STATUS
            ========================= */

            const {
                error: designStatusError
            } =
                await supabaseClient
                    .from(
                        "project_designs"
                    )
                    .update({

                        status:
                            "revision_requested"
                    })
                    .eq(
                        "id",
                        Number(
                            designId
                        )
                    );


            if (designStatusError) {

                console.error(
                    "Greška kod promjene statusa dizajna:",
                    designStatusError
                );
            }


            /* =========================
               SUCCESS
            ========================= */

            revisionMessage.value =
                "";

            updateCharacterCount();


            submitButton.disabled =
                false;

            submitButton.textContent =
                "Pošalji poruku";


            showMessage(
                "Poruka je poslana.",
                "success"
            );


            await loadConversation(
                project
            );
        }
    );
}


/* =========================
   LOAD PROJECT
========================= */

async function loadProject() {

    hideMessage();


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


    if (!projectId) {

        showMessage(
            "Projekt nije odabran.",
            "error"
        );

        return;
    }


    if (!designId) {

        showMessage(
            "Verzija dizajna nije odabrana.",
            "error"
        );

        return;
    }


    if (backToApproval) {

        backToApproval.href =
            `approve.html?id=${projectId}`;
    }


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

        return;
    }


    if (!project) {

        showMessage(
            "Projekt nije pronađen.",
            "error"
        );

        return;
    }


    if (
        project.user_id &&
        project.user_id !==
        session.user.id
    ) {

        showMessage(
            "Ovaj projekt nije dostupan.",
            "error"
        );

        return;
    }


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


    setupRevisionForm(
        project,
        session
    );


    await loadConversation(
        project
    );
}


/* =========================
   START
========================= */

loadProject();
