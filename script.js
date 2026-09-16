const SUPABASE_URL = "https://agivwsbczzvvuzszcvxz.supabase.co";
const SUPABASE_KEY = "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// GLAVNA FUNKCIJA
async function loadDashboard() {

    // 1. PROVJERA PRIJAVE
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "login.html";
        return;
    }


    // 2. DOHVATI PROFIL KORISNIKA
    const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Greška kod dohvaćanja profila:", profileError);
    }

    // Ako postoji display_name koristi njega,
    // inače privremeno koristi email
    const userName =
        profile?.display_name || session.user.email;

    document.getElementById("userTop").textContent = userName;
    document.getElementById("userGreeting").textContent = userName;


    // 3. DOHVATI PROJEKT PRIJAVLJENOG KORISNIKA
    const { data: project, error: projectError } = await supabaseClient
    .from("projects")
    .select("id, type, name, status, progress, deadline")
    .eq("user_id", session.user.id)
    .single();

    if (projectError) {
        console.error("Greška kod dohvaćanja projekta:", projectError);
        return;
    }


    // 4. PRIKAŽI PROJEKT
    document.getElementById("job").textContent = project.type;
    document.getElementById("jobName").textContent = project.name;
    document.getElementById("jobStatus").textContent = project.status;
    document.getElementById("progress").textContent = project.progress;


    // 5. DATUM
    if (project.deadline) {

        const deadline = new Date(project.deadline);

        document.getElementById("deadline").textContent =
            deadline.toLocaleDateString("hr-HR");

    } else {

        document.getElementById("deadline").textContent = "-";

    }


    // 6. PROGRESS BAR
    document.getElementById("progressBar").style.width =
        project.progress + "%";


    // 7. DOHVATI AKTIVNOSTI TOG PROJEKTA
    const { data: activities, error: activitiesError } =
        await supabaseClient
            .from("activities")
            .select("title, status, position")
            .eq("project_id", project.id)
            .order("position", { ascending: true });

    if (activitiesError) {
        console.error(
            "Greška kod dohvaćanja aktivnosti:",
            activitiesError
        );
        return;
    }


    // 8. PRIKAŽI AKTIVNOSTI
    const activitiesContainer =
        document.getElementById("activities");

    // očisti stare aktivnosti prije prikaza
    activitiesContainer.innerHTML = "";

    activities.forEach(function (activity) {

        const p = document.createElement("p");

        p.classList.add("activity-item");

        let icon = "○";

        if (activity.status === "Završeno") {
            icon = "✓";
        }
        else if (activity.status === "U tijeku") {
            icon = "●";
        }

        p.textContent =
            icon + " " + activity.title;

        activitiesContainer.appendChild(p);

    });
}


// POKRENI DASHBOARD
loadDashboard();


// ODJAVA
document
    .getElementById("logoutButton")
    .addEventListener("click", async function () {

        await supabaseClient.auth.signOut();

        window.location.href = "login.html";

    });
const themeToggle = document.getElementById("themeToggle");

// Učitaj spremljenu temu
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
    document.body.classList.add("light-mode");
    themeToggle.checked = true;
}

// Promjena teme
themeToggle.addEventListener("change", function () {

    if (themeToggle.checked) {

        document.body.classList.add("light-mode");
        localStorage.setItem("theme", "light");

    } else {

        document.body.classList.remove("light-mode");
        localStorage.setItem("theme", "dark");

    }

});
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", function () {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";
        togglePassword.classList.add("hidden-password");

    } else {

        passwordInput.type = "password";
        togglePassword.classList.remove("hidden-password");

    }

});
