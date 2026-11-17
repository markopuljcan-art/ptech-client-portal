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


/* PTech Client Portal - Sidebar V23.0
   New versioned preference, never auto-restore broken legacy narrow widths.
   Users can explicitly collapse to the real 76px compact mode or expand.
*/
(() => {
  'use strict';
  const DESKTOP = window.matchMedia('(min-width: 1101px)');
  const KEY = 'ptech_client_sidebar_v23';
  const WIDTH_DEFAULT = 258;
  const WIDTH_MIN = 236;
  const WIDTH_MAX = 380;
  const WIDTH_COMPACT = 76;
  const clamp = n => Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, Math.round(Number(n) || WIDTH_DEFAULT)));
  const defaultState = () => ({mode:'expanded', width:WIDTH_DEFAULT});

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!stored || (stored.mode !== 'expanded' && stored.mode !== 'collapsed')) return defaultState();
      return {mode:stored.mode, width:clamp(stored.width)};
    } catch (_) { return defaultState(); }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }

  function init() {
    const dashboard = document.querySelector('.dashboard.desktop-layout');
    const sidebar = dashboard?.querySelector(':scope > .desktop-sidebar');
    if (!sidebar || document.getElementById('ptechSidebarResize')) return;
    const root = document.documentElement;
    root.classList.remove('p18-sidebar-collapsed', 'p18-resizing');
    // The old V18 handle can remain in legacy builds. Remove it before adding ours.
    document.querySelectorAll('.p18-sidebar-grip').forEach(el => el.remove());
    root.classList.add('ptech-glass','ptech-sidebar-resizable');

    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'ptech-sidebar-resize';
    grip.id = 'ptechSidebarResize';
    grip.innerHTML = '<span aria-hidden="true"><i></i><i></i><i></i></span>';
    grip.setAttribute('aria-controls', sidebar.id || 'ptechClientSidebar');
    if (!sidebar.id) sidebar.id = 'ptechClientSidebar';
    sidebar.insertAdjacentElement('afterend', grip);
    let state = load();

    function apply(next, persist=false) {
      state = { mode:next.mode === 'collapsed' ? 'collapsed':'expanded', width:clamp(next.width) };
      const collapsed = state.mode === 'collapsed';
      const width = collapsed ? WIDTH_COMPACT : state.width;
      root.classList.toggle('ptech-sidebar-collapsed', collapsed);
      root.classList.remove('p18-sidebar-collapsed');
      root.style.setProperty('--ptech-sidebar-width', width + 'px');
      grip.setAttribute('aria-expanded', String(!collapsed));
      grip.setAttribute('aria-label', collapsed ? 'Proširi bočni izbornik' : 'Skupi bočni izbornik');
      grip.title = collapsed ? 'Klikni za proširenje izbornika' : 'Klikni za skupljanje ili povuci za promjenu širine';
      if (DESKTOP.matches) {
        dashboard.style.setProperty('grid-template-columns', width + 'px minmax(0,1fr)', 'important');
      } else {
        dashboard.style.removeProperty('grid-template-columns');
      }
      if (persist) save(state);
      window.dispatchEvent(new CustomEvent('ptech:sidebar-resized', {detail:{width,collapsed}}));
    }
    apply(state);
    DESKTOP.addEventListener?.('change', () => apply(state));

    let drag = null;
    let suppressClick = false;
    grip.addEventListener('pointerdown', event => {
      if (!DESKTOP.matches || event.button !== 0) return;
      suppressClick = false;
      drag = {id:event.pointerId, x:event.clientX, moved:false, original:{...state}};
      try { grip.setPointerCapture(event.pointerId); } catch (_) {}
    });
    grip.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      if (Math.abs(event.clientX - drag.x) > 7) drag.moved = true;
      if (!drag.moved) return;
      root.classList.add('ptech-sidebar-resizing');
      // Below the threshold, snap fully shut instead of hiding labels in a half-width sidebar.
      apply(event.clientX < 166 ? {mode:'collapsed',width:drag.original.width} : {mode:'expanded',width:clamp(event.clientX)});
    });
    grip.addEventListener('pointerup', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const wasMoved = drag.moved;
      drag = null;
      root.classList.remove('ptech-sidebar-resizing');
      if (wasMoved) { suppressClick=true; apply(state,true); }
    });
    grip.addEventListener('pointercancel', () => {
      if (!drag) return;
      const original = drag.original;
      drag=null; suppressClick=true;
      root.classList.remove('ptech-sidebar-resizing');
      apply(original);
    });
    grip.addEventListener('click', event => {
      if (suppressClick) { suppressClick=false; return; }
      if (!DESKTOP.matches) return;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        root.classList.add('ptech-sidebar-animating');
        window.clearTimeout(grip._ptechAnimationTimer);
        grip._ptechAnimationTimer = window.setTimeout(() => root.classList.remove('ptech-sidebar-animating'), 380);
      }
      apply(state.mode==='collapsed' ? {mode:'expanded',width:state.width} : {mode:'collapsed',width:state.width},true);
    });
    grip.addEventListener('dblclick', event => {
      event.preventDefault();
      apply(defaultState(),true);
    });
    grip.addEventListener('keydown', event => {
      if (!DESKTOP.matches) return;
      if (event.key==='ArrowLeft'||event.key==='ArrowRight') {
        event.preventDefault();
        const current = state.mode==='collapsed' ? WIDTH_DEFAULT:state.width;
        apply({mode:'expanded',width:clamp(current+(event.key==='ArrowLeft'?-16:16))},true);
      } else if (event.key==='Home') {
        event.preventDefault(); apply({mode:'expanded',width:WIDTH_MIN},true);
      } else if (event.key==='End') {
        event.preventDefault(); apply({mode:'expanded',width:WIDTH_MAX},true);
      }
    });
    sidebar.querySelectorAll('.sidebar-nav .sidebar-link').forEach(link => {
      const label = link.querySelector('span')?.textContent?.trim();
      if (label) {
        link.title = label;
        if (!link.hasAttribute('aria-label')) link.setAttribute('aria-label',label);
      }
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
