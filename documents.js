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

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const themeToggle =
    document.getElementById(
        "themeToggle"
    );

const documentSearch =
    document.getElementById(
        "documentSearch"
    );

const projectFilter =
    document.getElementById(
        "projectFilter"
    );

const typeFilter =
    document.getElementById(
        "typeFilter"
    );

const documentsCount =
    document.getElementById(
        "documentsCount"
    );

const documentsList =
    document.getElementById(
        "documentsList"
    );

const documentsMessage =
    document.getElementById(
        "documentsMessage"
    );


let currentSession = null;

let allProjects = [];

let allDocuments = [];


/* =========================
   THEME
========================= */

function applyTheme(theme) {

    const finalTheme =
        theme === "light"
            ? "light"
            : "dark";


    document.documentElement
        .setAttribute(
            "data-theme",
            finalTheme
        );


    localStorage.setItem(
        "ptech-theme",
        finalTheme
    );


    if (themeToggle) {

        themeToggle.setAttribute(
            "aria-label",
            finalTheme === "light"
                ? "Uključi tamni način"
                : "Uključi svijetli način"
        );
    }
}


function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            "ptech-theme"
        );


    if (
        savedTheme === "light" ||
        savedTheme === "dark"
    ) {

        applyTheme(
            savedTheme
        );

        return;
    }


    applyTheme(
        "dark"
    );
}


themeToggle
    ?.addEventListener(
        "click",
        () => {

            const currentTheme =
                document.documentElement
                    .getAttribute(
                        "data-theme"
                    ) ||
                "dark";


            applyTheme(
                currentTheme === "dark"
                    ? "light"
                    : "dark"
            );
        }
    );


loadTheme();


/* =========================
   LOGOUT
========================= */

logoutButton
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


function formatBytes(bytes) {

    const value =
        Number(bytes || 0);


    if (value < 1024) {

        return `${value} B`;
    }


    if (
        value <
        1024 * 1024
    ) {

        return `${(
            value / 1024
        ).toFixed(1)} KB`;
    }


    return `${(
        value /
        (1024 * 1024)
    ).toFixed(1)} MB`;
}


function getFileType(name) {

    return String(
        name || ""
    )
        .split(".")
        .pop()
        .toLowerCase();
}


function getFileLabel(name) {

    const extension =
        getFileType(
            name
        );


    if (
        extension === "pdf"
    ) {

        return "PDF";
    }


    if (
        [
            "doc",
            "docx"
        ].includes(
            extension
        )
    ) {

        return "DOC";
    }


    if (
        [
            "xls",
            "xlsx"
        ].includes(
            extension
        )
    ) {

        return "XLS";
    }


    if (
        [
            "jpg",
            "jpeg",
            "png",
            "webp"
        ].includes(
            extension
        )
    ) {

        return "IMG";
    }


    if (
        [
            "zip",
            "rar",
            "7z"
        ].includes(
            extension
        )
    ) {

        return "ZIP";
    }


    return "FILE";
}


/* =========================
   MESSAGE
========================= */

function showMessage(
    message,
    type = "error"
) {

    if (!documentsMessage) {
        return;
    }


    documentsMessage.hidden =
        false;


    documentsMessage.className =
        `documents-message ${type}`;


    documentsMessage.textContent =
        message;
}


function hideMessage() {

    if (!documentsMessage) {
        return;
    }


    documentsMessage.hidden =
        true;

    documentsMessage.className =
        "documents-message";

    documentsMessage.textContent =
        "";
}


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
                role
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


    if (
        clientName &&
        data?.display_name
    ) {

        clientName.textContent =
            data.display_name;
    }
}


/* =========================
   PROJECTS
========================= */

async function loadProjects() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("projects")
            .select(`
                id,
                name,
                type,
                created_at
            `)
            .eq(
                "user_id",
                currentSession.user.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Projects error:",
            error
        );


        showMessage(
            "Projekte nije moguće učitati.",
            "error"
        );


        return;
    }


    allProjects =
        data || [];


    buildProjectFilter();
}


/* =========================
   PROJECT FILTER
========================= */

function buildProjectFilter() {

    if (!projectFilter) {
        return;
    }


    projectFilter.innerHTML = `
        <option value="">
            Svi projekti
        </option>
    `;


    for (
        const project
        of allProjects
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            String(
                project.id
            );


        option.textContent =
            project.type ||
            project.name ||
            `Projekt #${project.id}`;


        projectFilter
            .appendChild(
                option
            );
    }
}


/* =========================
   DOCUMENTS
========================= */

async function loadDocuments() {

    if (!documentsList) {
        return;
    }


    documentsList.innerHTML = `
        <div class="documents-empty">
            Učitavanje dokumenata...
        </div>
    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "project_documents"
            )
            .select(`
                id,
                created_at,
                project_id,
                name,
                file_url,
                document_type,
                file_size
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Documents error:",
            error
        );


        documentsList.innerHTML = `
            <div class="documents-empty">
                Dokumente nije moguće učitati.
            </div>
        `;


        showMessage(
            "Dokumente nije moguće učitati.",
            "error"
        );


        return;
    }


    const projectMap =
        Object.fromEntries(
            allProjects.map(
                project => [
                    String(
                        project.id
                    ),
                    project
                ]
            )
        );


    allDocuments =
        (data || [])
            .map(
                item => ({

                    ...item,

                    project:
                        projectMap[
                            String(
                                item.project_id
                            )
                        ] ||
                        null
                })
            );


    hideMessage();

    applyFilters();
}


/* =========================
   SIGNED URL
========================= */

async function getDocumentUrl(
    item
) {

    if (!item.file_url) {
        return null;
    }


    const value =
        String(
            item.file_url
        );


    if (
        value.startsWith(
            "http://"
        ) ||
        value.startsWith(
            "https://"
        )
    ) {

        return value;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .storage
            .from(
                "project-documents"
            )
            .createSignedUrl(
                value,
                3600
            );


    if (error) {

        console.error(
            "Signed URL error:",
            error
        );


        return null;
    }


    return (
        data?.signedUrl ||
        null
    );
}


/* =========================
   RENDER
========================= */

async function renderDocuments(
    documents
) {

    if (!documentsList) {
        return;
    }


    if (documentsCount) {

        documentsCount.textContent =
            documents.length;
    }


    if (
        !documents ||
        documents.length === 0
    ) {

        documentsList.innerHTML = `
            <div class="documents-empty">
                Trenutno nema dokumenata.
            </div>
        `;

        return;
    }


    const cards = [];


    for (
        const item
        of documents
    ) {

        const url =
            await getDocumentUrl(
                item
            );


        cards.push(`

            <article class="document-card">


                <div class="document-main">


                    <div class="document-icon">

                        ${getFileLabel(
                            item.name
                        )}

                    </div>


                    <div class="document-info">


                        <strong>

                            ${escapeHtml(
                                item.name ||
                                "Dokument"
                            )}

                        </strong>


                        <span>

                            ${escapeHtml(
                                item.project?.type ||
                                item.project?.name ||
                                "Projekt"
                            )}

                        </span>


                        <small>

                            ${escapeHtml(
                                item.document_type ||
                                "Ostalo"
                            )}

                            •

                            ${formatDate(
                                item.created_at
                            )}

                            •

                            ${formatBytes(
                                item.file_size
                            )}

                        </small>


                    </div>


                </div>


                ${
                    url

                        ? `
                            <a
                                href="${url}"
                                target="_blank"
                                rel="noopener"
                                class="document-open-button"
                            >
                                Otvori
                            </a>
                        `

                        : `
                            <span class="document-unavailable">
                                Nedostupno
                            </span>
                        `
                }


            </article>
        `);
    }


    documentsList.innerHTML =
        cards.join("");
}


/* =========================
   FILTER
========================= */

function applyFilters() {

    const search =
        String(
            documentSearch
                ?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const projectId =
        projectFilter
            ?.value ||
        "";


    const type =
        typeFilter
            ?.value ||
        "";


    const filtered =
        allDocuments.filter(
            item => {

                const searchValue =
                    `
                        ${item.name || ""}
                        ${item.project?.name || ""}
                        ${item.project?.type || ""}
                        ${item.document_type || ""}
                    `
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchValue.includes(
                        search
                    );


                const matchesProject =
                    !projectId ||
                    String(
                        item.project_id
                    ) ===
                    projectId;


                const matchesType =
                    !type ||
                    String(
                        item.document_type ||
                        "Ostalo"
                    ) ===
                    type;


                return (
                    matchesSearch &&
                    matchesProject &&
                    matchesType
                );
            }
        );


    renderDocuments(
        filtered
    );
}


/* =========================
   FILTER EVENTS
========================= */

documentSearch
    ?.addEventListener(
        "input",
        applyFilters
    );


projectFilter
    ?.addEventListener(
        "change",
        applyFilters
    );


typeFilter
    ?.addEventListener(
        "change",
        applyFilters
    );


/* =========================
   START
========================= */

async function startDocuments() {

    hideMessage();


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


    await loadProfile();

    await loadProjects();

    await loadDocuments();
}


/* =========================
   INIT
========================= */

startDocuments();
