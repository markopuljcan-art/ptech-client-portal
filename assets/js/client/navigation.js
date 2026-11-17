/* PTech Digital - unified navigation (one resizer on all client pages). */

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


(() => {
  'use strict';
  const MIN = 76, MAX = 430, DEFAULT = 244, COLLAPSED = 202;
  const KEY = 'ptech_sidebar_width_v22';
  const DESKTOP = window.matchMedia('(min-width: 1101px)');
  const clamp = value => Math.max(MIN, Math.min(MAX, Math.round(Number(value) || DEFAULT)));
  const read = () => {
    try {
      const current = localStorage.getItem(KEY);
      if (current !== null) return Number(current);
      // Migrate only a readable width: old stored narrow values caused clipped labels.
      const old = Number(localStorage.getItem('ptech_sidebar_width') || localStorage.getItem('ptech-client-sidebar-width-v21') || localStorage.getItem('ptech-v18-sidebar-width') || 0);
      return old >= 215 && old <= MAX ? old : 0;
    } catch (_) {return 0;}
  };
  const store = value => {try {localStorage.setItem(KEY, String(value));} catch (_) {}};

  function init() {
    const dashboard = document.querySelector('.dashboard.desktop-layout');
    const sidebar = dashboard?.querySelector(':scope > .desktop-sidebar');
    if (!sidebar || document.getElementById('ptechSidebarResize')) return;
    // In repositories that still explicitly load the older V18 resizer, keep just one grip.
    document.querySelectorAll('.p18-sidebar-grip').forEach(grip => grip.remove());
    const root = document.documentElement;
    const saved = read();
    let width = saved >= MIN && saved <= MAX ? saved : DEFAULT;
    let expanded = width > COLLAPSED ? width : DEFAULT;
    const grip = document.createElement('button');
    grip.type = 'button';
    grip.id = 'ptechSidebarResize';
    grip.className = 'ptech-sidebar-resize';
    grip.setAttribute('role', 'separator');
    grip.setAttribute('aria-orientation', 'vertical');
    grip.setAttribute('aria-label', 'Promjena širine bočnog izbornika');
    if (!sidebar.id) sidebar.id = 'ptechClientSidebar';
    grip.setAttribute('aria-controls', sidebar.id);
    grip.title = 'Povuci za promjenu širine · klikni za skupi ili proširi · strelice za precizno podešavanje';
    grip.innerHTML = '<span aria-hidden="true"><i></i><i></i><i></i></span>';
    sidebar.insertAdjacentElement('afterend', grip);

    function apply(next, persist) {
      width = clamp(next);
      if (width > COLLAPSED) expanded = width;
      root.classList.add('ptech-glass', 'ptech-sidebar-resizable');
      root.classList.toggle('ptech-sidebar-collapsed', width <= COLLAPSED);
      root.style.setProperty('--ptech-sidebar-width', `${width}px`);
      grip.setAttribute('aria-valuenow', String(width));
      grip.setAttribute('aria-valuemin', String(MIN));
      grip.setAttribute('aria-valuemax', String(MAX));
      grip.setAttribute('aria-valuetext', width <= COLLAPSED ? 'Skupljeni izbornik' : `Širina ${width} piksela`);
      if (DESKTOP.matches) dashboard.style.setProperty('grid-template-columns', `${width}px minmax(0, 1fr)`, 'important');
      else dashboard.style.removeProperty('grid-template-columns');
      if (persist) store(width);
      window.dispatchEvent(new CustomEvent('ptech:sidebar-resized', {detail:{width}}));
    }
    apply(width, false);
    DESKTOP.addEventListener?.('change', () => apply(width, false));

    let pointer = null;
    grip.addEventListener('pointerdown', event => {
      if (!DESKTOP.matches || event.button !== 0) return;
      pointer = {id:event.pointerId, start:event.clientX, moved:false};
      grip.setPointerCapture(event.pointerId);
      root.classList.add('ptech-sidebar-resizing');
      event.preventDefault();
    });
    grip.addEventListener('pointermove', event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      if (Math.abs(event.clientX - pointer.start) > 4) pointer.moved = true;
      if (pointer.moved) apply(event.clientX, false);
    });
    function end(event, cancelled) {
      if (!pointer || (event?.pointerId !== undefined && event.pointerId !== pointer.id)) return;
      const moved = pointer.moved;
      pointer = null;
      root.classList.remove('ptech-sidebar-resizing');
      if (!cancelled) {
        if (!moved) apply(width <= COLLAPSED ? expanded : MIN, true);
        else apply(width, true);
      } else apply(width, true);
    }
    grip.addEventListener('pointerup', event => end(event, false));
    grip.addEventListener('pointercancel', event => end(event, true));
    grip.addEventListener('lostpointercapture', () => {if (pointer) end(null, true);});
    grip.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); apply(width + (event.key === 'ArrowLeft' ? -16 : 16), true);
      } else if (event.key === 'Home') {
        event.preventDefault(); apply(MIN, true);
      } else if (event.key === 'End') {
        event.preventDefault(); apply(MAX, true);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); apply(width <= COLLAPSED ? expanded : MIN, true);
      }
    });
    grip.addEventListener('dblclick', event => {event.preventDefault(); apply(DEFAULT, true);});
    sidebar.querySelectorAll('.sidebar-nav .sidebar-link').forEach(link => {
      const label = link.querySelector('span')?.textContent?.trim();
      if (label) {
        link.title = label;
        if (!link.hasAttribute('aria-label')) link.setAttribute('aria-label', label);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
