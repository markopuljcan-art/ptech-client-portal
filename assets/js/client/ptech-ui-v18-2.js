/* PTech Digital V18.2 — UI-only behavior. Never recreates data / auth handlers. */
(() => {
  'use strict';
  const root = document.documentElement;
  if (!root.classList.contains('ptech-v182')) return;
  const file = location.pathname.split('/').pop() || 'form.html';
  const titles = { 'form.html':'Dashboard','my-projects.html':'Projekti','tasks.html':'Zadaci',
    'documents.html':'Dokumenti','messages.html':'Poruke','profile.html':'Profil',
    'project.html':'Pregled projekta','approve.html':'Odobri dizajn' };
  const WIDTH_KEY='ptech-v18-sidebar-width';
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const safeGet=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
  const safeSet=(k,v)=>{try{localStorage.setItem(k,String(v))}catch(_){}};

  function init() {
    // Reuse each page's original top-bar widgets (auth, logout, theme).
    const title = document.querySelector('.dashboard-header .dashboard-mobile-brand');
    if (title && titles[file]) {
      const first = title.querySelector('span');
      const heading = title.querySelector('strong');
      if (first) first.textContent='PTECH DIGITAL';
      if (heading) heading.textContent=titles[file];
    }
    const sidebar=document.querySelector('.dashboard.desktop-layout > .desktop-sidebar');
    if(sidebar && !document.querySelector('.ptech-v182-grip')) {
      const min=78,max=Math.min(352,Math.round(innerWidth*.38));
      const parsed=Number(safeGet(WIDTH_KEY));
      let width=(Number.isFinite(parsed)&&parsed>=min&&parsed<=max)?parsed:256;
      let lastExpanded=width>99?width:256;
      const grip=document.createElement('button');
      grip.type='button';grip.className='ptech-v182-grip';
      grip.setAttribute('role','slider');
      grip.setAttribute('aria-label','Širina bočnog izbornika');
      grip.setAttribute('aria-valuemin',String(min));
      grip.setAttribute('aria-valuemax',String(max));
      grip.setAttribute('aria-orientation','horizontal');
      grip.title='Povuci za širinu · Enter za skupi/proširi · Dvoklik vrati širinu';
      sidebar.insertAdjacentElement('afterend',grip);
      const apply=(n,persist=false)=>{
        width=clamp(Math.round(n),min,max);
        root.style.setProperty('--g-sidebar-width',width+'px');
        root.classList.toggle('v182-sidebar-collapsed',width<=99);
        grip.setAttribute('aria-valuenow',String(width));
        if(width>99)lastExpanded=width;
        if(persist)safeSet(WIDTH_KEY,width);
      };
      apply(width);
      let pointerId=null;
      grip.addEventListener('pointerdown',e=>{
        if(e.button!==0||matchMedia('(max-width:1100px)').matches)return;
        pointerId=e.pointerId;
        root.classList.add('v182-dragging');
        grip.setPointerCapture?.(pointerId);
        e.preventDefault();
      });
      grip.addEventListener('pointermove',e=>{
        if(pointerId===e.pointerId)apply(e.clientX);
      });
      const finish=()=>{
        if(pointerId===null)return;
        pointerId=null;root.classList.remove('v182-dragging');safeSet(WIDTH_KEY,width);
      };
      grip.addEventListener('pointerup',finish);
      grip.addEventListener('pointercancel',finish);
      grip.addEventListener('lostpointercapture',finish);
      grip.addEventListener('dblclick',()=>apply(256,true));
      grip.addEventListener('keydown',e=>{
        if(['ArrowLeft','ArrowRight','Home','End','Enter',' '].includes(e.key)) {
          e.preventDefault();
          const target=e.key==='Home'?min:e.key==='End'?max:
            e.key==='ArrowLeft'?width-16:e.key==='ArrowRight'?width+16:
            width<=99?lastExpanded:min;
          apply(target,true);
        }
      });
      sidebar.querySelectorAll('.sidebar-nav a.sidebar-link').forEach(a=>{
        const lbl=a.querySelector('span')?.textContent?.trim();
        if(lbl) {a.setAttribute('aria-label',lbl);a.title=lbl;}
      });
    }

    if (file==='form.html') {
      const welcome=document.querySelector('.dashboard-content > .welcome');
      if(welcome && !welcome.querySelector('.ptech-v182-eyebrow')) {
        const label=document.createElement('span');label.className='ptech-v182-eyebrow';
        label.textContent='DOBRODOŠLI U PTECH DIGITAL';welcome.prepend(label);
        const h=welcome.querySelector('h2');
        if(h) {
          // Keep #userGreeting managed by existing Supabase code.
          const leading=[...h.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
          if(leading)leading.textContent='Dobar dan, ';
        }
        const p=welcome.querySelector('p');
        if(p)p.textContent='Ovdje prati svoje projekte, zadatke, komunikaciju i dokumente na jednom mjestu.';
      }
      const bar=document.querySelector('.ptech-layout-bar-actions');
      if(bar&&!document.getElementById('ptechFirstGlassPreset')) {
        const b=document.createElement('button');
        b.id='ptechFirstGlassPreset';b.type='button';
        b.textContent='▦ Primijeni dizajn sa slike';
        b.title='Primijeni V19.1 raspored i sačuvaj prethodni raspored za povratak';
        b.addEventListener('click',()=>{
          if(typeof window.PTechApplyFirstGlassLayout!=='function'){
            alert('Uređivanje rasporeda još se učitava.');return;
          }
          const okay=confirm('Primijeniti dizajn sa slike? Promijenit će se raspored i veličine kartica, a prethodni raspored bit će spremljen za povratak. Osobni zadaci, prečaci i podaci ostaju.');
          if(!okay)return;
          if(window.PTechApplyFirstGlassLayout()) {
            b.textContent='✓ Raspored primijenjen';
            setTimeout(()=>{b.textContent='▦ Primijeni dizajn sa slike'},2600);
          } else alert('Prijavi se u portal i pokušaj ponovno kada se Dashboard učita.');
        });
        bar.prepend(b);
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
