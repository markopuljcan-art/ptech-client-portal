/* ==========================================
   PTECH DIGITAL
   LOGIN + SUPPORT BOT
========================================== */


/* ==========================================
   SUPABASE
========================================== */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient =
    supabase.createClient(
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


/* ==========================================
   LOGIN
========================================== */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            clearLoginError();

            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;

            if (!email || !password) {

                showLoginError(
                    "Unesite e-mail adresu i lozinku."
                );

                return;
            }

            setLoginLoading(true);

            try {

                /* SUPABASE AUTH */

                const {
                    data,
                    error
                } =
                    await supabaseClient.auth.signInWithPassword({
                        email,
                        password
                    });

                if (error) {

                    console.error("Login error:", error);

                    showLoginError(
                        "E-mail adresa ili lozinka nisu točni."
                    );

                    shakeLoginCard();

                    return;
                }

                if (!data || !data.user) {

                    showLoginError(
                        "Prijava nije uspjela. Pokušajte ponovno."
                    );

                    return;
                }


                /* PROFILE */

                const {
                    data: profile,
                    error: profileError
                } =
                    await supabaseClient
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

                const role =
                    String(profile.role || "client")
                        .trim()
                        .toLowerCase();


                /* REDIRECT */

                if (role === "admin") {

                    window.location.href = "admin.html";

                    return;
                }

                window.location.href = "form.html";

            } catch (error) {

                console.error(
                    "Unexpected login error:",
                    error
                );

                showLoginError(
                    "Došlo je do pogreške pri povezivanju. Pokušajte ponovno."
                );

            } finally {

                setLoginLoading(false);

            }

        }
    );

}


/* ==========================================
   LOGIN HELPERS
========================================== */

function showLoginError(message) {

    if (!loginError) {
        return;
    }

    loginError.textContent = message;

    loginError.classList.add("show");
}


function clearLoginError() {

    if (!loginError) {
        return;
    }

    loginError.textContent = "";

    loginError.classList.remove("show");
}


function setLoginLoading(loading) {

    if (!loginButton) {
        return;
    }

    loginButton.disabled = loading;

    loginButton.textContent =
        loading ? "Prijava..." : "Prijavi se";
}


function shakeLoginCard() {

    if (!loginCard) {
        return;
    }

    loginCard.classList.remove("shake");

    void loginCard.offsetWidth;

    loginCard.classList.add("shake");
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

        }
    );

}


/* ==========================================
   PARTICLES
========================================== */

function createParticles() {

    const container =
        document.getElementById("particles");

    if (!container) {
        return;
    }

    if (
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

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
   QUESTIONS AND ANSWERS
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


if (supportTrigger) {

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

            supportTrigger.focus();

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

    if (!supportMessages) {
        return;
    }

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
   RENDER QUESTIONS
========================================== */

function renderSupportQuestions() {

    if (!supportQuestionList) {
        return;
    }

    supportQuestionList.innerHTML = "";

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
