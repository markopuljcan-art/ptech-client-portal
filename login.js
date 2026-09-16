const SUPABASE_URL = "https://agivwsbczzvvuzszcvxz.supabase.co";
const SUPABASE_KEY = "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// LOGIN
document.getElementById("loginForm").addEventListener("submit", async function (event) {

    event.preventDefault();

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

        alert(error.message);
        console.error(error);

        loginButton.disabled = false;
        loginButton.textContent = "Prijavi se";

        return;
    }

    // Login je uspješan
    localStorage.setItem("user", email);

    setTimeout(function () {
    window.location.href = "form.html";
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
