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

const adminUserName =
    document.getElementById(
        "adminUserName"
    );

const adminLogoutButton =
    document.getElementById(
        "adminLogoutButton"
    );

const supportConversationCount =
    document.getElementById(
        "supportConversationCount"
    );

const supportUnreadBadge =
    document.getElementById(
        "supportUnreadBadge"
    );

const supportSearch =
    document.getElementById(
        "supportSearch"
    );

const supportConversationList =
    document.getElementById(
        "supportConversationList"
    );

const supportChatEmpty =
    document.getElementById(
        "supportChatEmpty"
    );

const supportChatContent =
    document.getElementById(
        "supportChatContent"
    );

const supportClientAvatar =
    document.getElementById(
        "supportClientAvatar"
    );

const supportClientName =
    document.getElementById(
        "supportClientName"
    );

const adminSupportMessages =
    document.getElementById(
        "adminSupportMessages"
    );

const adminSupportInput =
    document.getElementById(
        "adminSupportInput"
    );

const adminSupportSend =
    document.getElementById(
        "adminSupportSend"
    );

const adminSupportNotice =
    document.getElementById(
        "adminSupportNotice"
    );


let currentSession = null;

let allProfiles = [];

let allMessages = [];

let conversations = [];

let selectedUserId = null;


/* =========================
   HELPERS
========================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDateTime(value) {

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


    return date.toLocaleString(
        "hr-HR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
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


function showNotice(
    message,
    type = "success"
) {

    if (!adminSupportNotice) {
        return;
    }


    adminSupportNotice.hidden =
        false;


    adminSupportNotice.className =
        `admin-support-notice ${type}`;


    adminSupportNotice.textContent =
        message;
}


function hideNotice() {

    if (!adminSupportNotice) {
        return;
    }


    adminSupportNotice.hidden =
        true;


    adminSupportNotice.className =
        "admin-support-notice";


    adminSupportNotice.textContent =
        "";
}


/* =========================
   UNREAD
========================= */

function getUnreadCount() {

    return allMessages.filter(
        message =>
            message.sender_role === "client" &&
            !message.admin_read_at
    ).length;
}


function getUnreadCountForUser(
    userId
) {

    return allMessages.filter(
        message =>
            String(
                message.user_id
            ) ===
                String(userId) &&
            message.sender_role === "client" &&
            !message.admin_read_at
    ).length;
}


function updateUnreadBadge() {

    if (!supportUnreadBadge) {
        return;
    }


    const unreadCount =
        getUnreadCount();


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
   SESSION
========================= */

async function requireAdminSession() {

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

        return false;
    }


    currentSession =
        session;


    const {
        data: profile,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                display_name,
                role
            `)
            .eq(
                "id",
                session.user.id
            )
            .maybeSingle();


    if (
        profileError ||
        !profile
    ) {

        console.error(
            "Admin profile error:",
            profileError
        );


        window.location.href =
            "login.html";

        return false;
    }


    if (
        profile.role !== "admin"
    ) {

        window.location.href =
            "form.html";

        return false;
    }


    if (
        adminUserName &&
        profile.display_name
    ) {

        adminUserName.textContent =
            profile.display_name;
    }


    return true;
}


/* =========================
   LOGOUT
========================= */

adminLogoutButton
    ?.addEventListener(
        "click",
        async () => {

            await supabaseClient
                .auth
                .signOut();


            window.location.href =
                "login.html";
        }
    );


/* =========================
   LOAD PROFILES
========================= */

async function loadProfiles() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                display_name,
                role
            `)
            .order(
                "display_name",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Profiles error:",
            error
        );


        showNotice(
            "Klijente nije moguće učitati.",
            "error"
        );


        return;
    }


    allProfiles =
        (data || [])
            .filter(
                profile =>
                    profile.role !==
                    "admin"
            );
}


/* =========================
   LOAD SUPPORT MESSAGES
========================= */

async function loadSupportMessages() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "support_messages"
            )
            .select(`
                id,
                created_at,
                user_id,
                sender_role,
                message,
                admin_read_at
            `)
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Support messages error:",
            error
        );


        if (
            supportConversationList
        ) {

            supportConversationList.innerHTML = `
                <div class="admin-support-empty">
                    Razgovore nije moguće učitati.
                </div>
            `;
        }


        showNotice(
            "Razgovore nije moguće učitati.",
            "error"
        );


        return;
    }


    allMessages =
        data || [];


    updateUnreadBadge();

    buildConversations();
}


/* =========================
   BUILD CONVERSATIONS
========================= */

function buildConversations() {

    const profileMap =
        Object.fromEntries(
            allProfiles.map(
                profile => [
                    String(
                        profile.id
                    ),
                    profile
                ]
            )
        );


    const grouped = {};


    for (
        const message
        of allMessages
    ) {

        const userId =
            String(
                message.user_id
            );


        if (!grouped[userId]) {

            grouped[userId] = {

                user_id:
                    userId,

                profile:
                    profileMap[
                        userId
                    ] ||
                    null,

                messages: []
            };
        }


        grouped[
            userId
        ].messages.push(
            message
        );
    }


    conversations =
        Object.values(
            grouped
        )
            .map(
                conversation => {

                    const lastMessage =
                        conversation
                            .messages[
                                conversation
                                    .messages
                                    .length - 1
                            ];


                    return {

                        ...conversation,

                        lastMessage:
                            lastMessage ||
                            null,

                        unreadCount:
                            getUnreadCountForUser(
                                conversation.user_id
                            )
                    };
                }
            )
            .sort(
                (a, b) => {

                    const aTime =
                        new Date(
                            a.lastMessage
                                ?.created_at ||
                            0
                        )
                            .getTime();


                    const bTime =
                        new Date(
                            b.lastMessage
                                ?.created_at ||
                            0
                        )
                            .getTime();


                    return (
                        bTime -
                        aTime
                    );
                }
            );


    if (
        supportConversationCount
    ) {

        supportConversationCount.textContent =
            conversations.length;
    }


    renderConversationList();
}


/* =========================
   CONVERSATION LIST
========================= */

function renderConversationList() {

    if (!supportConversationList) {
        return;
    }


    const search =
        String(
            supportSearch
                ?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const filtered =
        conversations.filter(
            conversation => {

                const name =
                    conversation
                        .profile
                        ?.display_name ||
                    "Klijent";


                return (
                    !search ||
                    name
                        .toLowerCase()
                        .includes(
                            search
                        )
                );
            }
        );


    if (
        filtered.length === 0
    ) {

        supportConversationList.innerHTML = `
            <div class="admin-support-empty">
                Nema razgovora.
            </div>
        `;

        return;
    }


    supportConversationList.innerHTML =
        filtered
            .map(
                conversation => {

                    const name =
                        conversation
                            .profile
                            ?.display_name ||
                        "Klijent";


                    const last =
                        conversation
                            .lastMessage;


                    return `

                        <button
                            type="button"
                            class="
                                admin-support-conversation
                                ${
                                    selectedUserId ===
                                    conversation.user_id
                                        ? "active"
                                        : ""
                                }
                            "
                            data-user-id="${escapeHtml(
                                conversation.user_id
                            )}"
                        >

                            <div class="admin-support-conversation-avatar">

                                ${escapeHtml(
                                    getInitials(
                                        name
                                    )
                                )}

                            </div>


                            <div class="admin-support-conversation-main">


                                <div class="admin-support-conversation-top">


                                    <strong>
                                        ${escapeHtml(
                                            name
                                        )}
                                    </strong>


                                    <span>
                                        ${
                                            last
                                                ? formatDateTime(
                                                    last.created_at
                                                )
                                                : ""
                                        }
                                    </span>


                                </div>


                                <div class="admin-support-conversation-preview">

                                    <p>
                                        ${escapeHtml(
                                            last?.message ||
                                            "Nema poruka"
                                        )}
                                    </p>


                                    ${
                                        conversation.unreadCount > 0

                                            ? `
                                                <span class="admin-support-unread-count">
                                                    ${
                                                        conversation.unreadCount > 99
                                                            ? "99+"
                                                            : conversation.unreadCount
                                                    }
                                                </span>
                                            `

                                            : ""
                                    }

                                </div>


                            </div>

                        </button>
                    `;
                }
            )
            .join("");


    document
        .querySelectorAll(
            ".admin-support-conversation"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    async () => {

                        await openConversation(
                            button.dataset.userId
                        );
                    }
                );
            }
        );
}


/* =========================
   MARK AS READ
========================= */

async function markConversationAsRead(
    userId
) {

    const unreadIds =
        allMessages
            .filter(
                message =>
                    String(
                        message.user_id
                    ) ===
                        String(
                            userId
                        ) &&
                    message.sender_role ===
                        "client" &&
                    !message.admin_read_at
            )
            .map(
                message =>
                    message.id
            );


    if (
        unreadIds.length === 0
    ) {

        return;
    }


    const readAt =
        new Date()
            .toISOString();


    const {
        error
    } =
        await supabaseClient
            .from(
                "support_messages"
            )
            .update({

                admin_read_at:
                    readAt
            })
            .in(
                "id",
                unreadIds
            );


    if (error) {

        console.error(
            "Read update error:",
            error
        );


        return;
    }


    for (
        const message
        of allMessages
    ) {

        if (
            unreadIds.includes(
                message.id
            )
        ) {

            message.admin_read_at =
                readAt;
        }
    }


    updateUnreadBadge();
}


/* =========================
   OPEN CONVERSATION
========================= */

async function openConversation(
    userId
) {

    let conversation =
        conversations.find(
            item =>
                item.user_id ===
                String(
                    userId
                )
        );


    if (!conversation) {
        return;
    }


    selectedUserId =
        conversation.user_id;


    await markConversationAsRead(
        selectedUserId
    );


    /*
        Ponovno napravimo conversations
        kako bi nestao unread broj
        uz tog klijenta.
    */

    buildConversations();


    conversation =
        conversations.find(
            item =>
                item.user_id ===
                String(
                    selectedUserId
                )
        );


    if (!conversation) {
        return;
    }


    if (
        supportChatEmpty
    ) {

        supportChatEmpty.hidden =
            true;
    }


    if (
        supportChatContent
    ) {

        supportChatContent.hidden =
            false;
    }


    const name =
        conversation
            .profile
            ?.display_name ||
        "Klijent";


    if (
        supportClientName
    ) {

        supportClientName.textContent =
            name;
    }


    if (
        supportClientAvatar
    ) {

        supportClientAvatar.textContent =
            getInitials(
                name
            );
    }


    renderActiveMessages(
        conversation.messages
    );
}


/* =========================
   RENDER ACTIVE CHAT
========================= */

function renderActiveMessages(
    messages
) {

    if (!adminSupportMessages) {
        return;
    }


    if (
        !messages ||
        messages.length === 0
    ) {

        adminSupportMessages.innerHTML = `
            <div class="admin-support-empty">
                Nema poruka.
            </div>
        `;

        return;
    }


    adminSupportMessages.innerHTML =
        messages
            .map(
                message => {

                    const isAdmin =
                        message.sender_role ===
                        "admin";


                    return `

                        <div
                            class="
                                admin-support-message
                                ${
                                    isAdmin
                                        ? "admin"
                                        : "client"
                                }
                            "
                        >


                            <div class="admin-support-message-top">


                                <strong>
                                    ${
                                        isAdmin
                                            ? "Admin"
                                            : "Klijent"
                                    }
                                </strong>


                                <span>
                                    ${formatDateTime(
                                        message.created_at
                                    )}
                                </span>


                            </div>


                            <p>
                                ${escapeHtml(
                                    message.message
                                )}
                            </p>


                        </div>
                    `;
                }
            )
            .join("");


    adminSupportMessages.scrollTop =
        adminSupportMessages
            .scrollHeight;
}


/* =========================
   SEND ADMIN MESSAGE
========================= */

adminSupportSend
    ?.addEventListener(
        "click",
        async () => {

            hideNotice();


            if (!selectedUserId) {

                showNotice(
                    "Prvo odaberi razgovor.",
                    "error"
                );

                return;
            }


            const message =
                adminSupportInput
                    ?.value
                    .trim();


            if (
                !message ||
                message.length < 2
            ) {

                showNotice(
                    "Napiši odgovor prije slanja.",
                    "error"
                );

                return;
            }


            adminSupportSend.disabled =
                true;


            adminSupportSend.textContent =
                "Šaljem...";


            const {
                error
            } =
                await supabaseClient
                    .from(
                        "support_messages"
                    )
                    .insert({

                        user_id:
                            selectedUserId,

                        sender_role:
                            "admin",

                        message:
                            message,

                        admin_read_at:
                            new Date()
                                .toISOString()
                    });


            if (error) {

                console.error(
                    "Admin send error:",
                    error
                );


                showNotice(
                    "Odgovor nije moguće poslati.",
                    "error"
                );


                adminSupportSend.disabled =
                    false;


                adminSupportSend.textContent =
                    "Pošalji odgovor";


                return;
            }


            adminSupportInput.value =
                "";


            showNotice(
                "Odgovor je poslan.",
                "success"
            );


            adminSupportSend.disabled =
                false;


            adminSupportSend.textContent =
                "Pošalji odgovor";


            const keepUserId =
                selectedUserId;


            await loadSupportMessages();


            await openConversation(
                keepUserId
            );
        }
    );


/* =========================
   ENTER TO SEND
========================= */

adminSupportInput
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                adminSupportSend
                    ?.click();
            }
        }
    );


/* =========================
   SEARCH
========================= */

supportSearch
    ?.addEventListener(
        "input",
        renderConversationList
    );


/* =========================
   START
========================= */

async function startAdminSupport() {

    hideNotice();


    const isAdmin =
        await requireAdminSession();


    if (!isAdmin) {
        return;
    }


    await loadProfiles();

    await loadSupportMessages();
}


/* =========================
   INIT
========================= */

startAdminSupport();
