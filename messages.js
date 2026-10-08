
/* =========================
   SUPABASE
========================= */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* =========================
   ELEMENTS
========================= */

const $ = (id) => document.getElementById(id);

const clientName = $("clientName");
const logoutButton = $("logoutButton");
const themeToggle = $("themeToggle");

const helpAnswer = $("helpAnswer");
const helpAnswerTitle = $("helpAnswerTitle");
const helpAnswerText = $("helpAnswerText");

const chatLauncher = $("chatLauncher");
const chatPanel = $("chatPanel");
const closeChatButton = $("closeChat");
const minimizeChatButton = $("minimizeChat");

const aiTab = $("aiTab");
const humanTab = $("humanTab");

const aiMessages = $("aiMessages");
const supportMessages = $("supportMessages");

const aiSuggestions = $("aiSuggestions");
const humanSupportAction = $("humanSupportAction");

const chatInput = $("chatInput");
const sendChatMessage = $("sendChatMessage");

const chatHeaderStatus = $("chatHeaderStatus");
const chatFooterText = $("chatFooterText");

const messagesUnreadBadge = $("messagesUnreadBadge");
const chatUnreadBadge = $("chatUnreadBadge");
const humanTabUnread = $("humanTabUnread");

const supportMessage = $("supportMessage");

/* =========================
   STATE
========================= */

let currentSession = null;
let realtimeChannel = null;

let chatOpen = false;
let chatMode = "ai";
let sendingMessage = false;
let currentHelpKey = null;
let unreadCount = 0;

/* =========================
   THEME
========================= */

function applyTheme(theme) {
    const light = theme === "light";

    document.body.classList.toggle(
        "light-mode",
        light
    );

    if (themeToggle) {
        themeToggle.checked = light;
    }

    localStorage.setItem(
        "theme",
        light ? "light" : "dark"
    );
}

applyTheme(
    localStorage.getItem("theme") === "light"
        ? "light"
        : "dark"
);

themeToggle?.addEventListener("change", () => {
    applyTheme(
        themeToggle.checked ? "light" : "dark"
    );
});

/* =========================
   HELP CONTENT
========================= */

const helpContent = {
    approve: {
        title: "Kako odobriti dizajn?",
        keywords: [
            "odobri", "odobren", "potvrdi dizajn",
            "odobriti dizajn", "prihvati dizajn"
        ],
        answer:
`Za odobrenje dizajna otvori svoj projekt i pronađi opciju za pregled dizajna.

1. Otvori karticu Projekti.
2. Odaberi projekt.
3. Otvori pregled dostavljenog dizajna.
4. Pažljivo pregledaj izgled i sadržaj.
5. Ako si zadovoljan, klikni "Odobri dizajn".

Nakon potvrde PTech Digital tim može nastaviti s idućom fazom projekta.

Ako želiš nešto promijeniti, prije odobrenja odaberi "Zatraži izmjenu".`
    },

    revision: {
        title: "Kako zatražiti izmjenu?",
        keywords: [
            "izmjen", "promjen", "dorad", "reviz",
            "isprav", "poprav", "drugačiji dizajn"
        ],
        answer:
`Izmjenu dizajna možeš zatražiti kroz pregled dizajna svojeg projekta.

1. Otvori karticu Projekti.
2. Odaberi svoj projekt.
3. Otvori pregled dizajna.
4. Klikni "Zatraži izmjenu".
5. Opiši što želiš promijeniti.

Preporučujemo da komentar bude što precizniji.

Primjer: "Želim da naslov na početnoj stranici bude veći, a gumb za kontakt narančaste boje."

Zahtjev će biti dostupan PTech Digital timu.

Napomena: dodatni rad izvan dogovorenog opsega može se dodatno naplatiti. Prije takvog rada trebaš dobiti potvrdu opsega i cijene.`
    },

    documents: {
        title: "Gdje su moji dokumenti?",
        keywords: [
            "dokument", "ugovor", "ponud", "datotek",
            "preuz", "download", "pdf", "račun"
        ],
        answer:
`Svoje dokumente možeš pronaći u kartici Dokumenti.

1. Klikni "Dokumenti" u donjoj navigaciji.
2. Pregledaj dokumente povezane sa svojim projektima.
3. Po potrebi koristi pretraživanje ili filtre.
4. Otvori ili preuzmi željeni dokument ako je dostupan.

Dokumenti mogu uključivati ponude, ugovore, briefove i ostale projektne datoteke.

Ako očekuješ dokument koji nije prikazan, javi se fizičkoj podršci.`
    },

    status: {
        title: "Kako pratiti projekt?",
        keywords: [
            "projekt", "status", "napred", "rok",
            "završ", "gotov", "koliko je", "faza"
        ],
        answer:
`Napredak projekta možeš pratiti kroz svoj PTech Digital Client Portal.

1. Otvori karticu Projekti.
2. Odaberi projekt koji želiš pregledati.
3. Provjeri trenutni status, napredak i rok.

Na početnoj stranici također možeš vidjeti osnovne informacije o svojim projektima.

Ako želiš dodatno pojašnjenje određenog statusa ili faze, pošalji poruku fizičkoj podršci.

AI asistent ne može sam potvrditi promjenu roka ili završetak projekta.`
    },

    billing: {
        title: "Što se dodatno naplaćuje?",
        keywords: [
            "naplat", "cijen", "košta", "plat",
            "troš", "dodatni rad", "besplat",
            "iznos", "paket"
        ],
        answer:
`Dodatna naplata ovisi o dogovorenom opsegu tvojeg projekta.

Rad izvan tog opsega može uključivati:

• Nove funkcionalnosti koje nisu bile dogovorene.
• Veće izmjene nakon potvrđenog dizajna.
• Dodatne verzije ili zahtjeve izvan paketa.
• Ostale naknadno dogovorene radove.

Prije početka dodatnog rada PTech Digital treba potvrditi opseg i cijenu.

Samo slanje poruke podršci ne predstavlja automatsku narudžbu dodatnog rada.

Za točan iznos ili ponudu obrati se fizičkoj podršci.`
    },

    support: {
        title: "Kako kontaktirati podršku?",
        keywords: [
            "podrš", "osob", "agent", "čovjek",
            "kontakt", "pomoć", "tim", "admin"
        ],
        answer:
`Možeš razgovarati izravno s PTech Digital timom.

1. Otvori narančastu ikonu razgovora desno dolje.
2. Odaberi "Fizička podrška" ili klikni "Razgovaraj s osobom".
3. Napiši svoju poruku.
4. Pošalji je našem timu.

Poruka će se spremiti u razgovor s podrškom.

Odgovor će se prikazati u istom razgovoru kada ga tim pošalje.

Nemoj slati lozinke ili druge osjetljive podatke.`
    }
};

/* =========================
   HELP CARDS
========================= */

document.querySelectorAll("[data-help]").forEach((button) => {
    button.addEventListener("click", () => {
        const key = button.dataset.help;
        const item = helpContent[key];

        if (!item) return;

        currentHelpKey = key;

        helpAnswerTitle.textContent = item.title;
        helpAnswerText.textContent = item.answer;

        helpAnswer.hidden = false;

        helpAnswer.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    });
});

$("closeHelpAnswer")?.addEventListener("click", () => {
    helpAnswer.hidden = true;
});

$("askAiAboutThis")?.addEventListener("click", () => {
    if (!currentHelpKey) return;

    openChat();
    switchChatMode("ai");

    const question = helpContent[currentHelpKey].title;

    sendAiQuestion(question);
});

/* =========================
   HELPERS
========================= */

function formatTime(value = new Date()) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString("hr-HR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function scrollChatToBottom(container) {
    if (!container) return;

    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

function showNotice(text, isError = false) {
    supportMessage.textContent = text;
    supportMessage.classList.toggle("error", isError);
    supportMessage.hidden = false;
}

function hideNotice() {
    supportMessage.hidden = true;
    supportMessage.textContent = "";
}

function createMessageElement(text, sender, date = new Date()) {
    const wrapper = document.createElement("div");

    wrapper.className =
        `chat-message ${sender === "user" ? "user" : "bot"}`;

    if (sender !== "user") {
        const avatar = document.createElement("div");

        avatar.className = "message-avatar";
        avatar.textContent = "P";

        wrapper.appendChild(avatar);
    }

    const content = document.createElement("div");
    content.className = "message-content";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = formatTime(date);

    content.appendChild(bubble);
    content.appendChild(time);

    wrapper.appendChild(content);

    return wrapper;
}

function appendMessage(container, text, sender, date) {
    const element = createMessageElement(
        text,
        sender,
        date
    );

    container.appendChild(element);
    scrollChatToBottom(container);

    return element;
}

/* =========================
   CHAT OPEN / CLOSE
========================= */

function openChat() {
    chatOpen = true;

    chatPanel.hidden = false;
    chatLauncher.setAttribute(
        "aria-expanded",
        "true"
    );

    if (chatMode === "human") {
        loadSupportMessages();
        markClientMessagesAsRead();
    }

    setTimeout(() => {
        chatInput.focus();
    }, 100);
}

function closeChat() {
    chatOpen = false;

    chatPanel.hidden = true;
    chatLauncher.setAttribute(
        "aria-expanded",
        "false"
    );

    loadClientUnreadCount();
}

chatLauncher?.addEventListener("click", () => {
    if (chatOpen) {
        closeChat();
    } else {
        openChat();
    }
});

$("openChatFromPage")?.addEventListener(
    "click",
    openChat
);

closeChatButton?.addEventListener(
    "click",
    closeChat
);

minimizeChatButton?.addEventListener(
    "click",
    closeChat
);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chatOpen) {
        closeChat();
    }
});

/* =========================
   CHAT MODE
========================= */

function switchChatMode(mode) {
    chatMode = mode === "human" ? "human" : "ai";

    const isHuman = chatMode === "human";

    aiTab.classList.toggle("active", !isHuman);
    humanTab.classList.toggle("active", isHuman);

    aiMessages.hidden = isHuman;
    supportMessages.hidden = !isHuman;

    aiSuggestions.hidden = isHuman;
    humanSupportAction.hidden = isHuman;

    chatInput.placeholder = isHuman
        ? "Napiši poruku podršci..."
        : "Pitaj PTech asistenta...";

    chatHeaderStatus.innerHTML = isHuman
        ? '<i class="online-dot"></i> Fizička podrška • PTech tim'
        : '<i class="online-dot"></i> AI asistent • Dostupan 24/7';

    chatFooterText.textContent = isHuman
        ? "Poruke se šalju PTech Digital timu"
        : "PTech asistent • Informativni odgovori";

    hideNotice();

    if (isHuman && currentSession) {
        loadSupportMessages();

        if (chatOpen) {
            markClientMessagesAsRead();
        }
    }

    scrollChatToBottom(
        isHuman ? supportMessages : aiMessages
    );
}

aiTab?.addEventListener("click", () => {
    switchChatMode("ai");
});

humanTab?.addEventListener("click", () => {
    switchChatMode("human");
});

$("switchToHuman")?.addEventListener("click", () => {
    switchChatMode("human");
});

/* =========================
   AI KNOWLEDGE BASE
========================= */

function normalizeText(text) {
    return String(text || "")
        .toLocaleLowerCase("hr-HR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function getAiResponse(question) {
    const text = normalizeText(question);

    const greetingWords = [
        "bok", "pozdrav", "hej", "hello", "hi"
    ];

    if (greetingWords.includes(text)) {
        return `Bok! 👋

Dobrodošao u PTech Digital podršku.

Mogu ti objasniti kako:
• pratiti projekt
• odobriti dizajn
• zatražiti izmjenu
• pronaći dokumente
• razumjeti dodatnu naplatu

Što te zanima?`;
    }

    if (
        text.includes("hvala") ||
        text.includes("zahvaljujem")
    ) {
        return `Nema na čemu! 😊

Ako imaš još pitanja, slobodno pitaj.

Ako trebaš konkretnu pomoć oko svojeg projekta, možeš odabrati "Razgovaraj s osobom".`;
    }

    let bestKey = null;
    let bestScore = 0;

    for (const [key, item] of Object.entries(helpContent)) {
        let score = 0;

        for (const keyword of item.keywords) {
            if (text.includes(normalizeText(keyword))) {
                score += normalizeText(keyword).length >= 6
                    ? 2
                    : 1;
            }
        }

        if (text === normalizeText(item.title)) {
            score += 10;
        }

        if (score > bestScore) {
            bestScore = score;
            bestKey = key;
        }
    }

    if (bestKey && bestScore > 0) {
        return helpContent[bestKey].answer;
    }

    return `Mogu ti pomoći s informacijama o PTech Digital Client Portalu.

Najčešće teme su:

• Odobrenje dizajna
• Zahtjevi za izmjenama
• Status i napredak projekta
• Dokumenti
• Dodatna naplata
• Kontakt s podrškom

Možeš malo detaljnije opisati što te zanima?

Ako je pitanje vezano uz konkretnu situaciju, cijenu ili odluku PTech tima, odaberi "Razgovaraj s osobom".`;
}

/* =========================
   AI CHAT
========================= */

function sendAiQuestion(question) {
    const text = String(question || "").trim();

    if (!text) return;

    appendMessage(
        aiMessages,
        text,
        "user"
    );

    const answer = getAiResponse(text);

    const responseElement = appendMessage(
        aiMessages,
        answer,
        "bot"
    );

    responseElement.style.opacity = "0";

    requestAnimationFrame(() => {
        responseElement.style.transition = "opacity .25s";
        responseElement.style.opacity = "1";
    });
}

document.querySelectorAll("[data-ai-question]").forEach(
    (button) => {
        button.addEventListener("click", () => {
            sendAiQuestion(
                button.dataset.aiQuestion
            );
        });
    }
);

/* =========================
   AUTH / PROFILE
========================= */

async function loadProfile() {
    if (!currentSession) return;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq("id", currentSession.user.id)
        .maybeSingle();

    if (error) {
        console.error("Profile error:", error);
    }

    clientName.textContent =
        data?.display_name ||
        currentSession.user.email?.split("@")[0] ||
        "Klijent";
}

/* =========================
   SUPPORT MESSAGES
========================= */

async function loadSupportMessages() {
    if (!currentSession) return;

    const { data, error } = await supabaseClient
        .from("support_messages")
        .select(`
            id,
            created_at,
            user_id,
            sender_role,
            message,
            client_read_at
        `)
        .eq("user_id", currentSession.user.id)
        .order("created_at", {
            ascending: true
        });

    if (error) {
        console.error("Load support error:", error);

        supportMessages.innerHTML = "";

        const empty = document.createElement("div");
        empty.className = "chat-empty";
        empty.textContent =
            "Razgovor trenutno nije moguće učitati.";

        supportMessages.appendChild(empty);
        return;
    }

    supportMessages.innerHTML = "";

    if (!data || data.length === 0) {
        const empty = document.createElement("div");
        empty.className = "chat-empty";
        empty.textContent =
            "Još nema poruka. Napiši pitanje i pošalji ga našem timu.";

        supportMessages.appendChild(empty);
        return;
    }

    for (const item of data) {
        appendMessage(
            supportMessages,
            item.message || "",
            item.sender_role === "client"
                ? "user"
                : "bot",
            item.created_at
        );
    }

    scrollChatToBottom(supportMessages);
}

/* =========================
   MARK MESSAGES READ
========================= */

async function markClientMessagesAsRead() {
    if (
        !currentSession ||
        !chatOpen ||
        chatMode !== "human"
    ) {
        return;
    }

    const { error } = await supabaseClient
        .from("support_messages")
        .update({
            client_read_at: new Date().toISOString()
        })
        .eq("user_id", currentSession.user.id)
        .eq("sender_role", "admin")
        .is("client_read_at", null);

    if (error) {
        console.error("Mark read error:", error);
    }

    await loadClientUnreadCount();
}

/* =========================
   UNREAD BADGES
========================= */

function updateBadge(element, count) {
    if (!element) return;

    element.hidden = count <= 0;
    element.textContent =
        count > 99 ? "99+" : String(count);
}

async function loadClientUnreadCount() {
    if (!currentSession) return;

    const { count, error } = await supabaseClient
        .from("support_messages")
        .select("id", {
            count: "exact",
            head: true
        })
        .eq("user_id", currentSession.user.id)
        .eq("sender_role", "admin")
        .is("client_read_at", null);

    if (error) {
        console.error("Unread error:", error);
        return;
    }

    unreadCount = count || 0;

    updateBadge(messagesUnreadBadge, unreadCount);
    updateBadge(chatUnreadBadge, unreadCount);
    updateBadge(humanTabUnread, unreadCount);
}

/* =========================
   SEND HUMAN MESSAGE
========================= */

async function sendHumanMessage(message) {
    if (!currentSession || sendingMessage) return;

    sendingMessage = true;
    sendChatMessage.disabled = true;

    hideNotice();

    const { error } = await supabaseClient
        .from("support_messages")
        .insert({
            user_id: currentSession.user.id,
            sender_role: "client",
            message: message
        });

    sendingMessage = false;
    sendChatMessage.disabled = false;

    if (error) {
        console.error("Send message error:", error);

        showNotice(
            "Poruka nije poslana. Pokušaj ponovno.",
            true
        );

        return;
    }

    chatInput.value = "";

    await loadSupportMessages();
}

/* =========================
   SEND COMPOSER
========================= */

async function sendCurrentMessage() {
    if (sendingMessage) return;

    const message = chatInput.value.trim();

    if (!message) return;

    if (message.length < 2) {
        showNotice(
            "Napiši malo dužu poruku.",
            true
        );
        return;
    }

    hideNotice();

    if (chatMode === "ai") {
        chatInput.value = "";
        sendAiQuestion(message);
    } else {
        await sendHumanMessage(message);
    }

    chatInput.style.height = "42px";
    chatInput.focus();
}

sendChatMessage?.addEventListener(
    "click",
    sendCurrentMessage
);

chatInput?.addEventListener("keydown", (event) => {
    if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.isComposing
    ) {
        event.preventDefault();
        sendCurrentMessage();
    }
});

chatInput?.addEventListener("input", () => {
    chatInput.style.height = "42px";

    chatInput.style.height =
        Math.min(chatInput.scrollHeight, 110) + "px";
});

/* =========================
   REALTIME
========================= */

function subscribeToSupportRealtime() {
    if (!currentSession || realtimeChannel) return;

    realtimeChannel = supabaseClient
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
                await loadClientUnreadCount();

                if (chatOpen && chatMode === "human") {
                    await loadSupportMessages();
                    await markClientMessagesAsRead();
                }
            }
        )
        .subscribe((status) => {
            console.log(
                "Support realtime:",
                status
            );
        });
}

/* =========================
   VISIBILITY REFRESH
========================= */

document.addEventListener(
    "visibilitychange",
    async () => {
        if (
            document.visibilityState !== "visible" ||
            !currentSession
        ) {
            return;
        }

        await loadClientUnreadCount();

        if (chatOpen && chatMode === "human") {
            await loadSupportMessages();
            await markClientMessagesAsRead();
        }
    }
);

/* =========================
   LOGOUT
========================= */

logoutButton?.addEventListener(
    "click",
    async () => {
        if (realtimeChannel) {
            await supabaseClient.removeChannel(
                realtimeChannel
            );

            realtimeChannel = null;
        }

        await supabaseClient.auth.signOut();

        window.location.href = "login.html";
    }
);

/* =========================
   START
========================= */

async function startMessages() {
    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error || !session) {
        window.location.href = "login.html";
        return;
    }

    currentSession = session;

    await loadProfile();
    await loadClientUnreadCount();

    subscribeToSupportRealtime();

    switchChatMode("ai");
}

startMessages();
