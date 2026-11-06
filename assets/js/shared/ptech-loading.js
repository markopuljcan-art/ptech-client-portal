/* PTech Digital V13.8 - Universal branded loading bar.
 * Only long requests show the small top bar. Page transitions show a logo + bar.
 * No fake progress percentage, no backend/auth changes, no timers that hold login.
 */
(() => {
  'use strict';
  if (window.PTechLoading) return;

  const TOP_DELAY = 320;
  const MIN_VISIBLE = 340;
  const active = new Set();
  let firstVisibleAt = 0;
  let showTimer = 0;
  let hideTimer = 0;
  let panel = null;
  let top = null;
  let navigationStarted = false;

  function setup() {
    if (!document.body || top) return;
    top = document.createElement('div');
    top.className = 'ptech-loading-top';
    top.setAttribute('role', 'progressbar');
    top.setAttribute('aria-label', 'PTech Digital učitava podatke');
    top.innerHTML = '<span class="ptech-loading-top__fill" aria-hidden="true"></span>';
    document.body.appendChild(top);
    panel = document.createElement('div');
    panel.className = 'ptech-loading-screen';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = '<img class="ptech-loading-screen__logo" alt="" src="./assets/ptech-logo.png">' +
      '<div class="ptech-loading-screen__brand">PTech Digital</div>' +
      '<div class="ptech-loading-screen__line" aria-hidden="true"></div>' +
      '<div class="ptech-loading-screen__text">Učitavanje...</div>';
    document.body.appendChild(panel);
  }

  function showTop() {
    showTimer = 0;
    if (!active.size || navigationStarted) return;
    setup();
    if (!top) return;
    clearTimeout(hideTimer);
    if (top.dataset.visible !== 'true') firstVisibleAt = performance.now();
    top.dataset.visible = 'true';
  }
  function requestTop() {
    if (active.size && !showTimer && !navigationStarted) showTimer = setTimeout(showTop, TOP_DELAY);
  }
  function finishTop() {
    if (active.size) return;
    clearTimeout(showTimer); showTimer = 0;
    if (!top || top.dataset.visible !== 'true') return;
    const remaining = Math.max(0, MIN_VISIBLE - (performance.now() - firstVisibleAt));
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {if (!active.size && top) top.dataset.visible = 'false';}, remaining);
  }
  function start() {
    const token = Symbol('ptech-load');
    active.add(token);
    requestTop();
    return token;
  }
  function end(token) {
    if (active.delete(token)) finishTop();
  }
  function track(promise) {
    const token = start();
    return Promise.resolve(promise).then(
      result => { end(token); return result; },
      error => { end(token); throw error; }
    );
  }
  function showPage(label = 'Otvaramo portal...') {
    navigationStarted = true;
    clearTimeout(showTimer);
    if (top) top.dataset.visible = 'false';
    setup();
    if (!panel) return;
    const text = panel.querySelector('.ptech-loading-screen__text');
    if (text) text.textContent = String(label).slice(0, 95);
    panel.dataset.visible = 'true';
  }
  function navigate(destination, options = {}) {
    const url = new URL(destination, document.baseURI);
    // Do not redirect to an arbitrary third-party website via this helper.
    if (url.origin !== location.origin) return;
    if (navigationStarted) {
      if (options.replace) location.replace(url.href);
      else location.assign(url.href);
      return;
    }
    showPage(options.label || 'Otvaramo vaš portal...');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const go = options.replace ? location.replace.bind(location) : location.assign.bind(location);
      go(url.href);
    }));
  }
  function isNetworkCall(input) {
    let raw;
    if (typeof input === 'string') raw = input;
    else if (input instanceof URL) raw = input.href;
    else if (input && typeof input.url === 'string') raw = input.url;
    else return false;
    let url;
    try { url = new URL(raw, location.href); } catch { return false; }
    return /\/(auth|rest|storage|functions)\/v1(?:\/|$)/.test(url.pathname) ||
      (url.origin === location.origin && /\.(?:json|php)$/.test(url.pathname));
  }

  window.PTechLoading = Object.freeze({start, end, track, showPage, navigate});

  // Traces only real API calls. Background realtime/WebSocket traffic is not intercepted.
  if (typeof window.fetch === 'function') {
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      if (!isNetworkCall(args[0])) return originalFetch.apply(this, args);
      const token = start();
      try {
        return Promise.resolve(originalFetch.apply(this, args)).then(
          response => {end(token); return response;},
          error => {end(token); throw error;}
        );
      } catch (error) {end(token); throw error;}
    };
  }

  function init() {
    setup();
    // Initial page load: if it takes long enough, show the branded top bar.
    if (document.readyState !== 'complete') {
      const initial = start();
      const done = () => end(initial);
      window.addEventListener('load', done, {once: true});
      setTimeout(done, 10000);
    }
    // Native navigation links: show branded progress, without changing URL/behavior.
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      let target;
      try {target = new URL(link.href, location.href);} catch {return;}
      if (target.origin !== location.origin || (target.pathname === location.pathname && target.search === location.search)) return;
      // Browser performs the actual navigation (no interception of auth links/modals).
      showPage('Učitavanje stranice...');
      // If a page script cancels navigation, do not block the page indefinitely.
      setTimeout(() => {if (panel) panel.dataset.visible = 'false'; navigationStarted = false;}, 2300);
    }, false);
    window.addEventListener('pageshow', () => {
      navigationStarted = false;
      if (panel) panel.dataset.visible = 'false';
      finishTop();
    });
    window.addEventListener('pagehide', () => {if (top) top.dataset.visible='false';});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
