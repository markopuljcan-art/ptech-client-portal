/* PTech V28.3 — readable glass over a pale gold scene or optional photograph.
 * Curved edges trace the scene; the interior softly diffuses and tones it.
 * DOM text, links, saved layout and authentication remain native.
 */
(() => {
  'use strict';

  const surfaceSelector = [
    '#portalHome .portal-welcome',
    '#portalHome .ptech-dashboard-grid > .ptech-widget',
    '.ptech-zoom-grid > .ptech-widget',
    '#portalHome .portal-project-card',
    '#portalHome .portal-metric',
    '#portalHome .portal-task-main',
    '#portalHome .portal-adaptive-glance',
    '#portalHome .portal-preview-link',
    '#portalHome .portal-adaptive-list-row',
    '#portalHome .portal-action',
    '#portalHome .portal-summary-preview:has(.portal-empty-preview)',
    '#portalHome .ptech-hub-extra',
    '.ptech-zoom-grid .portal-project-card',
    '.ptech-zoom-grid .portal-metric',
    '.ptech-zoom-grid .portal-task-main',
    '.ptech-zoom-grid .portal-adaptive-glance',
    '.ptech-zoom-grid .portal-preview-link',
    '.ptech-zoom-grid .portal-adaptive-list-row',
    '.ptech-zoom-grid .portal-action',
    '.ptech-zoom-grid .portal-summary-preview:has(.portal-empty-preview)',
    '.ptech-zoom-grid .ptech-hub-extra',
    '.ptech-widget-picker',
    '.ptech-catalog-tile',
    '.ptech-personal-form',
    '.portal-action-picker-choice',
    '.portal-action-picker-selected-row',
    '.portal-adaptive-dialog-item'
  ].join(',');
  const canvasClass = 'ptech-liquid-canvas';
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const round = n => Math.round(n * 4) / 4;

  function init() {
    const body = document.querySelector('body.ptech-home-glass-v28');
    const main = body && body.querySelector('.desktop-main');
    const optics = window.PTechLiquidOptics;
    if (!main || !optics || body.dataset.ptechHomeGlassReady) return;
    body.dataset.ptechHomeGlassReady = 'true';

    let renderer;
    try { renderer = optics.createRenderer(); } catch (_) {
      delete body.dataset.ptechHomeGlassReady;
      return;
    }
    const scene = document.createElement('canvas');
    const sceneContext = scene.getContext('2d', { alpha: false });
    if (!sceneContext) {
      renderer.destroy();
      delete body.dataset.ptechHomeGlassReady;
      return;
    }
    scene.className = 'ptech-gold-scene';
    scene.setAttribute('aria-hidden', 'true');
    scene.setAttribute('role', 'presentation');
    main.append(scene);

    const tracked = new Map();
    let frame = 0, destroyed = false, sceneKey = '', sceneVersion = 0;
    let sceneWidth = 0, sceneHeight = 0, needsDiscovery = true, movingUntil = 0;
    let activePointerId = null;
    const backdropImage = body.querySelector('#ptechGlassBackdropImage');
    const backdropToolbar = body.querySelector('#ptechGlassBackdropToolbar');
    const photoButton = body.querySelector('#ptechBackdropPhoto');
    const goldButton = body.querySelector('#ptechBackdropGold');
    const backdropStatus = body.querySelector('#ptechGlassBackdropStatus');
    let backdropChoice = main.dataset.ptechBackdropChoice === 'photo' ? 'photo' : 'gold';
    let imageState = backdropImage ? 'loading' : 'error';
    let imageRevision = 0, decorationFailed = false;
    const cleanupEvents = [];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    function on(target, name, handler, options) {
      target.addEventListener(name, handler, options);
      cleanupEvents.push(() => target.removeEventListener(name, handler, options));
    }
    function queue(duration = 0) {
      if (destroyed || document.hidden) return;
      if (duration && !reduced.matches) movingUntil = Math.max(movingUntil, performance.now() + duration);
      if (!frame) frame = requestAnimationFrame(paint);
    }
    function rgba(rgb, alpha) { return 'rgba(' + rgb + ',' + alpha + ')'; }

    function syncBackdropControls() {
      main.dataset.ptechBackdropChoice = backdropChoice;
      if (!main.dataset.ptechBackdropActive) main.dataset.ptechBackdropActive = 'gold';
      if (photoButton) photoButton.setAttribute('aria-pressed', String(backdropChoice === 'photo'));
      if (goldButton) goldButton.setAttribute('aria-pressed', String(backdropChoice === 'gold'));
      if (backdropToolbar) backdropToolbar.dataset.ptechBackdropStatus = decorationFailed ? 'error' : imageState;
      const message = backdropChoice !== 'photo' ? '' : decorationFailed || imageState === 'error'
        ? 'Slika nije dostupna. Prikazana je zlatna pozadina.'
        : imageState === 'loading' ? 'Učitavanje slike… Prikazana je zlatna pozadina.' : '';
      if (backdropStatus && backdropStatus.textContent !== message) backdropStatus.textContent = message;
    }
    function invalidateBackdrop() {
      sceneKey = '';
      for (const [element, entry] of tracked) {
        entry.key = '';
        entry.failed = false;
        delete element.dataset.ptechLiquidReady;
      }
      syncBackdropControls();
      queue();
    }
    function chooseBackdrop(choice) {
      if (destroyed || choice === backdropChoice) return;
      backdropChoice = choice;
      decorationFailed = false;
      invalidateBackdrop();
    }
    function imageLoaded() {
      if (destroyed) return;
      imageState = backdropImage && backdropImage.naturalWidth > 0 && backdropImage.naturalHeight > 0 ? 'ready' : 'error';
      imageRevision++;
      invalidateBackdrop();
    }
    function imageFailed() {
      if (destroyed) return;
      imageState = 'error';
      imageRevision++;
      invalidateBackdrop();
    }

    function paintScene(width, height, light) {
      // Bounded raster; logical coordinates stay in CSS pixels regardless of DPR.
      const density = Math.min(1.4, window.devicePixelRatio || 1, 1900 / width,
        3000 / height, Math.sqrt(2600000 / (width * height)));
      scene.width = Math.max(1, Math.ceil(width * density));
      scene.height = Math.max(1, Math.ceil(height * density));
      scene.style.width = width + 'px';
      scene.style.height = height + 'px';
      const ctx = sceneContext;
      ctx.setTransform(density, 0, 0, density, 0, 0);
      let photoPainted = false;
      if (backdropChoice === 'photo' && imageState === 'ready') {
        try {
          // A raw, aspect-preserving cover crop per viewport-height band keeps
          // long mobile pages from magnifying one tiny slice of the photograph.
          // The visible scene and every lens use these exact same image pixels.
          const tileHeight = Math.min(height, Math.max(1, window.innerHeight || height));
          const scale = Math.max(width / backdropImage.naturalWidth, tileHeight / backdropImage.naturalHeight);
          const sourceWidth = width / scale, sourceHeight = tileHeight / scale;
          const sourceX = (backdropImage.naturalWidth - sourceWidth) / 2;
          const sourceY = (backdropImage.naturalHeight - sourceHeight) / 2;
          for (let y = 0; y < height; y += tileHeight) {
            ctx.drawImage(backdropImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, y, width, tileHeight);
          }
          photoPainted = true;
        } catch (_) {
          imageState = 'error';
          imageRevision++;
        }
      }
      if (!photoPainted) {
      ctx.fillStyle = light ? '#f7f3e8' : '#191d24';
      ctx.fillRect(0, 0, width, height);

      function glow(x, y, rx, ry, rgb, opacity) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(rx, ry);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, rgba(rgb, opacity));
        gradient.addColorStop(.28, rgba(rgb, opacity * .82));
        gradient.addColorStop(.66, rgba(rgb, opacity * .24));
        gradient.addColorStop(1, rgba(rgb, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
      }
      const top = Math.min(height * .42, width < 700 ? 650 : 560);
      glow(width * .75, top, Math.max(width * .82, 620), 740, '223,194,125', light ? .34 : .20);
      glow(width * .12, Math.min(height * .82, 1320), Math.max(width * .66, 540), 660, '206,175,106', light ? .15 : .12);
      glow(width * .32, 80, Math.max(width * .56, 480), 460, '255,251,235', light ? .66 : .045);

      // Soft reflected-light contours make the curved edge's bending visible.
      // They are part of this exact shared scene, not a separate overlay.
      function lightBand(y, amplitude, rgb, alpha, lineWidth, blur) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(-100, y + amplitude * .55);
        ctx.bezierCurveTo(width * .25, y - amplitude, width * .58, y + amplitude * 1.3, width + 100, y - amplitude * .2);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = rgba(rgb, alpha);
        ctx.shadowColor = rgba(rgb, alpha * .9);
        ctx.shadowBlur = blur;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }
      const band = Math.min(490, Math.max(240, width * .34));
      lightBand(band, Math.min(230, width * .22), light ? '184,153,85' : '222,195,135', light ? .10 : .10, 20, 28);
      lightBand(band - 20, Math.min(230, width * .22), '255,253,241', light ? .48 : .10, 7, 18);
      lightBand(band + 510, Math.min(200, width * .19), '207,177,112', light ? .08 : .085, 26, 34);
      lightBand(band + 492, Math.min(200, width * .19), '255,250,228', light ? .32 : .075, 5, 16);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      renderer.setScene(scene);
      main.dataset.ptechSceneReady = 'true';
      main.dataset.ptechBackdropActive = photoPainted ? 'photo' : 'gold';
      decorationFailed = false;
      syncBackdropControls();
    }

    function release(element, entry) {
      if (resize) resize.unobserve(element);
      if (entry.canvas.parentNode) entry.canvas.remove();
      element.classList.remove('ptech-liquid-surface', 'ptech-liquid-positioned');
      delete element.dataset.ptechLiquidReady;
      delete element.dataset.ptechGlassSurface;
      tracked.delete(element);
    }
    function discover() {
      const found = new Set(body.querySelectorAll(surfaceSelector));
      for (const [element, entry] of tracked) {
        if (!found.has(element)) release(element, entry);
      }
      for (const element of found) {
        let entry = tracked.get(element);
        if (!entry) {
          // Remove stale decorative layers without cloning any native content.
          for (const child of [...element.children]) {
            if (child.classList.contains(canvasClass)) child.remove();
          }
          const canvas = document.createElement('canvas');
          canvas.className = canvasClass;
          canvas.setAttribute('aria-hidden', 'true');
          canvas.setAttribute('role', 'presentation');
          entry = { canvas, key: '', failed: false };
          tracked.set(element, entry);
          element.classList.add('ptech-liquid-surface');
          element.dataset.ptechGlassSurface = '';
          if (getComputedStyle(element).position === 'static') element.classList.add('ptech-liquid-positioned');
          if (resize) resize.observe(element);
        }
        if (entry.canvas.parentNode !== element) {
          // Append last: keep existing first-child labels and indexed controls intact.
          element.append(entry.canvas);
          entry.key = '';
        }
      }
      needsDiscovery = false;
    }

    function paint(now) {
      frame = 0;
      if (destroyed || document.hidden) return;
      try {
        if (needsDiscovery) discover();
        const mainRect = main.getBoundingClientRect();
        const light = document.documentElement.dataset.theme === 'light' || body.classList.contains('light-mode');
        sceneWidth = Math.max(1, main.clientWidth);
        sceneHeight = Math.max(main.clientHeight, window.innerHeight);
        const nextSceneKey = [sceneWidth, sceneHeight, light, window.devicePixelRatio || 1,
          window.innerHeight, backdropChoice, imageState, imageRevision].join(':');
        if (nextSceneKey !== sceneKey) {
          paintScene(sceneWidth, sceneHeight, light);
          sceneKey = nextSceneKey;
          sceneVersion++;
        }
        const start = performance.now();
        let remaining = false, painted = 0;
        for (const [element, entry] of tracked) {
          if (!element.isConnected || entry.failed) continue;
          const rect = element.getBoundingClientRect();
          if (rect.width < 12 || rect.height < 12 || rect.bottom < -140 ||
              rect.top > window.innerHeight + 140 || rect.right < 0 || rect.left > window.innerWidth) continue;
          const style = getComputedStyle(element);
          if (style.visibility === 'hidden' || style.display === 'none') continue;
          const sx = rect.width / Math.max(1, element.offsetWidth);
          const sy = rect.height / Math.max(1, element.offsetHeight);
          const left = (parseFloat(style.borderLeftWidth) || 0) * sx;
          const right = (parseFloat(style.borderRightWidth) || 0) * sx;
          const top = (parseFloat(style.borderTopWidth) || 0) * sy;
          const bottom = (parseFloat(style.borderBottomWidth) || 0) * sy;
          const width = Math.max(1, rect.width - left - right);
          const height = Math.max(1, rect.height - top - bottom);
          const radius = clamp((parseFloat(style.borderTopLeftRadius) || 0) * Math.min(sx, sy) - Math.max(left, top), 0, Math.min(width, height) / 2);
          const outer = element.matches('.portal-welcome,.ptech-widget,.ptech-widget-picker');
          const kind = outer ? 'outer' : 'inner';
          const originX = rect.left - mainRect.left + left;
          const originY = rect.top - mainRect.top + top;
          const key = [sceneVersion, round(width), round(height), round(radius), round(originX), round(originY), renderer.mode].join(':');
          if (entry.key === key) continue;
          if (painted && performance.now() - start > 12) { remaining = true; break; }
          const software = renderer.mode !== 'webgl';
          const ratio = software
            ? Math.min(.8, Math.sqrt(85000 / (width * height)))
            : Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(400000 / (width * height)));
          const rim = Math.min(outer ? 21 : 10, height * .24, width * .24);
          try {
            const result = renderer.render(entry.canvas, {
              width, height, radius, rim, depth: outer ? 36 : 18,
              dispersion: 1, originX, originY, sceneWidth, sceneHeight, light, kind, pixelRatio: ratio,
              // A busy photograph needs a stronger interior veil than the calm
              // gold scene. Inner cards use the same treatment as their shell.
              readability: main.dataset.ptechBackdropActive === 'photo' ? .72 : light ? .30 : .35,
              blur: 12
            });
            if (result === false) throw new Error('No glass frame');
            entry.key = key;
            element.dataset.ptechLiquidReady = 'true';
            painted++;
          } catch (_) {
            entry.failed = true;
            delete element.dataset.ptechLiquidReady;
            entry.canvas.width = entry.canvas.height = 1;
          }
        }
        if (remaining || now < movingUntil) queue();
      } catch (_) {
        // Keep the native CSS material and working controls if decoration fails.
        sceneKey = '';
        delete main.dataset.ptechSceneReady;
        main.dataset.ptechBackdropActive = 'gold';
        decorationFailed = true;
        scene.width = scene.height = 1;
        for (const [element, entry] of tracked) {
          entry.key = '';
          entry.failed = false;
          delete element.dataset.ptechLiquidReady;
          entry.canvas.width = entry.canvas.height = 1;
        }
        syncBackdropControls();
      }
    }

    const resize = 'ResizeObserver' in window ? new ResizeObserver(() => queue()) : null;
    if (resize) resize.observe(main);
    const mutation = new MutationObserver(records => {
      let dirty = false;
      for (const record of records) {
        const target = record.target;
        if (!(target instanceof Element) || target.tagName === 'CANVAS') continue;
        if (record.type === 'childList') {
          const nodes = [...record.addedNodes, ...record.removedNodes].filter(node =>
            node.nodeType === 1 && node.tagName !== 'CANVAS'
          );
          if (nodes.length || (tracked.has(target) && tracked.get(target).canvas.parentNode !== target)) {
            needsDiscovery = true;
            dirty = true;
          }
        } else if (target === body || target === document.documentElement || target === main ||
            tracked.has(target) || target.closest('#portalHome,.ptech-zoom-grid')) dirty = true;
      }
      // Native widget reflow uses a 280ms Web Animations transform, beginning
      // on the next frame. It does not emit CSS transitionend events.
      if (dirty) queue(360);
    });
    mutation.observe(body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'data-adaptive-level'] });
    const themeObserver = new MutationObserver(() => queue());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    on(window, 'resize', () => queue(200), { passive: true });
    on(window, 'scroll', () => queue(), { capture: true, passive: true });
    on(window, 'orientationchange', () => queue(250), { passive: true });
    on(document, 'visibilitychange', () => {
      if (document.hidden) {
        activePointerId = null;
        movingUntil = 0;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      } else queue(360);
    });
    on(body, 'pointerover', event => {
      if (event.target instanceof Element && event.target.closest('.portal-action')) queue(260);
    }, { passive: true });
    on(body, 'pointerout', event => {
      if (event.target instanceof Element && event.target.closest('.portal-action')) queue(260);
    }, { passive: true });
    on(body, 'transitionrun', event => {
      if (tracked.has(event.target)) queue(300);
    }, { passive: true });
    on(body, 'transitionend', event => {
      if (tracked.has(event.target)) queue();
    }, { passive: true });
    // Capture observes native handles even when their existing handlers stop
    // propagation. Every event requests only a bounded settling window: a lost
    // release can never leave an idle animation loop running indefinitely.
    function finishGesture(event) {
      if (activePointerId === null) return;
      if (event && typeof event.pointerId === 'number' && event.pointerId !== activePointerId) return;
      activePointerId = null;
      queue(360);
    }
    on(body, 'pointerdown', event => {
      if (body.classList.contains('ptech-layout-editing') && event.target instanceof Element &&
          event.target.closest('.ptech-widget-move,.ptech-widget-resize') &&
          (event.pointerType !== 'mouse' || event.button === 0)) {
        activePointerId = event.pointerId;
        queue(360);
      }
    }, { capture: true, passive: true });
    on(window, 'pointermove', event => {
      if (activePointerId !== null && event.pointerId === activePointerId) queue(360);
    }, { capture: true, passive: true });
    on(window, 'pointerup', finishGesture, { capture: true, passive: true });
    on(window, 'pointercancel', finishGesture, { capture: true, passive: true });
    on(body, 'lostpointercapture', finishGesture, { capture: true, passive: true });
    on(window, 'blur', finishGesture);
    on(window, 'keydown', event => { if (event.key === 'Escape') finishGesture(); }, { capture: true });
    if (photoButton) on(photoButton, 'click', () => chooseBackdrop('photo'));
    if (goldButton) on(goldButton, 'click', () => chooseBackdrop('gold'));
    if (backdropImage) {
      on(backdropImage, 'load', imageLoaded);
      on(backdropImage, 'error', imageFailed);
      if (backdropImage.complete) imageLoaded();
    }
    syncBackdropControls();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => queue(250));
    queue(500);

    on(window, 'pagehide', () => {
      destroyed = true;
      if (frame) cancelAnimationFrame(frame);
      mutation.disconnect();
      themeObserver.disconnect();
      if (resize) resize.disconnect();
      cleanupEvents.splice(0).forEach(remove => remove());
      for (const [element, entry] of [...tracked]) release(element, entry);
      renderer.destroy();
      scene.remove();
      delete main.dataset.ptechSceneReady;
      main.dataset.ptechBackdropActive = 'gold';
      delete body.dataset.ptechHomeGlassReady;
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('pageshow', event => { if (event.persisted) init(); });
})();

