const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================
   ELEMENTI
========================= */

const loginForm =
    document.getElementById(
        "loginForm"
    );

const loginButton =
    document.getElementById(
        "loginButton"
    );

const loginError =
    document.getElementById(
        "loginError"
    );

const emailInput =
    document.getElementById(
        "email"
    );

const passwordInput =
    document.getElementById(
        "password"
    );

const togglePassword =
    document.getElementById(
        "togglePassword"
    );

const capsLockWarning =
    document.getElementById(
        "capsLockWarning"
    );

const themeToggle =
    document.getElementById(
        "themeToggle"
    );


/* =========================
   LOGIN
========================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            /* RESET ERROR */

            if (loginError) {

                loginError.textContent =
                    "";

                loginError.classList.remove(
                    "show"
                );
            }


            /* BUTTON */

            if (loginButton) {

                loginButton.disabled =
                    true;

                loginButton.textContent =
                    "Prijava...";
            }


            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            /* =========================
               VALIDACIJA
            ========================= */

            if (
                !email ||
                !password
            ) {

                showLoginError(
                    "Unesi e-mail i lozinku."
                );

                resetLoginButton();

                return;
            }


            /* =========================
               SUPABASE LOGIN
            ========================= */

            const {
                data,
                error
            } =
                await supabaseClient
                    .auth
                    .signInWithPassword({
                        email: email,
                        password: password
                    });


            /* =========================
               LOGIN ERROR
            ========================= */

            if (error) {

                console.error(
                    "Login error:",
                    error
                );


                showLoginError(
                    "Pogrešan e-mail ili lozinka."
                );


                shakeLoginCard();

                resetLoginButton();

                return;
            }


            /* =========================
               USER PROVJERA
            ========================= */

            if (
                !data ||
                !data.user
            ) {

                showLoginError(
                    "Prijava nije uspjela."
                );

                resetLoginButton();

                return;
            }


            /* =========================
               SPREMI USER
            ========================= */

            localStorage.setItem(
                "user",
                email
            );


            /* =========================
               DOHVATI PROFIL
            ========================= */

            const {
                data: profile,
                error: profileError
            } =
                await supabaseClient
                    .from("profiles")
                    .select(`
                        id,
                        display_name,
                        role
                    `)
                    .eq(
                        "id",
                        data.user.id
                    )
                    .maybeSingle();


            console.log(
                "LOGIN USER:",
                data.user.id
            );

            console.log(
                "PROFILE:",
                profile
            );

            console.log(
                "PROFILE ERROR:",
                profileError
            );


            /* =========================
               PROFILE ERROR
            ========================= */

            if (profileError) {

                console.error(
                    "Greška kod dohvaćanja profila:",
                    profileError
                );


                showLoginError(
                    "Prijava je uspjela, ali profil nije moguće učitati."
                );

                resetLoginButton();

                return;
            }


            if (!profile) {

                showLoginError(
                    "Korisnički profil nije pronađen."
                );

                resetLoginButton();

                return;
            }


            /* =========================
               ROLE
            ========================= */

            const role =
                String(
                    profile.role || "client"
                )
                    .trim()
                    .toLowerCase();


            console.log(
                "ROLE:",
                role
            );


            /* =========================
               REDIRECT
            ========================= */

            if (
                role === "admin"
            ) {

                window.location.href =
                    "admin.html";

                return;
            }


            window.location.href =
                "form.html";
        }
    );
}


/* =========================
   LOGIN ERROR
========================= */

function showLoginError(
    message
) {

    if (!loginError) {
        return;
    }


    loginError.textContent =
        message;

    loginError.classList.add(
        "show"
    );
}


/* =========================
   RESET BUTTON
========================= */

function resetLoginButton() {

    if (!loginButton) {
        return;
    }


    loginButton.disabled =
        false;

    loginButton.textContent =
        "Prijavi se";
}


/* =========================
   SHAKE
========================= */

function shakeLoginCard() {

    const loginCard =
        document.querySelector(
            ".big_bubble"
        );


    if (!loginCard) {
        return;
    }


    loginCard.classList.remove(
        "shake"
    );


    void loginCard.offsetWidth;


    loginCard.classList.add(
        "shake"
    );
}


/* =========================
   THEME
========================= */

const savedTheme =
    localStorage.getItem(
        "theme"
    );


if (
    savedTheme === "light"
) {

    document.body.classList.add(
        "light-mode"
    );


    if (themeToggle) {

        themeToggle.checked =
            true;
    }
}


if (themeToggle) {

    themeToggle.addEventListener(
        "change",
        function () {

            if (
                themeToggle.checked
            ) {

                document.body.classList.add(
                    "light-mode"
                );

                localStorage.setItem(
                    "theme",
                    "light"
                );

            }

            else {

                document.body.classList.remove(
                    "light-mode"
                );

                localStorage.setItem(
                    "theme",
                    "dark"
                );
            }
        }
    );
}


/* =========================
   SHOW / HIDE PASSWORD
========================= */

if (
    togglePassword &&
    passwordInput
) {

    togglePassword.addEventListener(
        "click",
        function (event) {

            event.preventDefault();


            const isPassword =
                passwordInput.type ===
                "password";


            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";


            togglePassword.classList.toggle(
                "password-visible",
                isPassword
            );


            togglePassword.setAttribute(
                "aria-label",
                isPassword
                    ? "Sakrij lozinku"
                    : "Prikaži lozinku"
            );


            passwordInput.focus();
        }
    );
}


/* =========================
   CAPS LOCK
========================= */

if (
    passwordInput &&
    capsLockWarning
) {

    function checkCapsLock(event) {

        const capsLockOn =
            event.getModifierState(
                "CapsLock"
            );


        if (capsLockOn) {

            capsLockWarning.classList.add(
                "show"
            );

        }

        else {

            capsLockWarning.classList.remove(
                "show"
            );
        }
    }


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
