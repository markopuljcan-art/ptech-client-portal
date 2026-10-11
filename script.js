
/* ==========================================
   PTECH DIGITAL CLIENT PORTAL
   DASHBOARD OVERVIEW
   Nedavne poruke + Korisni dokumenti
========================================== */

(() => {
    "use strict";

    const SUPABASE_URL =
        "https://agivwsbczzvvuzszcvxz.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

    const db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    const messagesContainer =
        document.getElementById("recentMessagesList");

    const documentsContainer =
        document.getElementById("recentDocumentsList");

    let signedInUser = null;
    let realtimeChannel = null;

    /* ======================================
       POMOĆNE FUNKCIJE
    ====================================== */

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "-";
        }

        return date.toLocaleDateString("hr-HR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function formatSize(value) {
        const bytes = Number(value || 0);

        if (!bytes) return "";

        if (bytes < 1024) {
            return `${bytes} B`;
        }

        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        return `${(
            bytes / (1024 * 1024)
        ).toFixed(1)} MB`;
    }

    function showEmpty(container, message) {
        if (!container) return;

        container.replaceChildren();

        const paragraph =
            document.createElement("p");

        paragraph.className = "overview-empty";
        paragraph.textContent = message;

        container.appendChild(paragraph);
    }

    function fileLabel(name) {
        const extension = String(name || "")
            .split(".")
            .pop()
            .toUpperCase();

        if (
            extension.length > 0 &&
            extension.length <= 4
        ) {
            return extension;
        }

        return "FILE";
    }

    /* ======================================
       NEDAVNE PORUKE
    ====================================== */

    async function loadRecentMessages() {
        if (!messagesContainer || !signedInUser) {
            return;
        }

        const { data, error } = await db
            .from("support_messages")
            .select("*")
            .eq("user_id", signedInUser.id)
            .order("created_at", {
                ascending: false
            })
            .limit(3);

        if (error) {
            console.error(
                "Greška kod nedavnih poruka:",
                error
            );

            showEmpty(
                messagesContainer,
                "Poruke trenutno nisu dostupne."
            );

            return;
        }

        if (!data || data.length === 0) {
            showEmpty(
                messagesContainer,
                "Trenutno nema poruka."
            );

            return;
        }

        messagesContainer.innerHTML =
            data.map(message => {
                const isAdmin =
                    message.sender_role === "admin";

                const sender = isAdmin
                    ? "PTech Digital"
                    : "Vi";

                const content =
                    message.message ??
                    message.content ??
                    message.body ??
                    "Poruka";

                const unread =
                    isAdmin &&
                    !message.client_read_at;

                return `
                    <a
                        href="messages.html"
                        class="overview-row"
                    >
                        <span class="overview-avatar">
                            ${isAdmin ? "P" : "V"}
                        </span>

                        <span class="overview-row-main">
                            <strong>
                                ${escapeHtml(sender)}
                                ${unread ? "•" : ""}
                            </strong>

                            <small>
                                ${escapeHtml(content)}
                            </small>
                        </span>

                        <time class="overview-row-date">
                            ${formatDate(
                                message.created_at
                            )}
                        </time>
                    </a>
                `;
            }).join("");
    }

    /* ======================================
       KORISNI DOKUMENTI
    ====================================== */

    async function loadRecentDocuments() {
        if (!documentsContainer || !signedInUser) {
            return;
        }

        /* Učitaj samo projekte korisnika */

        const {
            data: userProjects,
            error: projectsError
        } = await db
            .from("projects")
            .select("id")
            .eq("user_id", signedInUser.id);

        if (projectsError) {
            console.error(
                "Greška kod projekata:",
                projectsError
            );

            showEmpty(
                documentsContainer,
                "Dokumenti trenutno nisu dostupni."
            );

            return;
        }

        const projectIds =
            (userProjects || []).map(
                project => project.id
            );

        if (projectIds.length === 0) {
            showEmpty(
                documentsContainer,
                "Trenutno nema dokumenata."
            );

            return;
        }

        /* Dokumenti iz postojeće tablice */

        const { data, error } = await db
            .from("project_documents")
            .select(`
                id,
                name,
                created_at,
                project_id,
                file_size
            `)
            .in("project_id", projectIds)
            .order("created_at", {
                ascending: false
            })
            .limit(3);

        if (error) {
            console.error(
                "Greška kod dokumenata:",
                error
            );

            showEmpty(
                documentsContainer,
                "Dokumenti trenutno nisu dostupni."
            );

            return;
        }

        if (!data || data.length === 0) {
            showEmpty(
                documentsContainer,
                "Trenutno nema dokumenata."
            );

            return;
        }

        documentsContainer.innerHTML =
            data.map(item => {
                const name =
                    item.name || "Dokument";

                const size =
                    formatSize(item.file_size);

                return `
                    <div class="overview-row">
                        <span class="overview-file-icon">
                            ${escapeHtml(
                                fileLabel(name)
                            )}
                        </span>

                        <span class="overview-row-main">
                            <strong>
                                ${escapeHtml(name)}
                            </strong>

                            <small>
                                ${escapeHtml(size)}
                            </small>
                        </span>

                        <time class="overview-row-date">
                            ${formatDate(
                                item.created_at
                            )}
                        </time>

                        <a
                            class="overview-download"
                            href="documents.html"
                            aria-label="Otvori dokumente"
                            title="Otvori dokumente"
                        >
                            &darr;
                        </a>
                    </div>
                `;
            }).join("");
    }

    /* ======================================
       OSVJEŽAVANJE
    ====================================== */

    async function refreshOverview() {
        if (!signedInUser) return;

        await Promise.all([
            loadRecentMessages(),
            loadRecentDocuments()
        ]);
    }

    /* ======================================
       REALTIME PORUKE
    ====================================== */

    function subscribeToMessages() {
        if (!signedInUser || realtimeChannel) {
            return;
        }

        realtimeChannel = db
            .channel(
                `dashboard-overview-${signedInUser.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "support_messages",
                    filter:
                        `user_id=eq.${signedInUser.id}`
                },
                () => {
                    loadRecentMessages();
                }
            )
            .subscribe();
    }

    /* ======================================
       POKRETANJE
    ====================================== */

    async function startOverview() {
        if (
            !messagesContainer &&
            !documentsContainer
        ) {
            return;
        }

        if (!window.supabase) {
            console.error(
                "Supabase biblioteka nije učitana."
            );

            return;
        }

        const {
            data: { session },
            error
        } = await db.auth.getSession();

        if (error || !session) {
            showEmpty(
                messagesContainer,
                "Prijavi se za pregled poruka."
            );

            showEmpty(
                documentsContainer,
                "Prijavi se za pregled dokumenata."
            );

            return;
        }

        signedInUser = session.user;

        await refreshOverview();

        subscribeToMessages();
    }

    document.addEventListener(
        "visibilitychange",
        () => {
            if (
                document.visibilityState === "visible" &&
                signedInUser
            ) {
                refreshOverview();
            }
        }
    );

    db.auth.onAuthStateChange(
        (event, session) => {
            if (event === "SIGNED_OUT") {
                signedInUser = null;

                if (realtimeChannel) {
                    db.removeChannel(
                        realtimeChannel
                    );

                    realtimeChannel = null;
                }

                showEmpty(
                    messagesContainer,
                    "Prijavi se za pregled poruka."
                );

                showEmpty(
                    documentsContainer,
                    "Prijavi se za pregled dokumenata."
                );
            }
        }
    );

    startOverview();

})();
