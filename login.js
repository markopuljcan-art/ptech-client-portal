const SUPABASE_URL = "https://agivwsbczzvvuzszcvxz.supabase.co";
const SUPABASE_KEY = "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// LOGIN
document.getElementById("loginForm").addEventListener("submit", async function (event) {

    event.preventDefault();
    const loginError = document.getElementById("loginError");

loginError.textContent = "";
loginError.classList.remove("show");
    const loginButton = document.getElementById("loginButton");

    loginButton.disabled = true;
    loginButton.textContent = "Prijava...";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {

    console.error(error);

    const loginError = document.getElementById("loginError");
    const loginCard = document.querySelector(".big_bubble");

    loginError.textContent = "Pogrešan e-mail ili lozinka.";
    loginError.classList.add("show");

    loginCard.classList.remove("shake");

    // prisili browser da ponovno pokrene animaciju
    void loginCard.offsetWidth;

    loginCard.classList.add("shake");

    loginButton.disabled = false;
    loginButton.textContent = "Prijavi se";

    return;
}

    // Login je uspješan
    localStorage.setItem("user", email);

    setTimeout(function () {
    const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

if (profileError) {
    console.error("Greška kod provjere role:", profileError);

    window.location.href = "form.html";
    return;
}

const role = String(profile?.role || "")
    .trim()
    .toLowerCase();

if (role === "admin") {
    window.location.href = "admin.html";
} else {
    window.location.href = "form.html";
}
}, 1000);
});


// THEME
const themeToggle = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    themeToggle.checked = true;
}

themeToggle.addEventListener("change", function () {

    if (themeToggle.checked) {

        document.body.classList.add("light-mode");
        localStorage.setItem("theme", "light");

    } else {

        document.body.classList.remove("light-mode");
        localStorage.setItem("theme", "dark");

    }

});


// SHOW / HIDE PASSWORD
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", function () {

    const isHidden = passwordInput.type === "password";

    passwordInput.type = isHidden
        ? "text"
        : "password";

    togglePassword.classList.toggle(
        "password-visible",
        isHidden
    );
});

// CAPS LOCK UPOZORENJE

const capsLockWarning =
    document.getElementById("capsLockWarning");

passwordInput.addEventListener("keyup", function (event) {

    const capsLockOn =
        event.getModifierState("CapsLock");

    if (capsLockOn) {
        capsLockWarning.classList.add("show");
    } else {
        capsLockWarning.classList.remove("show");
    }

});

passwordInput.addEventListener("blur", function () {
    capsLockWarning.classList.remove("show");
});
