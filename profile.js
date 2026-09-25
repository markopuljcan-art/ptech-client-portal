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
   ELEMENTI
========================= */

const clientName =
    document.getElementById(
        "clientName"
    );

const profileName =
    document.getElementById(
        "profileName"
    );

const profileDisplayName =
    document.getElementById(
        "profileDisplayName"
    );

const profileEmail =
    document.getElementById(
        "profileEmail"
    );

const profileEmailRow =
    document.getElementById(
        "profileEmailRow"
    );

const profileAvatar =
    document.getElementById(
        "profileAvatar"
    );

const profileProjectsCount =
    document.getElementById(
        "profileProjectsCount"
    );

const profileDocumentsCount =
    document.getElementById(
        "profileDocumentsCount"
    );

const profileCreatedAt =
    document.getElementById(
        "profileCreatedAt"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const profileLogoutButton =
    document.getElementById(
        "profileLogoutButton"
    );

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

const messagesUnreadBadge =
    document.getElementById(
        "messagesUnreadBadge"
    );


let currentSession = null;

let supportRealtimeChannel =
    null;


/* =========================
   HELPERS
========================= */

function formatDate(value) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


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


function getInitials(name) {

    const clean =
        String(name || "K")
            .trim();


    if (!clean) {
        return "K";
    }


    return clean
        .split(/\s+/)
        .slice(0, 2)
        .map(
            part =>
                part
                    .charAt(0)
                    .toUpperCase()
        )
        .join("");
}


/* =========================
   THEME
========================= */

function loadTheme() {

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
}


themeToggle
    ?.addEventListener(
        "change",
        () => {

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


loadTheme();


/* =========================
   LOGOUT
========================= */

async function logout() {

    if (
        supportRealtimeChannel
    ) {

        await supabaseClient
            .removeChannel(
                supportRealtimeChannel
            );
    }


    await supabaseClient
        .auth
        .signOut();


    window.location.href =
        "login.html";
}


logoutButton
    ?.addEventListener(
        "click",
        logout
    );


profileLogoutButton
    ?.addEventListener(
        "click",
        logout
    );


/* =========================
   PROFILE
========================= */

async function loadProfile() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                display_name,
                role,
                created_at
            `)
            .eq(
                "id",
                currentSession.user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Profile error:",
            error
        );

        return;
    }


    const name =
        data?.display_name ||
        currentSession.user.email
            ?.split("@")[0] ||
        "Klijent";


    const email =
        currentSession.user.email ||
        "-";


    if (clientName) {

        clientName.textContent =
            name;
    }


    if (profileName) {

        profileName.textContent =
            name;
    }


    if (profileDisplayName) {

        profileDisplayName.textContent =
            name;
    }


    if (profileEmail) {

        profileEmail.textContent =
            email;
    }


    if (profileEmailRow) {

        profileEmailRow.textContent =
            email;
    }


    if (profileAvatar) {

        profileAvatar.textContent =
            getInitials(name);
    }


    if (profileCreatedAt) {

        profileCreatedAt.textContent =
            formatDate(
                data?.created_at ||
                currentSession.user.created_at
            );
    }
}


/* =========================
   PROJECT COUNT
========================= */

async function loadProjectCount() {

    const {
        count,
        error
    } =
        await supabaseClient
            .from("projects")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "user_id",
                currentSession.user.id
            );


    if (error) {

        console.error(
            "Project count error:",
            error
        );

        return;
    }


    if (profileProjectsCount) {

        profileProjectsCount.textContent =
            count || 0;
    }
}


/* =========================
   DOCUMENT COUNT
========================= */

async function loadDocumentCount() {

    const {
        count,
        error
    } =
        await supabaseClient
            .from("documents")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "user_id",
                currentSession.user.id
            );


    if (error) {

        console.error(
            "Document count error:",
            error
        );


        if (profileDocumentsCount) {

            profileDocumentsCount.textContent =
                "0";
        }


        return;
    }


    if (profileDocumentsCount) {

        profileDocumentsCount.textContent =
            count || 0;
    }
}


/* =========================
   UNREAD SUPPORT
========================= */

async function loadMessagesUnreadCount() {

    if (
        !messagesUnreadBadge ||
        !currentSession
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
                currentSession.user.id
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
            "Unread support error:",
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
   REALTIME SUPPORT
========================= */

function subscribeToSupportRealtime() {

    if (
        !currentSession ||
        supportRealtimeChannel
    ) {
        return;
    }


    supportRealtimeChannel =
        supabaseClient
            .channel(
                `profile-support-${currentSession.user.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "support_messages",
                    filter:
                        `user_id=eq.${currentSession.user.id}`
                },
                async () => {

                    await loadMessagesUnreadCount();
                }
            )
            .subscribe();
}


/* =========================
   VISIBILITY
========================= */

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState ===
                "visible" &&
            currentSession
        ) {

            await loadMessagesUnreadCount();
        }
    }
);


/* =========================
   START
========================= */

async function startProfile() {

    const {
        data: {
            session
        },
        error
    } =
        await supabaseClient
            .auth
            .getSession();


    if (
        error ||
        !session
    ) {

        window.location.href =
            "login.html";


        return;
    }


    currentSession =
        session;


    await Promise.all([

        loadProfile(),

        loadProjectCount(),

        loadDocumentCount(),

        loadMessagesUnreadCount()

    ]);


    subscribeToSupportRealtime();
}


/* =========================
   INIT
========================= */

startProfile();
