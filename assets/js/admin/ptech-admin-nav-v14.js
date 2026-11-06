/* V14 - the same sidebar on every admin page; no auth or data changes. */
(() => {
  'use strict';
  const routes = [
    ['admin.html', 'Nadzorna plo\u010da', 'home'],
    ['admin-projects.html', 'Projekti', 'projects'],
    ['admin-clients.html', 'Klijenti', 'users'],
    ['admin-revisions.html', 'Zahtjevi', 'revisions'],
    ['admin-approvals.html', 'Odobrenja', 'approval'],
    ['admin-documents.html', 'Dokumenti', 'docs'],
    ['admin-support.html', 'Poruke', 'messages'],
    ['admin-tasks.html', 'Zadaci klijenata', 'tasks'],
    ['admin-planner.html', 'Interni planer', 'calendar'],
    ['admin-system.html', 'Upravljanje sustavom', 'settings']
  ];
  const icons = {
    home:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    projects:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 5V3m8 2V3M3 10h18"/>',
    users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m3-12a3 3 0 0 1 0 6m-1 4a5 5 0 0 1 4 4"/>',
    revisions:'<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
    approval:'<path d="M5 13l4 4L19 7"/><rect x="2" y="2" width="20" height="20" rx="4"/>',
    docs:'<path d="M6 2h9l5 5v15H6zM15 2v5h5M9 13h8M9 17h8"/>',
    messages:'<path d="M4 5h16v13H8l-4 3zM8 10h8m-8 4h5"/>',
    tasks:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7 9 2 2 4-4M14 10h4m-11 6h11"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>'
  };
  function init() {
    const nav = document.querySelector('.admin-sidebar .admin-nav');
    if (!nav) return;
    const page = document.body.dataset.adminPage || location.pathname.split('/').pop();
    const current = page === 'admin-client-profile.html' ? 'admin-clients.html' : page;
    const oldBadge = document.getElementById('supportUnreadBadge');
    const badge = oldBadge || document.createElement('span');
    badge.id = 'supportUnreadBadge';
    badge.className = 'admin-nav-badge';
    if (!oldBadge) {badge.hidden = true;badge.textContent='0';}
    const fragment = document.createDocumentFragment();
    for (const [href,label,icon] of routes) {
      const link=document.createElement('a');
      link.className='admin-nav-item';link.href=href;
      if (href === current) {link.classList.add('active'); link.setAttribute('aria-current','page');}
      const symbol=document.createElement('span');symbol.className='admin-nav-icon';symbol.setAttribute('aria-hidden','true');
      symbol.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+icons[icon]+'</svg>';
      const name=document.createElement('span');name.textContent=label;
      link.append(symbol,name);
      if (href === 'admin-support.html') link.append(badge);
      fragment.append(link);
    }
    nav.replaceChildren(fragment);
    nav.setAttribute('aria-label','Administratorska navigacija');
  }
  // V15.1: one logout handler for all admin pages, including pages that
  // previously had no logout binding. Capture phase prevents duplicate
  // page-specific handlers from signing out twice.
  function initSharedLogout() {
    if (window.__ptechAdminLogoutInstalled) return;
    window.__ptechAdminLogoutInstalled = true;

    document.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('#adminLogoutButton');
      if (!button) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      if (button.disabled) return;

      const previousLabel = button.textContent;
      button.disabled = true;
      button.textContent = 'Odjavljivanje...';
      try {
        if (!window.supabase?.createClient) {
          throw new Error('Supabase biblioteka nije dostupna.');
        }
        // Publishable key is the same public client key used throughout V15.
        const client = window.supabase.createClient(
          'https://agivwsbczzvvuzszcvxz.supabase.co',
          'sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE'
        );
        const { error } = await client.auth.signOut();
        if (error) throw error;
        window.location.replace('login.html');
      } catch (error) {
        console.error('[PTech Admin] Odjava nije uspjela:', error);
        button.disabled = false;
        button.textContent = previousLabel;
        window.alert('Odjava nije uspjela. Provjeri vezu i pokušaj ponovno.');
      }
    }, true);
  }

  initSharedLogout();
  if (document.querySelector('.admin-sidebar .admin-nav')) init();
  else if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
