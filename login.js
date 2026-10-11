
/* ==========================================
   PTECH DIGITAL — LOGIN.JS
   SUPABASE AUTH + LIGHT THEME
========================================== */


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

const themeToggle =
    document.getElementById("themeToggle");


/* ==========================================
   3. PRIKAZ POGREŠKE
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


/* ==========================================
   4. GUMB ZA PRIJAVU
========================================== */

function setLoginLoading(loading) {

    if (!loginButton) {
        return;
    }

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
   5. ANIMACIJA POGREŠNE PRIJAVE
========================================== */

function shakeLoginCard() {

    const loginCard =
        document.querySelector(".login-card");

    if (!loginCard) {
        return;
    }

    loginCard.classList.remove("shake");

    void loginCard.offsetWidth;

    loginCard.classList.add("shake");
}


/* ==========================================
   6. PRIJAVA KORISNIKA
========================================== */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            clearLoginError();

            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";


            /* VALIDACIJA */

            if (!email || !password) {

                showLoginError(
                    "Unesi e-mail i lozinku."
                );

                shakeLoginCard();

                return;
            }


            /* BLOKIRAJ GUMB */

            setLoginLoading(true);


            try {

                /* SUPABASE LOGIN */

                const {
                    data,
                    error
                } = await supabaseClient.auth
                    .signInWithPassword({
                        email: email,
                        password: password
                    });


                /* POGREŠNI PODACI */

                if (error) {

                    console.error(
                        "Login error:",
                        error
                    );

                    showLoginError(
                        "Pogrešan e-mail ili lozinka."
                    );

                    shakeLoginCard();

                    return;
                }


                /* PROVJERA KORISNIKA */

                if (!data || !data.user) {

                    showLoginError(
                        "Prijava nije uspjela. Pokušajte ponovno."
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
                    .select(
                        "id, display_name, role"
                    )
                    .eq(
                        "id",
                        data.user.id
                    )
                    .maybeSingle();


                /* POGREŠKA PROFILA */

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


                /* PROFIL NE POSTOJI */

                if (!profile) {

                    showLoginError(
                        "Korisnički profil nije pronađen."
                    );

                    return;
                }


                /* SPREMI EMAIL */

                localStorage.setItem(
                    "user",
                    email
                );


                /* KORISNIČKA ULOGA */

                const role = String(
                    profile.role || "client"
                )
                    .trim()
                    .toLowerCase();


                /* ADMINISTRATOR */

                if (role === "admin") {

                    window.location.href =
                        "admin.html";

                    return;
                }


                /* KLIJENT */

                window.location.href =
                    "form.html";

            } catch (err) {

                console.error(
                    "Unexpected login error:",
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
   7. SVIJETLA TEMA KAO ZADANA
========================================== */

/*
   Ako korisnik još nije odabrao temu,
   automatski se koristi svijetla.

   Ako je korisnik ranije odabrao tamnu,
   njegova postavka ostaje spremljena.
*/

const savedTheme =
    localStorage.getItem("theme") || "light";

const isLightTheme =
    savedTheme === "light";

document.body.classList.toggle(
    "light-mode",
    isLightTheme
);

if (themeToggle) {

    themeToggle.checked = isLightTheme;

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
   8. PRIKAZ / SAKRIVANJE LOZINKE
========================================== */

if (togglePassword && passwordInput) {

    togglePassword.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            const isPassword =
                passwordInput.type === "password";

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

            togglePassword.setAttribute(
                "aria-pressed",
                String(isPassword)
            );

            passwordInput.focus();
        }
    );
}


/* ==========================================
   9. CAPS LOCK UPOZORENJE
========================================== */

if (passwordInput && capsLockWarning) {

    function checkCapsLock(event) {

        const capsLockOn =
            event.getModifierState("CapsLock");

        capsLockWarning.classList.toggle(
            "show",
            capsLockOn
        );
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
