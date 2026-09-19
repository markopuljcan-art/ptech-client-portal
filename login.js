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
   LOGIN
========================= */

document
    .getElementById("loginForm")
    .addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const loginError =
                document.getElementById(
                    "loginError"
                );

            const loginButton =
                document.getElementById(
                    "loginButton"
                );

            const email =
                document
                    .getElementById("email")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("password")
                    .value;


            /* RESET ERRORA */

            loginError.textContent = "";

            loginError.classList.remove(
                "show"
            );


            /* BUTTON */

            loginButton.disabled = true;

            loginButton.textContent =
                "Prijava...";


            /* =========================
               LOGIN
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

                console.error(error);

                const loginCard =
                    document.querySelector(
                        ".big_bubble"
                    );


                loginError.textContent =
                    "Pogrešan e-mail ili lozinka.";

                loginError.classList.add(
                    "show"
                );


                if (loginCard) {

                    loginCard.classList.remove(
                        "shake"
                    );

                    void loginCard.offsetWidth;

                    loginCard.classList.add(
                        "shake"
                    );
                }


                loginButton.disabled =
                    false;

                loginButton.textContent =
                    "Prijavi se";

                return;
            }


            /* =========================
               LOGIN USPJEŠAN
            ========================= */

            localStorage.setItem(
                "user",
                email
            );


            /* =========================
               DOHVATI ROLE
            ========================= */

            const {
                data: profile,
                error: profileError
            } =
                await supabaseClient
                    .from("profiles")
                    .select(`
                        role,
                        display_name
                    `)
                    .eq(
                        "id",
                        data.user.id
                    )
                    .maybeSingle();


            if (profileError) {

                console.error(
                    "Greška kod provjere role:",
                    profileError
                );


                /*
                    Ako nešto ne uspije kod
                    role provjere, korisnika
                    šaljemo na client portal.
                */

                window.location.href =
                    "form.html";

                return;
            }


            /* =========================
               ROLE
            ========================= */

            const role =
                String(
                    profile?.role || "client"
                )
                    .trim()
                    .toLowerCase();


            /* =========================
               REDIRECT
            ========================= */

            if (role === "admin") {

                window.location.href =
                    "admin.html";

                return;
            }


            window.location.href =
                "form.html";
        }
    );


/* =========================
   THEME
========================= */

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

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

const togglePassword =
    document.getElementById(
        "togglePassword"
    );

const passwordInput =
    document.getElementById(
        "password"
    );


if (
    togglePassword &&
    passwordInput
) {

    togglePassword.addEventListener(
        "click",
        function () {

            const isHidden =
                passwordInput.type ===
                "password";


            passwordInput.type =
                isHidden
                    ? "text"
                    : "password";


            togglePassword.classList.toggle(
                "password-visible",
                isHidden
            );
        }
    );
}


/* =========================
   CAPS LOCK UPOZORENJE
========================= */

const capsLockWarning =
    document.getElementById(
        "capsLockWarning"
    );


if (
    passwordInput &&
    capsLockWarning
) {

    passwordInput.addEventListener(
        "keyup",
        function (event) {

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
