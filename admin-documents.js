const SUPABASE_URL =
    "https://agivwsbczzvvuzszcvxz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


const documentsList =
    document.getElementById("documentsList");

const documentDetail =
    document.getElementById("documentDetail");

const documentsCount =
    document.getElementById("documentsCount");

const documentsStat =
    document.getElementById("documentsStat");

const documentProjectsStat =
    document.getElementById("documentProjectsStat");

const documentsSizeStat =
    document.getElementById("documentsSizeStat");

const documentSearch =
    document.getElementById("documentSearch");

const documentProjectFilter =
    document.getElementById("documentProjectFilter");

const documentClientFilter =
    document.getElementById("documentClientFilter");

const documentTypeFilter =
    document.getElementById("documentTypeFilter");

const documentsMessage =
    document.getElementById("documentsMessage");

const adminUserName =
    document.getElementById("adminUserName");

const logoutButton =
    document.getElementById("adminLogoutButton");

const openUploadButton =
    document.getElementById("openUploadButton");

const closeUploadButton =
    document.getElementById("closeUploadButton");

const documentUploadPanel =
    document.getElementById("documentUploadPanel");

const uploadProject =
    document.getElementById("uploadProject");

const uploadDocumentType =
    document.getElementById("uploadDocumentType");

const uploadDocumentFile =
    document.getElementById("uploadDocumentFile");

const uploadDocumentButton =
    document.getElementById("uploadDocumentButton");


let currentSession = null;

let allDocuments = [];

let allProjects = [];

let profileMap = {};


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

    return new Date(value)
        .toLocaleDateString(
            "hr-HR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );
}


function formatDateTime(value) {

    if (!value) {
        return "-";
    }

    return new Date(value)
        .toLocaleString(
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


function createSlug(value) {

    return String(value || "klijent")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim()
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        ) || "klijent";
}


function showMessage(
    message,
    type = "success"
) {

    documentsMessage.hidden =
        false;

    documentsMessage.className =
        `documents-message ${type}`;

    documentsMessage.textContent =
        message;
}


/* =========================
   LOGOUT
========================= */

logoutButton?.addEventListener(
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
   ADMIN CHECK
========================= */

async function checkAdmin(session) {

    const {
        data,
        error
    } =
        await supabaseClient
            .rpc(
                "is_admin_user",
                {
                    check_user_id:
                        session.user.id
                }
            );


    if (error) {

        console.error(error);

        return false;
    }


    return data === true;
}


/* =========================
   ADMIN PROFILE
========================= */

async function loadAdminProfile(
    session
) {

    const {
        data
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
        adminUserName &&
        data?.display_name
    ) {

        adminUserName.textContent =
            data.display_name;
    }
}


/* =========================
   PROJECTS + CLIENTS
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
                user_id
            `)
            .order(
                "name",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Projects:",
            error
        );

        return;
    }


    allProjects =
        data || [];


    const userIds =
        [
            ...new Set(
                allProjects
                    .map(
                        project =>
                            project.user_id
                    )
                    .filter(Boolean)
            )
        ];


    if (
        userIds.length > 0
    ) {

        const {
            data: profiles
        } =
            await supabaseClient
                .from("profiles")
                .select(`
                    id,
                    display_name
                `)
                .in(
                    "id",
                    userIds
                );


        for (
            const profile
            of profiles || []
        ) {

            profileMap[
                profile.id
            ] =
                profile.display_name ||
                "Klijent";
        }
    }


    buildFilters();
}


/* =========================
   FILTER DROPDOWNS
========================= */

function buildFilters() {

    documentProjectFilter.innerHTML = `
        <option value="">
            Svi projekti
        </option>
    `;

    uploadProject.innerHTML = `
        <option value="">
            Odaberi projekt
        </option>
    `;


    for (
        const project
        of allProjects
    ) {

        const label =
            project.type ||
            project.name ||
            `Projekt #${project.id}`;


        const option =
            document.createElement(
                "option"
            );

        option.value =
            project.id;

        option.textContent =
            label;

        documentProjectFilter
            .appendChild(
                option
            );


        const uploadOption =
            option.cloneNode(true);

        uploadProject
            .appendChild(
                uploadOption
            );
    }


    const clients =
        [
            ...new Map(
                allProjects.map(
                    project => [
                        project.user_id,
                        profileMap[
                            project.user_id
                        ] ||
                        "Klijent"
                    ]
                )
            ).entries()
        ];


    documentClientFilter.innerHTML = `
        <option value="">
            Svi klijenti
        </option>
    `;


    for (
        const [
            userId,
            name
        ]
        of clients
    ) {

        if (!userId) {
            continue;
        }


        const option =
            document.createElement(
                "option"
            );


        option.value =
            userId;

        option.textContent =
            name;


        documentClientFilter
            .appendChild(
                option
            );
    }
}


/* =========================
   DOCUMENTS
========================= */

async function loadDocuments() {

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
                uploaded_by,
                file_path,
                file_name,
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
            "Documents:",
            error
        );

        documentsList.innerHTML = `
            <div class="admin-empty">
                Dokumente nije moguće učitati.
            </div>
        `;

        return;
    }


    const projectMap =
        Object.fromEntries(
            allProjects.map(
                project => [
                    project.id,
                    project
                ]
            )
        );


    allDocuments =
        (data || [])
            .map(
                document => {

                    const project =
                        projectMap[
                            document.project_id
                        ];


                    return {

                        ...document,

                        project,

                        client_id:
                            project?.user_id ||
                            null,

                        client_name:
                            profileMap[
                                project?.user_id
                            ] ||
                            "Klijent"
                    };
                }
            );


    updateStats();

    renderDocuments(
        allDocuments
    );
}


/* =========================
   STATS
========================= */

function updateStats() {

    const total =
        allDocuments.length;


    const projects =
        new Set(
            allDocuments.map(
                document =>
                    document.project_id
            )
        );


    const size =
        allDocuments.reduce(
            (
                totalSize,
                document
            ) =>
                totalSize +
                Number(
                    document.file_size ||
                    0
                ),
            0
        );


    documentsCount.textContent =
        total;

    documentsStat.textContent =
        total;

    documentProjectsStat.textContent =
        projects.size;

    documentsSizeStat.textContent =
        formatBytes(size);
}


/* =========================
   RENDER LIST
========================= */

function renderDocuments(
    documents
) {

    if (
        !documents.length
    ) {

        documentsList.innerHTML = `
            <div class="admin-empty">
                Nema dokumenata koji odgovaraju filterima.
            </div>
        `;

        return;
    }


    documentsList.innerHTML =
        documents
            .map(
                document => {

                    const project =
                        document.project;


                    return `

                        <button
                            type="button"
                            class="document-row"
                            data-document-id="${document.id}"
                        >

                            <div class="document-file-main">

                                <div class="document-file-icon">
                                    ${getFileIcon(
                                        document.file_name
                                    )}
                                </div>

                                <div>

                                    <strong>
                                        ${escapeHtml(
                                            document.file_name ||
                                            "Dokument"
                                        )}
                                    </strong>

                                    <span>
                                        ${formatBytes(
                                            document.file_size
                                        )}
                                    </span>

                                </div>

                            </div>


                            <div>
                                ${escapeHtml(
                                    project?.type ||
                                    project?.name ||
                                    "-"
                                )}
                            </div>


                            <div>
                                ${escapeHtml(
                                    document.client_name
                                )}
                            </div>


                            <div>

                                <span class="document-type-badge">
                                    ${escapeHtml(
                                        document.document_type ||
                                        "Ostalo"
                                    )}
                                </span>

                            </div>


                            <div>
                                ${formatDate(
                                    document.created_at
                                )}
                            </div>

                        </button>
                    `;
                }
            )
            .join("");


    setupDocumentRows();
}


function getFileIcon(fileName) {

    const extension =
        String(
            fileName || ""
        )
            .split(".")
            .pop()
            .toLowerCase();


    if (extension === "pdf") {
        return "PDF";
    }

    if (
        extension === "jpg" ||
        extension === "jpeg" ||
        extension === "png" ||
        extension === "webp"
    ) {
        return "IMG";
    }

    if (
        extension === "doc" ||
        extension === "docx"
    ) {
        return "DOC";
    }

    if (
        extension === "xls" ||
        extension === "xlsx"
    ) {
        return "XLS";
    }


    return "FILE";
}


/* =========================
   FILTERS
========================= */

function applyFilters() {

    const search =
        String(
            documentSearch.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const projectId =
        documentProjectFilter
            .value;


    const clientId =
        documentClientFilter
            .value;


    const type =
        documentTypeFilter
            .value;


    const filtered =
        allDocuments.filter(
            document => {

                const searchText =
                    `
                        ${document.file_name || ""}
                        ${document.project?.name || ""}
                        ${document.project?.type || ""}
                        ${document.client_name || ""}
                        ${document.document_type || ""}
                    `
                        .toLowerCase();


                return (

                    (
                        !search ||
                        searchText.includes(
                            search
                        )
                    )

                    &&

                    (
                        !projectId ||
                        String(
                            document.project_id
                        ) ===
                        projectId
                    )

                    &&

                    (
                        !clientId ||
                        document.client_id ===
                        clientId
                    )

                    &&

                    (
                        !type ||
                        document.document_type ===
                        type
                    )

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

documentProjectFilter
    ?.addEventListener(
        "change",
        applyFilters
    );

documentClientFilter
    ?.addEventListener(
        "change",
        applyFilters
    );

documentTypeFilter
    ?.addEventListener(
        "change",
        applyFilters
    );


/* =========================
   DETAIL
========================= */

function setupDocumentRows() {

    document
        .querySelectorAll(
            ".document-row"
        )
        .forEach(
            row => {

                row.addEventListener(
                    "click",
                    () => {

                        const id =
                            Number(
                                row.dataset
                                    .documentId
                            );


                        const documentData =
                            allDocuments.find(
                                item =>
                                    item.id ===
                                    id
                            );


                        if (
                            documentData
                        ) {

                            showDocumentDetail(
                                documentData
                            );
                        }
                    }
                );
            }
        );
}


async function showDocumentDetail(
    documentData
) {

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
                documentData.file_path,
                3600
            );


    const signedUrl =
        error
            ? null
            : data?.signedUrl;


    const extension =
        String(
            documentData.file_name ||
            ""
        )
            .split(".")
            .pop()
            .toLowerCase();


    let preview = `
        <div class="document-no-preview">
            Pregled nije dostupan za ovu vrstu datoteke.
        </div>
    `;


    if (
        signedUrl &&
        [
            "jpg",
            "jpeg",
            "png",
            "webp"
        ].includes(
            extension
        )
    ) {

        preview = `
            <img
                class="document-preview-image"
                src="${signedUrl}"
                alt="Pregled dokumenta"
            >
        `;
    }


    if (
        signedUrl &&
        extension === "pdf"
    ) {

        preview = `
            <iframe
                class="document-preview-pdf"
                src="${signedUrl}"
                title="PDF pregled"
            ></iframe>
        `;
    }


    documentDetail.innerHTML = `

        <div class="document-detail-header">

            <div>

                <span>
                    Dokument
                </span>

                <h3>
                    ${escapeHtml(
                        documentData.file_name
                    )}
                </h3>

            </div>

            <span class="document-type-badge">
                ${escapeHtml(
                    documentData.document_type ||
                    "Ostalo"
                )}
            </span>

        </div>


        <div class="document-preview">
            ${preview}
        </div>


        <div class="document-detail-meta">

            <div>
                <span>Projekt</span>
                <strong>
                    ${escapeHtml(
                        documentData.project?.type ||
                        documentData.project?.name ||
                        "-"
                    )}
                </strong>
            </div>

            <div>
                <span>Klijent</span>
                <strong>
                    ${escapeHtml(
                        documentData.client_name
                    )}
                </strong>
            </div>

            <div>
                <span>Vrsta</span>
                <strong>
                    ${escapeHtml(
                        documentData.document_type ||
                        "Ostalo"
                    )}
                </strong>
            </div>

            <div>
                <span>Veličina</span>
                <strong>
                    ${formatBytes(
                        documentData.file_size
                    )}
                </strong>
            </div>

            <div>
                <span>Datum</span>
                <strong>
                    ${formatDateTime(
                        documentData.created_at
                    )}
                </strong>
            </div>

        </div>


        ${
            signedUrl
                ? `
                    <a
                        href="${signedUrl}"
                        target="_blank"
                        rel="noopener"
                        class="document-download-button"
                    >
                        Otvori dokument
                    </a>
                `
                : ""
        }
    `;
}


/* =========================
   UPLOAD PANEL
========================= */

openUploadButton
    ?.addEventListener(
        "click",
        () => {

            documentUploadPanel.hidden =
                false;
        }
    );


closeUploadButton
    ?.addEventListener(
        "click",
        () => {

            documentUploadPanel.hidden =
                true;
        }
    );


/* =========================
   UPLOAD
========================= */

uploadDocumentButton
    ?.addEventListener(
        "click",
        async () => {

            const projectId =
                Number(
                    uploadProject.value
                );


            const file =
                uploadDocumentFile
                    .files?.[0];


            const type =
                uploadDocumentType
                    .value;


            if (
                !projectId ||
                !file
            ) {

                showMessage(
                    "Odaberi projekt i datoteku.",
                    "error"
                );

                return;
            }


            const project =
                allProjects.find(
                    item =>
                        item.id ===
                        projectId
                );


            if (!project) {
                return;
            }


            const clientName =
                profileMap[
                    project.user_id
                ] ||
                "klijent";


            const clientSlug =
                createSlug(
                    clientName
                );


            const safeName =
                file.name
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9._-]+/g,
                        "-"
                    );


            const filePath =
                `${clientSlug}/projekt-${projectId}/${Date.now()}-${safeName}`;


            uploadDocumentButton.disabled =
                true;

            uploadDocumentButton.textContent =
                "Učitavam...";


            const {
                error: uploadError
            } =
                await supabaseClient
                    .storage
                    .from(
                        "project-documents"
                    )
                    .upload(
                        filePath,
                        file,
                        {
                            upsert: false
                        }
                    );


            if (uploadError) {

                console.error(
                    uploadError
                );

                showMessage(
                    "Upload nije uspio.",
                    "error"
                );

                resetUploadButton();

                return;
            }


            const {
                error: insertError
            } =
                await supabaseClient
                    .from(
                        "project_documents"
                    )
                    .insert({

                        project_id:
                            projectId,

                        uploaded_by:
                            currentSession
                                .user
                                .id,

                        file_path:
                            filePath,

                        file_name:
                            file.name,

                        document_type:
                            type,

                        file_size:
                            file.size
                    });


            if (insertError) {

                console.error(
                    insertError
                );

                showMessage(
                    "Datoteka je učitana, ali zapis u bazi nije spremljen.",
                    "error"
                );

                resetUploadButton();

                return;
            }


            showMessage(
                "Dokument je uspješno dodan.",
                "success"
            );


            uploadDocumentFile.value =
                "";

            documentUploadPanel.hidden =
                true;


            resetUploadButton();


            await loadDocuments();
        }
    );


function resetUploadButton() {

    uploadDocumentButton.disabled =
        false;

    uploadDocumentButton.textContent =
        "Učitaj dokument";
}


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


    const isAdmin =
        await checkAdmin(
            session
        );


    if (!isAdmin) {

        window.location.href =
            "form.html";

        return;
    }


    await loadAdminProfile(
        session
    );


    await loadProjects();


    await loadDocuments();
}


startDocuments();
