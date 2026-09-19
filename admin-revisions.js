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

    adminMessage.hidden = false;

    adminMessage.className =
        `admin-message ${type}`;

    adminMessage.textContent =
        message;
}


function hideMessage() {

    if (!adminMessage) {
        return;
    }

    adminMessage.hidden = true;

    adminMessage.className =
        "admin-message";

    adminMessage.textContent = "";
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
   DATUM
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
   STATUS
========================= */

function getStatusLabel(status) {

    const value =
        String(status || "")
            .toLowerCase()
            .trim();

    if (
        value === "answered" ||
        value === "resolved"
    ) {
        return "Odgovoreno";
    }

    return "Na čekanju";
}


/* =========================
   RENDER
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

            <div class="empty-state">
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
                        );


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
                                                    revision.admin_reply
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
                                                placeholder="Napiši odgovor klijentu..."
                                                maxlength="2000"
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
   ODGOVORI
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


                    button.disabled = true;

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
                            "Greška kod odgovora:",
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
   LOAD REVISIONS
========================= */

async function loadRevisions() {

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
            "Greška kod zahtjeva:",
            error
        );

        revisionsList.innerHTML = `

            <div class="empty-state">
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
   START
========================= */

async function startAdmin() {

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


    /* =========================
       PROVJERA ADMIN ROLE
    ========================= */

    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                role
            `)
            .eq(
                "id",
                session.user.id
            )
            .maybeSingle();


    if (
        profileError ||
        !profile
    ) {

        console.error(
            "Greška kod profila:",
            profileError
        );

        revisionsList.innerHTML = `

            <div class="empty-state">
                Nije moguće provjeriti administratorski račun.
            </div>
        `;

        return;
    }


    if (profile.role !== "admin") {

        revisionsList.innerHTML = `

            <div class="empty-state">
                Nemaš administratorski pristup ovoj stranici.
            </div>
        `;

        if (revisionCount) {
            revisionCount.textContent = "0";
        }

        return;
    }


    /* =========================
       UČITAJ ZAHTJEVE
    ========================= */

    await loadRevisions();
}


/* =========================
   START
========================= */

startAdmin();
