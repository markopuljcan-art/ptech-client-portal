/* PTECH DIGITAL V13.4 - unified mobile layer and native-like dock.
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
    'messages.html','profile.html','project.html','tasks.html'
  ]);
  const page = decodeURIComponent(location.pathname.split('/').pop() || '');
  if (!PAGES.has(page)) return;

  function init() {
    if (!document.body || document.body.classList.contains('ptech-v13')) return;
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    document.body.classList.add('ptech-v13');
    nav.setAttribute('aria-label', 'Glavna navigacija PTech Client Portala');

    const activeHref = (page === 'project.html' || page === 'tasks.html') ? 'my-projects.html' : page;
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
  const PAGES = new Set(['form.html','my-projects.html','documents.html','messages.html','profile.html','project.html','tasks.html']);
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
    // V25.12: one and only one visibly selected icon. Gesture preview is
    // separate from the selected page, so press/hold cannot blacken two icons.
    function selectVisual(index) {
      links.forEach((link,i) => link.classList.toggle('ptech-nav-selected', i === index));
    }
    selectVisual(active);
    const documentIndex = active; // The page really loaded; distinct from an optimistic tap.
    let hovered = active;
    let pointer = null;
    let drag = false;
    let suppressUntil = 0;
    let navigating = false;
    // V26.3: latest intent wins. While someone taps quickly we keep the dock
    // fully interactive and launch only ONE cross-document navigation.
    // Full page reloads cannot themselves remain interactive, so we coalesce
    // rapid input BEFORE handing control to the browser.
    const NAV_IDLE_MS = 190;
    let pendingIndex = -1;
    let pendingTimer = 0;
    // Stable layout size; getBoundingClientRect() grows when the glass deforms.
    const bubbleWidth = () => bubble.offsetWidth || 62;
    const bubbleHeight = () => bubble.offsetHeight || 59;

    /* iOS-like liquid lens motion: a single spring-driven, deformable glass lens.
       It follows the finger continuously; selection happens only on release.
       No external library, no changes to auth, and full reduced-motion support. */
    const spring = {
      x: NaN, y: NaN, targetX: 0, targetY: 0,
      vx: 0, vy: 0, stretch: 1, stretchV: 0,
      lastTime: 0, frame: 0, following: false
    };
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    nav.classList.add('ptech-liquid-motion');
    const motionAllowed = () => mobile.matches && !reduceMotion.matches;

    function paintLiquid() {
      const stretch = motionAllowed() ? spring.stretch : 1;
      const squish = 1 / Math.sqrt(stretch);
      bubble.style.transform = `translate3d(${spring.x.toFixed(2)}px,${spring.y.toFixed(2)}px,0) scale(${stretch.toFixed(4)},${squish.toFixed(4)})`;
      // V26: optical highlights shift subtly with velocity, without replacing
      // the spring animation or altering active-tab selection.
      const glint = clamp(48 + spring.vx * 1.32, 26, 74);
      const specularShift = clamp(spring.vx * 0.24, -3.5, 3.5);
      bubble.style.setProperty('--p26-highlight-x', `${glint.toFixed(1)}%`);
      bubble.style.setProperty('--p261-glint-x', `${glint.toFixed(1)}%`);
      bubble.style.setProperty('--p261-specular-shift', `${specularShift.toFixed(2)}px`);
      bubble.style.setProperty('--p26-shimmer-y', `${clamp(spring.vy * 0.12, -1.4, 1.4).toFixed(2)}px`);
    }
    function liquidFrame(timestamp) {
      spring.frame = 0;
      const dt = spring.lastTime ? clamp((timestamp - spring.lastTime) / 16.667, 0.55, 1.7) : 1;
      spring.lastTime = timestamp;
      // Slightly firmer following while held; a softer, damped snap afterwards.
      const stiffness = spring.following ? 0.23 : 0.17;
      const friction = spring.following ? 0.69 : 0.74;
      spring.vx = (spring.vx + (spring.targetX - spring.x) * stiffness * dt) * Math.pow(friction, dt);
      spring.vy = (spring.vy + (spring.targetY - spring.y) * stiffness * dt) * Math.pow(friction, dt);
      spring.x += spring.vx * dt;
      spring.y += spring.vy * dt;
      // Stretch parallel to travel, settle back to a regular pill when stationary.
      const stretchTarget = 1 + Math.min(0.08, Math.abs(spring.vx) * 0.007) + (spring.following ? 0.026 : 0);
      spring.stretchV = (spring.stretchV + (stretchTarget - spring.stretch) * 0.20 * dt) * Math.pow(0.63, dt);
      spring.stretch += spring.stretchV * dt;
      spring.stretch = clamp(spring.stretch, 0.985, 1.115);
      paintLiquid();
      const moving = Math.abs(spring.targetX - spring.x) > 0.12 ||
        Math.abs(spring.targetY - spring.y) > 0.12 || Math.abs(spring.vx) > 0.08 ||
        Math.abs(spring.vy) > 0.08 || Math.abs(spring.stretch - stretchTarget) > 0.003 ||
        Math.abs(spring.stretchV) > 0.002;
      if (moving) spring.frame = requestAnimationFrame(liquidFrame);
      else {
        spring.x = spring.targetX; spring.y = spring.targetY;
        spring.vx = spring.vy = spring.stretchV = 0;
        spring.stretch = spring.following ? 1.026 : 1; spring.lastTime = 0;
        paintLiquid();
      }
    }
    function setGlassTarget(x, y, instant = false, following = false) {
      // The lens never leaves the dock, even with elastic scale.
      const margin = 9;
      const maxX = Math.max(margin, nav.clientWidth - bubbleWidth() - margin);
      const maxY = Math.max(margin, nav.clientHeight - bubbleHeight() - margin);
      spring.targetX = clamp(x, margin, maxX);
      spring.targetY = clamp(y, margin, maxY);
      spring.following = following;
      if (!Number.isFinite(spring.x) || instant || !motionAllowed()) {
        if (spring.frame) cancelAnimationFrame(spring.frame);
        spring.frame = 0; spring.lastTime = 0;
        spring.x = spring.targetX; spring.y = spring.targetY;
        spring.vx = spring.vy = spring.stretchV = 0;
        spring.stretch = 1;
        paintLiquid();
      } else if (!spring.frame) {
        spring.frame = requestAnimationFrame(liquidFrame);
      }
    }

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
      const tab = links[index].getBoundingClientRect();
      const nr = nav.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - nr.left - bubbleWidth() / 2,
        // Center within the full nav row (icon + label), not just the icon.
        y: tab.top + tab.height / 2 - nr.top - bubbleHeight() / 2
      };
    }
    function showAt(x, y, immediate = false, following = false) {
      setGlassTarget(x, y, immediate, following);
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
    function setSelectedTab(index) {
      selectVisual(index);
      links.forEach((link, i) => {
        const selected = i === index;
        link.classList.toggle('active', selected);
        if (selected) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      active = index;
      snap(index);
    }

    function cancelQueuedNavigation() {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = 0;
      pendingIndex = -1;
      nav.classList.remove('v131-switching', 'p263-pending');
    }

    function commitQueuedNavigation() {
      pendingTimer = 0;
      const index = pendingIndex;
      if (index < 0 || navigating || index === documentIndex) {
        cancelQueuedNavigation();
        return;
      }
      const url = targetPath(links[index]);
      if (!url) {
        cancelQueuedNavigation();
        setSelectedTab(documentIndex);
        return;
      }
      pendingIndex = -1;
      navigating = true;
      nav.classList.remove('p263-pending', 'v131-holding', 'v131-dragging');
      nav.classList.add('v131-switching', 'p263-committing');
      // Save the direction once, for the already existing page transition.
      try { sessionStorage.setItem('ptech-v131-slide', index > documentIndex ? 'next' : 'prev'); } catch (_) {}
      // No extra animation timeout here: the browser receives the final URL
      // immediately after the brief burst of taps settles.
      location.assign(url.href);
    }

    function navigate(index) {
      if (navigating || index < 0 || index >= links.length) return;
      if (!targetPath(links[index])) return;
      // Optimistic feedback is instant, even if a previous destination was queued.
      setSelectedTab(index);
      // Pressing the original page cancels an in-flight rapid-selection burst.
      if (index === documentIndex) {
        cancelQueuedNavigation();
        return;
      }
      pendingIndex = index;
      nav.classList.add('p263-pending', 'v131-switching');
      if (pendingTimer) clearTimeout(pendingTimer);
      // Repeated taps only update the pending destination. Do not start a full
      // document load until the user's finger has stopped switching tabs.
      pendingTimer = window.setTimeout(commitQueuedNavigation, NAV_IDLE_MS);
    }

    nav.addEventListener('pointerdown', e => {
      if (!mobile.matches || navigating || e.pointerType === 'touch' || e.button !== 0 || !e.isPrimary) return;
      const link = e.target.closest('a.bottom-nav-item');
      if (!link || !nav.contains(link)) return;
      // Preserve ordinary link semantics for modified clicks / accessible keyboard use.
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      // A NEW physical press must not be blocked by the previous swipe's
      // synthetic-click suppression window.
      suppressUntil = 0;
      pointer = { id: e.pointerId, startX: e.clientX, startY: e.clientY, element: link };
      drag = false;
      nav.classList.add('v131-holding');
      const currentIndex = links.indexOf(link);
      selectVisual(currentIndex); // The pressed tab replaces the old solid icon.
      preview(currentIndex);
      const pressed = bubblePoint(currentIndex);
      showAt(pressed.x, pressed.y, false, true);
      try { link.setPointerCapture(e.pointerId); } catch { /* allowed to fail */ }
    });
    nav.addEventListener('pointermove', e => {
      if (!mobile.matches || !pointer || e.pointerId !== pointer.id || navigating) return;
      const dx = e.clientX - pointer.startX;
      const dy = e.clientY - pointer.startY;
      if (!drag && Math.abs(dx) < 11) return;
      if (!drag && Math.abs(dy) > Math.abs(dx) * 1.4) return;
      drag = true;
      selectVisual(active); // Drag is preview-only until the finger is released.
      nav.classList.add('v131-dragging');
      const idx = closestIndex(e.clientX);
      const r = nav.getBoundingClientRect();
      const p = bubblePoint(idx);
      const minX = bubblePoint(0).x;
      const maxX = bubblePoint(links.length - 1).x;
      showAt(Math.max(minX, Math.min(maxX, e.clientX - r.left - bubbleWidth() / 2)), p.y, false, true);
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
      nav.classList.remove('v131-dragging', 'v131-holding');
      spring.following = false;
      if (didDrag) {
        suppressUntil = performance.now() + 480;
        snap(idx);
        if (navigator.vibrate) { try { navigator.vibrate(8); } catch { /* optional */ } }
        navigate(idx);
      } else {
        // Keep pressed tab visibly chosen until its native click commits it.
        // Do not momentarily snap back to the old tab on pointerup.
      }
    });
    nav.addEventListener('pointercancel', e => {
      if (!pointer || e.pointerId !== pointer.id) return;
      pointer = null;
      drag = false;
      nav.classList.remove('v131-dragging', 'v131-holding');
      spring.following = false;
      selectVisual(active);
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
      showAt(Math.max(left,Math.min(right,x-r.left-bubbleWidth()/2)),p.y,false,true);
      preview(idx);
    }
    nav.addEventListener('touchstart', e => {
      if (!mobile.matches || navigating || e.touches.length !== 1) return;
      const link = e.target.closest('a.bottom-nav-item');
      if (!link || !nav.contains(link)) return;
      suppressUntil = 0;
      const t = e.touches[0];
      touch = {id:t.identifier, ...pointFromTouch(t), dragging:false};
      nav.classList.add('v131-holding');
      const pressedIndex = links.indexOf(link);
      selectVisual(pressedIndex);
      preview(pressedIndex);
      const pressed = bubblePoint(pressedIndex);
      showAt(pressed.x, pressed.y, false, true);
    }, {passive:true});
    nav.addEventListener('touchmove', e => {
      if (!touch || navigating) return;
      const t = [...e.touches].find(x => x.identifier === touch.id);
      if (!t) return;
      const dx = t.clientX-touch.x, dy = t.clientY-touch.y;
      if (!touch.dragging && Math.abs(dx) < 11) return;
      if (!touch.dragging && Math.abs(dy) > Math.abs(dx)*1.4) return;
      touch.dragging = true;
      selectVisual(active);
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
      nav.classList.remove('v131-dragging', 'v131-holding');
      spring.following = false;
      if (dragged) {
        const idx=closestIndex(t.clientX);
        suppressUntil=performance.now()+650;
        snap(idx);
        navigate(idx);
      } else {
        // Native click follows touchend; retain exclusive visual selection.
      }
    }, {passive:true});
    nav.addEventListener('touchcancel', () => {
      touch=null;
      nav.classList.remove('v131-dragging', 'v131-holding');
      spring.following = false;
      selectVisual(active);
      snap(active);
    }, {passive:true});
    nav.addEventListener('click', e => {
      if (!mobile.matches) return;
      const link = e.target.closest('a.bottom-nav-item');
      if (!link || !nav.contains(link)) return;
      // While an actual document navigation has started, never let a second
      // native click escape and create a competing navigation.
      if (navigating) { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (e.detail !== 0 && performance.now() < suppressUntil) {
        // Only ignore the synthetic click generated at the END of a drag.
        // Keyboard clicks and the next independent pointer/touch press work.
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
    window.addEventListener('pageshow', () => {
      cancelQueuedNavigation();
      // Correct a restored BFCache page whose previous click had changed the
      // old document's aria-current before the browser navigated away.
      const file = decodeURIComponent(location.pathname.split('/').pop() || '');
      const actual = (file === 'project.html' || file === 'tasks.html') ? 'my-projects.html' : file;
      const realIndex = links.findIndex(link => (link.getAttribute('href') || '').split(/[?#]/)[0].replace(/^\.\//,'') === actual);
      if (realIndex >= 0) {
        active = realIndex;
        links.forEach((link,i) => {
          const current = i === active;
          link.classList.toggle('active',current);
          if(current)link.setAttribute('aria-current','page');
          else link.removeAttribute('aria-current');
        });
      }
      navigating = false;
      nav.classList.remove('v131-switching', 'v131-dragging', 'v131-holding', 'p263-pending', 'p263-committing');
      document.body.classList.remove('v131-exiting');
      selectVisual(active);
      updateLayout();
    });
    window.addEventListener('pagehide', () => {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = 0;
    });
    if ('ResizeObserver' in window) new ResizeObserver(updateLayout).observe(nav);
    updateLayout();
    requestAnimationFrame(updateLayout);

    // Keep a gentle fallback for older browsers. Chromium/Safari with
    // same-origin cross-document View Transitions handle the scene natively.
    let lastDir = '';
    try { lastDir = sessionStorage.getItem('ptech-v131-slide') || ''; sessionStorage.removeItem('ptech-v131-slide'); } catch { /* no-op */ }
    if (lastDir && !reduceMotion.matches && !document.createDocumentTransition) {
      // CSS fade is intentionally tiny; the native transition takes priority.
      if (!document.startViewTransition) {
        document.body.classList.add('ptech-ig-fallback-enter');
        window.setTimeout(() => document.body.classList.remove('ptech-ig-fallback-enter'), 210);
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();



/* PTech Digital V13.5 - login-only responsive safety fallback.
   Does NOT change Supabase Auth, Turnstile or form submission. */
(() => {
  'use strict';
  if (!/(?:\/(?:login|index)\.html|\/)$/i.test(location.pathname)) return;
  const init = () => {
    const page = document.querySelector('.login-page');
    const left = page?.querySelector('.login-left');
    const card = page?.querySelector('.login-card');
    if (!page || !left || !card) return;
    const recompute = () => {
      if (innerWidth > 760) {
        document.documentElement.classList.remove('v135-login-scroll');
        document.body.classList.remove('v135-login-scroll');
        return;
      }
      // Never clip the form if viewport, translations or validation grow.
      const available = window.visualViewport?.height || window.innerHeight;
      // Include the actual gap between hero and form; older versions measured
      // only their heights and could clip the bottom of the form on iPhone.
      const pageTop = page.getBoundingClientRect().top;
      const required = card.getBoundingClientRect().bottom - pageTop + 18;
      const keyboardInput = !!document.activeElement?.matches('.login-card input, .login-card textarea');
      const mustScroll = available < 720 || required > available - 4 || keyboardInput;
      document.documentElement.classList.toggle('v135-login-scroll', mustScroll);
      document.body.classList.toggle('v135-login-scroll', mustScroll);
    };
    const observe = new ResizeObserver(recompute);
    observe.observe(left);
    observe.observe(card);
    window.addEventListener('resize', recompute, { passive: true });
    window.visualViewport?.addEventListener('resize', recompute, { passive: true });
    document.addEventListener('focusin', recompute);
    document.addEventListener('focusout', () => requestAnimationFrame(recompute));
    recompute();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();

/* PTECH DIGITAL V13.10 - Reliable mobile launch animation.
   The old sessionStorage one-time flag prevented the intro from replaying
   in a persistent iOS PWA session, even after reopening the login page.
   This version shows the splash on each NEW login document and when returning
   to a backgrounded login after a significant absence. No auth modifications. */
(() => {
  'use strict';
  const pathname = location.pathname.toLowerCase();
  const isLogin = pathname.endsWith('/index.html') || pathname.endsWith('/login.html') || pathname.endsWith('/');
  if (!isLogin) return;
  const mobile = matchMedia('(max-width: 760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function init() {
    const root = document.documentElement;
    const page = document.querySelector('.login-page');
    const card = page?.querySelector('.login-card');
    if (!page || !card || !page.querySelector('.login-left')) {
      root.classList.remove('v137-intro-pending');
      return;
    }
    // Keep the two-tone background seam aligned with the actual login wave.
    let raf = 0;
    const alignSeam = () => {
      if (!mobile.matches || !page.isConnected) return;
      const r = card.getBoundingClientRect();
      const p = page.getBoundingClientRect();
      page.style.setProperty('--v137-seam', `${Math.round(Math.max(0, r.top - p.top + 5))}px`);
    };
    const scheduleAlign = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(alignSeam);
    };
    scheduleAlign();
    addEventListener('resize', scheduleAlign, {passive:true});
    if ('ResizeObserver' in window) new ResizeObserver(scheduleAlign).observe(card);
    if ('MutationObserver' in window) new MutationObserver(scheduleAlign).observe(root, {
      attributes:true, attributeFilter:['data-login-theme']
    });

    let activeSplash = null;
    let hiddenAt = null;
    let lastShown = 0;
    const permitted = () => mobile.matches && !reduced.matches;

    function showIntro() {
      root.classList.remove('v137-intro-pending');
      if (!permitted() || activeSplash || document.visibilityState === 'hidden') return;
      // Prevent duplicate events firing simultaneously when the PWA resumes.
      if (Date.now() - lastShown < 2500) return;
      lastShown = Date.now();
      const splash = document.createElement('div');
      splash.className = 'v137-intro';
      splash.setAttribute('role','status');
      splash.setAttribute('aria-label','Učitavanje PTech Digital portala');
      splash.innerHTML = `<div class="v137-intro__top" aria-hidden="true"></div>
      <div class="v137-intro__bottom" aria-hidden="true"></div>
      <div class="v137-intro__wave" aria-hidden="true">
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="v137-wave-line" x1="0" x2="1">
              <stop stop-color="#c78353" stop-opacity=".35"/>
              <stop offset=".23" stop-color="#fff0d8"/>
              <stop offset=".6" stop-color="#edb486"/>
              <stop offset=".85" stop-color="#fff0d7"/>
              <stop offset="1" stop-color="#bf7b50" stop-opacity=".4"/>
            </linearGradient>
          </defs>
          <path d="M-20 52 C130 -5 205 70 365 65 S620 15 770 49 S910 69 1020 35" fill="none" stroke="#dd9a6a" stroke-width="16" opacity=".3"/>
          <path d="M-20 52 C130 -5 205 70 365 65 S620 15 770 49 S910 69 1020 35" fill="none" stroke="url(#v137-wave-line)" stroke-width="4.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="v137-intro__center">
        <div class="v137-intro__logo"><img alt="" src="./assets/ptech-logo.png"></div>
        <span class="v137-intro__label">PTech Digital</span>
        <div class="v137-intro__progress" aria-hidden="true"></div>
      </div>`;
      document.body.appendChild(splash);
      activeSplash = splash;

      let finished = false;
      let logoTimer = 0;
      let cleanupTimer = 0;
      let safeguardTimer = 0;
      const started = performance.now();
      const cleanup = () => {
        if (activeSplash === splash) activeSplash = null;
        splash.remove();
        scheduleAlign();
      };
      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(logoTimer);
        clearTimeout(safeguardTimer);
        if (!splash.isConnected) {cleanup(); return;}
        splash.classList.add('v137-opening');
        cleanupTimer = setTimeout(cleanup, 970);
      }
      const logo = splash.querySelector('img');
      const revealAfterLogo = () => {
        logoTimer = setTimeout(finish, Math.max(0, 1050 - (performance.now() - started)));
      };
      if (logo?.decode) logo.decode().catch(() => {}).then(revealAfterLogo);
      else revealAfterLogo();
      safeguardTimer = setTimeout(finish, 2300);
      window.addEventListener('pagehide', () => {
        clearTimeout(logoTimer);
        clearTimeout(safeguardTimer);
        clearTimeout(cleanupTimer);
        cleanup();
      }, {once:true});
    }

    showIntro();
    // iOS installed PWAs can restore the SAME document instead of reloading.
    // Replay only on the login screen after an extended background interval.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt !== null) {
        const elapsed = Date.now() - hiddenAt;
        hiddenAt = null;
        if (elapsed >= 10000 && !page.querySelector('input:focus')) showIntro();
      }
    });
    window.addEventListener('pageshow', () => {
      root.classList.remove('v137-intro-pending');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
