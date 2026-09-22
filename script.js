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
   GLOBAL
========================= */

let projects = [];

let activeProjectIndex = 0;

let supportRealtimeChannel = null;

let currentSession = null;


/* =========================
   ELEMENTI
========================= */

const projectsSlider =
    document.getElementById(
        "projectsSlider"
    );

const sliderDots =
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

const userTop =
    document.getElementById(
        "userTop"
    );

const userGreeting =
    document.getElementById(
        "userGreeting"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

const approveDesignAction =
    document.getElementById(
        "approveDesignAction"
    );

const messagesUnreadBadge =
    document.getElementById(
        "messagesUnreadBadge"
    );


/* =========================
   HELPERS
========================= */

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


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "-";
    }


    return date.toLocaleDateString(
        "hr-HR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


/* =========================
   STATUS
========================= */

function getStatusClass(status) {

    const value =
        String(
            status || ""
        )
            .trim()
            .toLowerCase();


    if (
        value === "u izradi"
    ) {

        return "status-progress";
    }


    if (
        value === "završeno" ||
        value === "zavrseno"
    ) {

        return "status-done";
    }


    if (
        value === "na čekanju" ||
        value === "na cekanju"
    ) {

        return "status-waiting";
    }


    return "";
}


/* =========================
   ZADNJE AŽURIRANO
========================= */

async function loadLatestUpdate(
    projectId,
    element
) {

    if (
        !projectId ||
        !element
    ) {
        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "activities"
            )
            .select(
                "activity_date"
            )
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


/* =========================
   RENDER PROJEKATA
========================= */

function renderProjects() {

    if (
        !projectsSlider ||
        !sliderDots ||
        !currentProject ||
        !totalProjects
    ) {
        return;
    }


    projectsSlider.innerHTML =
        "";

    sliderDots.innerHTML =
        "";


    totalProjects.textContent =
        projects.length;


    /* =========================
       NEMA PROJEKATA
    ========================= */

    if (
        projects.length === 0
    ) {

        currentProject.textContent =
            "0";


        projectsSlider.innerHTML = `
            <div class="no-projects">
                Trenutno nema aktivnih projekata.
            </div>
        `;


        return;
    }


    /* =========================
       PROJEKTI
    ========================= */

    projects.forEach(
        function (
            project,
            index
        ) {

            const statusClass =
                getStatusClass(
                    project.status
                );


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


            const slide =
                document.createElement(
                    "div"
                );


            slide.classList.add(
                "project-slide"
            );


            slide.innerHTML = `

                <a
                    class="
                        project-card
                        project-card-link
                    "
                    href="project.html?id=${project.id}"
                >

                    <!-- HEADER -->

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


                            <div class="project-title-wrap">

                                <h3>
                                    ${escapeHTML(
                                        project.type ||
                                        "Projekt"
                                    )}
                                </h3>

                                <p>
                                    ${escapeHTML(
                                        project.name ||
                                        ""
                                    )}
                                </p>

                            </div>

                        </div>


                        <div class="project-heading-right">

                            <span
                                class="
                                    status-badge
                                    ${statusClass}
                                "
                            >
                                ${escapeHTML(
                                    project.status ||
                                    "-"
                                )}
                            </span>


                            <span
                                class="project-open-arrow"
                                aria-hidden="true"
                            >
                                &gt;
                            </span>

                        </div>

                    </div>


                    <!-- INFO -->

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
                                        project.package ||
                                        "-"
                                    )}
                                </strong>

                            </div>

                        </div>


                        <!-- NAPREDAK -->

                        <div class="stat-card progress-stat">

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

                        </div>


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


                        <!-- ZADNJE AŽURIRANO -->

                        <div class="stat-card">

                            <div class="stat-icon">

                                <svg viewBox="0 0 24 24">

                                    <path
                                        d="
                                            M20 11
                                            a8 8 0 1 1
                                            -2.34 -5.66
                                        ">
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
                                >
                                    -
                                </strong>

                            </div>

                        </div>


                    </div>

                </a>
            `;


            projectsSlider.appendChild(
                slide
            );


            /* ZADNJE AŽURIRANO */

            const latestUpdate =
                slide.querySelector(
                    ".latest-update"
                );


            loadLatestUpdate(
                project.id,
                latestUpdate
            );


            /* =========================
               DOT
            ========================= */

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
                `Prikaži projekt ${index + 1}`
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
                        projectsSlider
                            .querySelectorAll(
                                ".project-slide"
                            );


                    const targetSlide =
                        slides[index];


                    if (!targetSlide) {
                        return;
                    }


                    projectsSlider.scrollTo({
                        left:
                            targetSlide.offsetLeft,

                        behavior:
                            "smooth"
                    });
                }
            );


            sliderDots.appendChild(
                dot
            );
        }
    );


    currentProject.textContent =
        "1";


    activeProjectIndex =
        0;
}


/* =========================
   PROJECT SLIDER
========================= */

function setupProjectSlider() {

    if (
        !projectsSlider ||
        !currentProject
    ) {
        return;
    }


    let scrollTimeout;


    projectsSlider.addEventListener(
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
                                projectsSlider
                                    .querySelectorAll(
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
                                        projectsSlider.scrollLeft -
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


                        activeProjectIndex =
                            index;


                        currentProject.textContent =
                            index + 1;


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

                    },
                    100
                );
        }
    );
}


/* =========================
   SUPPORT UNREAD
========================= */

async function loadMessagesUnreadCount(
    userId
) {

    if (
        !messagesUnreadBadge ||
        !userId
    ) {
        return;
    }


    const {
        count,
        error
    } =
        await supabaseClient
            .from(
                "support_messages"
            )
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "user_id",
                userId
            )
            .eq(
                "sender_role",
                "admin"
            )
            .is(
                "client_read_at",
                null
            );


    if (error) {

        console.error(
            "Greška kod brojanja nepročitanih poruka:",
            error
        );

        return;
    }


    const unreadCount =
        count || 0;


    if (
        unreadCount > 0
    ) {

        messagesUnreadBadge.hidden =
            false;


        messagesUnreadBadge.textContent =
            unreadCount > 99
                ? "99+"
                : String(
                    unreadCount
                );

    } else {

        messagesUnreadBadge.hidden =
            true;


        messagesUnreadBadge.textContent =
            "0";
    }
}


/* =========================
   SUPPORT REALTIME
========================= */

function subscribeToSupportRealtime(
    userId
) {

    if (
        !userId ||
        supportRealtimeChannel
    ) {
        return;
    }


    supportRealtimeChannel =
        supabaseClient
            .channel(
                `home-support-${userId}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "support_messages",
                    filter:
                        `user_id=eq.${userId}`
                },
                async payload => {

                    console.log(
                        "Home support realtime:",
                        payload
                    );


                    await loadMessagesUnreadCount(
                        userId
                    );
                }
            )
            .subscribe(
                status => {

                    console.log(
                        "Home support realtime status:",
                        status
                    );
                }
            );
}


/* =========================
   DASHBOARD
========================= */

async function loadDashboard() {

    const {
        data: {
            session
        },
        error: sessionError
    } =
        await supabaseClient
            .auth
            .getSession();


    if (
        sessionError ||
        !session
    ) {

        window.location.href =
            "login.html";

        return;
    }


    currentSession =
        session;


    /* =========================
       PORUKE
    ========================= */

    await loadMessagesUnreadCount(
        session.user.id
    );


    subscribeToSupportRealtime(
        session.user.id
    );


    /* =========================
       PROFIL
    ========================= */

    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from(
                "profiles"
            )
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
        session.user.email
            ?.split("@")[0] ||
        "Klijent";


    if (userTop) {

        userTop.textContent =
            userName;
    }


    if (userGreeting) {

        userGreeting.textContent =
            userName;
    }


    /* =========================
       PROJEKTI
    ========================= */

    const {
        data,
        error: projectError
    } =
        await supabaseClient
            .from(
                "projects"
            )
            .select(`
                id,
                type,
                name,
                status,
                progress,
                deadline,
                package
            `)
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


    /* =========================
       ODOBRI DIZAJN
    ========================= */

    if (
        approveDesignAction
    ) {

        if (
            projects.length > 0
        ) {

            approveDesignAction.href =
                `approve.html?id=${projects[0].id}`;

        } else {

            approveDesignAction.href =
                "#";
        }
    }
}


/* =========================
   LOGOUT
========================= */

logoutButton
    ?.addEventListener(
        "click",
        async function () {

            if (
                supportRealtimeChannel
            ) {

                await supabaseClient
                    .removeChannel(
                        supportRealtimeChannel
                    );


                supportRealtimeChannel =
                    null;
            }


            await supabaseClient
                .auth
                .signOut();


            window.location.href =
                "login.html";
        }
    );


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


themeToggle
    ?.addEventListener(
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

            } else {

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


/* =========================
   TAB / VISIBILITY REFRESH
========================= */

document.addEventListener(
    "visibilitychange",
    async function () {

        if (
            document.visibilityState ===
                "visible" &&
            currentSession
        ) {

            await loadMessagesUnreadCount(
                currentSession.user.id
            );
        }
    }
);


/* =========================
   START
========================= */

setupProjectSlider();

loadDashboard();
