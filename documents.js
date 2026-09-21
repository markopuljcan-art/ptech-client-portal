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


    if (extension === "pdf") {
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


    return "FILE";
}


/* =========================
   USER PROFILE
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
                display_name
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
                type
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

        return;
    }


    allProjects =
        data || [];


    if (projectFilter) {

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


    return data?.signedUrl || null;
}


/* =========================
   RENDER
========================= */

async function renderDocuments(
    documents
) {

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
                            ${
                                escapeHtml(
                                    item.document_type ||
                                    "Ostalo"
                                )
                            }
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


startDocuments();
