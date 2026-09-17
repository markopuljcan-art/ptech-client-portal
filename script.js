const SUPABASE_URL = "https://agivwsbczzvvuzszcvxz.supabase.co";
const SUPABASE_KEY = "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let projects = [];
let activeProjectIndex = 0;


// =========================
// HELPER
// =========================

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(
        value + "T00:00:00"
    );

    return date.toLocaleDateString(
        "hr-HR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


// =========================
// AKTIVNOSTI
// =========================

async function loadActivities(projectId) {

    const {
        data: activities,
        error
    } = await supabaseClient
        .from("activities")
        .select(
            "title, status, position, activity_date"
        )
        .eq("project_id", projectId)
        .order("position", {
            ascending: true
        });

    if (error) {
        console.error(
            "Greška kod dohvaćanja aktivnosti:",
            error
        );
        return;
    }


    const container =
        document.getElementById("activities");

    container.innerHTML = "";


    if (!activities || activities.length === 0) {

        container.innerHTML = `
            <div class="no-activities">
                Trenutno nema aktivnosti.
            </div>
        `;

        return;
    }


    activities.forEach(function (activity) {

        const item =
            document.createElement("div");

        item.classList.add(
            "activity-item"
        );


        const icon =
            document.createElement("span");

        icon.classList.add(
            "activity-icon"
        );


        // ZAVRŠENO
        if (activity.status === "Završeno") {

            item.classList.add(
                "activity-done"
            );

            icon.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <circle
                        cx="12"
                        cy="12"
                        r="9">
                    </circle>

                    <path
                        d="M8 12.5l2.5 2.5L16 9">
                    </path>
                </svg>
            `;

        }


        // U TIJEKU
        else if (activity.status === "U tijeku") {

            item.classList.add(
                "activity-progress"
            );

            icon.innerHTML = `
                <svg
                    class="activity-spinner"
                    viewBox="0 0 24 24"
                >
                    <circle
                        cx="12"
                        cy="12"
                        r="8">
                    </circle>

                    <path
                        d="M12 4a8 8 0 0 1 8 8">
                    </path>
                </svg>
            `;

        }


        // NA ČEKANJU
        else {

            item.classList.add(
                "activity-waiting"
            );

            icon.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <circle
                        cx="12"
                        cy="12"
                        r="8">
                    </circle>
                </svg>
            `;

        }


        const content =
            document.createElement("div");

        content.classList.add(
            "activity-content"
        );


        const title =
            document.createElement("span");

        title.classList.add(
            "activity-title"
        );

        title.textContent =
            activity.title;


        const date =
            document.createElement("span");

        date.classList.add(
            "activity-date"
        );

        date.textContent =
            activity.activity_date
                ? formatDate(
                    activity.activity_date
                )
                : "";


        content.appendChild(title);
        content.appendChild(date);

        item.appendChild(icon);
        item.appendChild(content);

        container.appendChild(item);

    });
}


// =========================
// PROJECT SLIDER
// =========================

function renderProjects() {

    const slider =
        document.getElementById(
            "projectsSlider"
        );

    const dotsContainer =
        document.getElementById(
            "sliderDots"
        );

    const currentProject =
        document.getElementById(
            "currentProject"
        );

    const totalProjects =
        document.getElementById(
            "totalProjects"
        );


    slider.innerHTML = "";
    dotsContainer.innerHTML = "";

    totalProjects.textContent =
        projects.length;


    projects.forEach(function (
        project,
        index
    ) {

        const slide =
            document.createElement("div");

        slide.classList.add(
            "project-slide"
        );


        let statusClass = "";

        if (project.status === "U izradi") {

            statusClass =
                "status-progress";

        }
        else if (
            project.status === "Završeno"
        ) {

            statusClass =
                "status-done";

        }
        else if (
            project.status === "Na čekanju"
        ) {

            statusClass =
                "status-waiting";

        }


        const progress =
            Number(project.progress) || 0;


        slide.innerHTML = `
            <div class="project-card">

                <div class="project-heading">

                    <div class="project-main">

                        <div class="project-icon">

                            <svg viewBox="0 0 24 24">

                                <rect
                                    x="3"
                                    y="4"
                                    width="18"
                                    height="13"
                                    rx="2">
                                </rect>

                                <path d="M8 21h8"></path>

                                <path d="M12 17v4"></path>

                            </svg>

                        </div>


                        <div>

                            <h3>
                                ${escapeHTML(
                                    project.type
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    project.name
                                )}
                            </p>

                        </div>

                    </div>


                    <span
                        class="
                            status-badge
                            ${statusClass}
                        "
                    >
                        ${escapeHTML(
                            project.status
                        )}
                    </span>

                </div>


                <div class="project-stats">

                    <div class="stat-card">

                        <div class="stat-icon">

                            <svg viewBox="0 0 24 24">

                                <path
                                    d="M6 3h9l3 3v15H6z">
                                </path>

                                <path
                                    d="M15 3v4h4">
                                </path>

                                <path
                                    d="M9 11h6">
                                </path>

                                <path
                                    d="M9 15h6">
                                </path>

                            </svg>

                        </div>


                        <div>

                            <span
                                class="stat-label"
                            >
                                Status
                            </span>

                            <strong>
                                ${escapeHTML(
                                    project.status
                                )}
                            </strong>

                        </div>

                    </div>


                    <div
                        class="
                            stat-card
                            progress-stat
                        "
                    >

                        <div class="stat-icon">

                            <svg viewBox="0 0 24 24">

                                <path
                                    d="M5 20V12">
                                </path>

                                <path
                                    d="M10 20V7">
                                </path>

                                <path
                                    d="M15 20V4">
                                </path>

                                <path
                                    d="M20 20V10">
                                </path>

                            </svg>

                        </div>


                        <div
                            class="progress-info"
                        >

                            <span
                                class="stat-label"
                            >
                                Napredak
                            </span>


                            <div
                                class="progress-row"
                            >

                                <div
                                    class="
                                        progress-container
                                    "
                                >

                                    <div
                                        class="
                                            progress-bar
                                        "
                                        style="
                                            width:
                                            ${progress}%;
                                        "
                                    >
                                    </div>

                                </div>


                                <strong>
                                    ${progress}%
                                </strong>

                            </div>

                        </div>

                    </div>


                    <div class="stat-card">

                        <div class="stat-icon">

                            <svg viewBox="0 0 24 24">

                                <rect
                                    x="3"
                                    y="5"
                                    width="18"
                                    height="16"
                                    rx="2">
                                </rect>

                                <path d="M8 3v4"></path>

                                <path d="M16 3v4"></path>

                                <path d="M3 10h18"></path>

                            </svg>

                        </div>


                        <div>

                            <span
                                class="stat-label"
                            >
                                Rok
                            </span>

                            <strong>
                                ${formatDate(
                                    project.deadline
                                )}
                            </strong>

                        </div>

                    </div>

                </div>

            </div>
        `;


        slider.appendChild(slide);


        // DOT
        const dot =
            document.createElement(
                "button"
            );

        dot.type = "button";

        dot.classList.add(
            "slider-dot"
        );

        if (index === 0) {
            dot.classList.add("active");
        }


        dot.addEventListener(
            "click",
            function () {

                slider.scrollTo({
                    left:
                        index *
                        slider.clientWidth,

                    behavior:
                        "smooth"
                });

            }
        );


        dotsContainer.appendChild(dot);

    });


    if (projects.length > 0) {

        currentProject.textContent = "1";

        loadActivities(
            projects[0].id
        );

    }
}


// =========================
// PROMJENA AKTIVNOG PROJEKTA
// =========================

function setupProjectSlider() {

    const slider =
        document.getElementById(
            "projectsSlider"
        );

    const currentProject =
        document.getElementById(
            "currentProject"
        );


    let scrollTimeout;


    slider.addEventListener(
        "scroll",
        function () {

            clearTimeout(
                scrollTimeout
            );


            scrollTimeout =
                setTimeout(
                    function () {

                        if (
                            projects.length === 0
                        ) {
                            return;
                        }


                        const index =
                            Math.round(
                                slider.scrollLeft /
                                slider.clientWidth
                            );


                        if (
                            index < 0 ||
                            index >=
                                projects.length
                        ) {
                            return;
                        }


                        currentProject.textContent =
                            index + 1;


                        const dots =
                            document
                                .querySelectorAll(
                                    ".slider-dot"
                                );


                        dots.forEach(
                            function (
                                dot,
                                dotIndex
                            ) {

                                dot.classList.toggle(
                                    "active",
                                    dotIndex ===
                                        index
                                );

                            }
                        );


                        if (
                            index !==
                            activeProjectIndex
                        ) {

                            activeProjectIndex =
                                index;


                            loadActivities(
                                projects[
                                    index
                                ].id
                            );

                        }

                    },
                    100
                );

        }
    );
}


// =========================
// GLAVNA FUNKCIJA
// =========================

async function loadDashboard() {

    const {
        data: { session }
    } =
        await supabaseClient
            .auth
            .getSession();


    if (!session) {

        window.location.href =
            "login.html";

        return;
    }


    // PROFIL
    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("display_name")
        .eq(
            "id",
            session.user.id
        )
        .maybeSingle();


    if (profileError) {

        console.error(
            "Greška kod profila:",
            profileError
        );

    }


    const userName =
        profile?.display_name ||
        session.user.email;


    document.getElementById(
        "userTop"
    ).textContent =
        userName;


    document.getElementById(
        "userGreeting"
    ).textContent =
        userName;


    // SVI PROJEKTI
    const {
        data,
        error: projectError
    } = await supabaseClient
        .from("projects")
        .select(
            "id, type, name, status, progress, deadline"
        )
        .eq(
            "user_id",
            session.user.id
        );


    if (projectError) {

        console.error(
            "Greška kod projekata:",
            projectError
        );

        return;
    }


    projects =
        data || [];


    renderProjects();

}


// =========================
// ODJAVA
// =========================

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        async function () {

            await supabaseClient
                .auth
                .signOut();


            window.location.href =
                "login.html";

        }
    );


// =========================
// THEME
// =========================

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

const savedTheme =
    localStorage.getItem(
        "theme"
    );


if (savedTheme === "light") {

    document.body.classList.add(
        "light-mode"
    );

    themeToggle.checked = true;

}


themeToggle.addEventListener(
    "change",
    function () {

        if (themeToggle.checked) {

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


// =========================
// START
// =========================

setupProjectSlider();
loadDashboard();
