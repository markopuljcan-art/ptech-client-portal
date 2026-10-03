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
   ELEMENTS
========================= */

const clientName =
    document.getElementById(
        "clientName"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

const helpAnswer =
    document.getElementById(
        "helpAnswer"
    );

const helpAnswerTitle =
    document.getElementById(
        "helpAnswerTitle"
    );

const helpAnswerText =
    document.getElementById(
        "helpAnswerText"
    );

const closeHelpAnswer =
    document.getElementById(
        "closeHelpAnswer"
    );

const supportMessages =
    document.getElementById(
        "supportMessages"
    );

const supportMessageInput =
    document.getElementById(
        "supportMessageInput"
    );

const sendSupportMessage =
    document.getElementById(
        "sendSupportMessage"
    );

const supportMessage =
    document.getElementById(
        "supportMessage"
    );

const messagesUnreadBadge =
    document.getElementById(
        "messagesUnreadBadge"
    );


/* =========================
   GLOBAL
========================= */

let currentSession =
    null;

let realtimeChannel =
    null;


/* =========================
   THEME
========================= */

function applyTheme(theme) {

    const finalTheme =
        theme === "light"
            ? "light"
            : "dark";


    document.body.classList.toggle(
        "light-mode",
        finalTheme === "light"
    );


    if (themeToggle) {

        themeToggle.checked =
            finalTheme === "light";
    }


    localStorage.setItem(
        "theme",
        finalTheme
    );
}


function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            "theme"
        );


    applyTheme(
        savedTheme === "light"
            ? "light"
            : "dark"
    );
}


themeToggle
    ?.addEventListener(
        "change",
        function () {

            applyTheme(
                themeToggle.checked
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
        async function () {

            if (realtimeChannel) {

                await supabaseClient
                    .removeChannel(
                        realtimeChannel
                    );


                realtimeChannel =
                    null;
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

Zahtjev će biti poslan PTech Digital timu.

Dodatne izmjene ili zahtjevi izvan dogovorenog opsega projekta mogu se dodatno naplatiti.

Prije početka dodatnog rada dobit ćeš potvrdu opsega i cijene.
            `
    },


    documents: {

        title:
            "Gdje su moji dokumenti?",

        text:
            `
Otvori karticu Dokumenti u donjoj navigaciji.

Tamo možeš pronaći dokumente povezane s projektima, poput ugovora, ponuda, briefova i ostalih datoteka.
            `
    },


    status: {

        title:
            "Kako pratiti status projekta?",

        text:
            `
Otvori karticu Projekti.

Tamo možeš vidjeti aktivne projekte, njihov trenutni status i napredak.
            `
    },


    billing: {

        title:
            "Što se dodatno naplaćuje?",

        text:
            `
Rad koji nije uključen u dogovoreni opseg projekta može se dodatno naplatiti.

To može uključivati nove funkcionalnosti, dodatne verzije, veće promjene nakon potvrđenog dizajna ili druge dodatne zahtjeve.

Prije početka takvog rada PTech Digital će potvrditi opseg i cijenu.
            `
    },


    support: {

        title:
            "Kako kontaktirati podršku?",

        text:
            `
Ispod ovog odjeljka nalazi se razgovor s fizičkom podrškom.

Napiši pitanje i naš tim će odgovoriti kada bude dostupan.

Slanje poruke samo po sebi ne znači da si naručio dodatnu uslugu.
            `
    }

};


/* =========================
   HELP CARDS
========================= */

document
    .querySelectorAll(
        "[data-help]"
    )
    .forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const key =
                        button.dataset.help;


                    const item =
                        helpContent[key];


                    if (!item) {
                        return;
                    }


                    if (
                        !helpAnswer ||
                        !helpAnswerTitle ||
                        !helpAnswerText
                    ) {

                        return;
                    }


                    helpAnswerTitle.textContent =
                        item.title;


                    helpAnswerText.textContent =
                        item.text.trim();


                    helpAnswer.hidden =
                        false;


                    helpAnswer.scrollIntoView({

                        behavior:
                            "smooth",

                        block:
                            "nearest"
                    });
                }
            );
        }
    );


closeHelpAnswer
    ?.addEventListener(
        "click",
        function () {

            if (helpAnswer) {

                helpAnswer.hidden =
                    true;
            }
        }
    );


/* =========================
   HELPERS
========================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


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
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );
}


/* =========================
   STATUS MESSAGE
========================= */

function showMessage(
    message,
    type = "success"
) {

    if (!supportMessage) {
        return;
    }


    supportMessage.hidden =
        false;


    supportMessage.className =
        `support-message ${type}`;


    supportMessage.textContent =
        message;
}


function hideMessage() {

    if (!supportMessage) {
        return;
    }


    supportMessage.hidden =
        true;


    supportMessage.className =
        "support-message";


    supportMessage.textContent =
        "";
}


/* =========================
   LOAD PROFILE
========================= */

async function loadProfile() {

    if (!currentSession) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "profiles"
            )
            .select(
                "display_name"
            )
            .eq(
                "id",
                currentSession.user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Profile error:",
            error
        );


        if (clientName) {

            clientName.textContent =
                currentSession.user.email
                    ?.split("@")[0] ||
                "Klijent";
        }


        return;
    }


    if (clientName) {

        clientName.textContent =
            data?.display_name ||
            currentSession.user.email
                ?.split("@")[0] ||
            "Klijent";
    }
}


/* =========================
   LOAD SUPPORT MESSAGES
========================= */

async function loadSupportMessages() {

    if (
        !supportMessages ||
        !currentSession
    ) {

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "support_messages"
            )
            .select(`
                id,
                created_at,
                user_id,
                sender_role,
                message,
                client_read_at
            `)
            .eq(
                "user_id",
                currentSession.user.id
            )
            .order(
                "created_at",
                {
                    ascending:
                        true
                }
            );


    if (error) {

        console.error(
            "Support messages error:",
            error
        );


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
                function (item) {

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

                            <div
                                class="
                                    support-chat-message-top
                                "
                            >

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
   MARK ADMIN MESSAGES READ
========================= */

async function markClientMessagesAsRead() {

    if (!currentSession) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from(
                "support_messages"
            )
            .update({

                client_read_at:
                    new Date()
                        .toISOString()
            })
            .eq(
                "user_id",
                currentSession.user.id
            )
            .eq(
                "sender_role",
                "admin"
            )
            .is(
                "client_read_at",
                null
            );


    if (error) {

        console.error(
            "Client read update error:",
            error
        );
    }
}


/* =========================
   UNREAD COUNT
========================= */

async function loadClientUnreadCount() {

    if (
        !messagesUnreadBadge ||
        !currentSession
    ) {

        return;
    }


    const {
        count,
        error
    } =
        await supabaseClient
            .from(
                "support_messages"
            )
            .select(
                "id",
                {
                    count:
                        "exact",

                    head:
                        true
                }
            )
            .eq(
                "user_id",
                currentSession.user.id
            )
            .eq(
                "sender_role",
                "admin"
            )
            .is(
                "client_read_at",
                null
            );


    if (error) {

        console.error(
            "Unread count error:",
            error
        );


        return;
    }


    const unreadCount =
        count || 0;


    if (
        unreadCount > 0
    ) {

        messagesUnreadBadge.hidden =
            false;


        messagesUnreadBadge.textContent =
            unreadCount > 99
                ? "99+"
                : String(
                    unreadCount
                );

    } else {

        messagesUnreadBadge.hidden =
            true;


        messagesUnreadBadge.textContent =
            "0";
    }
}


/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {

    if (
        !currentSession ||
        !supportMessageInput ||
        !sendSupportMessage
    ) {

        return;
    }


    hideMessage();


    const message =
        supportMessageInput
            .value
            .trim();


    if (
        !message ||
        message.length < 2
    ) {

        showMessage(
            "Napiši poruku prije slanja.",
            "error"
        );


        supportMessageInput.focus();


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
            .from(
                "support_messages"
            )
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

        console.error(
            "Send support error:",
            error
        );


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
        Realtime će obično povući poruku,
        ali pozivamo i ručni refresh kao fallback.
    */

    await loadSupportMessages();
}


/* =========================
   SEND BUTTON
========================= */

sendSupportMessage
    ?.addEventListener(
        "click",
        sendMessage
    );


/* =========================
   ENTER SEND
========================= */

supportMessageInput
    ?.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();


                sendMessage();
            }
        }
    );


/* =========================
   REALTIME
========================= */

function subscribeToSupportRealtime() {

    if (
        !currentSession ||
        realtimeChannel
    ) {

        return;
    }


    realtimeChannel =
        supabaseClient
            .channel(
                `client-support-${currentSession.user.id}`
            )
            .on(
                "postgres_changes",
                {
                    event:
                        "*",

                    schema:
                        "public",

                    table:
                        "support_messages",

                    filter:
                        `user_id=eq.${currentSession.user.id}`
                },
                async function (payload) {

                    console.log(
                        "Client support realtime:",
                        payload
                    );


                    await loadSupportMessages();


                    /*
                        Ako korisnik trenutno gleda
                        messages.html i stigne admin poruka,
                        odmah ju označavamo pročitanom.
                    */

                    if (
                        payload.eventType ===
                            "INSERT" &&
                        payload.new
                            ?.sender_role ===
                            "admin"
                    ) {

                        await markClientMessagesAsRead();
                    }


                    await loadClientUnreadCount();
                }
            )
            .subscribe(
                function (status) {

                    console.log(
                        "Client support realtime status:",
                        status
                    );
                }
            );
}


/* =========================
   VISIBILITY
========================= */

document.addEventListener(
    "visibilitychange",
    async function () {

        if (
            document.visibilityState ===
                "visible" &&
            currentSession
        ) {

            await loadSupportMessages();


            await markClientMessagesAsRead();


            await loadClientUnreadCount();
        }
    }
);


/* =========================
   PAGE CLEANUP
========================= */

window.addEventListener(
    "beforeunload",
    function () {

        if (realtimeChannel) {

            supabaseClient
                .removeChannel(
                    realtimeChannel
                );
        }
    }
);


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


    /*
        Korisnik je upravo otvorio Poruke.
        Sve admin poruke koje nisu pročitane
        označavamo pročitanima.
    */

    await markClientMessagesAsRead();


    await loadClientUnreadCount();


    subscribeToSupportRealtime();
}


/* =========================
   INIT
========================= */

startMessages();
