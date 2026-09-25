const ADMIN_NOTIFICATIONS_SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const ADMIN_NOTIFICATIONS_SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";


const adminNotificationsSupabase =
    supabase.createClient(
        ADMIN_NOTIFICATIONS_SUPABASE_URL,
        ADMIN_NOTIFICATIONS_SUPABASE_KEY
    );


const supportUnreadBadge =
    document.getElementById(
        "supportUnreadBadge"
    );


let adminNotificationsChannel =
    null;


/* =========================
   LOAD UNREAD COUNT
========================= */

async function loadAdminSupportUnreadCount() {

    if (!supportUnreadBadge) {
        return;
    }


    const {
        count,
        error
    } =
        await adminNotificationsSupabase
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
                "sender_role",
                "client"
            )
            .is(
                "admin_read_at",
                null
            );


    if (error) {

        console.error(
            "Support unread count error:",
            error
        );

        return;
    }


    const unreadCount =
        count || 0;


    if (unreadCount > 0) {

        supportUnreadBadge.hidden =
            false;


        supportUnreadBadge.textContent =
            unreadCount > 99
                ? "99+"
                : String(
                    unreadCount
                );

    } else {

        supportUnreadBadge.hidden =
            true;


        supportUnreadBadge.textContent =
            "0";
    }
}


/* =========================
   REALTIME
========================= */

function subscribeAdminSupportNotifications() {

    if (
        !supportUnreadBadge ||
        adminNotificationsChannel
    ) {
        return;
    }


    adminNotificationsChannel =
        adminNotificationsSupabase
            .channel(
                "global-admin-support-notifications"
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "support_messages"
                },
                async () => {

                    await loadAdminSupportUnreadCount();
                }
            )
            .subscribe(
                status => {

                    console.log(
                        "Admin notifications realtime:",
                        status
                    );
                }
            );
}


/* =========================
   TAB REFRESH
========================= */

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState ===
            "visible"
        ) {

            await loadAdminSupportUnreadCount();
        }
    }
);


/* =========================
   START
========================= */

async function startAdminNotifications() {

    if (!supportUnreadBadge) {
        return;
    }


    const {
        data: {
            session
        },
        error
    } =
        await adminNotificationsSupabase
            .auth
            .getSession();


    if (
        error ||
        !session
    ) {
        return;
    }


    await loadAdminSupportUnreadCount();

    subscribeAdminSupportNotifications();
}


startAdminNotifications();
