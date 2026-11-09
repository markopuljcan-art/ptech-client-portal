/* PTech Digital V18.0. Additive layout behavior: continuous sidebar resizing.
   Does NOT replace theme toggles, dashboard tile grid, authentication or data logic. */
(() => {
  'use strict';
  const root = document.documentElement;
  const storageKey = 'ptech-v18-sidebar-width';
  const MIN = 76;
  const MAX = 360;
  const DEFAULT = 244;
  const breakpoint = matchMedia('(min-width: 1101px)');
  let expandedWidth = DEFAULT;
  const clamp = x => Math.min(MAX, Math.max(MIN, Math.round(Number(x) || DEFAULT)));
  const safeRead = () => { try { return localStorage.getItem(storageKey); } catch { return null; } };
  const safeStore = x => { try { localStorage.setItem(storageKey, String(x)); } catch {} };

  function init() {
    const sidebar = document.querySelector('.dashboard.desktop-layout > .desktop-sidebar');
    if (!sidebar || document.querySelector('.p18-sidebar-grip')) return;
    const saved = Number(safeRead());
    let width = Number.isFinite(saved) && saved >= MIN && saved <= MAX ? saved : DEFAULT;
    if (width > 95) expandedWidth = width;
    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'p18-sidebar-grip';
    grip.setAttribute('aria-label', 'Promijeni širinu bočnog izbornika. Strelice za podešavanje, Enter za skupljanje ili proširivanje.');
    grip.setAttribute('aria-controls', sidebar.id || 'p18-desktop-sidebar');
    if (!sidebar.id) sidebar.id = 'p18-desktop-sidebar';
    grip.title = 'Povuci za širinu sidebara • Enter za skupi/proširi • Dvoklik za zadanu širinu';
    sidebar.insertAdjacentElement('afterend', grip);
    const apply = (value, persist = false) => {
      width = clamp(value);
      root.style.setProperty('--p18-sidebar-width', `${width}px`);
      root.classList.toggle('p18-sidebar-collapsed', width <= 95);
      grip.setAttribute('aria-valuenow', String(width));
      grip.setAttribute('aria-valuemin', String(MIN));
      grip.setAttribute('aria-valuemax', String(MAX));
      if (width > 95) expandedWidth = width;
      if (persist) safeStore(width);
    };
    apply(width);
    let dragging = false;
    grip.addEventListener('pointerdown', e => {
      if (!breakpoint.matches || e.button !== 0) return;
      dragging = true;
      root.classList.add('p18-resizing');
      grip.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    grip.addEventListener('pointermove', e => {
      if (!dragging) return;
      apply(e.clientX);
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('p18-resizing');
      safeStore(width);
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    grip.addEventListener('lostpointercapture', end);
    grip.addEventListener('dblclick', () => apply(DEFAULT, true));
    grip.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); apply(width + (e.key === 'ArrowLeft' ? -16 : 16), true);
      } else if (e.key === 'Home') {
        e.preventDefault(); apply(MIN, true);
      } else if (e.key === 'End') {
        e.preventDefault(); apply(MAX, true);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); apply(width <= 95 ? expandedWidth : MIN, true);
      }
    });
    // Markup may lack explicit link titles, so collapsed menu icons remain discoverable.
    sidebar.querySelectorAll('.sidebar-nav .sidebar-link').forEach(link => {
      const text = link.querySelector('span')?.textContent?.trim();
      if (text) { link.title = text; if (!link.hasAttribute('aria-label')) link.setAttribute('aria-label', text); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
