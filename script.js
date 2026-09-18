const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";


const supabaseClient =
    supabase.createClient(
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

    const date =
        new Date(
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
// ZADNJE AŽURIRANO
// =========================

async function loadLatestUpdate(
    projectId,
    element
) {

    const {
        data,
        error
    } = await supabaseClient

        .from("activities")

        .select("activity_date")

        .eq(
            "project_id",
            projectId
        )

        .not(
            "activity_date",
            "is",
            null
        )

        .order(
            "activity_date",
            {
                ascending: false
            }
        )

        .limit(1);


    if (error) {

        console.error(
            "Greška kod zadnjeg ažuriranja:",
            error
        );

        element.textContent =
            "-";

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        element.textContent =
            "-";

        return;
    }


    element.textContent =
        formatDate(
            data[0].activity_date
        );
}


// =========================
// ACTIVITY PREVIEW
// =========================

async function loadActivityPreview(
    projectId,
    container
) {

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

        container.innerHTML = `
            <div class="no-activities">
                Aktivnosti se trenutno ne mogu učitati.
            </div>
        `;

        return;
    }


    container.innerHTML = "";


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
    // PRVE 2 AKTIVNOSTI
    // =========================

    const previewActivities =
        activities.slice(0, 2);


    previewActivities.forEach(
        function (activity) {

            const item =
                document.createElement(
                    "div"
                );


            item.classList.add(
                "activity-preview-item"
            );


            // =========================
            // STATUS KLASA
            // =========================

            if (
                activity.status ===
                "Završeno"
            ) {

                item.classList.add(
                    "activity-preview-done"
                );

            }

            else if (
                activity.status ===
                "U tijeku"
            ) {

                item.classList.add(
                    "activity-preview-progress"
                );

            }

            else {

                item.classList.add(
                    "activity-preview-waiting"
                );

            }


            // =========================
            // IKONA
            // =========================

            const icon =
                document.createElement(
                    "span"
                );


            icon.classList.add(
                "activity-preview-icon"
            );


            // ZAVRŠENO
            if (
                activity.status ===
                "Završeno"
            ) {

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

                icon.innerHTML = `
                    <svg viewBox="0 0 24 24">

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
            // CONTENT
            // =========================

            const content =
                document.createElement(
                    "div"
                );


            content.classList.add(
                "activity-preview-content"
            );


            const title =
                document.createElement(
                    "strong"
                );


            title.textContent =
                activity.title;


            const date =
                document.createElement(
                    "span"
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

                date.textContent =
                    "";

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

        const more =
            document.createElement(
                "a"
            );


        more.classList.add(
            "activities-more"
        );


        more.href =
            `activities.html?project=${projectId}`;


        more.innerHTML = `
            <span>
                Pogledaj više
            </span>

            <span class="activities-more-arrow">
                &gt;
            </span>
        `;


        container.appendChild(
            more
        );

    }

}


// =========================
// NAPREDAK CLICK
// =========================

function setupProgressToggles() {

    const progressCards =
        document.querySelectorAll(
            ".progress-toggle"
        );


    progressCards.forEach(
        function (card) {

            const button =
                card.querySelector(
                    ".progress-header"
                );


            const preview =
                card.querySelector(
                    ".progress-activities"
                );


            button.addEventListener(
                "click",
                async function () {

                    const projectId =
                        Number(
                            card.dataset.projectId
                        );


                    const isOpen =
                        button.getAttribute(
                            "aria-expanded"
                        ) === "true";


                    // =========================
                    // ZATVORI
                    // =========================

                    if (isOpen) {

                        preview.hidden =
                            true;


                        button.setAttribute(
                            "aria-expanded",
                            "false"
                        );


                        return;
                    }


                    // =========================
                    // ZATVORI OSTALE
                    // =========================

                    document
                        .querySelectorAll(
                            ".progress-toggle"
                        )
                        .forEach(
                            function (
                                otherCard
                            ) {

                                const otherButton =
                                    otherCard.querySelector(
                                        ".progress-header"
                                    );


                                const otherPreview =
                                    otherCard.querySelector(
                                        ".progress-activities"
                                    );


                                if (
                                    otherCard !== card
                                ) {

                                    otherPreview.hidden =
                                        true;


                                    otherButton.setAttribute(
                                        "aria-expanded",
                                        "false"
                                    );

                                }

                            }
                        );


                    // =========================
                    // UČITAJ
                    // =========================

                    await loadActivityPreview(
                        projectId,
                        preview
                    );


                    preview.hidden =
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
// ZATVORI PREVIEW
// =========================

function closeProgressPreviews() {

    document
        .querySelectorAll(
            ".progress-toggle"
        )
        .forEach(
            function (card) {

                const button =
                    card.querySelector(
                        ".progress-header"
                    );


                const preview =
                    card.querySelector(
                        ".progress-activities"
                    );


                preview.hidden =
                    true;


                button.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }
        );

}


// =========================
// RENDER PROJECTS
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


    slider.innerHTML =
        "";


    dotsContainer.innerHTML =
        "";


    totalProjects.textContent =
        projects.length;


    // =========================
    // NEMA PROJEKATA
    // =========================

    if (
        projects.length === 0
    ) {

        currentProject.textContent =
            "0";


        slider.innerHTML = `
            <div class="no-projects">
                Trenutno nema aktivnih projekata.
            </div>
        `;


        return;
    }


    // =========================
    // PROJEKTI
    // =========================

    projects.forEach(
        function (
            project,
            index
        ) {

            // =========================
            // STATUS
            // =========================

            let statusClass =
                "";


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


            // =========================
            // PROGRESS
            // =========================

            const progress =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            project.progress
                        ) || 0
                    )
                );


            // =========================
            // SLIDE
            // =========================

            const slide =
                document.createElement(
                    "div"
                );


            slide.classList.add(
                "project-slide"
            );


            slide.innerHTML = `

                <div class="project-card">


                    <!-- =====================
                         HEADER PROJEKTA
                    ====================== -->

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
                         STATS
                    ====================== -->

                    <div class="project-stats">


                        <!-- =====================
                             LIJEVA KOLONA
                        ====================== -->

                        <div class="stat-column">


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
                                 ZADNJE AŽURIRANO
                            ====================== -->

                            <div
                                class="
                                    stat-card
                                    updated-card
                                "
                            >

                                <div class="stat-icon">

                                    <svg viewBox="0 0 24 24">

                                        <path
                                            d="M20 11a8 8 0 1 1-2.34-5.66">
                                        </path>

                                        <path
                                            d="M20 4v7h-7">
                                        </path>

                                    </svg>

                                </div>


                                <div>

                                    <span class="stat-label">
                                        Zadnje ažurirano
                                    </span>

                                    <strong
                                        class="latest-update"
                                        data-project-id="${project.id}"
                                    >
                                        -
                                    </strong>

                                </div>

                            </div>

                        </div>


                        <!-- =====================
                             NAPREDAK
                        ====================== -->

                        <div
                            class="
                                stat-card
                                progress-stat
                                progress-toggle
                            "
                            data-project-id="${project.id}"
                        >

                            <button
                                type="button"
                                class="progress-header"
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


                            <!-- AKTIVNOSTI -->

                            <div
                                class="progress-activities"
                                hidden
                            >
                            </div>

                        </div>


                        <!-- =====================
                             ROK
                        ====================== -->

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
            // UČITAJ ZADNJE AŽURIRANJE
            // =========================

            const latestUpdateElement =
                slide.querySelector(
                    ".latest-update"
                );


            loadLatestUpdate(
                project.id,
                latestUpdateElement
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


            dot.setAttribute(
                "aria-label",
                `Projekt ${index + 1}`
            );


            if (
                index === 0
            ) {

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


                    if (
                        !targetSlide
                    ) {

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


    currentProject.textContent =
        "1";


    activeProjectIndex =
        0;


    setupProgressToggles();

}


// =========================
// PROJECT SLIDER
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


                        let index =
                            0;


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


                        // BROJAČ

                        currentProject.textContent =
                            index + 1;


                        // DOTS

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


                        // PROMJENA PROJEKTA

                        if (
                            index !==
                            activeProjectIndex
                        ) {

                            activeProjectIndex =
                                index;


                            closeProgressPreviews();

                        }

                    },
                    100
                );

        }
    );

}


// =========================
// DASHBOARD
// =========================

async function loadDashboard() {

    // =========================
    // SESSION
    // =========================

    const {
        data: {
            session
        }
    } =
        await supabaseClient
            .auth
            .getSession();


    if (
        !session
    ) {

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


    if (
        profileError
    ) {

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


    if (
        projectError
    ) {

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
