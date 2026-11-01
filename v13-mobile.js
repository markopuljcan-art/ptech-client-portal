/* PTECH DIGITAL V13.2 - unified mobile layer and native-like dock.
   No changes to Supabase or existing page scripts.
   V13 base initialises first; V13.1 drag gesture follows on DOMContentLoaded.
*/

/* PTech Digital Client Portal V13 - small additive mobile layer.
   Does not request Supabase data, change auth, or register a service worker.
*/
(() => {
  'use strict';
  const PAGES = new Set([
    'form.html','my-projects.html','documents.html',
    'messages.html','profile.html','project.html'
  ]);
  const page = decodeURIComponent(location.pathname.split('/').pop() || '');
  if (!PAGES.has(page)) return;

  function init() {
    if (!document.body || document.body.classList.contains('ptech-v13')) return;
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    document.body.classList.add('ptech-v13');
    nav.setAttribute('aria-label', 'Glavna navigacija PTech Client Portala');

    const activeHref = page === 'project.html' ? 'my-projects.html' : page;
    for (const link of nav.querySelectorAll('a.bottom-nav-item')) {
      const target = (link.getAttribute('href') || '').split(/[?#]/)[0].replace(/^\.\//,'');
      const active = target === activeHref;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');

      // Keep original icon (and the unread badge) intact. Wrap once only.
      if (!link.querySelector('.v13-tab-visual')) {
        const original = link.querySelector(':scope > .bottom-nav-icon-wrap') ||
          link.querySelector(':scope > svg') ||
          link.querySelector(':scope > .bottom-nav-icon');
        if (original) {
          const bubble = document.createElement('span');
          bubble.className = 'v13-tab-visual';
          bubble.setAttribute('aria-hidden', 'true');
          link.insertBefore(bubble, original);
          bubble.appendChild(original);
          // A badge already contains meaning in its live DOM; do not recreate it.
        }
      }
      link.addEventListener('pointerdown', () => link.classList.add('v13-pressed'), {passive:true});
      const reset = () => link.classList.remove('v13-pressed');
      link.addEventListener('pointerup', reset, {passive:true});
      link.addEventListener('pointercancel', reset, {passive:true});
      link.addEventListener('blur', reset);
    }

    // Hide dock while an existing full-screen dialog is open.
    const modalSelectors = ['#uploadOverlay','#passwordModal','.modal-backdrop','.upload-overlay','.project-modal','.revision-modal'];
    function updateModal() {
      const modalOpen = modalSelectors.some(sel => [...document.querySelectorAll(sel)].some(el => {
        if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
        if (el === nav || el.closest('.bottom-nav')) return false;
        const cs = getComputedStyle(el);
        return cs.display !== 'none' && cs.visibility !== 'hidden';
      }));
      document.body.classList.toggle('v13-modal-open', modalOpen);
    }
    const modals = [...new Set(modalSelectors.flatMap(sel=>[...document.querySelectorAll(sel)]))];
    for (const el of modals) {
      new MutationObserver(updateModal).observe(el,{attributes:true,attributeFilter:['hidden','style','class','aria-hidden']});
    }
    updateModal();

    // Chat input: account for iOS virtual keyboard; only on messages page.
    if (page === 'messages.html' && window.visualViewport) {
      const vv = window.visualViewport;
      const update = () => {
        if (window.innerWidth > 650) {
          document.body.classList.remove('v13-keyboard-open');
          return;
        }
        const height = vv.height;
        document.documentElement.style.setProperty('--v13-viewport-height', `${Math.round(height)}px`);
        const keyboard = window.innerHeight - height - vv.offsetTop > 145;
        document.body.classList.toggle('v13-keyboard-open', keyboard && document.activeElement?.matches('textarea,input'));
      };
      vv.addEventListener('resize', update, {passive:true});
      window.addEventListener('resize', update, {passive:true});
      document.addEventListener('focusin', update);
      document.addEventListener('focusout', () => requestAnimationFrame(update));
      update();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();


/* ===== INTEGRATED DRAG GESTURES: previous v13-native.js ===== */
/* PTech Digital Client Portal V13.1 — drag-to-navigate mobile dock.
   Additive only: does not change Supabase/Auth, existing page JS or PWA.
   The portal is multi-page: the gesture navigates safely to the destination,
   with a short visual transition; it does NOT pretend to be a single-page app.
*/
(() => {
  'use strict';
  const PAGES = new Set(['form.html','my-projects.html','documents.html','messages.html','profile.html','project.html']);
  const current = decodeURIComponent(location.pathname.split('/').pop() || '');
  if (!PAGES.has(current)) return;
  const mobile = window.matchMedia('(max-width: 1100px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function init() {
    const nav = document.querySelector('nav.bottom-nav');
    if (!nav || nav.dataset.v131Init === 'true') return;
    nav.dataset.v131Init = 'true';
    const links = [...nav.querySelectorAll('a.bottom-nav-item[href]')];
    if (links.length < 2) return;

    const bubble = document.createElement('span');
    bubble.className = 'v131-dock-bubble';
    bubble.setAttribute('aria-hidden', 'true');
    nav.prepend(bubble);
    nav.classList.add('v131-enabled');
    nav.setAttribute('aria-description', 'Dodirni ikonu ili povuci oznaku preko donjeg izbornika.');

    let active = Math.max(0, links.findIndex(a => a.matches('[aria-current="page"],.active')));
    let hovered = active;
    let pointer = null;
    let drag = false;
    let suppressUntil = 0;
    let navigating = false;
    const BUBBLE_W = 45;
    const BUBBLE_H = 40;

    function targetPath(link) {
      try {
        const u = new URL(link.href, location.href);
        if (u.origin !== location.origin || !PAGES.has(u.pathname.split('/').pop())) return null;
        return u;
      } catch { return null; }
    }
    function bubblePoint(index) {
      const visual = links[index].querySelector('.v13-tab-visual') || links[index];
      const r = visual.getBoundingClientRect();
      const nr = nav.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - nr.left - BUBBLE_W / 2,
        y: r.top + r.height / 2 - nr.top - BUBBLE_H / 2
      };
    }
    function showAt(x, y, immediate = false) {
      bubble.style.transitionDuration = immediate ? '0ms' : '';
      bubble.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
    }
    function preview(index) {
      hovered = index;
      links.forEach((a, i) => a.classList.toggle('v131-preview', i === index));
    }
    function snap(index, immediate = false) {
      if (!mobile.matches) return;
      const p = bubblePoint(index);
      showAt(p.x, p.y, immediate);
      preview(index);
    }
    function closestIndex(clientX) {
      let best = 0, min = Infinity;
      links.forEach((a, i) => {
        const r = a.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - clientX);
        if (d < min) { best = i; min = d; }
      });
      return best;
    }
    function navigate(index) {
      if (navigating || index === active) { snap(active); return; }
      const url = targetPath(links[index]);
      if (!url) { snap(active); return; }
      navigating = true;
      const dir = index > active ? 'next' : 'prev';
      try { sessionStorage.setItem('ptech-v131-slide', dir); } catch { /* optional */ }
      document.body.classList.add('v131-exiting');
      document.documentElement.dataset.v131Direction = dir;
      // Do not delay navigation for users with reduced motion.
      if (reduceMotion.matches) { location.assign(url.href); return; }
      window.setTimeout(() => location.assign(url.href), 155);
    }

    nav.addEventListener('pointerdown', e => {
      if (!mobile.matches || navigating || e.pointerType === 'touch' || e.button !== 0 || !e.isPrimary) return;
      const link = e.target.closest('a.bottom-nav-item');
      if (!link || !nav.contains(link)) return;
      // Preserve ordinary link semantics for modified clicks / accessible keyboard use.
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      pointer = { id: e.pointerId, startX: e.clientX, startY: e.clientY, element: link };
      drag = false;
      const currentIndex = links.indexOf(link);
      preview(currentIndex);
      try { link.setPointerCapture(e.pointerId); } catch { /* allowed to fail */ }
    });
    nav.addEventListener('pointermove', e => {
      if (!mobile.matches || !pointer || e.pointerId !== pointer.id || navigating) return;
      const dx = e.clientX - pointer.startX;
      const dy = e.clientY - pointer.startY;
      if (!drag && Math.abs(dx) < 11) return;
      if (!drag && Math.abs(dy) > Math.abs(dx) * 1.4) return;
      drag = true;
      nav.classList.add('v131-dragging');
      const idx = closestIndex(e.clientX);
      const r = nav.getBoundingClientRect();
      const p = bubblePoint(idx);
      const minX = bubblePoint(0).x;
      const maxX = bubblePoint(links.length - 1).x;
      showAt(Math.max(minX, Math.min(maxX, e.clientX - r.left - BUBBLE_W / 2)), p.y, true);
      preview(idx);
      if (e.cancelable) e.preventDefault();
    }, {passive:false});
    nav.addEventListener('pointerup', e => {
      if (!pointer || e.pointerId !== pointer.id) return;
      const didDrag = drag;
      const idx = closestIndex(e.clientX);
      try { pointer.element.releasePointerCapture(e.pointerId); } catch { /* no-op */ }
      pointer = null;
      drag = false;
      nav.classList.remove('v131-dragging');
      if (didDrag) {
        suppressUntil = performance.now() + 480;
        snap(idx);
        if (navigator.vibrate) { try { navigator.vibrate(8); } catch { /* optional */ } }
        navigate(idx);
      } else snap(active);
    });
    nav.addEventListener('pointercancel', e => {
      if (!pointer || e.pointerId !== pointer.id) return;
      pointer = null;
      drag = false;
      nav.classList.remove('v131-dragging');
      snap(active);
    });
    // Touch-specific fallback: iOS/Android can cancel pointer capture when the
    // browser interprets a gesture as a page scroll. Touch events stay reliable.
    let touch = null;
    function pointFromTouch(t) {
      return {x: t.clientX, y: t.clientY};
    }
    function drawTouchPreview(x) {
      const idx = closestIndex(x);
      const r = nav.getBoundingClientRect();
      const p = bubblePoint(idx);
      const left = bubblePoint(0).x, right = bubblePoint(links.length - 1).x;
      showAt(Math.max(left,Math.min(right,x-r.left-BUBBLE_W/2)),p.y,true);
      preview(idx);
    }
    nav.addEventListener('touchstart', e => {
      if (!mobile.matches || navigating || e.touches.length !== 1) return;
      const link = e.target.closest('a.bottom-nav-item');
      if (!link || !nav.contains(link)) return;
      const t = e.touches[0];
      touch = {id:t.identifier, ...pointFromTouch(t), dragging:false};
      preview(links.indexOf(link));
    }, {passive:true});
    nav.addEventListener('touchmove', e => {
      if (!touch || navigating) return;
      const t = [...e.touches].find(x => x.identifier === touch.id);
      if (!t) return;
      const dx = t.clientX-touch.x, dy = t.clientY-touch.y;
      if (!touch.dragging && Math.abs(dx) < 11) return;
      if (!touch.dragging && Math.abs(dy) > Math.abs(dx)*1.4) return;
      touch.dragging = true;
      nav.classList.add('v131-dragging');
      if (e.cancelable) e.preventDefault();
      drawTouchPreview(t.clientX);
    }, {passive:false});
    nav.addEventListener('touchend', e => {
      if (!touch) return;
      const t = [...e.changedTouches].find(x=>x.identifier===touch.id);
      if (!t) return;
      const dragged=touch.dragging;
      touch=null;
      nav.classList.remove('v131-dragging');
      if (dragged) {
        const idx=closestIndex(t.clientX);
        suppressUntil=performance.now()+650;
        snap(idx);
        navigate(idx);
      } else snap(active);
    }, {passive:true});
    nav.addEventListener('touchcancel', () => {
      touch=null;
      nav.classList.remove('v131-dragging');
      snap(active);
    }, {passive:true});
    nav.addEventListener('click', e => {
      if (!mobile.matches || navigating) return;
      const link = e.target.closest('a.bottom-nav-item');
      if (!link || !nav.contains(link)) return;
      if (performance.now() < suppressUntil) {
        e.preventDefault(); e.stopImmediatePropagation(); return;
      }
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const idx = links.indexOf(link);
      if (idx < 0) return;
      e.preventDefault();
      snap(idx);
      navigate(idx);
    }, true);
    nav.addEventListener('keydown', e => {
      if (!mobile.matches || e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (!links.includes(document.activeElement)) return;
      e.preventDefault();
      const idx = links.indexOf(document.activeElement);
      const next = Math.max(0, Math.min(links.length - 1, idx + (e.key === 'ArrowRight' ? 1 : -1)));
      links[next].focus();
      snap(next);
    });
    nav.addEventListener('focusout', () => {
      if (!nav.contains(document.activeElement) && !drag) snap(active);
    });

    // Position after fonts/layout settle. Handle rotation and desktop resize.
    const updateLayout = () => {
      if (mobile.matches && !drag) snap(active, true);
    };
    window.addEventListener('resize', updateLayout, {passive:true});
    window.addEventListener('pageshow', () => { navigating = false; document.body.classList.remove('v131-exiting'); updateLayout(); });
    if ('ResizeObserver' in window) new ResizeObserver(updateLayout).observe(nav);
    updateLayout();
    requestAnimationFrame(updateLayout);

    // Lightweight entrance on the next HTML document; session state is not auth data.
    let lastDir = '';
    try { lastDir = sessionStorage.getItem('ptech-v131-slide') || ''; sessionStorage.removeItem('ptech-v131-slide'); } catch { /* no-op */ }
    if (lastDir && !reduceMotion.matches) {
      document.documentElement.dataset.v131Direction = lastDir;
      document.body.classList.add('v131-entering');
      window.setTimeout(() => document.body.classList.remove('v131-entering'), 330);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
