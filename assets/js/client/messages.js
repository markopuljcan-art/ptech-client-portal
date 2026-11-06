
"use strict";

/* ==========================================
   PTECH DIGITAL - PORUKE V18
   FAQ + AI ASISTENT + SUPABASE REALTIME
========================================== */

const SUPABASE_URL =
  "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const $ = id => document.getElementById(id);

const db = window.supabase?.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let session = null;
let realtimeChannel = null;

let activeChat = "ai";
let chatOpened = false;
let sending = false;
let markingRead = false;

let supportLoadToken = 0;
let lastTopic = null;
let currentFaqTopic = null;


/* ==========================================
   FAQ ODGOVORI
========================================== */

const faq = {

  approve: {
    title: "Kako odobriti dizajn?",

    answer: `Za odobrenje dizajna otvori karticu Projekti i odaberi odgovarajući projekt.

1. Otvori pregled dostavljenog dizajna.
2. Provjeri tekstove, fotografije, boje i izgled na mobitelu.
3. Ako je sve u redu i opcija je dostupna, klikni „Odobri dizajn”.
4. Ako želiš doradu, prvo zatraži izmjenu.

Ako opcija odobravanja nije dostupna, pošalji poruku PTech Digital timu.`
  },

  revision: {
    title: "Kako zatražiti izmjenu?",

    answer: `Otvorite odgovarajući projekt i, ako je dostupna, odaberite mogućnost za zahtjev za izmjenu.

U zahtjevu navedite što želite promijeniti, na kojoj se stranici ili dijelu dizajna nalazi i kako treba izgledati. Možete priložiti primjer kroz Dokumente.

Dodatni rad izvan dogovorenog opsega može se dodatno naplatiti. Za dogovor se obratite podršci.`
  },

  documents: {
    title: "Gdje su moji dokumenti?",

    answer: `Otvorite karticu Dokumenti u navigaciji. Ondje možete pregledavati i preuzimati datoteke povezane s vašim projektima.

Za slanje nove datoteke kliknite „Učitaj dokumente”, odaberite projekt, kategoriju i datoteke te potvrdite slanje. Možete dodati do 5 datoteka, svaku do 10 MB.`
  },

  status: {
    title: "Kako pratiti projekt?",

    answer: `U kartici Projekti odaberite projekt koji vas zanima. Prikazat će se njegov status, napredak, aktivnosti i rok, ako su podaci dostupni.

Asistent ne može potvrditi stvarni rok ili status iz baze. Za dodatno pojašnjenje pišite PTech Digital timu.`
  },

  billing: {
    title: "Što se dodatno naplaćuje?",

    answer: `Dodatno se mogu naplatiti nove funkcionalnosti, veće naknadne izmjene, integracije i zahtjevi izvan dogovorenog paketa.

Prije početka dodatnog rada trebate dobiti potvrdu opsega i cijene. Samo slanje upita nije narudžba dodatnog rada. Za račune pogledajte Dokumente ili pitajte podršku.`
  },

  support: {
    title: "Kako kontaktirati PTech Digital tim?",

    answer: `Na stranici Poruke kliknite „Otvori razgovor”. U popisu razgovora lijevo odaberite „PTech tim”. Napišite pitanje i pošaljite poruku.

Odgovor će biti vidljiv u razgovoru čim ga tim pošalje. Ne dijelite lozinke ni osjetljive pristupne podatke.`
  }

};


/* ==========================================
   DODATNI ODGOVORI ASISTENTA
========================================== */

const specialAnswers = {

  upload: faq.documents.answer,

  password:
    "Ako ste već prijavljeni, otvorite Profil → Sigurnost računa → Promijeni lozinku. Ako se ne možete prijaviti, koristite oporavak lozinke na stranici za prijavu ili kontaktirajte podršku. Nikad ne šaljite lozinku u razgovoru.",

  notifications:
    "Broj nepročitanih poruka prikazuje se uz Poruke. Odgovore tima čitate u razgovoru „PTech tim”. Postavke mobilnih obavijesti nalaze se u Profilu, ali slanje PWA push obavijesti još nije aktivirano.",

  bug:
    "Ako nešto ne radi, pokušajte osvježiti stranicu i provjeriti internetsku vezu. Ako se problem nastavi, pošaljite PTech Digital timu naziv stranice, opis problema i eventualnu poruku o grešci. Nemojte slati lozinke.",

  functionality:
    "Za novu funkcionalnost opišite što treba raditi, tko će je koristiti, kako treba izgledati i imate li željeni rok. Pošaljite upit PTech Digital timu. Cijenu i opseg potrebno je posebno dogovoriti."

};


/* ==========================================
   NORMALIZACIJA TEKSTA
========================================== */

function normalized(text) {

  return String(text ?? "")
    .toLocaleLowerCase("hr-HR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}


/* ==========================================
   PREPOZNAVANJE TEMA
========================================== */

const intentRules = [

  [
    "password",
    /lozink|zapork|password|reset loz|zaborav.*loz|ne mogu se prijav/
  ],

  [
    "notifications",
    /obavijest|obavijesti|notifikacij|push|neprocitan/
  ],

  [
    "bug",
    /ne radi|gresk|error|bug|tehnick|stranica se ne|prazan ekran|problem s portalom|ne ucitava se/
  ],

  [
    "upload",
    /ucitav|ucitat|uplo|priloz|poslat.*(datotek|dokument|materijal|slik)|dodat.*(dokument|materijal|datotek)/
  ],

  [
    "approve",
    /odob|prihvat.*dizajn|potvrd.*dizajn|konacn.*dizajn/
  ],

  [
    "revision",
    /izmjen|izmijen|dorad|revizij|promjen.*(boj|tekst|slik|dizajn)|zamijen.*slik/
  ],

  [
    "billing",
    /naplac|naplat|plac|racun|faktur|cijen|dopl|trosk|uplat|iznos|pdv|kost/
  ],

  [
    "functionality",
    /nov.*funkcional|nov.*funkcij|nov.*mogucnost|dodat.*opcij|integracij|rezervacij/
  ],

  [
    "status",
    /status|napred|rok|kasnj|faza|zavrs|kad ce.*projekt|kada ce.*projekt|koliko traje|projekt/
  ],

  [
    "documents",
    /dokument|ugovor|ponud|datotek|materijal|pdf|preuzet|skinuti/
  ],

  [
    "support",
    /podrsk|pomoc|kontakt|ptech tim|operater|agent|razgovor s osob|fizick/
  ]

];


/* ==========================================
   AI ASISTENT - ODGOVORI
========================================== */

function aiAnswer(question, explicitTopic = null) {

  const q = normalized(question);

  if (!q) {
    return "Napišite pitanje pa ću pokušati pomoći.";
  }

  /* POZDRAVI */

  if (
    /^(bok|hej|pozdrav|hello|hi|dobar dan|dobro jutro|dobra vecer)$/.test(q)
  ) {

    return "Bok! 👋 Mogu pomoći oko projekata, dizajna, dokumenata, naplate, lozinke i tehničkih problema. Što vas zanima?";

  }

  /* ZAHVALA */

  if (
    /^(hvala|hvala ti|puno hvala|super|okej hvala)/.test(q)
  ) {

    return "Nema na čemu! 😊 Za konkretne informacije o vašem projektu otvorite razgovor 'PTech tim'.";

  }

  /* INFORMACIJE O ASISTENTU */

  if (
    /^(tko si|sto si|jesi li ai|jesi li bot)$/.test(q)
  ) {

    return "Ja sam PTech Digital virtualni asistent s pripremljenom bazom odgovora. Nemam pristup privatnim podacima vašeg projekta ni stvarnom statusu i nisam generativni AI.";

  }

  /* ODABIR TEME */

  const permitted = new Set([
    ...Object.keys(faq),
    ...Object.keys(specialAnswers)
  ]);

  let topic = permitted.has(explicitTopic)
    ? explicitTopic
    : null;

  /* DODATNA PITANJA */

  if (!topic) {

    const followUp =
      /^(detaljnije|objasni|mozes pojasniti|moze primjer|daj primjer|zasto je to tako|a kako to)$/.test(q);

    if (followUp && lastTopic) {
      topic = lastTopic;
    }

  }

  /* PREPOZNAJ KLJUČNE RIJEČI */

  if (!topic) {

    for (const [key, pattern] of intentRules) {

      if (pattern.test(q)) {

        topic = key;

        break;

      }

    }

  }

  /* NEPOZNATO PITANJE */

  if (!topic) {

    return "Nisam siguran da sam razumio pitanje. Odaberite neku od brzih tema ili konkretnije opišite problem. Za provjeru statusa, cijene i drugih osobnih informacija javite se PTech timu.";

  }

  lastTopic = topic;

  return (
    faq[topic]?.answer ||
    specialAnswers[topic] ||
    "Za ovaj upit javite se PTech Digital timu."
  );

}


/* ==========================================
   FORMATIRANJE VREMENA
========================================== */

function dateTime(value) {

  const d = new Date(value || Date.now());

  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("hr-HR", {
        hour: "2-digit",
        minute: "2-digit"
      });

}


/* ==========================================
   PRIKAZ PORUKE
========================================== */

function appendMessage(
  root,
  text,
  own,
  date = new Date()
) {

  const row = document.createElement("div");

  row.className =
    `chat-message ${own ? "user" : "bot"}`;

  if (!own) {

    const avatar = document.createElement("span");

    avatar.className = "message-avatar";

    avatar.textContent = "P";

    row.append(avatar);

  }

  const content = document.createElement("div");

  content.className = "message-content";

  const bubble = document.createElement("div");

  bubble.className = "message-bubble";

  bubble.textContent = String(text ?? "");

  const time = document.createElement("div");

  time.className = "message-time";

  time.textContent = dateTime(date);

  content.append(bubble, time);

  row.append(content);

  root.append(row);

  requestAnimationFrame(() => {

    root.scrollTop = root.scrollHeight;

  });

}


/* ==========================================
   PORUKE O GREŠKAMA
========================================== */

function setNotice(text, error = false) {

  $("supportMessage").textContent = text;

  $("supportMessage").hidden = !text;

  $("supportMessage").classList.toggle(
    "error",
    error
  );

}


/* ==========================================
   OZNAKE NEPROČITANIH PORUKA
========================================== */

function updateBadges(number) {

  for (const id of [
    "messagesUnreadBadge",
    "desktopUnreadBadge",
    "humanTabUnread"
  ]) {

    const badge = $(id);

    if (!badge) continue;

    badge.hidden = !number;

    badge.textContent =
      number > 99 ? "99+" : String(number);

  }

}


/* ==========================================
   UČITAVANJE BROJA NEPROČITANIH
========================================== */

async function refreshUnread() {

  if (!session) return;

  const { count, error } = await db
    .from("support_messages")
    .select("id", {
      count: "exact",
      head: true
    })
    .eq("user_id", session.user.id)
    .eq("sender_role", "admin")
    .is("client_read_at", null);

  if (error) {

    console.warn("Unread:", error);

    return;

  }

  updateBadges(count || 0);

}


/* ==========================================
   OZNAČAVANJE PORUKA KAO PROČITANIH
========================================== */

async function markRead() {

  if (
    !session ||
    !chatOpened ||
    activeChat !== "human" ||
    document.hidden ||
    markingRead
  ) {
    return;
  }

  markingRead = true;

  try {

    const { error } = await db
      .from("support_messages")
      .update({
        client_read_at: new Date().toISOString()
      })
      .eq("user_id", session.user.id)
      .eq("sender_role", "admin")
      .is("client_read_at", null);

    if (error) {

      console.warn("Read status:", error);

    }

  } finally {

    markingRead = false;

    await refreshUnread();

  }

}


/* ==========================================
   UČITAVANJE PORUKA PODRŠKE
========================================== */

async function loadSupport() {

  if (!session) return;

  const token = ++supportLoadToken;

  const { data, error } = await db
    .from("support_messages")
    .select(
      "id,created_at,user_id,sender_role,message,client_read_at"
    )
    .eq("user_id", session.user.id)
    .order("created_at", {
      ascending: true
    });

  if (token !== supportLoadToken) return;

  const root = $("supportMessages");

  root.replaceChildren();

  if (error) {

    console.error(error);

    root.innerHTML =
      '<div class="chat-empty">Razgovor se trenutačno ne može učitati.</div>';

    return;

  }

  if (!data?.length) {

    root.innerHTML =
      '<div class="chat-empty">Još nema poruka. Napišite pitanje i pošaljite ga našem timu.</div>';

    return;

  }

  for (const item of data) {

    appendMessage(
      root,
      item.message,
      item.sender_role === "client",
      item.created_at
    );

  }

}


/* ==========================================
   PREBACIVANJE RAZGOVORA
========================================== */

function switchChat(mode) {

  activeChat =
    mode === "human" ? "human" : "ai";

  const human = activeChat === "human";

  $("aiTab").classList.toggle(
    "active",
    !human
  );

  $("humanTab").classList.toggle(
    "active",
    human
  );

  $("aiTab").setAttribute(
    "aria-pressed",
    String(!human)
  );

  $("humanTab").setAttribute(
    "aria-pressed",
    String(human)
  );

  $("aiMessages").hidden = human;

  $("supportMessages").hidden = !human;

  $("aiSuggestions").hidden = human;

  $("chatInput").placeholder = human
    ? "Napiši poruku PTech timu..."
    : "Pitaj PTech asistenta...";

  $("chatTitle").textContent = human
    ? "PTech Digital tim"
    : "PTech Digital asistent";

  $("chatHeaderStatus").textContent = human
    ? "Izravna poruka podršci"
    : "Automatska pomoć • Dostupan 24/7";

  $("chatFooterText").textContent = human
    ? "Poruke se šalju PTech Digital timu"
    : "PTech asistent • Informativni odgovori";

  setNotice("");

  if (human && session) {

    loadSupport()
      .then(markRead)
      .catch(console.error);

  }

}


/* ==========================================
   OTVARANJE CHATA
========================================== */

function openChat(mode = activeChat) {

  chatOpened = true;

  $("supportView").hidden = true;

  $("chatView").hidden = false;

  document.body.classList.add("chat-open");

  switchChat(mode);

  window.scrollTo(0, 0);

  $("chatInput").focus();

}


/* ==========================================
   ZATVARANJE CHATA
========================================== */

function closeChat() {

  chatOpened = false;

  $("chatView").hidden = true;

  $("supportView").hidden = false;

  document.body.classList.remove("chat-open");

  setNotice("");

  window.scrollTo(0, 0);

  refreshUnread();

}


/* ==========================================
   AI RAZGOVOR
========================================== */

function sendAi(text, explicitTopic = null) {

  appendMessage(
    $("aiMessages"),
    text,
    true
  );

  appendMessage(
    $("aiMessages"),
    aiAnswer(text, explicitTopic),
    false
  );

}


/* ==========================================
   SLANJE PORUKE
========================================== */

async function sendCurrent() {

  const input = $("chatInput");

  const text = input.value.trim();

  if (!text || sending) return;

  if (text.length < 2) {

    setNotice(
      "Napišite malo dužu poruku.",
      true
    );

    return;

  }

  if (activeChat === "ai") {

    input.value = "";

    sendAi(text);

    input.style.height = "42px";

    input.focus();

    return;

  }

  if (!session) {

    setNotice(
      "Prijavite se kako biste poslali poruku.",
      true
    );

    return;

  }

  sending = true;

  $("sendChatMessage").disabled = true;

  setNotice("");

  try {

    const { error } = await db
      .from("support_messages")
      .insert({
        user_id: session.user.id,
        sender_role: "client",
        message: text
      });

    if (error) {

      throw error;

    }

    input.value = "";

    input.style.height = "42px";

    await loadSupport();

    await refreshUnread();

  } catch (error) {

    console.error(
      "Send message:",
      error
    );

    setNotice(
      "Poruka nije poslana. Pokušajte ponovno.",
      true
    );

  } finally {

    sending = false;

    $("sendChatMessage").disabled = false;

    input.focus();

  }

}


/* ==========================================
   FAQ KARTICE
========================================== */

function setupFaq() {

  document
    .querySelectorAll("[data-help]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const item =
            faq[button.dataset.help];

          if (!item) return;

          currentFaqTopic =
            button.dataset.help;

          $("helpAnswerTitle").textContent =
            item.title;

          $("helpAnswerText").textContent =
            item.answer;

          $("helpAnswer").hidden = false;

          $("helpAnswer").scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });

        }
      );

    });

  $("closeHelpAnswer").addEventListener(
    "click",
    () => {

      $("helpAnswer").hidden = true;

    }
  );

  $("askAiAboutThis").addEventListener(
    "click",
    () => {

      const question =
        $("helpAnswerTitle").textContent;

      openChat("ai");

      sendAi(
        question,
        currentFaqTopic
      );

    }
  );

}


/* ==========================================
   PARTICLES
========================================== */

function setupParticles() {

  if (
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {
    return;
  }

  const positions = [
    8, 19, 31, 43, 55, 67, 79, 91
  ];

  positions.forEach((top, i) => {

    const part =
      document.createElement("span");

    part.className = "messages-particle";

    part.style.setProperty(
      "--top",
      `${top}%`
    );

    part.style.setProperty(
      "--width",
      `${78 + (i * 17) % 66}px`
    );

    part.style.setProperty(
      "--duration",
      `${18 + (i * 3) % 8}s`
    );

    part.style.setProperty(
      "--delay",
      `${-i * 3}s`
    );

    $("messagesParticles").append(part);

  });

}


/* ==========================================
   LIGHT / DARK MODE
========================================== */

function setupTheme() {

  let theme = "dark";

  try {

    theme = (
      localStorage.getItem("theme") ||
      localStorage.getItem("ptech-theme")
    ) === "light"
      ? "light"
      : "dark";

  } catch (_) {}

  function apply(next) {

    const light = next === "light";

    document.body.classList.toggle(
      "light-mode",
      light
    );

    document.documentElement.dataset.theme =
      next;

    document.documentElement.classList.remove(
      "initial-light"
    );

    $("themeToggle").checked = light;

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        light ? "#fffaf5" : "#1b2232"
      );

    try {

      localStorage.setItem(
        "theme",
        next
      );

    } catch (_) {}

  }

  apply(theme);

  $("themeToggle").addEventListener(
    "change",
    event => {

      apply(
        event.target.checked
          ? "light"
          : "dark"
      );

    }
  );

}


/* ==========================================
   POKRETANJE STRANICE
========================================== */

async function start() {

  setupTheme();

  setupParticles();

  setupFaq();

  /* OTVARANJE RAZGOVORA */

  $("openChatFromPage").addEventListener(
    "click",
    () => openChat("ai")
  );

  /* POVRATAK NA POMOĆ */

  $("closeChat").addEventListener(
    "click",
    closeChat
  );

  /* ODABIR AI ASISTENTA */

  $("aiTab").addEventListener(
    "click",
    () => switchChat("ai")
  );

  /* ODABIR PTECH TIMA */

  $("humanTab").addEventListener(
    "click",
    () => switchChat("human")
  );

  /* SLANJE PORUKE */

  $("sendChatMessage").addEventListener(
    "click",
    sendCurrent
  );

  /* ENTER ZA SLANJE */

  $("chatInput").addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.isComposing
      ) {

        event.preventDefault();

        sendCurrent();

      }

    }
  );

  /* AUTOMATSKA VISINA UNOSA */

  $("chatInput").addEventListener(
    "input",
    event => {

      const input = event.target;

      input.style.height = "42px";

      input.style.height =
        Math.min(
          input.scrollHeight,
          115
        ) + "px";

    }
  );

  /* BRZA PITANJA */

  document
    .querySelectorAll("[data-ai-question]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          sendAi(
            button.dataset.aiQuestion,
            button.dataset.topic
          );

        }
      );

    });

  /* ESC ZA POVRATAK */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        chatOpened
      ) {

        closeChat();

      }

    }
  );

  /* POVRATAK NA TAB */

  document.addEventListener(
    "visibilitychange",
    () => {

      if (!document.hidden) {

        refreshUnread();

        if (
          chatOpened &&
          activeChat === "human"
        ) {

          loadSupport().then(markRead);

        }

      }

    }
  );

  /* SUPABASE PROVJERA */

  if (!db) {

    setNotice(
      "Supabase biblioteka nije učitana.",
      true
    );

    return;

  }

  /* PROVJERA SESIJE */

  const {
    data: {
      session: authSession
    },
    error
  } = await db.auth.getSession();

  if (error || !authSession) {

    location.href = "login.html";

    return;

  }

  session = authSession;

  /* UČITAJ IME KLIJENTA */

  const profile = await db
    .from("profiles")
    .select("display_name")
    .eq("id", session.user.id)
    .maybeSingle();

  $("clientName").textContent =
    profile.data?.display_name ||
    session.user.email?.split("@")[0] ||
    "Klijent";

  /* BROJ NEPROČITANIH PORUKA */

  await refreshUnread();

  /* SUPABASE REALTIME */

  realtimeChannel = db
    .channel(
      `client-support-${session.user.id}`
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "support_messages",
        filter: `user_id=eq.${session.user.id}`
      },
      async () => {

        await refreshUnread();

        if (
          chatOpened &&
          activeChat === "human"
        ) {

          await loadSupport();

          await markRead();

        }

      }
    )
    .subscribe();

  /* ODJAVA */

  $("logoutButton").addEventListener(
    "click",
    async () => {

      if (realtimeChannel) {

        await db.removeChannel(
          realtimeChannel
        );

      }

      const {
        error: logoutError
      } = await db.auth.signOut();

      if (logoutError) {

        alert(
          "Odjava nije uspjela. Pokušajte ponovno."
        );

        return;

      }

      location.href = "login.html";

    }
  );

}


/* ==========================================
   START
========================================== */

start().catch(error => {

  console.error(
    "Messages initialization:",
    error
  );

});
