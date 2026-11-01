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
