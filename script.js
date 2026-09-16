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
    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .maybeSingle();

    if (profileError) {
        console.error(
            "Greška kod dohvaćanja profila:",
            profileError
        );
    }

    const userName =
        profile?.display_name || session.user.email;

    document.getElementById("userTop").textContent =
        userName;

    document.getElementById("userGreeting").textContent =
        userName;


    // 3. DOHVATI PROJEKT
    const {
        data: project,
        error: projectError
    } = await supabaseClient
        .from("projects")
        .select("id, type, name, status, progress, deadline")
        .eq("user_id", session.user.id)
        .single();

    if (projectError) {
        console.error(
            "Greška kod dohvaćanja projekta:",
            projectError
        );
        return;
    }


    // 4. PRIKAŽI PROJEKT
    document.getElementById("job").textContent =
        project.type;

    document.getElementById("jobName").textContent =
        project.name;


    // STATUS BADGE
    const statusBadge =
        document.getElementById("jobStatus");

    statusBadge.textContent =
        project.status;

    statusBadge.classList.remove(
        "status-progress",
        "status-done",
        "status-waiting"
    );

    if (project.status === "U izradi") {
        statusBadge.classList.add("status-progress");
    }
    else if (project.status === "Završeno") {
        statusBadge.classList.add("status-done");
    }
    else if (project.status === "Na čekanju") {
        statusBadge.classList.add("status-waiting");
    }


    // NAPREDAK
    document.getElementById("progress").textContent =
        project.progress;


    // 5. DATUM
    if (project.deadline) {

        const deadline =
            new Date(project.deadline);

        document.getElementById("deadline").textContent =
            deadline.toLocaleDateString("hr-HR");

    } else {

        document.getElementById("deadline").textContent =
            "-";
    }


    // 6. PROGRESS BAR
    const progressBar =
        document.getElementById("progressBar");

    progressBar.style.width = "0%";

    setTimeout(function () {
        progressBar.style.width =
            project.progress + "%";
    }, 150);


    // 7. DOHVATI AKTIVNOSTI
    const {
        data: activities,
        error: activitiesError
    } = await supabaseClient
        .from("activities")
        .select("title, status, position")
        .eq("project_id", project.id)
        .order("position", {
            ascending: true
        });

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

    activitiesContainer.innerHTML = "";

    activities.forEach(function (activity) {

        const item =
            document.createElement("div");

        item.classList.add("activity-item");


        const icon =
            document.createElement("span");

        icon.classList.add("activity-icon");


        // ZAVRŠENO
        if (activity.status === "Završeno") {

            item.classList.add("activity-done");

            icon.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M8 12.5l2.5 2.5L16 9"></path>
                </svg>
            `;
        }


        // U TIJEKU
        else if (activity.status === "U tijeku") {

            item.classList.add("activity-progress");

            icon.innerHTML = `
                <svg
                    class="activity-spinner"
                    viewBox="0 0 24 24"
                >
                    <circle cx="12" cy="12" r="8"></circle>
                    <path d="M12 4a8 8 0 0 1 8 8"></path>
                </svg>
            `;
        }


        // NA ČEKANJU
        else {

            item.classList.add("activity-waiting");

            icon.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="8"></circle>
                </svg>
            `;
        }


        const title =
            document.createElement("span");

        title.classList.add("activity-title");

        title.textContent =
            activity.title;


        item.appendChild(icon);
        item.appendChild(title);

        activitiesContainer.appendChild(item);

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


// LIGHT / DARK MODE
const themeToggle =
    document.getElementById("themeToggle");

const savedTheme =
    localStorage.getItem("theme");

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
