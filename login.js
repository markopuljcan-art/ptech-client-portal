
/* ==================================================
   PTECH DIGITAL CLIENT PORTAL
   LOGIN + SUPABASE + PARTICLES
================================================== */


/* ==========================================
   1. SUPABASE
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
   2. ELEMENTI
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


/* ==========================================
   3. LOGIN ERROR
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


/* ==========================================
   4. LOGIN BUTTON
========================================== */

function setLoginLoading(loading) {

    if (!loginButton) return;

    loginButton.disabled = loading;

    if (loading) {

        loginButton.innerHTML = `
            <span>Prijava...</span>
        `;

    } else {

        loginButton.innerHTML = `
            <span>Prijavi se</span>

            <svg
                class="login-arrow"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path d="M5 12h14"></path>
                <path d="m13 6 6 6-6 6"></path>
            </svg>
        `;
    }
}


/* ==========================================
   5. SHAKE ANIMACIJA
========================================== */

function shakeLoginCard() {

    const card =
        document.querySelector(".login-card");

    if (!card) return;

    card.classList.remove("shake");

    void card.offsetWidth;

    card.classList.add("shake");
}


/* ==========================================
   6. SUPABASE LOGIN
========================================== */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            clearLoginError();

            const email =
                emailInput?.value.trim() || "";

            const password =
                passwordInput?.value || "";

            if (!email || !password) {

                showLoginError(
                    "Unesi e-mail i lozinku."
                );

                shakeLoginCard();
                return;
            }

            setLoginLoading(true);

            try {

                /* PRIJAVA */

                const {
                    data,
                    error
                } = await supabaseClient.auth
                    .signInWithPassword({
                        email,
                        password
                    });


                if (error || !data?.user) {

                    showLoginError(
                        "Pogrešan e-mail ili lozinka."
                    );

                    shakeLoginCard();
                    return;
                }


                /* DOHVAT PROFILA */

                const {
                    data: profile,
                    error: profileError
                } = await supabaseClient
                    .from("profiles")
                    .select("id, display_name, role")
                    .eq("id", data.user.id)
                    .maybeSingle();


                if (profileError || !profile) {

                    showLoginError(
                        profileError
                            ? "Prijava je uspjela, ali profil nije moguće učitati."
                            : "Korisnički profil nije pronađen."
                    );

                    return;
                }


                /* SPREMI EMAIL */

                localStorage.setItem(
                    "user",
                    email
                );


                /* PROVJERA ULOGE */

                const role = String(
                    profile.role || "client"
                ).trim().toLowerCase();


                /* PREUSMJERAVANJE */

                window.location.href =
                    role === "admin"
                        ? "admin.html"
                        : "form.html";

            } catch (err) {

                console.error(
                    "Login error:",
                    err
                );

                showLoginError(
                    "Došlo je do pogreške pri povezivanju. Pokušajte ponovno."
                );

                shakeLoginCard();

            } finally {

                setLoginLoading(false);
            }
        }
    );
}


/* ==========================================
   7. PRIKAZ / SAKRIVANJE LOZINKE
========================================== */

if (togglePassword && passwordInput) {

    togglePassword.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

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

            togglePassword.setAttribute(
                "aria-pressed",
                String(showPassword)
            );

            passwordInput.focus();
        }
    );
}


/* ==========================================
   8. CAPS LOCK
========================================== */

if (passwordInput && capsLockWarning) {

    function checkCapsLock(event) {

        capsLockWarning.classList.toggle(
            "show",
            event.getModifierState("CapsLock")
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


/* ==================================================
   9. ANIMIRANE SVJETLEĆE CRTICE
================================================== */

/* ==================================================
   9. PTECH DIGITAL — PREMIUM LIGHT PARTICLES
   Izraženije brončane crtice + nježan sjaj
================================================== */

(function initLoginParticles() {

    const canvas = document.getElementById("loginParticles");

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const PARTICLE_COUNT = 55;

    let particles = [];
    let width = 0;
    let height = 0;
    let animationId = null;
    let lastFrameTime = 0;


    /* NOVA ČESTICA */

    function createParticle(randomPosition = true) {

        return {
            x: randomPosition
                ? Math.random() * width
                : -140 - Math.random() * 100,

            y: 20 + Math.random() * Math.max(1, height - 40),

            length: 30 + Math.random() * 105,

            speed: 16 + Math.random() * 34,

            opacity: 0.25 + Math.random() * 0.32,

            thickness: 0.7 + Math.random() * 0.9,

            radius: 0.8 + Math.random() * 1.3,

            phase: Math.random() * Math.PI * 2,

            pulseSpeed: 0.5 + Math.random() * 1.1,

            life: Math.random() * Math.PI * 2
        };
    }


    /* VELIČINA CANVASA */

    function resizeCanvas() {

        const rect = canvas.getBoundingClientRect();

        width = rect.width;
        height = rect.height;

        if (!width || !height) return;

        const dpr = Math.min(
            window.devicePixelRatio || 1,
            2
        );

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        particles = Array.from(
            { length: PARTICLE_COUNT },
            () => createParticle(true)
        );

        drawParticles(0);
    }


    /* CRTANJE ČESTICA */

    function drawParticles(time) {

        ctx.clearRect(0, 0, width, height);

        for (const particle of particles) {

            const pulse =
                0.75 +
                Math.sin(
                    time * particle.pulseSpeed +
                    particle.phase
                ) * 0.25;

            const edgeFade = Math.min(
                1,
                Math.max(0, particle.x / 110),
                Math.max(0, (width - particle.x) / 110)
            );

            const alpha =
                particle.opacity *
                pulse *
                edgeFade;

            if (alpha <= 0) continue;


            /* SJAJ ISPOD CRTICE */

            const glowGradient = ctx.createLinearGradient(
                particle.x - particle.length,
                particle.y,
                particle.x,
                particle.y
            );

            glowGradient.addColorStop(
                0,
                "rgba(190, 125, 82, 0)"
            );

            glowGradient.addColorStop(
                0.65,
                `rgba(207, 145, 103, ${alpha * 0.3})`
            );

            glowGradient.addColorStop(
                1,
                `rgba(207, 145, 103, ${alpha * 0.65})`
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

            ctx.strokeStyle = glowGradient;
            ctx.lineWidth = particle.thickness + 3;
            ctx.stroke();


            /* GLAVNA TANKA CRTICA */

            const lineGradient = ctx.createLinearGradient(
                particle.x - particle.length,
                particle.y,
                particle.x,
                particle.y
            );

            lineGradient.addColorStop(
                0,
                "rgba(166, 105, 67, 0)"
            );

            lineGradient.addColorStop(
                0.55,
                `rgba(183, 116, 74, ${alpha * 0.7})`
            );

            lineGradient.addColorStop(
                1,
                `rgba(160, 94, 54, ${alpha})`
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

            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = particle.thickness;
            ctx.stroke();


            /* SVJETLEĆA TOČKA NA VRHU */

            const dotGlow = ctx.createRadialGradient(
                particle.x,
                particle.y,
                0,
                particle.x,
                particle.y,
                particle.radius * 5
            );

            dotGlow.addColorStop(
                0,
                `rgba(194, 123, 77, ${alpha * 0.85})`
            );

            dotGlow.addColorStop(
                0.4,
                `rgba(217, 161, 121, ${alpha * 0.35})`
            );

            dotGlow.addColorStop(
                1,
                "rgba(217, 161, 121, 0)"
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


            /* MALA JASNA TOČKICA */

            ctx.beginPath();

            ctx.arc(
                particle.x,
                particle.y,
                particle.radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                `rgba(164, 98, 58, ${alpha})`;

            ctx.fill();
        }
    }


    /* ANIMACIJA */

    function animate(timestamp) {

        if (!lastFrameTime) {
            lastFrameTime = timestamp;
        }

        const delta = Math.min(
            (timestamp - lastFrameTime) / 1000,
            0.05
        );

        lastFrameTime = timestamp;

        const time = timestamp / 1000;

        for (let i = 0; i < particles.length; i++) {

            particles[i].x += particles[i].speed * delta;

            if (
                particles[i].x -
                particles[i].length > width
            ) {
                particles[i] = createParticle(false);
            }
        }

        drawParticles(time);

        animationId = requestAnimationFrame(animate);
    }


    /* START / STOP */

    function stopAnimation() {

        if (animationId !== null) {
            cancelAnimationFrame(animationId);
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

        animationId = requestAnimationFrame(animate);
    }


    /* DOGAĐAJI */

    window.addEventListener("resize", function () {
        resizeCanvas();
        startAnimation();
    });

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


    /* POKRETANJE */

    resizeCanvas();
    startAnimation();

})();
