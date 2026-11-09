/* PTech Digital V19.2: chosen Home layout in the portal's existing themes.
   Pure presentation switching: original DOM/Supabase/V16 editor untouched. */
(() => {
 'use strict';
 if(!document.documentElement.classList.contains('ptech-v19')) return;
 const grid=document.getElementById('ptechDashboardGrid');
 if(!grid) return;
 const body=document.body;
 const KEY='ptech-home-v192-presentation';
 const getSaved=()=>{try{return localStorage.getItem(KEY);}catch{return null;}};
 const putSaved=value=>{try{localStorage.setItem(KEY,value);}catch{}};
 const mode=getSaved()==='personal'?'personal':'reference';
 body.classList.add('ptech-home-v192');
 body.classList.toggle('v192-reference-view',mode==='reference');
 const liveWidgets=['projects','tasks','actions','messages','documents'];
 const widget=id=>grid.querySelector(`[data-widget-id="${id}"]`);
 function updateProjectCount(){
   const total=Number(document.getElementById('totalProjects')?.textContent.trim());
   widget('projects')?.classList.toggle('v192-single-project',total===1);
 }
 function updateLayoutButtons(){
   const switcher=document.getElementById('ptechHomeViewSwitch');
   const reference=body.classList.contains('v192-reference-view');
   if(switcher){
     switcher.textContent=reference?'Moj raspored':'Izgled sa slike';
     switcher.title=reference?'Prikaži svoj spremljeni raspored kockica':'Vrati izgled Početne prema odabranoj slici';
     switcher.setAttribute('aria-pressed',String(reference));
   }
 }
 function init(){
   const actions=document.querySelector('.ptech-layout-bar-actions');
   if(actions&&!document.getElementById('ptechHomeViewSwitch')){
     const btn=document.createElement('button');
     btn.type='button';btn.id='ptechHomeViewSwitch';
     btn.addEventListener('click',()=>{
       const reference=!body.classList.contains('v192-reference-view');
       body.classList.toggle('v192-reference-view',reference);
       putSaved(reference?'reference':'personal');
       updateLayoutButtons();
     });
     actions.insertBefore(btn,document.getElementById('ptechLayoutEdit'));
   }
   const edit=document.getElementById('ptechLayoutEdit');
   // V16 editing stays fully operational. To make a user's edits visible after
   // clicking 'Gotovo', switch to their personal layout rather than hiding it.
   edit?.addEventListener('click',()=>{
     if(!body.classList.contains('ptech-layout-editing')){
       body.classList.remove('v192-reference-view');
       putSaved('personal');
       updateLayoutButtons();
     }
   },{capture:true});
   updateLayoutButtons();updateProjectCount();
   const projectCounter=document.getElementById('totalProjects');
   if(projectCounter){
      new MutationObserver(updateProjectCount).observe(projectCounter,{childList:true,characterData:true,subtree:true});
   }
   // Layout may be hydrated later by the auth client; presentation mode depends
   // only on CSS; data and events remain on their original DOM elements.
   for(const id of liveWidgets){
     const w=widget(id);if(w) w.classList.add('ptech-v192-core');
   }
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
