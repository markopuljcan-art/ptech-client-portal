/* V25.4: shared client UI polish. Presentation + theme coordination only. */
(() => {
  'use strict';
  const ICONS = {
    'form.html': '<path d="M12 2.8 2.6 11a1.5 1.5 0 0 0 2 2.3l.4-.3V20a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7l.4.3a1.5 1.5 0 0 0 2-2.3L12 2.8Z"/><path class="ptech-cutout" d="M10 14h4v8h-4z"/>',
    'messages.html': '<path d="M5 3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H9l-6 3V6a3 3 0 0 1 3-3Z"/>',
    'my-projects.html': '<rect x="2.5" y="4.5" width="19" height="17" rx="3"/><path class="ptech-cutout" d="M2.8 9.5h18.4v2H2.8z"/>',
    'documents.html': '<path d="M2 6a3 3 0 0 1 3-3h5l2.3 2H19a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V6Z"/>',
    'profile.html': '<circle cx="12" cy="8" r="4.5"/><path d="M3 21v-1.5a9 9 0 0 1 18 0V21Z"/>'
  };
  function mountIcons() {
    document.querySelectorAll('nav.bottom-nav .bottom-nav-item').forEach(link => {
      const href=(link.getAttribute('href')||'').split(/[?#]/)[0].replace(/^\.\//,'');
      const shape=ICONS[href];
      const visual=link.querySelector('.v13-tab-visual');
      if(!shape || !visual || visual.querySelector('.ptech-filled-icon')) return;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');
      svg.classList.add('ptech-filled-icon');
      svg.setAttribute('aria-hidden','true');
      svg.innerHTML=shape;
      visual.append(svg);
    });
  }
  function syncTheme(theme) {
    const light=theme==='light';
    document.documentElement.dataset.theme=light?'light':'dark';
    document.body.classList.toggle('light-mode',light);
    const toggle=document.getElementById('themeToggle');
    if(toggle) {
      toggle.checked=light;
      toggle.setAttribute('aria-label',light?'Uključi tamni način':'Uključi svijetli način');
      const label=toggle.closest('.theme-switch');
      if(label)label.title=light?'Prijeđi na tamni način':'Prijeđi na svijetli način';
    }
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=light?'#faf8f4':'#1b2538';
  }
  let stopTransition;
  document.addEventListener('change', event => {
    if(event.target?.id!=='themeToggle') return;
    const next=event.target.checked?'light':'dark';
    const root=document.documentElement;
    root.classList.add('ptech-theme-changing');
    syncTheme(next);
    try {localStorage.setItem('theme',next);} catch (_) {}
    clearTimeout(stopTransition);
    stopTransition=setTimeout(()=>root.classList.remove('ptech-theme-changing'),320);
  },true);
  function init() {
    const toggle=document.getElementById('themeToggle');
    let saved; try {saved=localStorage.getItem('theme')||localStorage.getItem('ptech-theme');}catch(_){}
    const initial=(saved==='light'||saved==='dark')?saved:(document.body.classList.contains('light-mode')||document.documentElement.dataset.theme==='light'||toggle?.checked?'light':'dark');
    if(toggle) syncTheme(initial);
    mountIcons();
    // V13 mobile wraps icons on DOMContentLoaded. This is only a fallback
    // if any older page initialises its bottom bar later.
    if(document.querySelector('nav.bottom-nav') && !document.querySelector('.ptech-filled-icon')){
      const obs=new MutationObserver(()=>{
        mountIcons();
        if(document.querySelector('.ptech-filled-icon'))obs.disconnect();
      });
      obs.observe(document.querySelector('nav.bottom-nav'),{subtree:true,childList:true});
      setTimeout(()=>obs.disconnect(),3000);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
