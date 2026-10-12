
/* ==========================================
   PTECH DIGITAL CLIENT PORTAL
   LOGIN + CINEMATIC PORTAL TRANSITION
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
   PORTAL TRANSITION CONFIGURATION
========================================== */

/*
   Pozicija centra iz tvojeg screenshota.

   52.5% = malo desno od sredine
   50%   = sredina po visini

   Tu je bio plavi kruzic.
*/

const PORTAL_X = "52.5%";
const PORTAL_Y = "50%";

/*
   Ukupno trajanje animacije.
   Povecaj za sporiji prijelaz.
*/

const PORTAL_DURATION = 2800;

/* ==========================================
   PORTAL TRANSITION CSS
========================================== */

function installPortalStyles() {

    if (document.getElementById("ptech-portal-styles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "ptech-portal-styles";

    style.textContent = `

        /* ====================================
           PORTAL VARIABLES
        ==================================== */

        :root {
            --portal-x: ${PORTAL_X};
            --portal-y: ${PORTAL_Y};
        }

        /* ====================================
           LOCK PAGE
        ==================================== */

        body.portal-entering {
            overflow: hidden !important;
        }

        body.portal-entering .support-widget {
            pointer-events: none;
        }

        /* ====================================
           CAMERA ZOOM TOWARD CENTER
        ==================================== */

        body.portal-entering .login-page {
            transform-origin:
                var(--portal-x)
                var(--portal-y);

            animation:
                portalCameraDive
                1550ms
                cubic-bezier(.42, 0, .14, 1)
                both;

            pointer-events: none;
            will-change: transform, filter;
        }

        @keyframes portalCameraDive {

            0% {
                transform: scale(1);
                filter: blur(0);
            }

            20% {
                transform: scale(1.025);
                filter: blur(0);
            }

            48% {
                transform: scale(1.17);
                filter: blur(.2px);
            }

            75% {
                transform: scale(1.65);
                filter: blur(1.5px);
            }

            100% {
                transform: scale(2.8);
                filter: blur(5px);
            }
        }

        /* ====================================
           LEFT SIDE EXITS TO THE LEFT
        ==================================== */

        body.portal-entering .login-left {
            animation:
                portalLeftExit
                1420ms
                cubic-bezier(.36, 0, .18, 1)
                both;

            will-change: transform, opacity;
        }

        @keyframes portalLeftExit {

            0% {
                transform: translateX(0);
                opacity: 1;
            }

            26% {
                transform: translateX(-2vw);
                opacity: 1;
            }

            63% {
                transform: translateX(-11vw);
                opacity: .85;
            }

            100% {
                transform: translateX(-37vw);
                opacity: 0;
            }
        }

        /* ====================================
           RIGHT SIDE EXITS TO THE RIGHT
        ==================================== */

        body.portal-entering .login-right {
            animation:
                portalRightExit
                1420ms
                cubic-bezier(.36, 0, .18, 1)
                both;

            will-change: transform, opacity;
        }

        @keyframes portalRightExit {

            0% {
                transform: translateX(0);
                opacity: 1;
            }

            26% {
                transform: translateX(2vw);
                opacity: 1;
            }

            63% {
                transform: translateX(11vw);
                opacity: .85;
            }

            100% {
                transform: translateX(37vw);
                opacity: 0;
            }
        }

        /* ====================================
           TRANSITION LAYER
        ==================================== */

        .ptech-portal-transition {
            position: fixed;
            inset: 0;

            z-index: 99999;

            overflow: hidden;
            pointer-events: all;

            font-family: "Inter", sans-serif;
        }

        /* ====================================
           GROWING LIGHT FROM BLUE-MARKED POINT
        ==================================== */

        .portal-light {
            position: absolute;
            inset: 0;

            background:
                radial-gradient(
                    circle at
                    var(--portal-x)
                    var(--portal-y),

                    #ffffff 0%,
                    #fffdf9 38%,
                    #f9e9d8 75%,
                    #f0d2b7 100%
                );

            clip-path:
                circle(
                    0px at
                    var(--portal-x)
                    var(--portal-y)
                );

            animation:
                portalLightExpand
                1370ms
                cubic-bezier(.32, 0, .12, 1)
                270ms
                both;
        }

        @keyframes portalLightExpand {

            0% {
                clip-path:
                    circle(
                        0px at
                        var(--portal-x)
                        var(--portal-y)
                    );
            }

            26% {
                clip-path:
                    circle(
                        24px at
                        var(--portal-x)
                        var(--portal-y)
                    );
            }

            55% {
                clip-path:
                    circle(
                        145px at
                        var(--portal-x)
                        var(--portal-y)
                    );
            }

            100% {
                clip-path:
                    circle(
                        160vmax at
                        var(--portal-x)
                        var(--portal-y)
                    );
            }
        }

        /* ====================================
           GLOW AT THE ENTRY POINT
        ==================================== */

        .portal-core {
            position: absolute;

            left: var(--portal-x);
            top: var(--portal-y);

            width: 42px;
            height: 42px;

            margin-left: -21px;
            margin-top: -21px;

            border-radius: 50%;

            background: #fffaf0;

            box-shadow:
                0 0 18px 8px rgba(255,248,231,.7),
                0 0 60px 20px rgba(255,219,172,.42),
                0 0 120px 40px rgba(255,236,208,.3);

            opacity: 0;

            animation:
                portalCorePulse
                1120ms
                cubic-bezier(.3, 0, .15, 1)
                170ms
                both;

            pointer-events: none;
        }

        @keyframes portalCorePulse {

            0% {
                opacity: 0;
                transform: scale(.15);
            }

            25% {
                opacity: 1;
                transform: scale(.75);
            }

            55% {
                opacity: 1;
                transform: scale(2.3);
            }

            100% {
                opacity: 0;
                transform: scale(13);
            }
        }

        /* ====================================
           EXPANDING RING
        ==================================== */

        .portal-ring {
            position: absolute;

            left: var(--portal-x);
            top: var(--portal-y);

            width: 70px;
            height: 70px;

            margin-left: -35px;
            margin-top: -35px;

            border: 1px solid rgba(205,145,99,.5);
            border-radius: 50%;

            opacity: 0;

            animation:
                portalRingExpand
                1050ms
                ease-out
                220ms
                both;

            pointer-events: none;
        }

        @keyframes portalRingExpand {

            0% {
                opacity: 0;
                transform: scale(.2);
            }

            25% {
                opacity: .8;
            }

            100% {
                opacity: 0;
                transform: scale(9);
            }
        }

        /* ====================================
           FINAL LOADING SCREEN
        ==================================== */

        .portal-finish {
            position: absolute;
            inset: 0;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 25px;

            background:
                radial-gradient(
                    circle at 50% 45%,
                    #ffffff 0%,
                    #fffdf9 48%,
                    #f7e9dc 100%
                );

            opacity: 0;

            animation:
                portalFinishReveal
                550ms
                ease
                1250ms
                both;
        }

        @keyframes portalFinishReveal {

            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }

        /* ====================================
           LOGO CONTENT
        ==================================== */

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
                translateY(22px)
                scale(.85);

            animation:
                portalLogoAppear
                660ms
                cubic-bezier(.16, .85, .22, 1)
                1540ms
                both;
        }

        @keyframes portalLogoAppear {

            from {
                opacity: 0;
                transform:
                    translateY(22px)
                    scale(.85);
            }

            to {
                opacity: 1;
                transform:
                    translateY(0)
                    scale(1);
            }
        }

        /* ====================================
           FULL BRAND LOGO
        ==================================== */

        .portal-finish-logo {
            display: block;

            width: 225px;
            max-width: 75vw;
            height: auto;

            object-fit: contain;

            filter:
                drop-shadow(
                    0 10px 20px rgba(150,95,60,.12)
                );
        }

        /* ====================================
           LOADING INDICATOR
        ==================================== */

        .portal-loader {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;

            margin-top: 4px;

            color: #936c52;

            font-size: 12px;
            font-weight: 600;
        }

        .portal-spinner {
            width: 20px;
            height: 20px;

            border-radius: 50%;

            border: 2px solid rgba(168,104,62,.15);
            border-top-color: #ac744f;

            animation:
                portalSpin
                .7s
                linear
                infinite;
        }

        @keyframes portalSpin {

            to {
                transform: rotate(360deg);
            }
        }

        /* ====================================
           BOTTOM BRAND
        ==================================== */

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

        /* ====================================
           MOBILE
        ==================================== */

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

        /* ====================================
           REDUCED MOTION
        ==================================== */

        @media (prefers-reduced-motion: reduce) {

            body.portal-entering .login-page,
            body.portal-entering .login-left,
            body.portal-entering .login-right,
            .portal-light,
            .portal-core,
            .portal-ring,
            .portal-finish,
            .portal-finish-content {

                animation: none !important;
            }

            .portal-light,
            .portal-finish,
            .portal-finish-content {
                opacity: 1;
                transform: none;
                clip-path: none;
            }
        }
    `;

    document.head.appendChild(style);
}

/* ==========================================
   START CLIENT PORTAL TRANSITION
========================================== */

function startClientTransition() {

    if (isRedirecting) return;

    isRedirecting = true;

    if (loginButton) {
        loginButton.disabled = true;
    }

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
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

        <div class="portal-ring"></div>

        <div class="portal-finish">

            <div class="portal-finish-content">

                <img
                    src="assets/ptech-logo.png"
                    class="portal-finish-logo"
                    alt="PTech Digital"
                >

                <div class="portal-loader">

                    <span
                        class="portal-spinner"
                        aria-hidden="true"
                    ></span>

                    <span>Otvaramo vaš portal...</span>

                </div>

            </div>

            <div class="portal-bottom">
                PTECH DIGITAL · CLIENT PORTAL
            </div>

        </div>
    `;

    document.body.appendChild(overlay);

    /*
       Pokretanje u sljedecem frameu
       pomaze pregledniku da prijelaz
       bude ravnomjerniji.
    */

    requestAnimationFrame(() => {

        document.body.classList.add(
            "portal-entering"
        );

    });

    /* Redirect nakon animacije */

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

                /* AUTHENTICATION */

                const { data, error } =
                    await supabaseClient.auth.signInWithPassword({
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

                /* USER PROFILE */

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

                /* STORE USER */

                localStorage.setItem(
                    "user",
                    data.user.email || email
                );

                /* ROLE */

                const role = String(
                    profile.role || "client"
                ).trim().toLowerCase();

                /* ADMIN */

                if (role === "admin") {

                    isRedirecting = true;

                    window.location.replace(
                        "admin.html"
                    );

                    return;
                }

                /* CLIENT — PORTAL ANIMATION */

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
   CAPS LOCK WARNING
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
   PARTICLES
========================================== */

function createParticles() {

    const container =
        document.getElementById("particles");

    if (!container) return;

    if (window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches) {
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
            Math.random() * .35 + .3;

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
   FAQ QUESTIONS
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
   OPEN / CLOSE SUPPORT
========================================== */

function setSupportOpen(open) {

    if (!supportPanel || !supportTrigger) {
        return;
    }

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
   RENDER FAQ BUTTONS
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
