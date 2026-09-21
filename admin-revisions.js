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

const revisionsList =
    document.getElementById(
        "adminRevisionsList"
    );

const revisionCount =
    document.getElementById(
        "revisionCount"
    );

const adminMessage =
    document.getElementById(
        "adminMessage"
    );

const adminUserName =
    document.getElementById(
        "adminUserName"
    );

const logoutButton =
    document.getElementById(
        "adminLogoutButton"
    );


let currentSession = null;


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

    if (!adminMessage) {
        return;
    }

    adminMessage.hidden =
        false;

    adminMessage.className =
        `admin-message ${type}`;

    adminMessage.textContent =
        message;
}


function hideMessage() {

    if (!adminMessage) {
        return;
    }

    adminMessage.hidden =
        true;

    adminMessage.className =
        "admin-message";

    adminMessage.textContent =
        "";
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
   ADMIN PROVJERA
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
            "Greška kod admin provjere:",
            error
        );

        return false;
    }

    return data === true;
}


/* =========================
   ADMIN PROFIL
========================= */

async function loadAdminProfile(session) {

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
            "Greška kod admin profila:",
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
   GROUP MESSAGES
========================= */

function groupMessages(messages) {

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
    }


    /*
        Najnoviji razgovor ide prvi.
    */

    threads.sort(
        (a, b) => {

            const lastA =
                a.messages[
                    a.messages.length - 1
                ];

            const lastB =
                b.messages[
                    b.messages.length - 1
                ];

            return (
                new Date(
                    lastB.created_at
                ) -
                new Date(
                    lastA.created_at
                )
            );
        }
    );


    return threads;
}


/* =========================
   RENDER THREAD
========================= */

function renderThread(thread) {

    const project =
        thread.project;


    const projectTitle =
        project?.type ||
        project?.name ||
        `Projekt #${thread.project_id}`;


    const projectName =
        project?.name || "";


    const lastMessage =
        thread.messages[
            thread.messages.length - 1
        ];


    const waitingForAdmin =
        lastMessage?.sender_role ===
        "client";


    const lastMessageText =
        lastMessage?.message || "";


    const messageCount =
        thread.messages.length;


    const messagesHtml =
        thread.messages
            .map(
                message => {

                    const isAdmin =
                        message.sender_role ===
                        "admin";


                    return `

                        <div
                            class="
                                admin-thread-message
                                ${
                                    isAdmin
                                        ? "admin-thread-admin"
                                        : "admin-thread-client"
                                }
                            "
                        >

                            <div class="admin-thread-message-top">

                                <strong>
                                    ${
                                        isAdmin
                                            ? "PTech Digital"
                                            : "Klijent"
                                    }
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


    return `

        <article
            class="
                admin-revision-card
                admin-thread-card
            "
            data-project-id="${thread.project_id}"
            data-design-id="${thread.design_id}"
        >

            <button
                type="button"
                class="admin-thread-toggle"
                data-thread-toggle="${thread.project_id}-${thread.design_id}"
                aria-expanded="false"
            >

                <div class="admin-thread-summary">


                    <div class="admin-thread-summary-main">

                        <span class="admin-thread-project-label">
                            Projekt
                        </span>


                        <h3>
                            ${escapeHtml(
                                projectTitle
                            )}
                        </h3>


                        <p>
                            ${escapeHtml(
                                projectName
                            )}
                        </p>


                        <div class="admin-thread-meta">

                            <span>
                                Verzija dizajna #${thread.design_id}
                            </span>

                            <span>
                                ${messageCount}
                                ${
                                    messageCount === 1
                                        ? "poruka"
                                        : messageCount >= 2 &&
                                          messageCount <= 4
                                            ? "poruke"
                                            : "poruka"
                                }
                            </span>

                        </div>

                    </div>


                    <div class="admin-thread-summary-side">

                        <span
                            class="
                                admin-revision-status
                                ${
                                    waitingForAdmin
                                        ? ""
                                        : "answered"
                                }
                            "
                        >
                            ${
                                waitingForAdmin
                                    ? "Na čekanju"
                                    : "Odgovoreno"
                            }
                        </span>


                        <span class="admin-thread-chevron">
                            ▾
                        </span>

                    </div>

                </div>


                <div class="admin-thread-preview">

                    <strong>
                        ${
                            lastMessage?.sender_role ===
                            "admin"
                                ? "PTech Digital:"
                                : "Klijent:"
                        }
                    </strong>

                    <span>
                        ${escapeHtml(
                            lastMessageText
                        )}
                    </span>

                </div>

            </button>


            <div
                class="admin-thread-content"
                id="thread-${thread.project_id}-${thread.design_id}"
                hidden
            >

                <div class="admin-thread">

                    ${messagesHtml}

                </div>


                <div class="admin-reply-area">

                    <label
                        for="reply-${thread.project_id}-${thread.design_id}"
                    >
                        Odgovor klijentu
                    </label>


                    <textarea
                        id="reply-${thread.project_id}-${thread.design_id}"
                        class="admin-reply-input"
                        maxlength="2000"
                        placeholder="Napiši odgovor klijentu..."
                    ></textarea>


                    <div class="admin-reply-actions">

                        <button
                            type="button"
                            class="admin-reply-button"
                            data-project-id="${thread.project_id}"
                            data-design-id="${thread.design_id}"
                        >
                            Pošalji odgovor
                        </button>

                    </div>

                </div>

            </div>

        </article>
    `;
}


/* =========================
   RENDER SVIH THREADOVA
========================= */

function renderRevisions(messages) {

    if (!revisionsList) {
        return;
    }


    const threads =
        groupMessages(
            messages
        );


    if (revisionCount) {

        revisionCount.textContent =
            threads.length;
    }


    if (
        threads.length === 0
    ) {

        revisionsList.innerHTML = `

            <div class="admin-empty">
                Trenutno nema zahtjeva za izmjenu.
            </div>
        `;

        return;
    }


    revisionsList.innerHTML =
        threads
            .map(
                renderThread
            )
            .join("");


    setupReplyButtons();

    setupThreadToggles();
}


/* =========================
   ACCORDION
========================= */

function setupThreadToggles() {

    const toggles =
        document.querySelectorAll(
            "[data-thread-toggle]"
        );


    toggles.forEach(
        toggle => {

            toggle.addEventListener(
                "click",
                function () {

                    const key =
                        toggle.dataset
                            .threadToggle;


                    const content =
                        document.getElementById(
                            `thread-${key}`
                        );


                    if (!content) {
                        return;
                    }


                    const isOpen =
                        !content.hidden;


                    content.hidden =
                        isOpen;


                    toggle.setAttribute(
                        "aria-expanded",
                        String(
                            !isOpen
                        )
                    );


                    toggle.classList.toggle(
                        "open",
                        !isOpen
                    );
                }
            );
        }
    );
}


/* =========================
   LOAD MESSAGES
========================= */

async function loadRevisions() {

    if (!revisionsList) {
        return;
    }


    revisionsList.innerHTML = `

        <div class="admin-empty">
            Učitavanje zahtjeva...
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


        revisionsList.innerHTML = `

            <div class="admin-empty">
                Zahtjeve nije moguće učitati.
            </div>
        `;


        showMessage(
            "Došlo je do greške kod učitavanja zahtjeva.",
            "error"
        );


        return;
    }


    renderRevisions(
        data || []
    );
}


/* =========================
   REPLY BUTTONS
========================= */

function setupReplyButtons() {

    const buttons =
        document.querySelectorAll(
            ".admin-reply-button"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                async function () {

                    hideMessage();


                    const projectId =
                        button.dataset
                            .projectId;


                    const designId =
                        button.dataset
                            .designId;


                    const textarea =
                        document.getElementById(
                            `reply-${projectId}-${designId}`
                        );


                    if (!textarea) {
                        return;
                    }


                    const reply =
                        textarea.value
                            .trim();


                    if (!reply) {

                        showMessage(
                            "Napiši odgovor prije slanja.",
                            "error"
                        );

                        textarea.focus();

                        return;
                    }


                    if (
                        reply.length < 3
                    ) {

                        showMessage(
                            "Odgovor je prekratak.",
                            "error"
                        );

                        textarea.focus();

                        return;
                    }


                    if (!currentSession) {

                        showMessage(
                            "Admin sesija nije dostupna.",
                            "error"
                        );

                        return;
                    }


                    button.disabled =
                        true;

                    button.textContent =
                        "Šaljem...";


                    const {
                        error
                    } =
                        await supabaseClient
                            .from(
                                "design_revision_messages"
                            )
                            .insert({

                                project_id:
                                    Number(
                                        projectId
                                    ),

                                design_id:
                                    Number(
                                        designId
                                    ),

                                user_id:
                                    currentSession
                                        .user
                                        .id,

                                sender_role:
                                    "admin",

                                message:
                                    reply
                            });


                    if (error) {

                        console.error(
                            "Greška kod slanja odgovora:",
                            error
                        );


                        showMessage(
                            "Odgovor nije moguće poslati.",
                            "error"
                        );


                        button.disabled =
                            false;

                        button.textContent =
                            "Pošalji odgovor";


                        return;
                    }


                    showMessage(
                        "Odgovor je uspješno poslan.",
                        "success"
                    );


                    await loadRevisions();
                }
            );
        }
    );
}


/* =========================
   START
========================= */

async function startAdminRevisions() {

    hideMessage();


    const {
        data: {
            session
        },
        error:
            sessionError
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


    currentSession =
        session;


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


    await loadRevisions();
}


/* =========================
   INIT
========================= */

startAdminRevisions();
