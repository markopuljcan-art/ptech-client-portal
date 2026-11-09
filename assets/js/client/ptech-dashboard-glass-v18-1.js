/* V18.1: presentation-only enhancement of the dashboard welcome copy.
   Does not read/write Supabase or change V16 dashboard widget layout. */
(() => {
  'use strict';
  if (location.pathname.split('/').pop() !== 'form.html') return;
  function init() {
    const welcome = document.querySelector('.dashboard-content > .welcome');
    if (!welcome || welcome.dataset.p181Applied) return;
    welcome.dataset.p181Applied = 'true';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'p181-eyebrow';
    eyebrow.textContent = 'DOBRODOŠLI U PTECH DIGITAL';
    welcome.prepend(eyebrow);
    const heading = welcome.querySelector('h2');
    if (heading) {
      // Preserve the existing #userGreeting element updated by auth code.
      const firstText = Array.from(heading.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (firstText) firstText.textContent = 'Dobar dan, ';
    }
    const intro = welcome.querySelector('p');
    if (intro) intro.textContent = 'Ovdje prati svoje projekte, zadatke, komunikaciju i dokumente na jednom mjestu.';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
