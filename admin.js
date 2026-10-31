/* ==============================================
   PTECH DIGITAL ADMIN CONSOLE V3.1
   Postojeci dashboard kod izvrsava se samo na admin.html.
   Zajednicki dizajn i navigacija rade na SVIM admin stranicama.
   Nema dodatnih admin-v3.js datoteka.
============================================== */

if (document.body?.dataset.adminPage === "admin.html") {

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

const adminWelcomeName =
    document.getElementById(
        "adminWelcomeName"
    );

const logoutButton =
    document.getElementById(
        "adminLogoutButton"
    );

const activeProjectsCount =
    document.getElementById(
        "activeProjectsCount"
    );

const pendingRevisionsCount =
    document.getElementById(
        "pendingRevisionsCount"
    );

const approvedDesignsCount =
    document.getElementById(
        "approvedDesignsCount"
    );

const pendingDesignsCount =
    document.getElementById(
        "pendingDesignsCount"
    );

const revisionRequestedCount =
    document.getElementById(
        "revisionRequestedCount"
    );

const clientsCount =
    document.getElementById(
        "clientsCount"
    );

const latestRevisions =
    document.getElementById(
        "latestRevisions"
    );

const recentProjects =
    document.getElementById(
        "recentProjects"
    );


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================
   FORMAT DATUMA
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


/* =========================
   LOGOUT
========================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            await supabaseClient
                .auth
                .signOut();


            window.location.href =
                "login.html";
        }
    );
}


/* =========================
   ADMIN PROFILE
========================= */

async function getAdminProfile(
    session
) {

    const {
        data: profile,
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
                session.user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Greška kod admin profila:",
            error
        );


        return null;
    }


    return profile;
}


/* =========================
   GROUP REVISION THREADS
========================= */

function groupRevisionThreads(
    messages
) {

    const groups = {};


    for (
        const message
        of messages
    ) {

        const key =
            `${message.project_id}-${message.design_id}`;


        if (!groups[key]) {

            groups[key] = {

                project_id:
                    message.project_id,

                design_id:
                    message.design_id,

                project:
                    message.projects,

                messages: []
            };
        }


        groups[key]
            .messages
            .push(
                message
            );
    }


    const threads =
        Object.values(
            groups
        );


    for (
        const thread
        of threads
    ) {

        thread.messages.sort(
            (a, b) =>
                new Date(
                    a.created_at
                ) -
                new Date(
                    b.created_at
                )
        );


        thread.lastMessage =
            thread.messages[
                thread.messages.length - 1
            ];


        thread.waitingForAdmin =
            thread.lastMessage
                ?.sender_role ===
            "client";
    }


    threads.sort(
        (a, b) =>
            new Date(
                b.lastMessage.created_at
            ) -
            new Date(
                a.lastMessage.created_at
            )
    );


    return threads;
}


/* =========================
   LOAD REVISION THREADS
========================= */

async function getRevisionThreads() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "design_revision_messages"
            )
            .select(`
                id,
                created_at,
                project_id,
                design_id,
                user_id,
                sender_role,
                message,
                projects (
                    id,
                    name,
                    type
                )
            `)
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Greška kod učitavanja razgovora:",
            error
        );


        return {
            threads: [],
            error
        };
    }


    return {

        threads:
            groupRevisionThreads(
                data || []
            ),

        error:
            null
    };
}


/* =========================
   NAJNOVIJA VERZIJA DIZAJNA
========================= */

async function getLatestDesigns() {

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
                status,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Greška kod učitavanja dizajna:",
            error
        );


        return [];
    }


    const latestByProject =
        new Map();


    for (
        const design
        of data || []
    ) {

        if (
            !latestByProject.has(
                design.project_id
            )
        ) {

            latestByProject.set(
                design.project_id,
                design
            );
        }
    }


    return [
        ...latestByProject.values()
    ];
}


/* =========================
   STATISTIKA
========================= */

async function loadStats(
    revisionThreads
) {

    /* AKTIVNI PROJEKTI */

    const {
        count: activeCount,
        error: projectsError
    } =
        await supabaseClient
            .from("projects")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .neq(
                "status",
                "Završeno"
            );


    if (projectsError) {

        console.error(
            "Greška kod brojanja projekata:",
            projectsError
        );
    }


    if (activeProjectsCount) {

        activeProjectsCount.textContent =
            activeCount ?? 0;
    }


    /* ČEKA ODGOVOR ADMINA */

    const pendingThreads =
        revisionThreads.filter(
            thread =>
                thread.waitingForAdmin
        );


    if (pendingRevisionsCount) {

        pendingRevisionsCount.textContent =
            pendingThreads.length;
    }


    /* DIZAJNI */

    const latestDesigns =
        await getLatestDesigns();


    const approvedCount =
        latestDesigns.filter(
            design =>
                design.status ===
                "approved"
        ).length;


    const pendingCount =
        latestDesigns.filter(
            design =>
                design.status ===
                "pending"
        ).length;


    const revisionCount =
        latestDesigns.filter(
            design =>
                design.status ===
                "revision_requested"
        ).length;


    if (approvedDesignsCount) {

        approvedDesignsCount.textContent =
            approvedCount;
    }


    if (pendingDesignsCount) {

        pendingDesignsCount.textContent =
            pendingCount;
    }


    if (revisionRequestedCount) {

        revisionRequestedCount.textContent =
            revisionCount;
    }


    /* KLIJENTI */

    const {
        count: clientCount,
        error: clientsError
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "role",
                "client"
            );


    if (clientsError) {

        console.error(
            "Greška kod brojanja klijenata:",
            clientsError
        );
    }


    if (clientsCount) {

        clientsCount.textContent =
            clientCount ?? 0;
    }
}


/* =========================
   NAJNOVIJI ZAHTJEVI
========================= */

function loadLatestRevisions(
    revisionThreads
) {

    if (!latestRevisions) {
        return;
    }


    if (
        !revisionThreads ||
        revisionThreads.length === 0
    ) {

        latestRevisions.innerHTML = `
            <div class="admin-empty">
                Trenutno nema novih zahtjeva.
            </div>
        `;


        return;
    }


    const latest =
        revisionThreads.slice(
            0,
            5
        );


    latestRevisions.innerHTML =
        latest
            .map(
                thread => {

                    const project =
                        thread.project;


                    const title =
                        project?.type ||
                        project?.name ||
                        `Projekt #${thread.project_id}`;


                    const lastMessage =
                        thread.lastMessage;


                    const waiting =
                        thread.waitingForAdmin;


                    const badge =
                        waiting
                            ? "Na čekanju"
                            : "Odgovoreno";


                    return `

                        <a
                            href="admin-revisions.html"
                            class="admin-list-item"
                        >

                            <div class="admin-list-main">

                                <strong>
                                    ${escapeHtml(
                                        title
                                    )}
                                </strong>

                                <span>
                                    Dizajn #${thread.design_id}
                                    •
                                    ${escapeHtml(
                                        lastMessage
                                            ?.message ||
                                        ""
                                    )}
                                </span>

                            </div>


                            <span
                                class="
                                    admin-list-badge
                                    ${
                                        waiting
                                            ? ""
                                            : "answered"
                                    }
                                "
                            >
                                ${badge}
                            </span>

                        </a>
                    `;
                }
            )
            .join("");
}


/* =========================
   NEDAVNI PROJEKTI
========================= */

async function loadRecentProjects() {

    if (!recentProjects) {
        return;
    }


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
                status,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(5);


    if (error) {

        console.error(
            "Greška kod nedavnih projekata:",
            error
        );


        recentProjects.innerHTML = `
            <div class="admin-empty">
                Projekte nije moguće učitati.
            </div>
        `;


        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        recentProjects.innerHTML = `
            <div class="admin-empty">
                Trenutno nema projekata.
            </div>
        `;


        return;
    }


    recentProjects.innerHTML =
        data
            .map(
                project => {

                    return `

                        <a
                            href="admin-projects.html?project=${encodeURIComponent(project.id)}"
                            class="admin-list-item"
                        >

                            <div class="admin-list-main">

                                <strong>
                                    ${escapeHtml(
                                        project.type ||
                                        project.name ||
                                        "Projekt"
                                    )}
                                </strong>

                                <span>
                                    ${escapeHtml(
                                        project.name ||
                                        ""
                                    )}
                                    •
                                    ${formatDate(
                                        project.created_at
                                    )}
                                </span>

                            </div>


                            <span
                                class="admin-list-badge"
                            >
                                ${escapeHtml(
                                    project.status ||
                                    "-"
                                )}
                            </span>

                        </a>
                    `;
                }
            )
            .join("");
}


/* =========================
   START
========================= */

async function startAdmin() {

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


    const profile =
        await getAdminProfile(
            session
        );


    if (!profile) {

        window.location.href =
            "form.html";


        return;
    }


    const role =
        String(
            profile.role || ""
        )
            .trim()
            .toLowerCase();


    if (
        role !== "admin"
    ) {

        window.location.href =
            "form.html";


        return;
    }


    const name =
        profile.display_name ||
        "Admin";


    if (adminUserName) {

        adminUserName.textContent =
            name;
    }


    if (adminWelcomeName) {

        adminWelcomeName.textContent =
            name;
    }


    /* =========================
       REVISION THREADOVI
    ========================= */

    const {
        threads,
        error: revisionThreadsError
    } =
        await getRevisionThreads();


    if (revisionThreadsError) {

        if (
            pendingRevisionsCount
        ) {

            pendingRevisionsCount.textContent =
                "0";
        }


        if (latestRevisions) {

            latestRevisions.innerHTML = `
                <div class="admin-empty">
                    Zahtjeve nije moguće učitati.
                </div>
            `;
        }
    }


    /* =========================
       DASHBOARD
    ========================= */

    await Promise.all([

        loadStats(
            threads
        ),

        loadRecentProjects()

    ]);


    loadLatestRevisions(
        threads
    );
}


/* =========================
   INIT
========================= */

startAdmin();

} // Kraj postojece logike Dashboarda.

/* ==============================================
   UGRADENI V3 DODACI - TEMA / MOBILNA NAVIGACIJA
============================================== */

/* PTech Digital Admin Console V3 — shared presentation only.
   Does not create extra Supabase clients or change authentication. */
(() => {
  'use strict';
  const icons = {
    home:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 13l4-4 4 4M9 12v5h6v-5"/>',
    briefcase:'<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    arrows:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
    check:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m7 12 3 3 7-7"/>',
    file:'<path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6"/>',
    chat:'<path d="M4 5h16v12H8l-4 4zM8 10h8M8 13h6"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    moon:'<path d="M20 15.6A8.5 8.5 0 0 1 8.4 4 8.5 8.5 0 1 0 20 15.6Z"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    close:'<path d="M5 5l14 14M19 5 5 19"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    people:'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M17 3.13a4 4 0 0 1 0 7.75"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    refresh:'<path d="M20 11a8 8 0 1 0-3 6M20 4v7h-7"/>'
  };
  const svg = key => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">${icons[key] || icons.home}</svg>`;
  const routes = [
    ['admin.html','home','Početna'],
    ['admin-projects.html','briefcase','Projekti'],
    ['admin-clients.html','people','Klijenti'],
    ['admin-revisions.html','arrows','Zahtjevi'],
    ['admin-approvals.html','check','Odobrenja'],
    ['admin-documents.html','file','Dokumenti'],
    ['admin-support.html','chat','Poruke']
  ];
  const current = document.body?.dataset.adminPage || location.pathname.split('/').pop() || 'admin.html';
  const html = document.documentElement;
  let theme = 'light';
  try { theme = localStorage.getItem('ptech-admin-theme') === 'dark' ? 'dark' : 'light'; } catch (_) {}
  const applyTheme = (mode, save = false) => {
    html.dataset.adminTheme = mode;
    const button = document.querySelector('.v3-theme-toggle');
    if (button) {
      button.innerHTML = svg(mode === 'dark' ? 'sun' : 'moon');
      button.setAttribute('aria-label', mode === 'dark' ? 'Uključi svijetli način' : 'Uključi tamni način');
      button.title = button.getAttribute('aria-label');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = mode === 'dark' ? '#101e31' : '#fcf8f4';
    if (save) try { localStorage.setItem('ptech-admin-theme', mode); } catch (_) {}
  };
  applyTheme(theme);
  const init = () => {
    const brand = document.querySelector('.admin-brand-logo');
    if (brand) brand.innerHTML = '<img src="./assets/ptech-icon.png" alt="" loading="eager">';
    document.querySelectorAll('.admin-nav-item').forEach(anchor => {
      const href = anchor.getAttribute('href')?.split('?')[0];
      const route = routes.find(([path]) => path === href);
      if (!route) return;
      anchor.classList.toggle('active', href === current);
      if (href === current) anchor.setAttribute('aria-current','page');
      else anchor.removeAttribute('aria-current');
      const icon = anchor.querySelector('.admin-nav-icon');
      if (icon) icon.innerHTML = svg(route[1]);
      if (href === 'admin.html') {
        const label = [...anchor.querySelectorAll('span')].find(el => !el.classList.contains('admin-nav-icon') && !el.classList.contains('admin-nav-badge'));
        if (label) label.textContent = 'Nadzorna ploča';
      }
      if (href === 'admin-support.html') {
        const label = [...anchor.querySelectorAll('span')].find(el => !el.classList.contains('admin-nav-icon') && !el.classList.contains('admin-nav-badge'));
        if (label) label.textContent = 'Poruke';
      }
    });
    document.querySelectorAll('[data-v3-icon]').forEach(element => { element.innerHTML = svg(element.dataset.v3Icon); });
    document.querySelectorAll('.admin-stat-icon').forEach((element, index) => {
      const items = ['briefcase','arrows','check','people','bell','refresh'];
      element.innerHTML = svg(items[index]);
    });
    const toolbar = document.querySelector('.admin-topbar-actions');
    const backdrop = document.createElement('div');
    backdrop.className = 'v3-drawer-backdrop'; backdrop.hidden = true;
    document.body.appendChild(backdrop);
    const menu = (open) => {
      document.body.classList.toggle('v3-menu-open',open);
      backdrop.hidden = !open;
      document.querySelectorAll('.v3-menu-toggle').forEach(btn => btn.setAttribute('aria-expanded',String(open)));
    };
    if (toolbar) {
      const themeButton = document.createElement('button');
      themeButton.type='button'; themeButton.className='v3-icon-btn v3-theme-toggle';
      themeButton.addEventListener('click', () => applyTheme(html.dataset.adminTheme === 'dark'?'light':'dark',true));
      toolbar.prepend(themeButton); applyTheme(html.dataset.adminTheme);
      const menuButton = document.createElement('button');
      menuButton.type='button'; menuButton.className='v3-icon-btn v3-menu-toggle';
      menuButton.innerHTML=svg('menu');menuButton.setAttribute('aria-label','Otvori izbornik');menuButton.setAttribute('aria-expanded','false');
      menuButton.addEventListener('click', () => menu(!document.body.classList.contains('v3-menu-open')));
      toolbar.prepend(menuButton);
    }
    backdrop.addEventListener('click',()=>menu(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')menu(false)});
    const mobile = document.createElement('nav');
    mobile.className='v3-mobile-nav';mobile.setAttribute('aria-label','Mobilna administratorska navigacija');
    const nav = ['admin.html','admin-projects.html','admin-support.html','admin-documents.html'].map(url=>routes.find(r=>r[0]===url));
    for (const [url,icon,label] of nav) {
      const a=document.createElement('a');a.href=url;
      if(current===url){a.classList.add('active');a.setAttribute('aria-current','page')}
      a.innerHTML=svg(icon)+`<span>${label}</span>`;mobile.appendChild(a);
    }
    const more=document.createElement('button');more.type='button';more.innerHTML=svg('menu')+'<span>Više</span>';
    if (!nav.some(([url])=>url===current)) more.classList.add('active');
    more.addEventListener('click',()=>menu(true));mobile.appendChild(more);
    document.body.appendChild(mobile);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
