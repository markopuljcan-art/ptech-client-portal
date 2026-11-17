/* PTech V24: smooth FAQ details opening and closing, without losing semantics. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  function init() {
    const details = document.querySelector('.messages-page #helpPolicy');
    const summary = details?.querySelector(':scope > summary');
    if (!details || !summary || !details.animate) return;
    let animation = null;
    summary.addEventListener('click', e => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduce.matches) return;
      e.preventDefault();
      if (animation) { animation.cancel(); animation = null; }
      const start = details.getBoundingClientRect().height;
      const wasOpen = details.open;
      details.style.height = `${start}px`;
      details.style.overflow = 'clip';
      details.open = true;
      const end = wasOpen ? summary.getBoundingClientRect().height : details.scrollHeight;
      animation = details.animate([{height:`${start}px`},{height:`${end}px`}], {
        duration: wasOpen ? 250 : 360,
        easing: 'cubic-bezier(.22,1,.36,1)'
      });
      animation.onfinish = () => {
        animation = null;
        if (wasOpen) details.open = false;
        details.style.height = '';
        details.style.overflow = '';
      };
      animation.oncancel = () => {
        details.style.height = '';
        details.style.overflow = '';
      };
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
