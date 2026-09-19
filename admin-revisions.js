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
   STATUS
========================= */

function getStatusLabel(status) {

    const value =
        String(status || "")
            .trim()
            .toLowerCase();

    if (
        value === "answered" ||
        value === "resolved"
    ) {
        return "Odgovoreno";
    }

    return "Na čekanju";
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

async function loadAdminProfile(
    session
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                display_name
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
   RENDER ZAHTJEVA
========================= */

function renderRevisions(revisions) {

    if (!revisionsList) {
        return;
    }


    if (revisionCount) {

        revisionCount.textContent =
            revisions.length;
    }


    if (
        !revisions ||
        revisions.length === 0
    ) {

        revisionsList.innerHTML = `

            <div class="admin-empty">
                Trenutno nema zahtjeva za izmjenu.
            </div>
        `;

        return;
    }


    revisionsList.innerHTML =
        revisions
            .map(
                revision => {

                    const project =
                        revision.projects;

                    const projectTitle =
                        project?.type ||
                        project?.name ||
                        `Projekt #${revision.project_id}`;

                    const projectName =
                        project?.name || "";

                    const answered =
                        Boolean(
                            revision.admin_reply
                        ) ||
                        revision.status ===
                        "answered";


                    return `

                        <article
                            class="admin-revision-card"
                            data-revision-id="${revision.id}"
                        >

                            <div class="admin-revision-top">

                                <div class="admin-revision-project">

                                    <span>
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

                                </div>


                                <span
                                    class="admin-revision-status ${
                                        answered
                                            ? "answered"
                                            : ""
                                    }"
                                >
                                    ${getStatusLabel(
                                        revision.status
                                    )}
                                </span>

                            </div>


                            <div class="admin-request-box">

                                <span class="admin-request-label">
                                    Zahtjev klijenta
                                </span>

                                <p class="admin-request-text">
                                    ${escapeHtml(
                                        revision.message
                                    )}
                                </p>

                                <span class="admin-request-date">
                                    Poslano:
                                    ${formatDateTime(
                                        revision.created_at
                                    )}
                                </span>

                            </div>


                            ${
                                answered

                                    ? `

                                        <div class="admin-existing-reply">

                                            <strong>
                                                Odgovor tima
                                            </strong>

                                            <p>
                                                ${escapeHtml(
                                                    revision.admin_reply ||
                                                    ""
                                                )}
                                            </p>

                                            <span>
                                                Odgovoreno:
                                                ${formatDateTime(
                                                    revision.replied_at
                                                )}
                                            </span>

                                        </div>
                                    `

                                    : `

                                        <div class="admin-reply-area">

                                            <label
                                                for="reply-${revision.id}"
                                            >
                                                Odgovor klijentu
                                            </label>

                                            <textarea
                                                id="reply-${revision.id}"
                                                class="admin-reply-input"
                                                maxlength="2000"
                                                placeholder="Napiši odgovor klijentu..."
                                            ></textarea>


                                            <div class="admin-reply-actions">

                                                <button
                                                    type="button"
                                                    class="admin-reply-button"
                                                    data-reply-id="${revision.id}"
                                                >
                                                    Pošalji odgovor
                                                </button>

                                            </div>

                                        </div>
                                    `
                            }

                        </article>
                    `;
                }
            )
            .join("");


    setupReplyButtons();
}


/* =========================
   UČITAJ ZAHTJEVE
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
            .from("design_revisions")
            .select(`
                id,
                created_at,
                project_id,
                user_id,
                message,
                status,
                admin_reply,
                replied_at,
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
            );


    if (error) {

        console.error(
            "Greška kod učitavanja zahtjeva:",
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
            "[data-reply-id]"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                async function () {

                    hideMessage();


                    const revisionId =
                        button.dataset.replyId;


                    const textarea =
                        document.getElementById(
                            `reply-${revisionId}`
                        );


                    if (!textarea) {
                        return;
                    }


                    const reply =
                        textarea.value.trim();


                    if (!reply) {

                        showMessage(
                            "Napiši odgovor prije slanja.",
                            "error"
                        );

                        textarea.focus();

                        return;
                    }


                    if (reply.length < 3) {

                        showMessage(
                            "Odgovor je prekratak.",
                            "error"
                        );

                        textarea.focus();

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
                                "design_revisions"
                            )
                            .update({

                                admin_reply:
                                    reply,

                                replied_at:
                                    new Date()
                                        .toISOString(),

                                status:
                                    "answered"
                            })
                            .eq(
                                "id",
                                revisionId
                            );


                    if (error) {

                        console.error(
                            "Greška kod spremanja odgovora:",
                            error
                        );

                        showMessage(
                            "Odgovor nije moguće spremiti.",
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
