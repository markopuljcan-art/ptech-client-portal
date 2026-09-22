const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


const clientName =
    document.getElementById("clientName");

const logoutButton =
    document.getElementById("logoutButton");

const themeToggle =
    document.getElementById("themeToggle");

const helpAnswer =
    document.getElementById("helpAnswer");

const helpAnswerTitle =
    document.getElementById("helpAnswerTitle");

const helpAnswerText =
    document.getElementById("helpAnswerText");

const closeHelpAnswer =
    document.getElementById("closeHelpAnswer");

const supportMessages =
    document.getElementById("supportMessages");

const supportMessageInput =
    document.getElementById("supportMessageInput");

const sendSupportMessage =
    document.getElementById("sendSupportMessage");

const supportMessage =
    document.getElementById("supportMessage");


let currentSession = null;
let realtimeChannel = null;


/* =========================
   THEME
========================= */

function applyTheme(theme) {

    const finalTheme =
        theme === "light"
            ? "light"
            : "dark";


    document.documentElement
        .setAttribute(
            "data-theme",
            finalTheme
        );


    localStorage.setItem(
        "ptech-theme",
        finalTheme
    );
}


function loadTheme() {

    const saved =
        localStorage.getItem(
            "ptech-theme"
        );


    applyTheme(
        saved === "light"
            ? "light"
            : "dark"
    );
}


themeToggle
    ?.addEventListener(
        "click",
        () => {

            const current =
                document.documentElement
                    .getAttribute(
                        "data-theme"
                    ) ||
                "dark";


            applyTheme(
                current === "dark"
                    ? "light"
                    : "dark"
            );
        }
    );


loadTheme();


/* =========================
   LOGOUT
========================= */

logoutButton
    ?.addEventListener(
        "click",
        async () => {

            if (realtimeChannel) {

                await supabaseClient
                    .removeChannel(
                        realtimeChannel
                    );
            }


            await supabaseClient
                .auth
                .signOut();


            window.location.href =
                "login.html";
        }
    );


/* =========================
   HELP CONTENT
========================= */

const helpContent = {

    approve: {
        title:
            "Kako odobriti dizajn?",

        text:
            `
            Otvori svoj projekt i pronađi zadnju verziju dizajna.
            Pregledaj dizajn i klikni gumb za odobrenje ako si zadovoljan verzijom.
            Nakon odobrenja dizajn se smatra potvrđenim.
            `
    },

    revision: {
        title:
            "Kako zatražiti izmjenu?",

        text:
            `
            Na stranici za pregled dizajna odaberi opciju za izmjenu i napiši što želiš promijeniti.

            Dodatne izmjene ili zahtjevi izvan dogovorenog opsega projekta mogu se dodatno naplatiti.
            Prije početka dodatnog rada dobit ćeš potvrdu cijene.
            `
    },

    documents: {
        title:
            "Gdje su moji dokumenti?",

        text:
            `
            Otvori karticu Dokumenti u donjoj navigaciji.
            Tamo možeš pronaći dokumente povezane s projektima.
            `
    },

    status: {
        title:
            "Kako pratiti status projekta?",

        text:
            `
            Otvori karticu Projekti.
            Tamo možeš pratiti status i napredak projekta.
            `
    },

    billing: {
        title:
            "Što se dodatno naplaćuje?",

        text:
            `
            Rad koji nije uključen u dogovoreni opseg projekta može se dodatno naplatiti.

            Prije početka dodatnog rada PTech Digital će potvrditi opseg i cijenu.
            `
    },

    support: {
        title:
            "Kako kontaktirati podršku?",

        text:
            `
            Ispod se nalazi razgovor s fizičkom podrškom.
            Slanje poruke samo po sebi ne predstavlja narudžbu dodatne usluge.
            `
    }
};


document
    .querySelectorAll(
        "[data-help]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const item =
                        helpContent[
                            button.dataset.help
                        ];


                    if (!item) {
                        return;
                    }


                    helpAnswerTitle.textContent =
                        item.title;

                    helpAnswerText.textContent =
                        item.text.trim();

                    helpAnswer.hidden =
                        false;
                }
            );
        }
    );


closeHelpAnswer
    ?.addEventListener(
        "click",
        () => {

            helpAnswer.hidden =
                true;
        }
    );


/* =========================
   HELPERS
========================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDateTime(value) {

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


function showMessage(
    message,
    type = "success"
) {

    supportMessage.hidden =
        false;

    supportMessage.className =
        `support-message ${type}`;

    supportMessage.textContent =
        message;
}


/* =========================
   PROFILE
========================= */

async function loadProfile() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "display_name"
            )
            .eq(
                "id",
                currentSession.user.id
            )
            .maybeSingle();


    if (error) {
        return;
    }


    if (
        clientName &&
        data?.display_name
    ) {

        clientName.textContent =
            data.display_name;
    }
}


/* =========================
   LOAD MESSAGES
========================= */

async function loadSupportMessages() {

    if (!supportMessages) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("support_messages")
            .select(`
                id,
                created_at,
                user_id,
                sender_role,
                message
            `)
            .eq(
                "user_id",
                currentSession.user.id
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        supportMessages.innerHTML = `
            <div class="support-empty">
                Razgovor nije moguće učitati.
            </div>
        `;

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        supportMessages.innerHTML = `
            <div class="support-empty">
                Još nema poruka. Pošalji pitanje podršci.
            </div>
        `;

        return;
    }


    supportMessages.innerHTML =
        data
            .map(
                item => {

                    const isClient =
                        item.sender_role ===
                        "client";


                    return `

                        <div
                            class="
                                support-chat-message
                                ${
                                    isClient
                                        ? "client"
                                        : "admin"
                                }
                            "
                        >

                            <div class="support-chat-message-top">

                                <strong>
                                    ${
                                        isClient
                                            ? "Vi"
                                            : "PTech Digital"
                                    }
                                </strong>

                                <span>
                                    ${formatDateTime(
                                        item.created_at
                                    )}
                                </span>

                            </div>

                            <p>
                                ${escapeHtml(
                                    item.message
                                )}
                            </p>

                        </div>
                    `;
                }
            )
            .join("");


    supportMessages.scrollTop =
        supportMessages.scrollHeight;
}


/* =========================
   SEND
========================= */

sendSupportMessage
    ?.addEventListener(
        "click",
        async () => {

            const message =
                supportMessageInput
                    .value
                    .trim();


            if (
                message.length < 2
            ) {

                showMessage(
                    "Napiši poruku prije slanja.",
                    "error"
                );

                return;
            }


            sendSupportMessage.disabled =
                true;

            sendSupportMessage.textContent =
                "Šaljem...";


            const {
                error
            } =
                await supabaseClient
                    .from("support_messages")
                    .insert({

                        user_id:
                            currentSession.user.id,

                        sender_role:
                            "client",

                        message:
                            message
                    });


            sendSupportMessage.disabled =
                false;

            sendSupportMessage.textContent =
                "Pošalji poruku";


            if (error) {

                showMessage(
                    "Poruku nije moguće poslati.",
                    "error"
                );

                return;
            }


            supportMessageInput.value =
                "";

            showMessage(
                "Poruka je poslana.",
                "success"
            );

            /*
                Realtime će sam učitati novu poruku.
            */
        }
    );


supportMessageInput
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();
                sendSupportMessage?.click();
            }
        }
    );


/* =========================
   REALTIME
========================= */

function subscribeToSupportRealtime() {

    realtimeChannel =
        supabaseClient
            .channel(
                `client-support-${currentSession.user.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "support_messages",
                    filter:
                        `user_id=eq.${currentSession.user.id}`
                },
                async () => {

                    await loadSupportMessages();
                }
            )
            .subscribe();
}


/* =========================
   START
========================= */

async function startMessages() {

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


    currentSession =
        session;


    await loadProfile();
    await loadSupportMessages();

    subscribeToSupportRealtime();
}


startMessages();
