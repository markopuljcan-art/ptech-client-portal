/* V16.6 - shared 'Zadaci' entry, without the redundant dashboard banner. Existing five-item mobile dock is untouched. */
(() => {
  'use strict';
  const pages = new Set(['form.html','my-projects.html','project.html','documents.html','messages.html','profile.html','revision.html','approve.html','tasks.html']);
  const current = location.pathname.split('/').pop();
  if (!pages.has(current)) return;
  function init() {
    const nav = document.querySelector('.sidebar-nav');
    if (nav && !nav.querySelector('a[href="tasks.html"]')) {
      const a = document.createElement('a');
      a.href='tasks.html';a.className='sidebar-link v14-tasks-nav';
      a.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 11 2 2 5-5M8 17h8"/></svg><span>Zadaci</span>';
      const project = nav.querySelector('a[href="my-projects.html"]');
      if (project) project.after(a); else nav.append(a);
    }
    if (current === 'tasks.html') {
      nav?.querySelectorAll('a.sidebar-link').forEach(a => {
        const active=a.getAttribute('href') === 'tasks.html';
        a.classList.toggle('active',active);
        if(active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
      });
    }
    if (current === 'my-projects.html' && !document.querySelector('.v14-tasks-shortcut')) {
      const main=document.querySelector('.dashboard-content');
      if (main) {
        const a=document.createElement('a');a.href='tasks.html';a.className='v14-tasks-shortcut';
        const strong=document.createElement('strong');strong.textContent='Moji zadaci';
        const small=document.createElement('span');small.textContent='Pogledaj obveze, rokove i zahtjeve vezane uz projekte';
        const arrow=document.createElement('span');arrow.textContent='\u2192';arrow.setAttribute('aria-hidden','true');
        a.append(strong,small,arrow);
        main.prepend(a);
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

/* V18.0 additive first-design glass layer: loaded after page-specific CSS and JS.
   No business logic, Supabase schema, or page HTML is changed. */
(() => {
  'use strict';
  const file = location.pathname.split('/').pop();
  const clientPages = new Set(['form.html', 'my-projects.html', 'project.html', 'tasks.html',
    'documents.html', 'messages.html', 'profile.html', 'approve.html']);
  if (!clientPages.has(file)) return;
  const root = document.documentElement;
  root.classList.add('ptech-glass-v18');
  const attach = () => {
    if (!document.querySelector('link[data-p18-glass]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.dataset.p18Glass = 'true';
      style.href = './assets/css/client/ptech-glass-v18.css?v=18.0';
      document.head.appendChild(style);
    }
    if (!document.querySelector('script[data-p18-glass]')) {
      const script = document.createElement('script');
      script.dataset.p18Glass = 'true';
      script.src = './assets/js/client/ptech-glass-v18.js?v=18.0';
      script.defer = true;
      document.head.appendChild(script);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, {once: true});
  else attach();
})();
