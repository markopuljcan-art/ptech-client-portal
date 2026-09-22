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

    const savedTheme =
        localStorage.getItem(
            "ptech-theme"
        );


    if (
        savedTheme === "light" ||
        savedTheme === "dark"
    ) {

        applyTheme(
            savedTheme
        );

        return;
    }


    applyTheme(
        "dark"
    );
}


themeToggle
    ?.addEventListener(
        "click",
        () => {

            const currentTheme =
                document.documentElement
                    .getAttribute(
                        "data-theme"
                    ) ||
                "dark";


            applyTheme(
                currentTheme === "dark"
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
        button => {

            button.addEventListener(
                "click",
                () => {

                    const key =
                        button.dataset.help;


                    const item =
                        helpContent[
                            key
                        ];


                    if (!item) {
                        return;
                    }


                    helpAnswerTitle.textContent =
                        item.title;


                    helpAnswerText.textContent =
                        item.text
                            .trim();


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

        console.error(
            "Profile error:",
            error
        );

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
   LOAD SUPPORT MESSAGES
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
                    ascending: true
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
   CLIENT READ
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
                    count: "exact",
                    head: true
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


    if (unreadCount > 0) {

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

sendSupportMessage
    ?.addEventListener(
        "click",
        async () => {

            if (!currentSession) {
                return;
            }


            const message =
                supportMessageInput
                    ?.value
                    .trim();


            if (
                !message ||
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
                    .from(
                        "support_messages"
                    )
                    .insert({

                        user_id:
                            currentSession
                                .user
                                .id,

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
                Ne radimo ručni reload.
                Realtime će povući novu poruku.
            */
        }
    );


/* =========================
   ENTER SEND
========================= */

supportMessageInput
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();


                sendSupportMessage
                    ?.click();
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
                    event: "*",
                    schema: "public",
                    table: "support_messages",
                    filter:
                        `user_id=eq.${currentSession.user.id}`
                },
                async payload => {

                    console.log(
                        "Client support realtime:",
                        payload
                    );


                    await loadSupportMessages();


                    /*
                        Ako je stigla nova ADMIN poruka
                        dok je korisnik baš na messages.html,
                        odmah se smatra pročitanom.
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
                status => {

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
    async () => {

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
        Korisnik je otvorio Poruke,
        pa admin odgovore označavamo pročitanima.
    */

    await markClientMessagesAsRead();

    await loadClientUnreadCount();


    subscribeToSupportRealtime();
}


/* =========================
   INIT
========================= */

startMessages();
