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

let activeProjectIndex =
    0;

let supportRealtimeChannel =
    null;

let currentSession =
    null;

let actionUpdateToken =
    0;


/* =========================
   ELEMENTS
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

const revisionAction =
    document.getElementById(
        "revisionAction"
    );

const revisionActionText =
    document.getElementById(
        "revisionActionText"
    );

const actionsProjectLabel =
    document.getElementById(
        "actionsProjectLabel"
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


    const raw =
        String(value)
            .slice(
                0,
                10
            );


    const date =
        new Date(
            raw +
            "T00:00:00"
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


    return "status-progress";
}


/* =========================
   THEME
========================= */

function applyTheme(theme) {

    const finalTheme =
        theme === "light"
            ? "light"
            : "dark";


    document.body.classList.toggle(
        "light-mode",
        finalTheme === "light"
    );


    if (themeToggle) {

        themeToggle.checked =
            finalTheme === "light";
    }


    localStorage.setItem(
        "theme",
        finalTheme
    );
}


function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            "theme"
        );


    applyTheme(
        savedTheme === "light"
            ? "light"
            : "dark"
    );
}


themeToggle
    ?.addEventListener(
        "change",
        function () {

            applyTheme(
                themeToggle.checked
                    ? "light"
                    : "dark"
            );
        }
    );


loadTheme();


/* =========================
   LATEST UPDATE
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
   ACTION LINKS
========================= */

async function updateProjectActions() {

    const token =
        ++actionUpdateToken;


    const project =
        projects[
            activeProjectIndex
        ];


    if (!project) {

        if (approveDesignAction) {

            approveDesignAction.href =
                "#";

            approveDesignAction.setAttribute(
                "aria-disabled",
                "true"
            );
        }


        if (revisionAction) {

            revisionAction.href =
                "#";

            revisionAction.setAttribute(
                "aria-disabled",
                "true"
            );
        }


        if (actionsProjectLabel) {

            actionsProjectLabel.textContent =
                "Trenutno nema dostupnog projekta.";
        }


        return;
    }


    /* =========================
       PROJECT LABEL
    ========================= */

    if (actionsProjectLabel) {

        actionsProjectLabel.textContent =
            `Akcije za: ${
                project.type ||
                project.name ||
                "Projekt"
            }`;
    }


    /* =========================
       APPROVE
    ========================= */

    if (approveDesignAction) {

        approveDesignAction.href =
            `approve.html?id=${project.id}`;


        approveDesignAction.removeAttribute(
            "aria-disabled"
        );
    }


    /* =========================
       REVISION - LOADING
    ========================= */

    if (revisionAction) {

        revisionAction.href =
            "#";


        revisionAction.setAttribute(
            "aria-disabled",
            "true"
        );
    }


    if (revisionActionText) {

        revisionActionText.textContent =
            "Provjeravam...";
    }


    /* =========================
       FIND LATEST DESIGN
    ========================= */

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "project_designs"
            )
            .select(`
                id,
                project_id,
                created_at
            `)
            .eq(
                "project_id",
                project.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1);


    /*
        Ako je korisnik prebacio slider
        dok je query trajao,
        ignoriramo stari odgovor.
    */

    if (
        token !==
        actionUpdateToken
    ) {

        return;
    }


    if (
        error ||
        !data ||
        data.length === 0
    ) {

        if (error) {

            console.error(
                "Greška kod provjere dizajna:",
                error
            );
        }


        if (revisionAction) {

            revisionAction.href =
                "#";


            revisionAction.setAttribute(
                "aria-disabled",
                "true"
            );
        }


        if (revisionActionText) {

            revisionActionText.textContent =
                "Nema dizajna";
        }


        return;
    }


    const design =
        data[0];


    if (revisionAction) {

        revisionAction.href =
            `revision.html?id=${project.id}&design=${design.id}`;


        revisionAction.removeAttribute(
            "aria-disabled"
        );
    }


    if (revisionActionText) {

        revisionActionText.textContent =
            "Nova izmjena";
    }
}


/* =========================
   PREVENT DISABLED LINKS
========================= */

revisionAction
    ?.addEventListener(
        "click",
        function (event) {

            if (
                revisionAction.getAttribute(
                    "aria-disabled"
                ) === "true"
            ) {

                event.preventDefault();
            }
        }
    );


approveDesignAction
    ?.addEventListener(
        "click",
        function (event) {

            if (
                approveDesignAction.getAttribute(
                    "aria-disabled"
                ) === "true"
            ) {

                event.preventDefault();
            }
        }
    );


/* =========================
   RENDER PROJECTS
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
       NO PROJECTS
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


        activeProjectIndex =
            0;


        updateProjectActions();


        return;
    }


    /* =========================
       PROJECTS
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


            slide.className =
                "project-slide";


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
                                        rx="2"
                                    ></rect>

                                    <path
                                        d="M8 21h8"
                                    ></path>

                                    <path
                                        d="M12 17v4"
                                    ></path>

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


                        <!-- PACKAGE -->

                        <div class="stat-card">

                            <div class="stat-icon">

                                <svg viewBox="0 0 24 24">

                                    <rect
                                        x="3"
                                        y="7"
                                        width="18"
                                        height="13"
                                        rx="2"
                                    ></rect>

                                    <path
                                        d="M8 7V5"
                                    ></path>

                                    <path
                                        d="M16 7V5"
                                    ></path>

                                    <path
                                        d="M8 5h8"
                                    ></path>

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


                        <!-- PROGRESS -->

                        <div class="stat-card">

                            <div class="stat-icon">

                                <svg viewBox="0 0 24 24">

                                    <path
                                        d="M5 20V12"
                                    ></path>

                                    <path
                                        d="M10 20V7"
                                    ></path>

                                    <path
                                        d="M15 20V4"
                                    ></path>

                                    <path
                                        d="M20 20V10"
                                    ></path>

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
                                        ></div>

                                    </div>

                                    <strong>
                                        ${progress}%
                                    </strong>

                                </div>

                            </div>

                        </div>


                        <!-- DEADLINE -->

                        <div class="stat-card">

                            <div class="stat-icon">

                                <svg viewBox="0 0 24 24">

                                    <rect
                                        x="3"
                                        y="5"
                                        width="18"
                                        height="16"
                                        rx="2"
                                    ></rect>

                                    <path
                                        d="M8 3v4"
                                    ></path>

                                    <path
                                        d="M16 3v4"
                                    ></path>

                                    <path
                                        d="M3 10h18"
                                    ></path>

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


                        <!-- LAST UPDATE -->

                        <div class="stat-card">

                            <div class="stat-icon">

                                <svg viewBox="0 0 24 24">

                                    <path
                                        d="M20 11a8 8 0 1 1-2.34-5.66"
                                    ></path>

                                    <path
                                        d="M20 4v7h-7"
                                    ></path>

                                </svg>

                            </div>


                            <div>

                                <span class="stat-label">
                                    Zadnje ažurirano
                                </span>

                                <strong class="latest-update">
                                    -
                                </strong>

                            </div>

                        </div>


                    </div>


                </a>
            `;


            projectsSlider
                .appendChild(
                    slide
                );


            /* LAST UPDATE */

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


            dot.className =
                "slider-dot";


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


            sliderDots
                .appendChild(
                    dot
                );
        }
    );


    activeProjectIndex =
        0;


    currentProject.textContent =
        "1";


    updateProjectActions();
}


/* =========================
   SLIDER
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


                        if (
                            activeProjectIndex !==
                            index
                        ) {

                            activeProjectIndex =
                                index;


                            updateProjectActions();
                        }


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
                                    dotIndex ===
                                    index
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
   UNREAD MESSAGES
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
                async () => {

                    await loadMessagesUnreadCount(
                        userId
                    );
                }
            )
            .subscribe();
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
       SUPPORT
    ========================= */

    await loadMessagesUnreadCount(
        session.user.id
    );


    subscribeToSupportRealtime(
        session.user.id
    );


    /* =========================
       PROFILE
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


    if (profileError) {

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
       PROJECTS
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


    if (projectError) {

        console.error(
            "Greška kod projekata:",
            projectError
        );


        projects =
            [];


        renderProjects();


        return;
    }


    projects =
        data || [];


    renderProjects();
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
   VISIBILITY
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
