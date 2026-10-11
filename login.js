
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

(function initLoginParticles() {

    const canvas =
        document.getElementById("loginParticles");

    if (!canvas) return;

    const ctx =
        canvas.getContext("2d");

    if (!ctx) return;


    /* ======================================
       POSTAVKE
    ====================================== */

    const PARTICLE_COUNT = 42;

    const reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    let particles = [];

    let width = 0;
    let height = 0;

    let animationId = null;

    let lastFrameTime = 0;


    /* ======================================
       NOVA ČESTICA
    ====================================== */

    function createParticle(randomX = true) {

        return {

            x: randomX
                ? Math.random() * width
                : -120 - Math.random() * 100,

            y: Math.random() * height,

            length:
                25 + Math.random() * 95,

            speed:
                12 + Math.random() * 30,

            opacity:
                0.12 + Math.random() * 0.2,

            thickness:
                0.5 + Math.random() * 0.8,

            glow:
                1 + Math.random() * 1.2

        };
    }


    /* ======================================
       RESIZE CANVAS
    ====================================== */

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
            dpr, 0,
            0, dpr,
            0, 0
        );

        particles = [];

        for (
            let i = 0;
            i < PARTICLE_COUNT;
            i++
        ) {
            particles.push(
                createParticle(true)
            );
        }

        drawParticles();
    }


    /* ======================================
       CRTANJE
    ====================================== */

    function drawParticles() {

        ctx.clearRect(
            0,
            0,
            width,
            height
        );

        for (const particle of particles) {

            const gradient =
                ctx.createLinearGradient(
                    particle.x - particle.length,
                    particle.y,
                    particle.x,
                    particle.y
                );

            gradient.addColorStop(
                0,
                "rgba(174, 116, 79, 0)"
            );

            gradient.addColorStop(
                0.65,
                `rgba(174, 116, 79, ${particle.opacity})`
            );

            gradient.addColorStop(
                1,
                `rgba(179, 117, 77, ${Math.min(
                    particle.opacity + 0.15,
                    0.55
                )})`
            );


            /* CRTICA */

            ctx.beginPath();

            ctx.moveTo(
                particle.x - particle.length,
                particle.y
            );

            ctx.lineTo(
                particle.x,
                particle.y
            );

            ctx.strokeStyle = gradient;

            ctx.lineWidth =
                particle.thickness;

            ctx.stroke();


            /* SJAJNA TOČKA */

            ctx.beginPath();

            ctx.arc(
                particle.x,
                particle.y,
                particle.glow,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                `rgba(185, 124, 86, ${Math.min(
                    particle.opacity + 0.1,
                    0.55
                )})`;

            ctx.fill();
        }
    }


    /* ======================================
       ANIMACIJA
    ====================================== */

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

            const particle =
                particles[i];

            particle.x +=
                particle.speed * delta;

            if (
                particle.x - particle.length > width
            ) {

                particles[i] =
                    createParticle(false);
            }
        }

        drawParticles();

        animationId =
            requestAnimationFrame(animate);
    }


    /* ======================================
       START / STOP
    ====================================== */

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

        if (!width || !height) {
            return;
        }

        if (reducedMotion.matches) {

            drawParticles();
            return;
        }

        if (document.hidden) {
            return;
        }

        animationId =
            requestAnimationFrame(animate);
    }


    /* ======================================
       DOGAĐAJI
    ====================================== */

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


    /* ======================================
       POKRETANJE
    ====================================== */

    resizeCanvas();
    startAnimation();

})();
