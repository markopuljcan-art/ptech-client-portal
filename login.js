
/* ==========================================
   PTECH DIGITAL
   LOGIN + ANIMATED TRANSITION + SUPPORT
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

const loginForm =
    document.getElementById("loginForm");

const loginButton =
    document.getElementById("loginButton");

const loginError =
    document.getElementById("loginError");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

const capsLockWarning =
    document.getElementById("capsLockWarning");

const loginCard =
    document.querySelector(".login-card");

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
   ANIMATED LOGIN TRANSITION
========================================== */

function installTransitionStyles() {

    if (document.getElementById("ptech-transition-styles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "ptech-transition-styles";

    style.textContent = `

        /* ZOOM POSTOJECE LOGIN STRANICE */

        body.ptech-exiting .login-page {
            transform-origin: 50% 50%;

            animation:
                ptechPageZoom
                850ms
                cubic-bezier(.22,.65,.25,1)
                forwards;

            pointer-events: none;
        }

        @keyframes ptechPageZoom {
            0% {
                transform: scale(1);
                filter: blur(0);
                opacity: 1;
            }

            55% {
                transform: scale(1.09);
                filter: blur(2px);
                opacity: .72;
            }

            100% {
                transform: scale(1.22);
                filter: blur(9px);
                opacity: 0;
            }
        }

        /* POZADINA PRIJELAZA */

        .ptech-transition {
            position: fixed;
            inset: 0;
            z-index: 99999;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 24px;

            background:
                radial-gradient(
                    circle at 50% 48%,
                    #ffffff 0%,
                    #fffaf5 48%,
                    #f1dfd0 100%
                );

            opacity: 0;

            animation:
                ptechOverlayFade
                750ms
                ease
                240ms
                forwards;

            pointer-events: all;
        }

        @keyframes ptechOverlayFade {
            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }

        /* DEKORATIVNI KRUG U POZADINI */

        .ptech-transition::before {
            content: "";

            position: absolute;

            width: min(620px, 92vw);
            height: min(620px, 92vw);

            border: 1px solid rgba(180, 117, 76, .13);
            border-radius: 50%;

            box-shadow:
                0 0 0 35px rgba(185, 125, 88, .035),
                0 0 0 80px rgba(185, 125, 88, .02);

            pointer-events: none;
        }

        /* SADRZAJ UCITAVANJA */

        .ptech-transition-content {
            position: relative;
            z-index: 2;

            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            width: 100%;
            max-width: 380px;

            text-align: center;

            opacity: 0;
            transform: translateY(20px) scale(.88);

            animation:
                ptechLogoReveal
                650ms
                cubic-bezier(.18,.75,.24,1)
                550ms
                forwards;
        }

        @keyframes ptechLogoReveal {
            from {
                opacity: 0;
                transform: translateY(20px) scale(.88);
            }

            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* PUNI PTECH DIGITAL LOGO */

        .ptech-transition-logo {
            display: block;

            width: 245px;
            max-width: 72vw;
            height: auto;

            object-fit: contain;

            filter:
                drop-shadow(
                    0 12px 25px rgba(156, 101, 65, .12)
                );
        }

        /* LOADER */

        .ptech-transition-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;

            margin-top: 5px;

            color: #86634e;

            font-family: "Inter", sans-serif;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: .15px;
        }

        .ptech-transition-spinner {
            display: block;

            width: 21px;
            height: 21px;

            border-radius: 50%;

            border: 2px solid rgba(174, 112, 72, .18);
            border-top-color: #ae7048;

            animation:
                ptechSpinner 750ms linear infinite;
        }

        @keyframes ptechSpinner {
            to {
                transform: rotate(360deg);
            }
        }

        /* DONJI NATPIS */

        .ptech-transition-footer {
            position: absolute;

            bottom: 34px;
            left: 0;
            right: 0;

            color: #b19b8b;

            text-align: center;

            font-family: "Inter", sans-serif;
            font-size: 9px;
            font-weight: 700;

            letter-spacing: 2px;
        }

        /* MOBITEL */

        @media (max-width: 600px) {
            .ptech-transition-logo {
                width: 200px;
            }

            .ptech-transition-loading {
                font-size: 11px;
            }

            .ptech-transition-footer {
                bottom: 24px;
                font-size: 8px;
                letter-spacing: 1.4px;
            }
        }

        /* PRISTUPACNOST */

        @media (prefers-reduced-motion: reduce) {
            body.ptech-exiting .login-page,
            .ptech-transition,
            .ptech-transition-content,
            .ptech-transition-spinner {
                animation: none !important;
            }

            .ptech-transition,
            .ptech-transition-content {
                opacity: 1;
                transform: none;
            }
        }
    `;

    document.head.appendChild(style);
}


/* ==========================================
   SHOW TRANSITION AND REDIRECT
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

    /* Bez animacije za korisnike koji to preferiraju */

    if (reducedMotion) {
        window.location.replace("form.html");
        return;
    }

    installTransitionStyles();

    const overlay = document.createElement("div");

    overlay.className = "ptech-transition";

    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-label", "Otvaranje portala");

    overlay.innerHTML = `
        <div class="ptech-transition-content">

            <img
                src="assets/ptech-logo.png"
                alt="PTech Digital"
                class="ptech-transition-logo"
            >

            <div class="ptech-transition-loading">

                <span
                    class="ptech-transition-spinner"
                    aria-hidden="true"
                ></span>

                <span>Otvaramo vaš portal...</span>

            </div>

        </div>

        <div class="ptech-transition-footer">
            PTECH DIGITAL · CLIENT PORTAL
        </div>
    `;

    document.body.appendChild(overlay);

    document.body.classList.add("ptech-exiting");

    /* Dovoljno vremena za zoom + logo + loading */

    window.setTimeout(function () {
        window.location.replace("form.html");
    }, 2200);
}


/* ==========================================
   LOGIN FORM
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

                /* SUPABASE AUTH */

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

                /* PROFILE */

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

                /* USER DATA */

                localStorage.setItem(
                    "user",
                    data.user.email || email
                );

                /* ROLE */

                const role = String(
                    profile.role || "client"
                ).trim().toLowerCase();

                /* ADMIN - POSTOJECI REDIRECT */

                if (role === "admin") {
                    isRedirecting = true;
                    window.location.replace("admin.html");
                    return;
                }

                /* CLIENT - NOVA ANIMACIJA */

                startClientTransition();

            } catch (error) {

                console.error(
                    "Unexpected login error:",
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

            const isHidden =
                passwordInput.type === "password";

            passwordInput.type =
                isHidden ? "text" : "password";

            togglePassword.setAttribute(
                "aria-label",
                isHidden
                    ? "Sakrij lozinku"
                    : "Prikaži lozinku"
            );

            togglePassword.setAttribute(
                "aria-pressed",
                String(isHidden)
            );

            passwordInput.focus();

        }
    );
}


/* ==========================================
   CAPS LOCK
========================================== */

if (passwordInput && capsLockWarning) {

    function updateCapsLock(event) {

        const isOn =
            event.getModifierState &&
            event.getModifierState("CapsLock");

        capsLockWarning.classList.toggle(
            "show",
            Boolean(isOn)
        );

        capsLockWarning.hidden = !isOn;
    }

    passwordInput.addEventListener(
        "keydown",
        updateCapsLock
    );

    passwordInput.addEventListener(
        "keyup",
        updateCapsLock
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

    /* Sprjecava duplo stvaranje */

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
            setSupportOpen(supportPanel.hidden);
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
   SUPPORT QUESTIONS RENDER
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
   INITIAL BOT MESSAGE
========================================== */

if (supportMessages) {

    addSupportMessage(
        "Pozdrav! 👋 Dobro došli u PTech Digital podršku. " +
        "Odaberite jedno od ponuđenih pitanja i rado ćemo vam pomoći.",
        "bot"
    );

}

renderSupportQuestions();
