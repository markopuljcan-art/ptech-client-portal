
/* ==========================================
   PTECH DIGITAL — LOGIN
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
   ELEMENTI
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

const themeToggle =
    document.getElementById("themeToggle");


/* ==========================================
   PORUKE O POGREŠCI
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
   GUMB ZA PRIJAVU
========================================== */

function resetLoginButton() {
    if (!loginButton) return;

    loginButton.disabled = false;

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


/* ==========================================
   ANIMACIJA POGREŠKE
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
   SUPABASE PRIJAVA
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
                return;
            }

            if (loginButton) {
                loginButton.disabled = true;
                loginButton.textContent = "Prijava...";
            }

            try {

                const { data, error } =
                    await supabaseClient.auth
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


                /* REDIRECT PREMA ULOZI */

                const role = String(
                    profile.role || "client"
                ).trim().toLowerCase();

                window.location.href =
                    role === "admin"
                        ? "admin.html"
                        : "form.html";

            } catch (err) {

                console.error(
                    "Greška prijave:",
                    err
                );

                showLoginError(
                    "Došlo je do pogreške pri povezivanju. Pokušajte ponovno."
                );

            } finally {

                resetLoginButton();

            }
        }
    );
}


/* ==========================================
   TAMNA / SVIJETLA TEMA
========================================== */

const savedTheme =
    localStorage.getItem("theme");

if (savedTheme === "light") {

    document.body.classList.add(
        "light-mode"
    );

    if (themeToggle) {
        themeToggle.checked = true;
    }
}

if (themeToggle) {

    themeToggle.addEventListener(
        "change",
        function () {

            const light =
                themeToggle.checked;

            document.body.classList.toggle(
                "light-mode",
                light
            );

            localStorage.setItem(
                "theme",
                light ? "light" : "dark"
            );
        }
    );
}


/* ==========================================
   PRIKAZ / SAKRIVANJE LOZINKE
========================================== */

if (togglePassword && passwordInput) {

    togglePassword.addEventListener(
        "click",
        function () {

            const visible =
                passwordInput.type === "password";

            passwordInput.type =
                visible ? "text" : "password";

            togglePassword.classList.toggle(
                "password-visible",
                visible
            );

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

    const checkCapsLock = function (event) {

        capsLockWarning.classList.toggle(
            "show",
            event.getModifierState("CapsLock")
        );
    };

    passwordInput.addEventListener(
        "keyup",
        checkCapsLock
    );

    passwordInput.addEventListener(
        "keydown",
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
