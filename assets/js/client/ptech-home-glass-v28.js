/* PTech V28 — optional, decorative refraction for the home dashboard.
 * Only desktop Chromium receives SVG backdrop displacement. CSS provides the
 * glass material everywhere else. Content, controls and the mobile dock are
 * never moved, cloned or filtered by this enhancement.
 */
(() => {
  'use strict';

  const scope = 'body.ptech-home-glass-v28';
  const surfaces = '.portal-welcome, #portalHome .ptech-widget, .dashboard-header';
  const ns = 'http://www.w3.org/2000/svg';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const svgElement = name => document.createElementNS(ns, name);

  function init() {
    const root = document.querySelector(scope);
    if (!root || root.dataset.ptechHomeGlassReady) return;
    root.dataset.ptechHomeGlassReady = 'true';

    const desktop = window.matchMedia('(min-width: 1101px)');
    const ua = navigator.userAgent || '';
    const chromium = /Chrome|Chromium|Edg\//.test(ua) && !/iP(ad|hone|od)|Firefox|FxiOS|CriOS/.test(ua);
    const supported = chromium && window.CSS && CSS.supports('backdrop-filter', 'url(#ptech-home-glass-test)') && 'ResizeObserver' in window;
    const tracked = new Map();
    const maps = new Map();
    const pending = new Set();
    let host, defs, frame = 0, serial = 0, destroyed = false;

    function ensureHost() {
      if (host) return;
      host = svgElement('svg');
      host.setAttribute('aria-hidden', 'true');
      host.setAttribute('focusable', 'false');
      host.setAttribute('width', '0');
      host.setAttribute('height', '0');
      host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
      defs = svgElement('defs');
      host.append(defs);
      root.append(host);
    }

    function displacementMap(width, height, radius) {
      const key = `${width}:${height}:${radius}`;
      if (maps.has(key)) return maps.get(key);
      // Bound map memory/work independently of viewport width or pixel ratio.
      const ratio = Math.min(1, 512 / width, 256 / height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const bitmap = ctx.createImageData(canvas.width, canvas.height);
      const ex = width / 2 - radius, ey = height / 2 - radius;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const xx = (x + .5) * width / canvas.width - width / 2;
          const yy = (y + .5) * height / canvas.height - height / 2;
          const qx = Math.abs(xx) - ex, qy = Math.abs(yy) - ey;
          const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
          const distance = Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - radius;
          // A ten-CSS-pixel curved edge; the interior is a neutral flat field.
          const amount = distance > 0 ? 0 : Math.pow(clamp(1 + distance / 10, 0, 1), 1.5);
          let nx, ny;
          if (ax || ay) { nx = Math.sign(xx) * ax; ny = Math.sign(yy) * ay; }
          else if (qx > qy) { nx = Math.sign(xx); ny = 0; }
          else { nx = 0; ny = Math.sign(yy); }
          const length = Math.hypot(nx, ny) || 1;
          const offset = (y * canvas.width + x) * 4;
          bitmap.data[offset] = Math.round(128 - 90 * amount * nx / length);
          bitmap.data[offset + 1] = Math.round(128 - 90 * amount * ny / length);
          bitmap.data[offset + 2] = 128;
          bitmap.data[offset + 3] = 255;
        }
      }
      ctx.putImageData(bitmap, 0, 0);
      const uri = canvas.toDataURL('image/png');
      if (maps.size >= 16) maps.delete(maps.keys().next().value);
      maps.set(key, uri);
      return uri;
    }

    function clearOptics(element, entry) {
      element.classList.remove('ptech-home-refractive');
      element.style.removeProperty('--ptech-home-refraction');
      if (entry.filter) entry.filter.remove();
      entry.filter = null;
      entry.key = '';
    }

    function draw(element) {
      const entry = tracked.get(element);
      if (!entry || !element.isConnected || !desktop.matches || !supported) return;
      const width = Math.round(element.offsetWidth), height = Math.round(element.offsetHeight);
      if (!width || !height) { clearOptics(element, entry); return; }
      const radius = Math.round(clamp(parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0, 0, Math.min(width, height) / 2));
      const key = `${width}:${height}:${radius}`;
      if (entry.key === key) return;
      try {
        const uri = displacementMap(width, height, radius);
        if (!uri) return;
        ensureHost();
        if (!entry.filter) {
          entry.filter = svgElement('filter');
          entry.filter.id = `ptech-home-glass-${++serial}`;
          entry.filter.setAttribute('filterUnits', 'userSpaceOnUse');
          entry.filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
          entry.filter.setAttribute('color-interpolation-filters', 'sRGB');
          entry.image = svgElement('feImage');
          entry.image.setAttribute('preserveAspectRatio', 'none');
          entry.image.setAttribute('result', 'edgeMap');
          const displacement = svgElement('feDisplacementMap');
          displacement.setAttribute('in', 'SourceGraphic');
          displacement.setAttribute('in2', 'edgeMap');
          displacement.setAttribute('scale', '12');
          displacement.setAttribute('xChannelSelector', 'R');
          displacement.setAttribute('yChannelSelector', 'G');
          entry.filter.append(entry.image, displacement);
          defs.append(entry.filter);
        }
        for (const node of [entry.filter, entry.image]) {
          node.setAttribute('x', '0'); node.setAttribute('y', '0');
          node.setAttribute('width', String(width)); node.setAttribute('height', String(height));
        }
        entry.image.setAttribute('href', uri);
        entry.key = key;
        element.style.setProperty('--ptech-home-refraction', `url(#${entry.filter.id})`);
        element.classList.add('ptech-home-refractive');
      } catch (_) {
        // A failed canvas/filter leaves the ordinary CSS glass intact.
        clearOptics(element, entry);
      }
    }

    function queue(element) {
      if (destroyed || !supported || !desktop.matches) return;
      pending.add(element);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const work = [...pending];
        pending.clear();
        work.forEach(draw);
      });
    }

    const resize = supported ? new ResizeObserver(entries => entries.forEach(entry => queue(entry.target))) : null;

    function reconcile() {
      const current = new Set(root.querySelectorAll(surfaces));
      for (const [element, entry] of tracked) {
        if (current.has(element)) continue;
        if (resize) resize.unobserve(element);
        pending.delete(element);
        clearOptics(element, entry);
        element.removeAttribute('data-ptech-glass-surface');
        tracked.delete(element);
      }
      for (const element of current) {
        if (!tracked.has(element)) {
          tracked.set(element, { filter: null, key: '' });
          element.setAttribute('data-ptech-glass-surface', '');
        }
        if (resize && desktop.matches) { resize.observe(element); queue(element); }
      }
    }

    function mediaChange() {
      if (resize) resize.disconnect();
      if (!desktop.matches) {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        pending.clear();
        for (const [element, entry] of tracked) clearOptics(element, entry);
        maps.clear();
      } else reconcile();
    }

    // Only structure changes matter: do not watch style/class changes generated
    // by hover, theme transitions, widget animation or this enhancement.
    const mutation = new MutationObserver(records => {
      const changed = records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
        node.nodeType === 1 && (node.matches(surfaces) || node.querySelector(surfaces) || node.hasAttribute('data-ptech-glass-surface') || node.querySelector('[data-ptech-glass-surface]'))
      ));
      if (changed) reconcile();
    });
    reconcile();
    mutation.observe(root, { childList: true, subtree: true });
    desktop.addEventListener('change', mediaChange);

    window.addEventListener('pagehide', () => {
      destroyed = true;
      mutation.disconnect();
      if (resize) resize.disconnect();
      if (frame) cancelAnimationFrame(frame);
      desktop.removeEventListener('change', mediaChange);
      for (const [element, entry] of tracked) {
        clearOptics(element, entry);
        element.removeAttribute('data-ptech-glass-surface');
      }
      tracked.clear(); maps.clear(); pending.clear();
      if (host) host.remove();
      delete root.dataset.ptechHomeGlassReady;
    }, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.addEventListener('pageshow', event => { if (event.persisted) init(); });
})();
