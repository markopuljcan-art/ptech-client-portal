
/* ==========================================================
   PTECH DIGITAL — LOGIN JAVASCRIPT
   SUPABASE + PARTICLES + SUPPORT ASSISTANT
========================================================== */


/* ==========================================================
   1. SUPABASE
========================================================== */

const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* ==========================================================
   2. ELEMENTI
========================================================== */

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


/* ==========================================================
   3. POMOĆNE FUNKCIJE
========================================================== */

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


function setLoginLoading(isLoading) {

    if (!loginButton) return;

    loginButton.disabled = isLoading;

    const label = loginButton.querySelector("span");

    if (label) {
        label.textContent = isLoading
            ? "Prijava..."
            : "Prijavi se";
    }
}


function shakeLoginCard() {

    const card =
        document.querySelector(".login-card");

    if (!card) return;

    card.classList.remove("shake");

    void card.offsetWidth;

    card.classList.add("shake");
}


/* ==========================================================
   4. LOGIN
========================================================== */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            clearLoginError();

            const email = emailInput
                ? emailInput.value.trim()
                : "";

            const password = passwordInput
                ? passwordInput.value
                : "";

            if (!email || !password) {

                showLoginError(
                    "Unesite e-mail adresu i lozinku."
                );

                return;
            }

            setLoginLoading(true);

            try {

                /* SUPABASE PRIJAVA */

                const {
                    data,
                    error
                } = await supabaseClient.auth
                    .signInWithPassword({
                        email,
                        password
                    });

                if (error) {

                    console.error(
                        "Greška prijave:",
                        error
                    );

                    showLoginError(
                        "Pogrešan e-mail ili lozinka."
                    );

                    shakeLoginCard();

                    return;
                }

                if (!data || !data.user) {

                    showLoginError(
                        "Prijava nije uspjela."
                    );

                    return;
                }


                /* PROFIL KORISNIKA */

                const {
                    data: profile,
                    error: profileError
                } = await supabaseClient
                    .from("profiles")
                    .select(
                        "id, display_name, role"
                    )
                    .eq("id", data.user.id)
                    .maybeSingle();


                if (profileError) {

                    console.error(
                        "Greška profila:",
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


                /* SPREMI KORISNIKA */

                localStorage.setItem(
                    "user",
                    data.user.email || email
                );


                /* PREUSMJERAVANJE */

                const role = String(
                    profile.role || "client"
                )
                    .trim()
                    .toLowerCase();

                if (role === "admin") {

                    window.location.href =
                        "admin.html";

                    return;
                }

                window.location.href =
                    "form.html";

            } catch (error) {

                console.error(
                    "Neočekivana greška:",
                    error
                );

                showLoginError(
                    "Došlo je do problema s povezivanjem. Pokušajte ponovno."
                );

            } finally {

                setLoginLoading(false);
            }
        }
    );
}


/* ==========================================================
   5. PRIKAZ / SAKRIVANJE LOZINKE
========================================================== */

if (togglePassword && passwordInput) {

    togglePassword.addEventListener(
        "click",
        function () {

            const showPassword =
                passwordInput.type === "password";

            passwordInput.type =
                showPassword
                    ? "text"
                    : "password";

            togglePassword.classList.toggle(
                "password-visible",
                showPassword
            );

            togglePassword.setAttribute(
                "aria-label",
                showPassword
                    ? "Sakrij lozinku"
                    : "Prikaži lozinku"
            );

            passwordInput.focus();
        }
    );
}


/* ==========================================================
   6. CAPS LOCK
========================================================== */

if (passwordInput && capsLockWarning) {

    function checkCapsLock(event) {

        const isOn =
            event.getModifierState("CapsLock");

        capsLockWarning.classList.toggle(
            "show",
            isOn
        );
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

            capsLockWarning.classList.remove(
                "show"
            );
        }
    );
}


/* ==========================================================
   7. ANIMIRANI PARTICLESI
========================================================== */

(function initParticles() {

    const canvas =
        document.getElementById("loginParticles");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const PARTICLE_COUNT = 52;

    let particles = [];
    let width = 0;
    let height = 0;
    let animationId = null;
    let lastFrameTime = 0;


    function createParticle(randomPosition = true) {

        return {

            x: randomPosition
                ? Math.random() * width
                : -140 - Math.random() * 100,

            y: 20 +
                Math.random() *
                Math.max(1, height - 40),

            length:
                30 + Math.random() * 105,

            speed:
                16 + Math.random() * 34,

            opacity:
                0.25 + Math.random() * 0.32,

            thickness:
                0.7 + Math.random() * 0.9,

            radius:
                0.8 + Math.random() * 1.3,

            phase:
                Math.random() * Math.PI * 2,

            pulseSpeed:
                0.5 + Math.random() * 1.1

        };
    }


    function resizeCanvas() {

        const rect =
            canvas.getBoundingClientRect();

        width = rect.width;
        height = rect.height;

        if (!width || !height) return;

        const dpr = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        canvas.width =
            Math.round(width * dpr);

        canvas.height =
            Math.round(height * dpr);

        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

        particles = Array.from(
            { length: PARTICLE_COUNT },
            () => createParticle(true)
        );

        drawParticles(0);
    }


    function drawParticles(time) {

        ctx.clearRect(
            0,
            0,
            width,
            height
        );

        for (const particle of particles) {

            const pulse =
                0.75 +
                Math.sin(
                    time * particle.pulseSpeed +
                    particle.phase
                ) * 0.25;

            const edgeFade = Math.min(
                1,
                Math.max(
                    0,
                    particle.x / 110
                ),
                Math.max(
                    0,
                    (width - particle.x) / 110
                )
            );

            const alpha =
                particle.opacity *
                pulse *
                edgeFade;

            if (alpha <= 0) continue;


            /* SVIJETLEĆI TRAG */

            const glow =
                ctx.createLinearGradient(
                    particle.x - particle.length,
                    particle.y,
                    particle.x,
                    particle.y
                );

            glow.addColorStop(
                0,
                "rgba(190, 125, 82, 0)"
            );

            glow.addColorStop(
                0.65,
                `rgba(207,145,103,${alpha * 0.3})`
            );

            glow.addColorStop(
                1,
                `rgba(207,145,103,${alpha * 0.65})`
            );

            ctx.beginPath();

            ctx.moveTo(
                particle.x - particle.length,
                particle.y
            );

            ctx.lineTo(
                particle.x,
                particle.y
            );

            ctx.strokeStyle = glow;

            ctx.lineWidth =
                particle.thickness + 3;

            ctx.stroke();


            /* GLAVNA CRTICA */

            const line =
                ctx.createLinearGradient(
                    particle.x - particle.length,
                    particle.y,
                    particle.x,
                    particle.y
                );

            line.addColorStop(
                0,
                "rgba(166,105,67,0)"
            );

            line.addColorStop(
                0.55,
                `rgba(183,116,74,${alpha * 0.7})`
            );

            line.addColorStop(
                1,
                `rgba(160,94,54,${alpha})`
            );

            ctx.beginPath();

            ctx.moveTo(
                particle.x - particle.length,
                particle.y
            );

            ctx.lineTo(
                particle.x,
                particle.y
            );

            ctx.strokeStyle = line;

            ctx.lineWidth =
                particle.thickness;

            ctx.stroke();


            /* TOČKICA NA VRHU */

            const dotGlow =
                ctx.createRadialGradient(
                    particle.x,
                    particle.y,
                    0,
                    particle.x,
                    particle.y,
                    particle.radius * 5
                );

            dotGlow.addColorStop(
                0,
                `rgba(194,123,77,${alpha * 0.85})`
            );

            dotGlow.addColorStop(
                0.4,
                `rgba(217,161,121,${alpha * 0.35})`
            );

            dotGlow.addColorStop(
                1,
                "rgba(217,161,121,0)"
            );

            ctx.beginPath();

            ctx.arc(
                particle.x,
                particle.y,
                particle.radius * 5,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = dotGlow;
            ctx.fill();


            ctx.beginPath();

            ctx.arc(
                particle.x,
                particle.y,
                particle.radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                `rgba(164,98,58,${alpha})`;

            ctx.fill();
        }
    }


    function animate(timestamp) {

        if (!lastFrameTime) {
            lastFrameTime = timestamp;
        }

        const delta = Math.min(
            (timestamp - lastFrameTime) / 1000,
            0.05
        );

        lastFrameTime = timestamp;

        for (
            let i = 0;
            i < particles.length;
            i++
        ) {

            particles[i].x +=
                particles[i].speed * delta;

            if (
                particles[i].x -
                particles[i].length > width
            ) {

                particles[i] =
                    createParticle(false);
            }
        }

        drawParticles(timestamp / 1000);

        animationId =
            requestAnimationFrame(animate);
    }


    function stopAnimation() {

        if (animationId !== null) {

            cancelAnimationFrame(
                animationId
            );

            animationId = null;
        }
    }


    function startAnimation() {

        stopAnimation();

        lastFrameTime = 0;

        if (!width || !height) return;

        if (reducedMotion.matches) {

            drawParticles(0);

            return;
        }

        if (document.hidden) return;

        animationId =
            requestAnimationFrame(animate);
    }


    window.addEventListener(
        "resize",
        function () {

            resizeCanvas();
            startAnimation();
        }
    );

    document.addEventListener(
        "visibilitychange",
        startAnimation
    );

    if (reducedMotion.addEventListener) {

        reducedMotion.addEventListener(
            "change",
            startAnimation
        );
    }

    resizeCanvas();
    startAnimation();

})();


/* ==========================================================
   8. PTECH AUTOMATSKI ASISTENT
========================================================== */

(function initSupportAssistant() {

    const toggle =
        document.getElementById("supportToggle");

    const panel =
        document.getElementById("supportPanel");

    const closeButton =
        document.getElementById("supportClose");

    const messages =
        document.getElementById("supportMessages");

    const questionList =
        document.getElementById("supportQuestionList");


    if (
        !toggle ||
        !panel ||
        !closeButton ||
        !messages ||
        !questionList
    ) {
        return;
    }


    /* PITANJA I ODGOVORI */

    const questions = [

    {
        question: "Kako se prijaviti?",

        answer:
            "Za prijavu unesite e-mail adresu i lozinku " +
            "koje vam je dodijelio PTech Digital. " +
            "Nakon uspješne prijave automatski ćete " +
            "biti preusmjereni u svoj korisnički portal."
    },

    {
        question: "Lozinka ili mail nisu točni",

        answer:
            "Provjerite jeste li ispravno upisali " +
            "e-mail adresu i lozinku. Obratite pozornost " +
            "na velika i mala slova te provjerite " +
            "je li uključen Caps Lock. " +
            "Ako prijava i dalje ne uspijeva, " +
            "obratite se PTech Digital timu."
    },

    {
        question: "Nemam pristupne podatke",

        answer:
            "Pristupne podatke za portal dodjeljuje " +
            "PTech Digital nakon dogovorene suradnje. " +
            "Ako ih još niste dobili, obratite se " +
            "osobi iz PTech Digital tima s kojom " +
            "ste dogovorili projekt."
    }

];


    /* DODAVANJE PORUKE */

    function addMessage(text, sender) {

        const message =
            document.createElement("div");

        message.className =
            `support-message ${sender}`;

        message.textContent = text;

        messages.appendChild(message);

        messages.scrollTop =
            messages.scrollHeight;
    }


    /* PRIKAZ PITANJA */

    questions.forEach(function (item) {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "support-question";

        button.textContent =
            item.question;

        button.addEventListener(
            "click",
            function () {

                addMessage(
                    item.question,
                    "user"
                );

                addMessage(
                    item.answer,
                    "bot"
                );
            }
        );

        questionList.appendChild(button);
    });


    /* OTVARANJE */

    function openSupport() {

        panel.hidden = false;

        toggle.setAttribute(
            "aria-expanded",
            "true"
        );

        if (!messages.children.length) {

            addMessage(
                "Pozdrav! 👋 Dobro došli u PTech Digital podršku. Odaberite pitanje ispod i rado ćemo vam pomoći.",
                "bot"
            );
        }

        closeButton.focus();
    }


    /* ZATVARANJE */

    function closeSupport() {

        panel.hidden = true;

        toggle.setAttribute(
            "aria-expanded",
            "false"
        );

        toggle.focus();
    }


    /* DOGAĐAJI */

    toggle.addEventListener(
        "click",
        function () {

            if (panel.hidden) {

                openSupport();

            } else {

                closeSupport();
            }
        }
    );


    closeButton.addEventListener(
        "click",
        closeSupport
    );


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                !panel.hidden
            ) {

                closeSupport();
            }
        }
    );

})();
