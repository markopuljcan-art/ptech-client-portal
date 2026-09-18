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
        .eq(
            "project_id",
            projectId
        )
        .order(
            "position",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Greška kod dohvaćanja aktivnosti:",
            error
        );

        return;
    }


    const container =
        document.getElementById(
            "activities"
        );

    container.innerHTML = "";


    // NEMA AKTIVNOSTI
    if (
        !activities ||
        activities.length === 0
    ) {

        container.innerHTML = `
            <div class="no-activities">
                Trenutno nema aktivnosti.
            </div>
        `;

        return;
    }


    // =========================
    // SAMO PRVE 2 AKTIVNOSTI
    // =========================

    const visibleActivities =
        activities.slice(0, 2);


    visibleActivities.forEach(
        function (activity) {

            const item =
                document.createElement(
                    "div"
                );

            item.classList.add(
                "activity-item"
            );


            // =========================
            // IKONA
            // =========================

            const icon =
                document.createElement(
                    "span"
                );

            icon.classList.add(
                "activity-icon"
            );


            // ZAVRŠENO
            if (
                activity.status ===
                "Završeno"
            ) {

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
            else if (
                activity.status ===
                "U tijeku"
            ) {

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


            // =========================
            // SADRŽAJ
            // =========================

            const content =
                document.createElement(
                    "div"
                );

            content.classList.add(
                "activity-content"
            );


            const title =
                document.createElement(
                    "span"
                );

            title.classList.add(
                "activity-title"
            );

            title.textContent =
                activity.title;


            const date =
                document.createElement(
                    "span"
                );

            date.classList.add(
                "activity-date"
            );


            if (
                activity.activity_date
            ) {

                date.textContent =
                    formatDate(
                        activity.activity_date
                    );

            }

            else {

                date.textContent = "";

            }


            content.appendChild(
                title
            );

            content.appendChild(
                date
            );

            item.appendChild(
                icon
            );

            item.appendChild(
                content
            );

            container.appendChild(
                item
            );

        }
    );


    // =========================
    // POGLEDAJ VIŠE
    // =========================

    if (
        activities.length > 2
    ) {

        const moreLink =
            document.createElement(
                "a"
            );

        moreLink.classList.add(
            "activities-more"
        );

        moreLink.href =
            `activities.html?project=${projectId}`;

        moreLink.innerHTML = `
            <span>
                Pogledaj više
            </span>

            <span class="activities-more-arrow">
                &gt;
            </span>
        `;

        container.appendChild(
            moreLink
        );

    }

}


// =========================
// NAPREDAK - CLICK
// =========================

function setupProgressToggles() {

    const activitiesSection =
        document.getElementById(
            "activitiesSection"
        );

    const buttons =
        document.querySelectorAll(
            ".progress-toggle"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                async function () {

                    const projectId =
                        Number(
                            button.dataset.projectId
                        );

                    const isOpen =
                        button.getAttribute(
                            "aria-expanded"
                        ) === "true";


                    // =========================
                    // ZATVORI
                    // =========================

                    if (isOpen) {

                        activitiesSection.hidden =
                            true;

                        button.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                        return;
                    }


                    // =========================
                    // RESET SVIH
                    // =========================

                    buttons.forEach(
                        function (
                            otherButton
                        ) {

                            otherButton.setAttribute(
                                "aria-expanded",
                                "false"
                            );

                        }
                    );


                    // =========================
                    // UČITAJ
                    // =========================

                    await loadActivities(
                        projectId
                    );


                    // =========================
                    // OTVORI
                    // =========================

                    activitiesSection.hidden =
                        false;

                    button.setAttribute(
                        "aria-expanded",
                        "true"
                    );

                }
            );

        }
    );

}


// =========================
// ZATVORI AKTIVNOSTI
// =========================

function closeActivities() {

    const activitiesSection =
        document.getElementById(
            "activitiesSection"
        );


    if (activitiesSection) {

        activitiesSection.hidden =
            true;

    }


    document
        .querySelectorAll(
            ".progress-toggle"
        )
        .forEach(
            function (button) {

                button.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }
        );

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


    projects.forEach(
        function (
            project,
            index
        ) {

            const slide =
                document.createElement(
                    "div"
                );

            slide.classList.add(
                "project-slide"
            );


            // =========================
            // STATUS
            // =========================

            let statusClass = "";


            if (
                project.status ===
                "U izradi"
            ) {

                statusClass =
                    "status-progress";

            }

            else if (
                project.status ===
                "Završeno"
            ) {

                statusClass =
                    "status-done";

            }

            else if (
                project.status ===
                "Na čekanju"
            ) {

                statusClass =
                    "status-waiting";

            }


            const progress =
                Number(
                    project.progress
                ) || 0;


            // =========================
            // KARTICA
            // =========================

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

                                    <path
                                        d="M8 21h8">
                                    </path>

                                    <path
                                        d="M12 17v4">
                                    </path>

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


                    <!-- =====================
                         DONJE KARTICE
                    ====================== -->

                    <div class="project-stats">


                        <!-- PAKET -->

                        <div class="stat-card">

                            <div class="stat-icon">

                                <svg viewBox="0 0 24 24">

                                    <rect
                                        x="3"
                                        y="7"
                                        width="18"
                                        height="13"
                                        rx="2">
                                    </rect>

                                    <path
                                        d="M8 7V5">
                                    </path>

                                    <path
                                        d="M16 7V5">
                                    </path>

                                    <path
                                        d="M8 5h8">
                                    </path>

                                </svg>

                            </div>


                            <div>

                                <span class="stat-label">
                                    Paket
                                </span>

                                <strong class="package-name">

                                    ${escapeHTML(
                                        project.package || "-"
                                    )}

                                </strong>

                            </div>

                        </div>


                        <!-- =====================
                             NAPREDAK
                        ====================== -->

                        <button
                            type="button"
                            class="
                                stat-card
                                progress-stat
                                progress-toggle
                            "
                            data-project-id="${project.id}"
                            aria-expanded="false"
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


                            <div class="progress-info">

                                <span class="stat-label">
                                    Napredak
                                </span>


                                <div class="progress-row">

                                    <div class="progress-container">

                                        <div
                                            class="progress-bar"
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


                            <span class="progress-chevron">
                                &gt;
                            </span>

                        </button>


                        <!-- ROK -->

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

                                    <path
                                        d="M8 3v4">
                                    </path>

                                    <path
                                        d="M16 3v4">
                                    </path>

                                    <path
                                        d="M3 10h18">
                                    </path>

                                </svg>

                            </div>


                            <div>

                                <span class="stat-label">
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


            slider.appendChild(
                slide
            );


            // =========================
            // DOT
            // =========================

            const dot =
                document.createElement(
                    "button"
                );

            dot.type =
                "button";

            dot.classList.add(
                "slider-dot"
            );


            if (index === 0) {

                dot.classList.add(
                    "active"
                );

            }


            dot.addEventListener(
                "click",
                function () {

                    const slides =
                        slider.querySelectorAll(
                            ".project-slide"
                        );

                    const targetSlide =
                        slides[index];


                    if (!targetSlide) {
                        return;
                    }


                    slider.scrollTo({

                        left:
                            targetSlide.offsetLeft,

                        behavior:
                            "smooth"

                    });

                }
            );


            dotsContainer.appendChild(
                dot
            );

        }
    );


    // =========================
    // PRVI PROJEKT
    // =========================

    if (
        projects.length > 0
    ) {

        currentProject.textContent =
            "1";

        activeProjectIndex =
            0;

    }

    else {

        currentProject.textContent =
            "0";

    }


    setupProgressToggles();

}


// =========================
// SWIPE / PROMJENA PROJEKTA
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


                        const slides =
                            Array.from(
                                slider.querySelectorAll(
                                    ".project-slide"
                                )
                            );


                        if (
                            slides.length === 0
                        ) {

                            return;

                        }


                        // =========================
                        // NAJBLIŽI SLIDE
                        // =========================

                        let index = 0;

                        let smallestDistance =
                            Infinity;


                        slides.forEach(
                            function (
                                slide,
                                slideIndex
                            ) {

                                const distance =
                                    Math.abs(
                                        slider.scrollLeft -
                                        slide.offsetLeft
                                    );


                                if (
                                    distance <
                                    smallestDistance
                                ) {

                                    smallestDistance =
                                        distance;

                                    index =
                                        slideIndex;

                                }

                            }
                        );


                        // =========================
                        // BROJAČ
                        // =========================

                        currentProject.textContent =
                            index + 1;


                        // =========================
                        // DOTS
                        // =========================

                        const dots =
                            document.querySelectorAll(
                                ".slider-dot"
                            );


                        dots.forEach(
                            function (
                                dot,
                                dotIndex
                            ) {

                                dot.classList.toggle(
                                    "active",
                                    dotIndex === index
                                );

                            }
                        );


                        // =========================
                        // PROMJENA PROJEKTA
                        // =========================

                        if (
                            index !==
                            activeProjectIndex
                        ) {

                            activeProjectIndex =
                                index;

                            closeActivities();

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

    // SESSION

    const {
        data: {
            session
        }
    } =
        await supabaseClient
            .auth
            .getSession();


    if (!session) {

        window.location.href =
            "login.html";

        return;

    }


    // =========================
    // PROFIL
    // =========================

    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "display_name"
            )
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


    document
        .getElementById(
            "userTop"
        )
        .textContent =
            userName;


    document
        .getElementById(
            "userGreeting"
        )
        .textContent =
            userName;


    // =========================
    // PROJEKTI
    // =========================

    const {
        data,
        error: projectError
    } =
        await supabaseClient
            .from("projects")
            .select(
                "id, type, name, status, progress, deadline, package"
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
// LIGHT / DARK MODE
// =========================

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

    themeToggle.checked =
        true;

}


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


// =========================
// START
// =========================

setupProjectSlider();
loadDashboard();
