
/* =========================================
   PTECH DIGITAL CLIENT PORTAL
   MESSAGES.JS

   Besplatni pametni asistent
   + Supabase fizicka podrska
   + Realtime poruke
   + Neprocitane poruke
   + FAQ
   + Dark / Light mode

   NEMA PLACENOG AI API-JA
========================================= */

/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* =========================================
   ELEMENTI
========================================= */

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

/* =========================================
   STATE
========================================= */

let currentSession = null;
let realtimeChannel = null;

let chatOpen = false;
let chatMode = "ai";

let sendingMessage = false;
let currentHelpKey = null;
let unreadCount = 0;

let lastAiTopic = null;
let lastAiTopics = [];

let aiConversation = [];
let supportLoadSequence = 0;
let markingRead = false;

/* =========================================
   THEME
========================================= */

function applyTheme(theme) {
    const isLight = theme === "light";

    document.body.classList.toggle(
        "light-mode",
        isLight
    );

    if (themeToggle) {
        themeToggle.checked = isLight;
    }

    localStorage.setItem(
        "theme",
        isLight ? "light" : "dark"
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

/* =========================================
   FAQ PODACI
========================================= */

const helpContent = {

    approve: {
        title: "Kako odobriti dizajn?",

        answer:
`Za odobrenje dizajna otvori svoj projekt i pronađi opciju za pregled dizajna.

1. Otvori karticu Projekti.
2. Odaberi željeni projekt.
3. Otvori pregled dostavljenog dizajna.
4. Pažljivo pregledaj izgled i sadržaj.
5. Ako si zadovoljan, klikni "Odobri dizajn".

Prije odobrenja preporučujemo da provjeriš tekstove, fotografije, boje, raspored i sve ostale elemente.

Ako želiš nešto promijeniti, prije odobrenja odaberi "Zatraži izmjenu".

Nakon potvrde PTech Digital tim može nastaviti s idućom fazom projekta.`
    },

    revision: {
        title: "Kako zatražiti izmjenu?",

        answer:
`Izmjenu dizajna možeš zatražiti kroz pregled dizajna svojeg projekta.

1. Otvori karticu Projekti.
2. Odaberi svoj projekt.
3. Otvori pregled dizajna.
4. Klikni "Zatraži izmjenu".
5. Detaljno opiši što želiš promijeniti.

Dobar zahtjev treba objasniti:

• Koji element želiš promijeniti.
• Na kojoj se stranici nalazi.
• Kako treba izgledati nakon izmjene.
• Imaš li primjer ili dodatne upute.

Primjer:
"Želim da naslov na početnoj stranici bude veći, a gumb za kontakt narančaste boje."

Dodatni rad izvan dogovorenog opsega može se dodatno naplatiti.`
    },

    documents: {
        title: "Gdje su moji dokumenti?",

        answer:
`Svoje dokumente možeš pronaći u kartici Dokumenti.

1. Klikni "Dokumenti" u donjoj navigaciji.
2. Pregledaj dokumente povezane sa svojim projektima.
3. Otvori željeni dokument.
4. Preuzmi ga ako je preuzimanje dostupno.

Dokumenti mogu uključivati ugovore, ponude, briefove i druge projektne datoteke.

Ako neki dokument nedostaje, kontaktiraj fizičku podršku.`
    },

    status: {
        title: "Kako pratiti projekt?",

        answer:
`Napredak projekta možeš pratiti kroz PTech Digital Client Portal.

1. Otvori karticu Projekti.
2. Odaberi projekt.
3. Provjeri trenutni status.
4. Pregledaj prikazani napredak i rok.

Na početnoj stranici također možeš vidjeti osnovne informacije o projektima.

Ako želiš detaljnije pojašnjenje određenog statusa, obrati se fizičkoj podršci.

Asistent nema izravan pristup stvarnom statusu projekta i ne može potvrditi promjene rokova.`
    },

    billing: {
        title: "Što se dodatno naplaćuje?",

        answer:
`Dodatna naplata ovisi o dogovorenom opsegu projekta.

Dodatno se mogu naplatiti:

• Nove funkcionalnosti.
• Veće naknadne izmjene.
• Dodatne verzije dizajna izvan dogovora.
• Integracije koje nisu uključene u projekt.
• Ostali dodatni zahtjevi.

Prije početka dodatnog rada trebaš dobiti potvrdu opsega i cijene.

Samo slanje pitanja ili zahtjeva ne predstavlja automatsku narudžbu dodatnog rada.

Za točan iznos obrati se PTech Digital timu.`
    },

    support: {
        title: "Kako kontaktirati podršku?",

        answer:
`Za razgovor s PTech Digital timom koristi fizičku podršku.

1. Otvori narančastu ikonu razgovora.
2. Klikni "Razgovaraj s osobom" ili karticu "Fizička podrška".
3. Napiši svoje pitanje.
4. Pošalji poruku.

Poruka će biti spremljena u razgovor s podrškom.

Odgovor će se prikazati kada ga tim pošalje.

Nemoj slati lozinke ili druge osjetljive podatke.`
    }
};

/* =========================================
   FAQ KARTICE
========================================= */

document.querySelectorAll("[data-help]").forEach(
    (button) => {
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
    }
);

$("closeHelpAnswer")?.addEventListener(
    "click",
    () => {
        helpAnswer.hidden = true;
    }
);

$("askAiAboutThis")?.addEventListener(
    "click",
    () => {
        if (!currentHelpKey) return;

        openChat();
        switchChatMode("ai");

        sendAiQuestion(
            helpContent[currentHelpKey].title
        );
    }
);

/* =========================================
   POMOCNE FUNKCIJE
========================================= */

function normalizeText(value) {
    return String(value || "")
        .toLocaleLowerCase("hr-HR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

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
    if (!supportMessage) return;

    supportMessage.textContent = text;
    supportMessage.classList.toggle(
        "error",
        isError
    );
    supportMessage.hidden = false;
}

function hideNotice() {
    if (!supportMessage) return;

    supportMessage.hidden = true;
    supportMessage.textContent = "";
}

function createMessageElement(
    text,
    sender,
    date = new Date()
) {
    const wrapper = document.createElement("div");

    wrapper.className =
        "chat-message " +
        (sender === "user" ? "user" : "bot");

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
    bubble.textContent = String(text || "");

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = formatTime(date);

    content.appendChild(bubble);
    content.appendChild(time);

    wrapper.appendChild(content);

    return wrapper;
}

function appendMessage(
    container,
    text,
    sender,
    date
) {
    const element = createMessageElement(
        text,
        sender,
        date
    );

    container.appendChild(element);

    scrollChatToBottom(container);

    return element;
}

/* =========================================
   OTVARANJE CHATA
========================================= */

function openChat() {
    chatOpen = true;

    chatPanel.hidden = false;

    chatLauncher.setAttribute(
        "aria-expanded",
        "true"
    );

    if (chatMode === "human") {
        loadSupportMessages().then(() => {
            markClientMessagesAsRead();
        });
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

/* =========================================
   PROMJENA AI / FIZICKA PODRSKA
========================================= */

function switchChatMode(mode) {
    chatMode = mode === "human"
        ? "human"
        : "ai";

    const isHuman = chatMode === "human";

    aiTab.classList.toggle(
        "active",
        !isHuman
    );

    humanTab.classList.toggle(
        "active",
        isHuman
    );

    aiMessages.hidden = isHuman;
    supportMessages.hidden = !isHuman;

    aiSuggestions.hidden = isHuman;
    humanSupportAction.hidden = isHuman;

    chatInput.placeholder = isHuman
        ? "Napiši poruku podršci..."
        : "Pitaj PTech asistenta...";

    chatHeaderStatus.innerHTML = isHuman
        ? '<i class="online-dot"></i> Fizička podrška • PTech tim'
        : '<i class="online-dot"></i> PTech asistent • Dostupan 24/7';

    chatFooterText.textContent = isHuman
        ? "Poruke se šalju PTech Digital timu"
        : "PTech asistent • Automatski odgovori";

    hideNotice();

    if (isHuman && currentSession) {
        loadSupportMessages().then(() => {
            if (chatOpen) {
                markClientMessagesAsRead();
            }
        });
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

$("switchToHuman")?.addEventListener(
    "click",
    () => {
        switchChatMode("human");
    }
);

/* =========================================
   BESPLATNI PAMETNI ASISTENT
========================================= */

/*
   Asistent ne koristi vanjski AI API.

   Razumije:
   - vise tema u jednom pitanju
   - sinonime i cestu hrvatsku terminologiju
   - kratka dodatna pitanja
   - prethodnu temu razgovora

   Ne zna stvarne podatke o projektu.
*/

/* =========================================
   BAZA ZNANJA
========================================= */

const aiKnowledge = {

    approve: {
        title: "Odobrenje dizajna",

        keywords: [
            "odobri",
            "odobriti",
            "odobrenje",
            "odobren",
            "potvrditi dizajn",
            "potvrda dizajna",
            "prihvatiti dizajn",
            "prihvacam dizajn",
            "dizajn je dobar",
            "finalni dizajn"
        ],

        answer: helpContent.approve.answer
    },

    revision: {
        title: "Izmjene dizajna",

        keywords: [
            "izmjena",
            "izmjene",
            "izmijeniti",
            "promjena",
            "promijeniti",
            "promijenim",
            "dorada",
            "doraditi",
            "popraviti",
            "ispraviti",
            "revizija",
            "drugacije",
            "boja",
            "font",
            "naslovnica",
            "raspored",
            "tekst na stranici",
            "gumb",
            "slika na stranici"
        ],

        answer: helpContent.revision.answer
    },

    documents: {
        title: "Dokumenti",

        keywords: [
            "dokument",
            "dokumenti",
            "ugovor",
            "ponuda",
            "faktura",
            "pdf",
            "datoteka",
            "datoteke",
            "preuzeti",
            "skinuti",
            "download",
            "brief",
            "prilog"
        ],

        answer: helpContent.documents.answer
    },

    status: {
        title: "Status projekta",

        keywords: [
            "status",
            "projekt",
            "projekta",
            "projekti",
            "napredak",
            "napreduje",
            "faza",
            "fazi",
            "rok",
            "rokovi",
            "gotovo",
            "gotov",
            "zavrsen",
            "zavrsiti",
            "kasni",
            "kasnjenje",
            "isporuka",
            "koliko jos",
            "kada ce",
            "kad ce",
            "koliko traje"
        ],

        answer: helpContent.status.answer
    },

    billing: {
        title: "Cijene i naplata",

        keywords: [
            "cijena",
            "cijene",
            "cijenu",
            "koliko kosta",
            "koliko dode",
            "naplata",
            "naplatiti",
            "placanje",
            "platiti",
            "placam",
            "doplata",
            "dodatno naplacuje",
            "dodatni trosak",
            "troskovi",
            "besplatno",
            "budzet",
            "iznos",
            "paket"
        ],

        answer: helpContent.billing.answer
    },

    support: {
        title: "Fizička podrška",

        keywords: [
            "podrska",
            "podrsku",
            "kontakt",
            "kontaktirati",
            "agent",
            "operater",
            "osoba",
            "covjek",
            "ziva osoba",
            "fizicka podrska",
            "administrator",
            "admin",
            "razgovarati s nekim",
            "trebam pomoc",
            "pomozite"
        ],

        answer: helpContent.support.answer
    },

    functionality: {
        title: "Nove funkcionalnosti",

        keywords: [
            "funkcionalnost",
            "funkcionalnosti",
            "nova opcija",
            "nova mogucnost",
            "dodati opciju",
            "dodati funkciju",
            "rezervacije",
            "online rezervacije",
            "placanje karticom",
            "web shop",
            "webshop",
            "kosarica",
            "kontakt forma",
            "registracija korisnika",
            "integracija",
            "api povezivanje"
        ],

        answer:
`Ako želiš dodati novu funkcionalnost na web stranicu ili u postojeći projekt, najbolje je pripremiti precizan opis zahtjeva.

Preporučujem da navedeš:

1. Što nova funkcionalnost treba raditi.
2. Tko će je koristiti.
3. Kako zamišljaš njezin izgled.
4. Treba li se povezati s drugom uslugom.
5. Imaš li željeni rok.

Primjer:
"Želim dodati online rezervacije. Posjetitelj treba odabrati datum, vrijeme i broj osoba te poslati rezervaciju."

Nova funkcionalnost može biti izvan dogovorenog opsega i dodatno se naplatiti.

Za točan opseg, cijenu i rok kontaktiraj PTech Digital tim.`
    },

    website: {
        title: "Web stranice",

        keywords: [
            "web stranica",
            "web stranice",
            "website",
            "izrada weba",
            "izrada stranice",
            "landing page",
            "poslovna stranica",
            "stranica za firmu"
        ],

        answer:
`Ako je tvoje pitanje vezano uz web stranicu, najprije provjeri odnosi li se zahtjev na postojeći projekt ili na novu funkcionalnost.

Ako već imaš aktivan projekt:

1. Otvori karticu Projekti.
2. Odaberi projekt web stranice.
3. Provjeri njegov status.
4. Za izmjene postojećeg dizajna koristi zahtjev za izmjenu.
5. Za nove funkcionalnosti pošalji detaljan opis podršci.

Ne mogu potvrditi cijenu ili rok bez dogovora s PTech Digital timom.`
    },

    login: {
        title: "Prijava i korisnički račun",

        keywords: [
            "prijava",
            "prijaviti se",
            "login",
            "logiranje",
            "lozinka",
            "password",
            "zaboravio lozinku",
            "korisnicki racun",
            "profil",
            "odjava",
            "logout",
            "ne mogu uci"
        ],

        answer:
`Ako imaš problem s korisničkim računom, provjeri koristiš li ispravnu e-mail adresu.

Ako se ne možeš prijaviti:

1. Provjeri internetsku vezu.
2. Provjeri e-mail adresu.
3. Ako postoji mogućnost obnove lozinke, koristi je.
4. Ako problem ostane, kontaktiraj fizičku podršku.

Podatke svojeg profila možeš pregledati u kartici Profil.

Nikada nemoj slati lozinku kroz chat.`
    },

    notifications: {
        title: "Poruke i obavijesti",

        keywords: [
            "obavijest",
            "obavijesti",
            "notifikacija",
            "notifikacije",
            "poruka",
            "poruke",
            "odgovor na poruku",
            "neprocitano",
            "crvena oznaka",
            "badge"
        ],

        answer:
`Poruke fizičke podrške možeš pronaći u ovom chatu.

1. Otvori narančastu ikonu razgovora.
2. Odaberi karticu Fizička podrška.
3. Pregledaj prethodne poruke.
4. Pošalji novu poruku ako je potrebno.

Ako imaš nepročitane poruke podrške, prikazuje se oznaka s njihovim brojem.

Kada otvoriš razgovor fizičke podrške, poruke se označavaju kao pročitane.`
    },

    bug: {
        title: "Tehnički problem",

        keywords: [
            "ne radi",
            "greska",
            "error",
            "bug",
            "problem s portalom",
            "ne ucitava",
            "ne otvara",
            "bijeli ekran",
            "crni ekran",
            "stranica ne radi",
            "ne mogu poslati",
            "ne mogu otvoriti"
        ],

        answer:
`Ako nešto na portalu ne radi, možeš pokušati sljedeće:

1. Osvježi stranicu.
2. Provjeri internetsku vezu.
3. Odjavi se i ponovno prijavi ako je moguće.
4. Provjeri javlja li se problem i nakon ponovnog otvaranja stranice.

Ako problem ostane, pošalji poruku fizičkoj podršci.

U poruci napiši:

• Na kojoj stranici se problem pojavljuje.
• Što si pokušao napraviti.
• Što se dogodilo.
• Prikazuje li se poruka o pogrešci.

Nemoj slati lozinke ili tajne pristupne podatke.`
    }
};

/* =========================================
   POSEBNE RIJECI
========================================= */

const aiGreetings = [
    "bok",
    "hej",
    "pozdrav",
    "hello",
    "hi",
    "dobar dan",
    "dobro jutro",
    "dobra vecer"
];

const aiThanks = [
    "hvala",
    "hvala ti",
    "puno hvala",
    "zahvaljujem",
    "super hvala",
    "okej hvala"
];

const aiFollowUps = [
    "kako",
    "zasto",
    "objasni",
    "detaljnije",
    "vise",
    "mozes pojasniti",
    "sto dalje",
    "a kako",
    "a zasto",
    "moze detaljnije",
    "daj primjer",
    "primjer"
];

/* =========================================
   PREPOZNAVANJE TEMA
========================================= */

function getMatchingTopics(question) {
    const text = normalizeText(question);
    const matches = [];

    for (const [key, topic] of Object.entries(aiKnowledge)) {
        let score = 0;

        for (const keyword of topic.keywords) {
            const normalizedKeyword = normalizeText(keyword);

            if (!normalizedKeyword) continue;

            const escapedKeyword = normalizedKeyword.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            const pattern = new RegExp(
                "(^|\\s)" + escapedKeyword + "(?=\\s|$)"
            );

            if (pattern.test(text)) {
                score += normalizedKeyword.includes(" ")
                    ? 4
                    : 2;
            } else if (
                normalizedKeyword.length >= 5 &&
                text.split(" ").some(
                    (word) =>
                        word.startsWith(normalizedKeyword)
                )
            ) {
                score += 1;
            }
        }

        if (score > 0) {
            matches.push({
                key,
                score
            });
        }
    }

    matches.sort((a, b) => b.score - a.score);

    return matches;
}

/* =========================================
   ODGOVORI PREMA TEMAMA
========================================= */

function getTopicAnswer(key) {
    return aiKnowledge[key]?.answer || "";
}

function isFollowUpQuestion(text) {
    if (!lastAiTopic) return false;

    const normalized = normalizeText(text);

    if (normalized.length > 65) {
        return false;
    }

    return aiFollowUps.some((phrase) => {
        const normalizedPhrase = normalizeText(phrase);

        return (
            normalized === normalizedPhrase ||
            normalized.startsWith(
                normalizedPhrase + " "
            )
        );
    });
}

/* =========================================
   KONTEKST RAZGOVORA
========================================= */

function rememberAiTopics(keys) {
    if (!keys.length) return;

    lastAiTopics = keys.slice(0, 3);
    lastAiTopic = keys[0];
}

function getFollowUpResponse(question) {
    if (!lastAiTopic) return null;

    const text = normalizeText(question);

    const topic = aiKnowledge[lastAiTopic];

    if (!topic) return null;

    if (
        text.includes("primjer") ||
        text.includes("kako napisati")
    ) {
        if (lastAiTopic === "revision") {
            return `Naravno! Evo primjera dobro napisanog zahtjeva za izmjenu:

"Pozdrav, želio bih promijeniti naslov na početnoj stranici. Trenutačni naslov je prevelik na mobitelu. Molim da bude malo manji i centriran. Također bih želio da glavni gumb bude narančaste boje."

Takav opis jasno govori što treba promijeniti i gdje.`;
        }

        if (lastAiTopic === "functionality") {
            return `Evo primjera zahtjeva za novu funkcionalnost:

"Pozdrav, želim dodati sustav online rezervacija na svoju web stranicu. Korisnik treba moći odabrati datum, vrijeme i broj osoba. Nakon slanja rezervacije želim dobiti obavijest e-mailom. Molim procjenu cijene i roka."

Takav zahtjev možeš poslati fizičkoj podršci.`;
        }

        if (lastAiTopic === "support") {
            return `Primjer poruke fizičkoj podršci:

"Pozdrav, trebam pomoć oko svojeg projekta. Želio bih provjeriti jednu informaciju i dobiti dodatno pojašnjenje. Možete li mi pomoći?"

Za konkretnije pitanje dodaj naziv projekta i opis problema.`;
        }
    }

    return `Naravno! Evo detaljnijeg objašnjenja teme "${topic.title}":

${topic.answer}

Ako se pitanje odnosi na konkretan dogovor, cijenu, rok ili odluku tima, preporučujem razgovor s fizičkom podrškom.`;
}

/* =========================================
   GENERIRANJE BESPLATNOG ODGOVORA
========================================= */

function getAiResponse(question) {
    const text = normalizeText(question);

    if (!text) {
        return "Napiši pitanje i pokušat ću ti pomoći.";
    }

    if (aiGreetings.includes(text)) {
        return `Bok! 👋

Dobrodošao u PTech Digital podršku.

Mogu ti pomoći oko:

• Projekata i njihovog statusa
• Odobrenja dizajna
• Izmjena i dorada
• Dokumenata
• Cijena i dodatne naplate
• Novih funkcionalnosti
• Problema s portalom

Što te zanima?`;
    }

    if (
        aiThanks.includes(text) ||
        text.startsWith("hvala ")
    ) {
        return `Nema na čemu! 😊

Ako imaš još pitanja, slobodno pitaj.

Ako ti treba pomoć PTech Digital tima, klikni "Razgovaraj s osobom".`;
    }

    if (
        text === "tko si" ||
        text === "sto si" ||
        text === "jesi li ai" ||
        text === "jesi li bot"
    ) {
        return `Ja sam PTech Digital virtualni asistent. ✦

Pomažem klijentima pronaći informacije o portalu, projektima, dokumentima i podršci.

Koristim pripremljenu bazu znanja i prepoznavanje pitanja. Nisam generativni AI i nemam pristup privatnim podacima tvojeg projekta.

Za pitanja koja zahtijevaju provjeru možeš razgovarati s PTech Digital timom.`;
    }

    const matches = getMatchingTopics(question);

    if (
        isFollowUpQuestion(question) &&
        matches.length === 0
    ) {
        return getFollowUpResponse(question);
    }

    if (matches.length > 0) {
        const bestScore = matches[0].score;

        const selected = matches
            .filter((item, index) => {
                return (
                    index === 0 ||
                    item.score >= Math.max(
                        2,
                        bestScore * 0.45
                    )
                );
            })
            .slice(0, 3);

        const keys = selected.map((item) => item.key);

        rememberAiTopics(keys);

        if (keys.length === 1) {
            return getTopicAnswer(keys[0]);
        }

        const sections = keys.map((key, index) => {
            const topic = aiKnowledge[key];

            return `${index + 1}. ${topic.title.toUpperCase()}

${topic.answer}`;
        });

        return `Tvoje pitanje obuhvaća nekoliko tema. Evo odgovora za svaku od njih:

${sections.join("\n\n──────────────\n\n")}

Ako želiš konkretnu procjenu cijene, roka ili opsega rada, možeš se javiti fizičkoj podršci.`;
    }

    if (isFollowUpQuestion(question)) {
        return getFollowUpResponse(question);
    }

    return `Razumijem da trebaš pomoć, ali nemam dovoljno informacija da ti dam pouzdan odgovor na to pitanje.

Mogu ti pomoći s ovim temama:

• Odobrenje dizajna
• Izmjene i dorade
• Status projekta
• Dokumenti
• Cijene i dodatna naplata
• Nove funkcionalnosti
• Tehnički problemi

Možeš li malo detaljnije opisati što želiš napraviti?

Ako je riječ o konkretnom projektu ili posebnom dogovoru, klikni "Razgovaraj s osobom".`;
}

/* =========================================
   AI RAZGOVOR
========================================= */

function sendAiQuestion(question) {
    const text = String(question || "").trim();

    if (!text) return;

    hideNotice();

    appendMessage(
        aiMessages,
        text,
        "user"
    );

    aiConversation.push({
        role: "user",
        content: text
    });

    const answer = getAiResponse(text);

    aiConversation.push({
        role: "assistant",
        content: answer
    });

    // Zadrzi samo zadnjih 20 poruka u memoriji.
    aiConversation = aiConversation.slice(-20);

    const responseElement = appendMessage(
        aiMessages,
        answer,
        "bot"
    );

    responseElement.style.opacity = "0";

    requestAnimationFrame(() => {
        responseElement.style.transition =
            "opacity .25s ease";

        responseElement.style.opacity = "1";
    });
}

/* =========================================
   PREDLOZENA AI PITANJA
========================================= */

document.querySelectorAll(
    "[data-ai-question]"
).forEach((button) => {
    button.addEventListener("click", () => {
        sendAiQuestion(
            button.dataset.aiQuestion
        );
    });
});

/* =========================================
   KORISNICKI PROFIL
========================================= */

async function loadProfile() {
    if (!currentSession) return;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq("id", currentSession.user.id)
        .maybeSingle();

    if (error) {
        console.error(
            "Profile error:",
            error
        );
    }

    clientName.textContent =
        data?.display_name ||
        currentSession.user.email?.split("@")[0] ||
        "Klijent";
}

/* =========================================
   UCITAVANJE FIZICKE PODRSKE
========================================= */

async function loadSupportMessages() {
    if (!currentSession) return;

    const sequence = ++supportLoadSequence;

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
        .eq(
            "user_id",
            currentSession.user.id
        )
        .order("created_at", {
            ascending: true
        });

    // Sprijeci da stariji zahtjev prepise noviji.
    if (sequence !== supportLoadSequence) {
        return;
    }

    supportMessages.innerHTML = "";

    if (error) {
        console.error(
            "Load support error:",
            error
        );

        const empty = document.createElement("div");

        empty.className = "chat-empty";
        empty.textContent =
            "Razgovor trenutno nije moguće učitati.";

        supportMessages.appendChild(empty);

        return;
    }

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

/* =========================================
   OZNACAVANJE PROCITANIH PORUKA
========================================= */

async function markClientMessagesAsRead() {
    if (
        !currentSession ||
        !chatOpen ||
        chatMode !== "human" ||
        document.visibilityState === "hidden" ||
        markingRead
    ) {
        return;
    }

    markingRead = true;

    try {
        const { error } = await supabaseClient
            .from("support_messages")
            .update({
                client_read_at:
                    new Date().toISOString()
            })
            .eq(
                "user_id",
                currentSession.user.id
            )
            .eq("sender_role", "admin")
            .is("client_read_at", null);

        if (error) {
            console.error(
                "Mark read error:",
                error
            );
        }
    } finally {
        markingRead = false;
        await loadClientUnreadCount();
    }
}

/* =========================================
   NEPROCITANE PORUKE
========================================= */

function updateBadge(element, count) {
    if (!element) return;

    element.hidden = count <= 0;

    element.textContent =
        count > 99
            ? "99+"
            : String(count);
}

async function loadClientUnreadCount() {
    if (!currentSession) return;

    const { count, error } = await supabaseClient
        .from("support_messages")
        .select("id", {
            count: "exact",
            head: true
        })
        .eq(
            "user_id",
            currentSession.user.id
        )
        .eq("sender_role", "admin")
        .is("client_read_at", null);

    if (error) {
        console.error(
            "Unread error:",
            error
        );
        return;
    }

    unreadCount = count || 0;

    updateBadge(
        messagesUnreadBadge,
        unreadCount
    );

    updateBadge(
        chatUnreadBadge,
        unreadCount
    );

    updateBadge(
        humanTabUnread,
        unreadCount
    );
}

/* =========================================
   SLANJE PORUKE FIZICKOJ PODRSCI
========================================= */

async function sendHumanMessage(message) {
    if (!currentSession || sendingMessage) {
        return;
    }

    sendingMessage = true;
    sendChatMessage.disabled = true;

    hideNotice();

    try {
        const { error } = await supabaseClient
            .from("support_messages")
            .insert({
                user_id: currentSession.user.id,
                sender_role: "client",
                message
            });

        if (error) {
            console.error(
                "Send message error:",
                error
            );

            showNotice(
                "Poruka nije poslana. Pokušaj ponovno.",
                true
            );

            return;
        }

        chatInput.value = "";

        await loadSupportMessages();

    } finally {
        sendingMessage = false;
        sendChatMessage.disabled = false;
    }
}

/* =========================================
   SLANJE IZ INPUTA
========================================= */

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
        Math.min(
            chatInput.scrollHeight,
            110
        ) + "px";
});

/* =========================================
   SUPABASE REALTIME
========================================= */

function subscribeToSupportRealtime() {
    if (!currentSession || realtimeChannel) {
        return;
    }

    realtimeChannel = supabaseClient
        .channel(
            "client-support-" +
            currentSession.user.id
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "support_messages",
                filter:
                    "user_id=eq." +
                    currentSession.user.id
            },
            async () => {
                await loadClientUnreadCount();

                if (
                    chatOpen &&
                    chatMode === "human"
                ) {
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

/* =========================================
   OSVJEZAVANJE KAD SE VRATIS NA TAB
========================================= */

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

        if (
            chatOpen &&
            chatMode === "human"
        ) {
            await loadSupportMessages();
            await markClientMessagesAsRead();
        }
    }
);

/* =========================================
   ODJAVA
========================================= */

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

/* =========================================
   START
========================================= */

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
