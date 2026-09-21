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

const documentsList =
    document.getElementById(
        "documentsList"
    );

const documentDetail =
    document.getElementById(
        "documentDetail"
    );

const documentsCount =
    document.getElementById(
        "documentsCount"
    );

const documentsStat =
    document.getElementById(
        "documentsStat"
    );

const documentProjectsStat =
    document.getElementById(
        "documentProjectsStat"
    );

const documentsSizeStat =
    document.getElementById(
        "documentsSizeStat"
    );

const documentSearch =
    document.getElementById(
        "documentSearch"
    );

const documentProjectFilter =
    document.getElementById(
        "documentProjectFilter"
    );

const documentClientFilter =
    document.getElementById(
        "documentClientFilter"
    );

const documentTypeFilter =
    document.getElementById(
        "documentTypeFilter"
    );

const documentsMessage =
    document.getElementById(
        "documentsMessage"
    );

const adminUserName =
    document.getElementById(
        "adminUserName"
    );

const logoutButton =
    document.getElementById(
        "adminLogoutButton"
    );

const openUploadButton =
    document.getElementById(
        "openUploadButton"
    );

const closeUploadButton =
    document.getElementById(
        "closeUploadButton"
    );

const documentUploadPanel =
    document.getElementById(
        "documentUploadPanel"
    );

const uploadProject =
    document.getElementById(
        "uploadProject"
    );

const uploadDocumentType =
    document.getElementById(
        "uploadDocumentType"
    );

const uploadDocumentFile =
    document.getElementById(
        "uploadDocumentFile"
    );

const uploadDocumentButton =
    document.getElementById(
        "uploadDocumentButton"
    );


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


function createSafeFileName(fileName) {

    const original =
        String(
            fileName ||
            "dokument"
        );


    return original
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9._-]+/g,
            "-"
        )
        .replace(
            /-+/g,
            "-"
        );
}


function showMessage(
    message,
    type = "success"
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

    documentsMessage.textContent =
        "";

    documentsMessage.className =
        "documents-message";
}


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
   ADMIN CHECK
========================= */

async function checkAdmin(
    session
) {

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

        console.error(
            "Admin check error:",
            error
        );

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
        data,
        error
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


    if (error) {

        console.error(
            "Admin profile error:",
            error
        );

        return;
    }


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
            "Projects error:",
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
            data: profiles,
            error:
                profilesError
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


        if (profilesError) {

            console.error(
                "Profiles error:",
                profilesError
            );
        }


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

    if (
        documentProjectFilter
    ) {

        documentProjectFilter.innerHTML = `
            <option value="">
                Svi projekti
            </option>
        `;
    }


    if (uploadProject) {

        uploadProject.innerHTML = `
            <option value="">
                Odaberi projekt
            </option>
        `;
    }


    for (
        const project
        of allProjects
    ) {

        const label =
            project.type ||
            project.name ||
            `Projekt #${project.id}`;


        if (
            documentProjectFilter
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
                label;


            documentProjectFilter
                .appendChild(
                    option
                );
        }


        if (
            uploadProject
        ) {

            const uploadOption =
                document.createElement(
                    "option"
                );


            uploadOption.value =
                String(
                    project.id
                );

            uploadOption.textContent =
                `${label} — ${
                    profileMap[
                        project.user_id
                    ] ||
                    "Klijent"
                }`;


            uploadProject
                .appendChild(
                    uploadOption
                );
        }
    }


    if (
        documentClientFilter
    ) {

        documentClientFilter.innerHTML = `
            <option value="">
                Svi klijenti
            </option>
        `;


        const clients =
            new Map();


        for (
            const project
            of allProjects
        ) {

            if (
                project.user_id
            ) {

                clients.set(
                    project.user_id,
                    profileMap[
                        project.user_id
                    ] ||
                    "Klijent"
                );
            }
        }


        const sortedClients =
            [
                ...clients.entries()
            ]
                .sort(
                    (a, b) =>
                        String(
                            a[1]
                        )
                            .localeCompare(
                                String(
                                    b[1]
                                ),
                                "hr"
                            )
                );


        for (
            const [
                userId,
                name
            ]
            of sortedClients
        ) {

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
}


/* =========================
   DOCUMENTS
========================= */

async function loadDocuments() {

    if (!documentsList) {
        return;
    }


    documentsList.innerHTML = `
        <div class="admin-empty">
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
                file_size,
                uploaded_by
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
            <div class="admin-empty">
                Dokumente nije moguće učitati.
            </div>
        `;


        showMessage(
            "Greška kod učitavanja dokumenata.",
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
                documentData => {

                    const project =
                        projectMap[
                            String(
                                documentData.project_id
                            )
                        ];


                    return {

                        ...documentData,

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

    applyFilters();
}


/* =========================
   STATS
========================= */

function updateStats() {

    const total =
        allDocuments.length;


    const projects =
        new Set(
            allDocuments
                .map(
                    item =>
                        item.project_id
                )
                .filter(
                    value =>
                        value !==
                        null
                )
        );


    const size =
        allDocuments.reduce(
            (
                totalSize,
                item
            ) =>
                totalSize +
                Number(
                    item.file_size ||
                    0
                ),
            0
        );


    if (documentsCount) {

        documentsCount.textContent =
            total;
    }


    if (documentsStat) {

        documentsStat.textContent =
            total;
    }


    if (
        documentProjectsStat
    ) {

        documentProjectsStat.textContent =
            projects.size;
    }


    if (
        documentsSizeStat
    ) {

        documentsSizeStat.textContent =
            formatBytes(
                size
            );
    }
}


/* =========================
   FILE ICON
========================= */

function getFileIcon(
    fileName
) {

    const extension =
        String(
            fileName || ""
        )
            .split(".")
            .pop()
            .toLowerCase();


    if (
        extension ===
        "pdf"
    ) {

        return "PDF";
    }


    if (
        [
            "jpg",
            "jpeg",
            "png",
            "webp"
        ]
            .includes(
                extension
            )
    ) {

        return "IMG";
    }


    if (
        [
            "doc",
            "docx"
        ]
            .includes(
                extension
            )
    ) {

        return "DOC";
    }


    if (
        [
            "xls",
            "xlsx"
        ]
            .includes(
                extension
            )
    ) {

        return "XLS";
    }


    if (
        [
            "zip",
            "rar",
            "7z"
        ]
            .includes(
                extension
            )
    ) {

        return "ZIP";
    }


    return "FILE";
}


/* =========================
   RENDER LIST
========================= */

function renderDocuments(
    documents
) {

    if (!documentsList) {
        return;
    }


    if (
        !documents ||
        documents.length === 0
    ) {

        documentsList.innerHTML = `
            <div class="admin-empty">
                Nema dokumenata koji odgovaraju odabranim filterima.
            </div>
        `;

        return;
    }


    documentsList.innerHTML =
        documents
            .map(
                item => {

                    const project =
                        item.project;


                    return `

                        <button
                            type="button"
                            class="document-row"
                            data-document-id="${escapeHtml(
                                item.id
                            )}"
                        >

                            <div class="document-file-main">

                                <div class="document-file-icon">
                                    ${getFileIcon(
                                        item.name
                                    )}
                                </div>

                                <div>

                                    <strong>
                                        ${escapeHtml(
                                            item.name ||
                                            "Dokument"
                                        )}
                                    </strong>

                                    <span>
                                        ${formatBytes(
                                            item.file_size
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
                                    item.client_name
                                )}
                            </div>


                            <div>

                                <span class="document-type-badge">
                                    ${escapeHtml(
                                        item.document_type ||
                                        "Ostalo"
                                    )}
                                </span>

                            </div>


                            <div>
                                ${formatDate(
                                    item.created_at
                                )}
                            </div>

                        </button>
                    `;
                }
            )
            .join("");


    setupDocumentRows();
}


/* =========================
   FILTERS
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
        documentProjectFilter
            ?.value ||
        "";


    const clientId =
        documentClientFilter
            ?.value ||
        "";


    const type =
        documentTypeFilter
            ?.value ||
        "";


    const filtered =
        allDocuments.filter(
            item => {

                const searchText =
                    `
                        ${item.name || ""}
                        ${item.project?.name || ""}
                        ${item.project?.type || ""}
                        ${item.client_name || ""}
                        ${item.document_type || ""}
                    `
                        .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchText.includes(
                        search
                    );


                const matchesProject =
                    !projectId ||
                    String(
                        item.project_id
                    ) ===
                    projectId;


                const matchesClient =
                    !clientId ||
                    String(
                        item.client_id
                    ) ===
                    clientId;


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
                    matchesClient &&
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
   DETAIL ROW CLICK
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
                            row.dataset
                                .documentId;


                        const documentData =
                            allDocuments.find(
                                item =>
                                    String(
                                        item.id
                                    ) ===
                                    String(
                                        id
                                    )
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


/* =========================
   RESOLVE DOCUMENT URL
========================= */

async function resolveDocumentUrl(
    documentData
) {

    if (
        !documentData?.file_url
    ) {

        return null;
    }


    const value =
        String(
            documentData.file_url
        );


    /*
        Ako je već puni URL,
        koristimo ga direktno.
    */

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


    /*
        Inače pretpostavljamo
        da je file_url Storage path.
    */

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
   DETAIL
========================= */

async function showDocumentDetail(
    documentData
) {

    if (!documentDetail) {
        return;
    }


    documentDetail.innerHTML = `
        <div class="document-detail-empty">
            Učitavanje pregleda...
        </div>
    `;


    const signedUrl =
        await resolveDocumentUrl(
            documentData
        );


    const extension =
        String(
            documentData.name ||
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
        ]
            .includes(
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
        extension ===
        "pdf"
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
                        documentData.name
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

                <span>
                    Projekt
                </span>

                <strong>
                    ${escapeHtml(
                        documentData.project?.type ||
                        documentData.project?.name ||
                        "-"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Klijent
                </span>

                <strong>
                    ${escapeHtml(
                        documentData.client_name
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Vrsta
                </span>

                <strong>
                    ${escapeHtml(
                        documentData.document_type ||
                        "Ostalo"
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Veličina
                </span>

                <strong>
                    ${formatBytes(
                        documentData.file_size
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Datum
                </span>

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

            hideMessage();

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

            hideMessage();


            const projectId =
                Number(
                    uploadProject
                        ?.value
                );


            const file =
                uploadDocumentFile
                    ?.files?.[0];


            const type =
                uploadDocumentType
                    ?.value ||
                "Ostalo";


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
                        Number(
                            item.id
                        ) ===
                        projectId
                );


            if (!project) {

                showMessage(
                    "Projekt nije pronađen.",
                    "error"
                );

                return;
            }


            if (!currentSession) {

                showMessage(
                    "Admin sesija nije dostupna.",
                    "error"
                );

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
                createSafeFileName(
                    file.name
                );


            const filePath =
                `${clientSlug}/projekt-${projectId}/${Date.now()}-${safeName}`;


            uploadDocumentButton.disabled =
                true;

            uploadDocumentButton.textContent =
                "Učitavam...";


            /* =========================
               STORAGE
            ========================= */

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
                            upsert:
                                false,

                            contentType:
                                file.type
                        }
                    );


            if (uploadError) {

                console.error(
                    "Upload error:",
                    uploadError
                );


                showMessage(
                    "Upload dokumenta nije uspio.",
                    "error"
                );


                resetUploadButton();

                return;
            }


            /* =========================
               DATABASE
            ========================= */

            const {
                error:
                    insertError
            } =
                await supabaseClient
                    .from(
                        "project_documents"
                    )
                    .insert({

                        project_id:
                            projectId,

                        name:
                            file.name,

                        file_url:
                            filePath,

                        document_type:
                            type,

                        file_size:
                            file.size,

                        uploaded_by:
                            currentSession
                                .user
                                .id
                    });


            if (insertError) {

                console.error(
                    "Insert error:",
                    insertError
                );


                showMessage(
                    "Datoteka je učitana u Storage, ali zapis u bazi nije spremljen.",
                    "error"
                );


                resetUploadButton();

                return;
            }


            showMessage(
                "Dokument je uspješno dodan.",
                "success"
            );


            if (
                uploadDocumentFile
            ) {

                uploadDocumentFile.value =
                    "";
            }


            if (
                uploadProject
            ) {

                uploadProject.value =
                    "";
            }


            documentUploadPanel.hidden =
                true;


            resetUploadButton();


            await loadDocuments();
        }
    );


function resetUploadButton() {

    if (
        !uploadDocumentButton
    ) {

        return;
    }


    uploadDocumentButton.disabled =
        false;

    uploadDocumentButton.textContent =
        "Učitaj dokument";
}


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


/* =========================
   INIT
========================= */

startDocuments();
