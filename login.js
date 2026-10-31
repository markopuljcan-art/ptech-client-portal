
/* ==========================================
   PTECH DIGITAL
   SMOOTH PORTAL LOGIN — V14
   LIGHT + DARK TRANSITION
========================================== */

/* ==========================================
   SUPABASE
========================================== */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* ==========================================
   ELEMENTS
========================================== */

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const capsLockWarning = document.getElementById("capsLockWarning");
const loginCard = document.querySelector(".login-card");

let isRedirecting = false;

/* ==========================================
   LOGIN HELPERS
========================================== */

function showLoginError(message) {
    if (!loginError) return;

    loginError.textContent = message;
    loginError.classList.add("show");
}

function clearLoginError() {
    if (!loginError) return;

    loginError.textContent = "";
    loginError.classList.remove("show");
}

function setLoginLoading(loading) {
    if (!loginButton) return;

    loginButton.disabled = loading;
    loginButton.textContent = loading
        ? "Prijava..."
        : "Prijavi se";
}

function shakeLoginCard() {
    if (!loginCard) return;

    loginCard.classList.remove("shake");
    void loginCard.offsetWidth;
    loginCard.classList.add("shake");
}

/* ==========================================
   PORTAL TRANSITION SETTINGS
========================================== */

/*
   Zadrzavamo savrseni zoom
   prema istoj tocki kao prije.
*/

const PORTAL_X = "52.5%";
const PORTAL_Y = "50%";

const PORTAL_DURATION = 2500;

/* ==========================================
   SMOOTH PORTAL TRANSITION STYLES
========================================== */

function installPortalStyles() {

    if (
        document.getElementById(
            "ptech-portal-styles"
        )
    ) {
        return;
    }

    const style = document.createElement("style");
    style.id = "ptech-portal-styles";

    style.textContent = `

        :root {
            --portal-x: ${PORTAL_X};
            --portal-y: ${PORTAL_Y};

            --portal-ease:
                cubic-bezier(.35, .08, .62, 1);
        }

        body.portal-entering {
            overflow: hidden !important;
        }

        /* ==================================
           1. CAMERA ZOOM
        ================================== */

        body.portal-entering .login-page {
            transform-origin:
                var(--portal-x)
                var(--portal-y);

            animation:
                portalCameraZoom
                1280ms
                var(--portal-ease)
                both;

            pointer-events: none;

            will-change: transform;
        }

        @keyframes portalCameraZoom {
            from {
                transform:
                    translateZ(0) scale(1);
            }

            to {
                transform:
                    translateZ(0) scale(2.35);
            }
        }

        /* ==================================
           2. LEFT SIDE MOVES LEFT
        ================================== */

        body.portal-entering .login-left {
            animation:
                portalMoveLeft
                1280ms
                var(--portal-ease)
                both;

            will-change:
                transform,
                opacity;
        }

        @keyframes portalMoveLeft {
            from {
                transform:
                    translate3d(0, 0, 0);

                opacity: 1;
            }

            to {
                transform:
                    translate3d(-29vw, 0, 0);

                opacity: 0;
            }
        }

        /* ==================================
           3. RIGHT SIDE MOVES RIGHT
        ================================== */

        body.portal-entering .login-right {
            animation:
                portalMoveRight
                1280ms
                var(--portal-ease)
                both;

            will-change:
                transform,
                opacity;
        }

        @keyframes portalMoveRight {
            from {
                transform:
                    translate3d(0, 0, 0);

                opacity: 1;
            }

            to {
                transform:
                    translate3d(29vw, 0, 0);

                opacity: 0;
            }
        }

        /* ==================================
           4. STOP PARTICLES
        ================================== */

        body.portal-entering .particle,
        body.portal-entering .particles::before,
        body.portal-entering .particles::after {
            animation-play-state:
                paused !important;
        }

        body.portal-entering .support-widget {
            opacity: 0;

            pointer-events: none;

            transition:
                opacity 220ms ease;
        }

        /* ==================================
           5. FULLSCREEN TRANSITION
        ================================== */

        .ptech-portal-transition {
            position: fixed;

            inset: 0;

            z-index: 99999;

            overflow: hidden;

            pointer-events: all;

            isolation: isolate;

            font-family:
                "Inter", sans-serif;
        }

        /* ==================================
           6. GROWING PORTAL CIRCLE
           LIGHT MODE
        ================================== */

        .portal-light {
            position: absolute;

            left: var(--portal-x);
            top: var(--portal-y);

            width: 100vmax;
            height: 100vmax;

            border-radius: 50%;

            background:
                radial-gradient(
                    circle,
                    #ffffff 0%,
                    #fffdf9 42%,
                    #f6e3d2 77%,
                    #e5bda0 100%
                );

            transform:
                translate3d(-50%, -50%, 0)
                scale(.001);

            transform-origin: center;

            animation:
                portalLightGrow
                1370ms
                cubic-bezier(.35, 0, .7, 1)
                100ms
                both;

            will-change: transform;
        }

        @keyframes portalLightGrow {
            from {
                transform:
                    translate3d(-50%, -50%, 0)
                    scale(.001);
            }

            to {
                transform:
                    translate3d(-50%, -50%, 0)
                    scale(1.9);
            }
        }

        /* ==================================
           7. CENTRAL GLOW
           LIGHT MODE
        ================================== */

        .portal-core {
            position: absolute;

            left: var(--portal-x);
            top: var(--portal-y);

            width: 90px;
            height: 90px;

            border-radius: 50%;

            background:
                radial-gradient(
                    circle,
                    rgba(255,255,255,.95),
                    rgba(255,241,220,.4) 72%,
                    transparent
                );

            transform:
                translate3d(-50%, -50%, 0)
                scale(.05);

            opacity: 0;

            animation:
                portalCoreGrow
                900ms
                ease-out
                90ms
                both;

            will-change:
                transform,
                opacity;
        }

        @keyframes portalCoreGrow {
            0% {
                transform:
                    translate3d(-50%, -50%, 0)
                    scale(.05);

                opacity: 0;
            }

            25% {
                opacity: .9;
            }

            100% {
                transform:
                    translate3d(-50%, -50%, 0)
                    scale(7);

                opacity: 0;
            }
        }

        /* ==================================
           8. FINAL LOADING SCREEN
           LIGHT MODE
        ================================== */

        .portal-finish {
            position: absolute;

            inset: 0;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 24px;

            background:
                radial-gradient(
                    circle at 50% 45%,
                    #ffffff 0%,
                    #fffdf9 54%,
                    #f7e9dc 100%
                );

            opacity: 0;

            animation:
                portalFinalFade
                380ms
                ease-out
                1190ms
                both;
        }

        @keyframes portalFinalFade {
            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }

        /* ==================================
           9. LOGO REVEAL
        ================================== */

        .portal-finish-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            width: 100%;
            max-width: 380px;

            text-align: center;

            opacity: 0;

            transform:
                translate3d(0, 15px, 0)
                scale(.94);

            animation:
                portalLogoReveal
                620ms
                cubic-bezier(.22, .8, .22, 1)
                1380ms
                both;

            will-change:
                transform,
                opacity;
        }

        @keyframes portalLogoReveal {
            from {
                opacity: 0;

                transform:
                    translate3d(0, 15px, 0)
                    scale(.94);
            }

            to {
                opacity: 1;

                transform:
                    translate3d(0, 0, 0)
                    scale(1);
            }
        }

        .portal-finish-logo {
            display: block;

            width: 225px;
            max-width: 75vw;
            height: auto;

            object-fit: contain;
        }

        /* ==================================
           10. LOADING SPINNER
        ================================== */

        .portal-loader {
            display: flex;
            align-items: center;
            justify-content: center;

            gap: 12px;

            margin-top: 5px;

            color: #936c52;

            font-size: 12px;
            font-weight: 600;
        }

        .portal-spinner {
            width: 20px;
            height: 20px;

            border:
                2px solid
                rgba(168,104,62,.15);

            border-top-color: #ac744f;

            border-radius: 50%;

            animation:
                portalSpinnerRotate
                850ms
                linear
                infinite;
        }

        @keyframes portalSpinnerRotate {
            to {
                transform: rotate(360deg);
            }
        }

        .portal-bottom {
            position: absolute;

            left: 0;
            right: 0;
            bottom: 31px;

            color: #ad9787;

            text-align: center;

            font-size: 9px;
            font-weight: 700;

            letter-spacing: 2px;
        }

        /* ==================================
           11. DARK MODE TRANSITION

           Mijenjamo samo boje.
           Nema promjene brzine,
           scalea ni trajanja.
        ================================== */

        html[data-login-theme="dark"]
        .portal-light {
            background:
                radial-gradient(
                    circle,
                    #30415d 0%,
                    #24334b 42%,
                    #1b283d 77%,
                    #131c2d 100%
                );
        }

        /* Brončani centralni sjaj */

        html[data-login-theme="dark"]
        .portal-core {
            background:
                radial-gradient(
                    circle,
                    rgba(232,182,147,.50),
                    rgba(141,111,117,.22) 72%,
                    transparent
                );
        }

        /* Zavrsni ekran je navy plav */

        html[data-login-theme="dark"]
        .portal-finish {
            background:
                radial-gradient(
                    circle at 50% 45%,
                    #2a3a55 0%,
                    #202e45 54%,
                    #172235 100%
                );
        }

        /* Tekst ispod logotipa */

        html[data-login-theme="dark"]
        .portal-loader {
            color: #e9c5a9;
        }

        /* Brončani loading spinner */

        html[data-login-theme="dark"]
        .portal-spinner {
            border-color:
                rgba(237,198,167,.18);

            border-top-color:
                #edc6a7;
        }

        /* Tekst na dnu */

        html[data-login-theme="dark"]
        .portal-bottom {
            color: #a8b8cc;
        }

        /* ==================================
           12. MOBILE
        ================================== */

        @media (max-width: 760px) {

            .portal-finish-logo {
                width: 195px;
            }

            .portal-loader {
                font-size: 11px;
            }

            .portal-bottom {
                bottom: 22px;
                font-size: 8px;
            }
        }

        /* ==================================
           13. REDUCED MOTION
        ================================== */

        @media (prefers-reduced-motion: reduce) {

            body.portal-entering .login-page,
            body.portal-entering .login-left,
            body.portal-entering .login-right,
            .portal-light,
            .portal-core,
            .portal-finish,
            .portal-finish-content,
            .portal-spinner {
                animation: none !important;
            }

            .portal-light,
            .portal-finish,
            .portal-finish-content {
                opacity: 1;
            }
        }
    `;

    document.head.appendChild(style);
}

/* ==========================================
   START SMOOTH PORTAL TRANSITION
========================================== */

function startClientTransition() {

    if (isRedirecting) return;

    isRedirecting = true;

    if (loginButton) {
        loginButton.disabled = true;
    }

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
        window.location.replace("form.html");
        return;
    }

    installPortalStyles();

    const overlay = document.createElement("div");

    overlay.className = "ptech-portal-transition";

    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute(
        "aria-label",
        "Otvaranje PTech Digital portala"
    );

    overlay.innerHTML = `
        <div class="portal-light"></div>
        <div class="portal-core"></div>

        <div class="portal-finish">

            <div class="portal-finish-content">

                <img
                    src="assets/ptech-logo.png"
                    alt="PTech Digital"
                    class="portal-finish-logo"
                >

                <div class="portal-loader">

                    <span
                        class="portal-spinner"
                        aria-hidden="true"
                    ></span>

                    <span>
                        Otvaramo vaš portal...
                    </span>

                </div>

            </div>

            <div class="portal-bottom">
                PTECH DIGITAL · CLIENT PORTAL
            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    /*
       Dva animation framea zadrzavaju
       glatki pocetak animacije.
    */

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            document.body.classList.add(
                "portal-entering"
            );

        });

    });

    window.setTimeout(() => {

        window.location.replace("form.html");

    }, PORTAL_DURATION);
}

/* ==========================================
   SUPABASE LOGIN
========================================== */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            if (isRedirecting) return;

            clearLoginError();

            const email =
                emailInput?.value.trim() || "";

            const password =
                passwordInput?.value || "";

            if (!email || !password) {

                showLoginError(
                    "Unesite e-mail adresu i lozinku."
                );

                return;
            }

            setLoginLoading(true);

            try {

                const { data, error } =
                    await supabaseClient.auth
                        .signInWithPassword({
                            email,
                            password
                        });

                if (error || !data?.user) {

                    showLoginError(
                        "E-mail adresa ili lozinka nisu točni."
                    );

                    shakeLoginCard();
                    return;
                }

                const {
                    data: profile,
                    error: profileError
                } = await supabaseClient
                    .from("profiles")
                    .select("id, display_name, role")
                    .eq("id", data.user.id)
                    .maybeSingle();

                if (profileError) {

                    console.error(
                        "Profile error:",
                        profileError
                    );

                    showLoginError(
                        "Prijava je uspjela, ali profil nije moguće učitati."
                    );

                    return;
                }

                if (!profile) {

                    showLoginError(
                        "Korisnički profil nije pronađen."
                    );

                    return;
                }

                localStorage.setItem(
                    "user",
                    data.user.email || email
                );

                const role = String(
                    profile.role || "client"
                ).trim().toLowerCase();

                if (role === "admin") {

                    isRedirecting = true;

                    window.location.replace(
                        "admin.html"
                    );

                    return;
                }

                startClientTransition();

            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                showLoginError(
                    "Došlo je do pogreške pri povezivanju. Pokušajte ponovno."
                );

            } finally {

                if (!isRedirecting) {
                    setLoginLoading(false);
                }
            }
        }
    );
}

/* ==========================================
   SHOW / HIDE PASSWORD
========================================== */

if (togglePassword && passwordInput) {

    togglePassword.addEventListener(
        "click",
        function () {

            const visible =
                passwordInput.type === "password";

            passwordInput.type =
                visible ? "text" : "password";

            togglePassword.setAttribute(
                "aria-label",
                visible
                    ? "Sakrij lozinku"
                    : "Prikaži lozinku"
            );

            togglePassword.setAttribute(
                "aria-pressed",
                String(visible)
            );

            passwordInput.focus();
        }
    );
}

/* ==========================================
   CAPS LOCK
========================================== */

if (passwordInput && capsLockWarning) {

    function checkCapsLock(event) {

        const isOn = Boolean(
            event.getModifierState &&
            event.getModifierState("CapsLock")
        );

        capsLockWarning.classList.toggle(
            "show",
            isOn
        );

        capsLockWarning.hidden = !isOn;
    }

    passwordInput.addEventListener(
        "keydown",
        checkCapsLock
    );

    passwordInput.addEventListener(
        "keyup",
        checkCapsLock
    );

    passwordInput.addEventListener(
        "blur",
        function () {

            capsLockWarning.classList.remove("show");
            capsLockWarning.hidden = true;
        }
    );
}

/* ==========================================
   PARTICLES — SAME AS LOGIN V13
========================================== */

function createParticles() {

    const container =
        document.getElementById("particles");

    if (!container) return;

    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    container.replaceChildren();

    const count = 34;

    for (let i = 0; i < count; i++) {

        const particle =
            document.createElement("span");

        particle.className = "particle";

        const top =
            Math.random() * 96 + 2;

        const width =
            Math.random() * 65 + 30;

        const duration =
            Math.random() * 10 + 12;

        const delay =
            Math.random() * -22;

        const opacity =
            Math.random() * 0.35 + 0.3;

        particle.style.setProperty(
            "--particle-top",
            top + "%"
        );

        particle.style.setProperty(
            "--particle-width",
            width + "px"
        );

        particle.style.setProperty(
            "--particle-duration",
            duration + "s"
        );

        particle.style.setProperty(
            "--particle-delay",
            delay + "s"
        );

        particle.style.setProperty(
            "--particle-opacity",
            opacity
        );

        container.appendChild(particle);
    }
}

createParticles();

/* ==========================================
   PTECH SUPPORT BOT
========================================== */

const supportTrigger =
    document.getElementById("supportTrigger");

const supportPanel =
    document.getElementById("supportPanel");

const supportClose =
    document.getElementById("supportClose");

const supportMessages =
    document.getElementById("supportMessages");

const supportQuestionList =
    document.getElementById("supportQuestionList");

/* ==========================================
   SUPPORT QUESTIONS
========================================== */

const supportQuestions = [

    {
        question: "Kako se prijaviti?",

        answer:
            "Za prijavu unesite e-mail adresu i lozinku " +
            "koje vam je dodijelio PTech Digital. " +
            "Nakon uspješne prijave otvorit će se vaš portal."
    },

    {
        question: "Lozinka ili mail nisu točni",

        answer:
            "Provjerite jeste li ispravno upisali e-mail " +
            "adresu i lozinku. Obratite pozornost na " +
            "velika i mala slova te provjerite Caps Lock. " +
            "Ako prijava i dalje ne uspijeva, " +
            "kontaktirajte PTech Digital tim."
    },

    {
        question: "Nemam pristupne podatke",

        answer:
            "Pristupne podatke dodjeljuje PTech Digital. " +
            "Ako ih još niste dobili, javite se osobi " +
            "iz našeg tima s kojom ste dogovorili suradnju."
    }

];

/* ==========================================
   SUPPORT OPEN / CLOSE
========================================== */

function setSupportOpen(open) {

    if (!supportPanel || !supportTrigger) return;

    supportPanel.hidden = !open;

    supportTrigger.setAttribute(
        "aria-expanded",
        String(open)
    );
}

if (supportTrigger && supportPanel) {

    supportTrigger.addEventListener(
        "click",
        function () {

            setSupportOpen(
                supportPanel.hidden
            );

        }
    );
}

if (supportClose) {

    supportClose.addEventListener(
        "click",
        function () {

            setSupportOpen(false);

            supportTrigger?.focus();

        }
    );
}

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {
            setSupportOpen(false);
        }
    }
);

/* ==========================================
   SUPPORT MESSAGES
========================================== */

function addSupportMessage(text, type) {

    if (!supportMessages) return;

    const message =
        document.createElement("div");

    message.className =
        "support-message " + type;

    message.textContent = text;

    supportMessages.appendChild(message);

    supportMessages.scrollTop =
        supportMessages.scrollHeight;
}

/* ==========================================
   SUPPORT FAQ BUTTONS
========================================== */

function renderSupportQuestions() {

    if (!supportQuestionList) return;

    supportQuestionList.replaceChildren();

    supportQuestions.forEach(function (item) {

        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "support-question";
        button.textContent = item.question;

        button.addEventListener(
            "click",
            function () {

                addSupportMessage(
                    item.question,
                    "user"
                );

                addSupportMessage(
                    item.answer,
                    "bot"
                );

            }
        );

        supportQuestionList.appendChild(button);
    });
}

/* ==========================================
   INITIAL SUPPORT MESSAGE
========================================== */

if (supportMessages) {

    addSupportMessage(
        "Pozdrav! 👋 Dobro došli u PTech Digital podršku. " +
        "Odaberite jedno od ponuđenih pitanja i rado ćemo vam pomoći.",
        "bot"
    );
}

renderSupportQuestions();

/* ==========================================
   END — PTECH DIGITAL LOGIN V14
========================================== */


/* ==========================================
   REQUEST ACCESS - PTECH V3.3
   Public form; never sends invites or admin keys.
   Before deploying: paste your PUBLIC Turnstile SITE key below.
========================================== */
(() => {
  "use strict";
  const SITE_KEY = "PASTE_YOUR_TURNSTILE_SITE_KEY"; // PUBLIC, not SECRET
  const ENDPOINT = "https://agivwsbczzvvuzszcvxz.supabase.co/functions/v1/ptech-registration-request";
  const $ = id => document.getElementById(id);
  const open = $("openAccessRequest"), overlay = $("accessRequestOverlay");
  const close = $("closeAccessRequest"), form = $("accessRequestForm");
  const email = $("accessRequestEmail"), message = $("accessRequestMessage");
  const submit = $("submitAccessRequest");
  if (!open || !overlay || !form || !email || !close) return;
  let busy=false, widgetId=null, previousFocus=null, approved=false;
  function say(text,error=false){ message.textContent=text;message.dataset.error=String(error); }
  function openModal(){
    previousFocus=document.activeElement;
    overlay.hidden=false;document.body.classList.add('v33-access-open');
    email.value=$("email")?.value?.trim()||"";say("");approved=false;
    submit.disabled=false;submit.textContent="Pošalji zahtjev";email.focus();
    if (SITE_KEY.startsWith('PASTE_')) {
      say('Obrazac još nije aktiviran. Administrator mora postaviti Turnstile ključ.',true);submit.disabled=true;
      return;
    }
    if (window.turnstile && widgetId===null) {
      widgetId=window.turnstile.render('#accessTurnstileWidget',{sitekey:SITE_KEY,action:'request-access',theme:'auto'});
    }
    if (window.turnstile && widgetId!==null) window.turnstile.reset(widgetId);
  }
  function closeModal(){if(busy)return;overlay.hidden=true;document.body.classList.remove('v33-access-open');previousFocus?.focus?.();}
  open.addEventListener('click',openModal);
  close.addEventListener('click',closeModal);
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal();});
  overlay.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeModal();return;}
    if(e.key!=='Tab')return;
    const focusables=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')]
      .filter(el=>el.getClientRects().length);
    const first=focusables[0],last=focusables.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy||approved||!form.reportValidity())return;
    const token=window.turnstile&&widgetId!==null ? window.turnstile.getResponse(widgetId) : '';
    if(!token){say('Potvrdite sigurnosnu provjeru.',true);return;}
    busy=true;submit.disabled=true;submit.textContent='Slanje…';say('');
    try{
      const res=await fetch(ENDPOINT,{
        method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({email:email.value.trim(),turnstileToken:token})
      });
      if(!res.ok)throw new Error('Delivery failed');
      approved=true;say('Zahtjev je zaprimljen. Ako ga odobrimo, pozivnica će stići na vašu e-mail adresu.');
      submit.textContent='Zahtjev je zaprimljen';
    }catch(err){say('Zahtjev nije poslan. Provjerite vezu ili pokušajte kasnije.',true);
      submit.disabled=false;submit.textContent='Pošalji zahtjev';
      if(window.turnstile&&widgetId!==null)window.turnstile.reset(widgetId);
    }finally{busy=false;}
  });
})();
