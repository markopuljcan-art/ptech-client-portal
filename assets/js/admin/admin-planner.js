/* PTech Digital V12 - private admin tasks, due dates, calendar & in-app reminders.
   Public Supabase publishable key only; all access protected by RLS on server. */
(() => {
  'use strict';
  const URL = 'https://agivwsbczzvvuzszcvxz.supabase.co';
  const KEY = 'sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE';
  const db = window.supabase?.createClient(URL, KEY);
  const $ = id => document.getElementById(id);
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today = () => { const d=new Date();return localISO(d); };
  const localISO = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const dateObj = str => str ? new Date(`${str.slice(0,10)}T12:00:00`) : null;
  const niceDate = str => { const d=dateObj(str);return d&&!isNaN(d)?d.toLocaleDateString('hr-HR',{day:'2-digit',month:'short',year:'numeric'}):'Bez roka'; };
  const shifted = (str, days) => {const d=dateObj(str);if(!d)return '';d.setDate(d.getDate()+days);return localISO(d);};
  const state = {user:null,tasks:[],projects:[],reminders:[],feed:[],settings:null,inboxAvailable:true,notifFilter:'all',unreadOnly:false,tab:'tasks',month:new Date(),selectedDate:today(),filter:'all',projectFilter:'all',search:''};
  let busy=false;
  let settingsDirty=false;
  let deepLinkHandled='';
  function notice(text,kind='info') { const el=$('plNotice');el.textContent=text;el.dataset.kind=kind; }
  function pathForProject(id) { return `admin-project-detail.html?id=${encodeURIComponent(String(id))}`; }
  function projectName(id) {return state.projects.find(x=>String(x.id)===String(id))?.name || 'Nepoznati projekt';}
  function priorityLabel(v){return ({high:'Visok',normal:'Normalan',low:'Nizak'})[v]||'Normalan';}
  function statusLabel(v){return ({todo:'Za napraviti',doing:'U tijeku',done:'Dovršeno'})[v]||'Za napraviti';}
  function dueBadge(t){ if(!t.due_date||t.status==='done')return '';
    const distance=Math.round((dateObj(t.due_date)-dateObj(today()))/86400000);
    return distance<0?'<span class="pl-tag danger">Rok prošao</span>':distance===0?'<span class="pl-tag warn">Danas</span>':distance<=3?'<span class="pl-tag warn">Uskoro</span>':'';
  }
  function projectDeadline(project){ const d=String(project.deadline||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:null; }
  function statusName(code) {return statusLabel(code);}
  async function authorized(){
    if(!db) throw Error('Supabase biblioteka nije učitana.');
    const {data,error}=await db.auth.getUser();
    if(error||!data.user)throw Error('Prijavi se kao administrator.');
    const admin=await db.rpc('is_admin_user',{check_user_id:data.user.id});
    if(admin.error||admin.data!==true)throw Error('Samo administrator može otvoriti planiranje.');
    state.user=data.user;
  }
  const settingDefaults = {notify_time_local:'09:00:00',overdue_enabled:true,overdue_every_days:3,push_enabled:true};
  async function systemCall(action, extra={}){
    const {data,error}=await db.auth.getSession();
    if(error || !data.session?.access_token) throw Error('Administratorska prijava nije dostupna.');
    const response=await fetch(`${URL}/functions/v1/ptech-admin-system`,{
      method:'POST',
      headers:{'Authorization':`Bearer ${data.session.access_token}`,'apikey':KEY,'Content-Type':'application/json'},
      body:JSON.stringify({action,...extra})
    });
    const json=await response.json();
    if(!response.ok || !json.ok)throw Error(json.error || 'Admin System nije dostupan.');
    return json.data;
  }
  function safeAdminHref(raw){
    const href=String(raw||'');
    return /^admin-(?:support|documents|clients|system|projects|project-detail)\.html(?:[?#][a-zA-Z0-9?&#=_%.-]*)?$/.test(href)?href:'admin-system.html';
  }
  function niceTimestamp(value){const d=new Date(value||0);return isNaN(d)?'':d.toLocaleString('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
  function reminderLink(r){return r.kind==='task'&&r.task_id ? `#task=${encodeURIComponent(String(r.task_id))}` : pathForProject(r.project_id);}
  async function markInboxRead(key){
    await systemCall('inbox_read',{key});
    const event=state.feed.find(x=>x.key===key);
    if(event)event.read=true;
    renderStats();renderReminders();
  }
  async function activateDeepLink(){
    const hash=decodeURIComponent(location.hash.slice(1));
    if(hash===deepLinkHandled)return;
    if(hash.startsWith('task=')){
      const id=hash.slice(5);
      if(!/^[0-9a-f-]{36}$/i.test(id))return;
      const task=state.tasks.find(t=>String(t.id)===id);
      tab('tasks',false);
      if(task){deepLinkHandled=hash;openTask(task);}
      else notice('Taj zadatak ne postoji ili je obrisan.','error');
    }else if(['tasks','calendar','reminders'].includes(hash)){
      deepLinkHandled=hash;tab(hash,false);
    }
  }
  function settingsMessage(message, kind='info') {
    const info = $('plSettingsInfo');
    info.textContent = message;
    info.dataset.status = kind;
    info.setAttribute('role', 'status');
    info.setAttribute('aria-live', 'polite');
  }
  function renderSettings(){
    // Don't erase unsaved choices during the automatic 60-second refresh.
    if(settingsDirty)return;
    const s=state.settings||settingDefaults;
    $('plNotifyTime').value=String(s.notify_time_local||'09:00').slice(0,5);
    $('plOverdueEnabled').checked=s.overdue_enabled!==false;
    $('plOverdueEvery').value=String(s.overdue_every_days||3);
    $('plPushEnabled').checked=s.push_enabled!==false;
  }
  async function saveSettings(){
    const button=$('plSettingsSave');
    const time=$('plNotifyTime').value;
    if(!state.user){
      settingsMessage('Prijava administratora nije učitana. Osvježi stranicu i prijavi se.', 'error');
      return;
    }
    const valid=/^([01]\d|2[0-3]):[0-5]\d$/.test(time) && Number(time.slice(3))%5===0;
    if(!valid){
      settingsMessage('Odaberi vrijeme u koracima od 5 minuta, npr. 09:00 ili 18:30.', 'error');
      return;
    }
    const values={admin_id:state.user.id,notify_time_local:time+':00',overdue_enabled:$('plOverdueEnabled').checked,overdue_every_days:Number($('plOverdueEvery').value),push_enabled:$('plPushEnabled').checked,updated_at:new Date().toISOString()};
    if(![1,3,7].includes(values.overdue_every_days)){
      settingsMessage('Neispravna učestalost podsjetnika.', 'error');
      return;
    }
    button.disabled=true;
    button.textContent='Spremam...';
    settingsMessage('Spremanje postavki u Supabase...', 'info');
    try{
      const r=await db.from('ptech_admin_reminder_settings').upsert(values,{onConflict:'admin_id'}).select('*').single();
      if(r.error)throw r.error;
      if(!r.data)throw Error('Supabase nije vratio spremljene postavke.');
      state.settings=r.data;
      settingsDirty=false;
      button.textContent='Spremljeno ✓';
      settingsMessage(`Postavke uspješno spremljene. Podsjetnici su postavljeni na ${time} (Europe/Zagreb).`, 'success');
      notice('Postavke obavijesti spremljene.','success');
    }catch(e){
      settingsMessage(`Spremanje nije uspjelo: ${e.message||'Nepoznata greška'}`, 'error');
      button.textContent='Pokušaj ponovno';
      notice(`Postavke: ${e.message||'Spremanje nije uspjelo'}`,'error');
    }finally{
      button.disabled=false;
    }
  }
  async function readAll(){
    if(busy) return;
    busy=true; $('plRefresh').disabled=true;
    try {
      const [a,b,c,s,inbox]=await Promise.all([
        db.from('ptech_admin_tasks').select('*').order('due_date',{ascending:true,nullsFirst:false}).limit(1000),
        db.from('projects').select('id,name,type,status,deadline,user_id').order('name').limit(1000),
        db.from('ptech_admin_task_reminders').select('*').eq('admin_id',state.user.id).order('created_at',{ascending:false}).limit(300),
        db.from('ptech_admin_reminder_settings').select('*').eq('admin_id',state.user.id).maybeSingle(),
        systemCall('inbox').then(data=>({data})).catch(e=>({error:e}))
      ]);
      for(const [label,r] of [['Zadaci',a],['Projekti',b],['Podsjetnici',c],['Postavke',s]]) if(r.error)throw Error(`${label}: ${r.error.message}`);
      state.tasks=a.data||[];state.projects=b.data||[];state.reminders=c.data||[];
      state.settings=s.data||settingDefaults;
      state.inboxAvailable=!inbox.error;
      state.feed=Array.isArray(inbox.data)?inbox.data:[];
      $('plInboxStatus').textContent=inbox.error?'Događaji klijenata nisu dostupni; podsjetnici i dalje rade.':'';
      renderAll();await activateDeepLink();notice('Podaci su ažurirani.','success');
    } catch(e){console.error('[V12 planner]',e);notice(e.message||'Učitavanje nije uspjelo.','error');}
    finally{busy=false;$('plRefresh').disabled=false;}
  }
  function renderStats(){
    const todayDate=today();
    $('plTotal').textContent=String(state.tasks.filter(t=>t.status!=='done').length);
    $('plUpcoming').textContent=String(state.tasks.filter(t=>t.status!=='done'&&t.due_date&&t.due_date>=todayDate&&t.due_date<=shifted(todayDate,7)).length);
    $('plOverdue').textContent=String(state.tasks.filter(t=>t.status!=='done'&&t.due_date&&t.due_date<todayDate).length);
    $('plReminderCount').textContent=String(state.reminders.filter(r=>!r.read_at).length+state.feed.filter(x=>!x.read).length);
    $('plUnreadBadge').textContent=String(state.reminders.filter(r=>!r.read_at).length+state.feed.filter(x=>!x.read).length);
    $('plUnreadBadge').hidden=!(state.reminders.some(r=>!r.read_at)||state.feed.some(x=>!x.read));
  }
  function renderSelects(){
    const choices=state.projects.map(p=>`<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('');
    const current=$('plProject').value, previousFilter=$('plProjectFilter').value;
    $('plProject').innerHTML=`<option value="">Odaberi projekt</option>${choices}`;
    if(state.projects.some(p=>String(p.id)===current))$('plProject').value=current;
    $('plProjectFilter').innerHTML=`<option value="all">Svi projekti</option>${choices}`;
    if(previousFilter&&[...$('plProjectFilter').options].some(x=>x.value===previousFilter))$('plProjectFilter').value=previousFilter;
  }
  function renderTasks(){
    let items=state.tasks.filter(t=>state.projectFilter==='all'||String(t.project_id)===state.projectFilter);
    if(state.filter==='todo')items=items.filter(t=>t.status==='todo');
    if(state.filter==='doing')items=items.filter(t=>t.status==='doing');
    if(state.filter==='done')items=items.filter(t=>t.status==='done');
    if(state.filter==='overdue')items=items.filter(t=>t.status!=='done'&&t.due_date&&t.due_date<today());
    if(state.search)items=items.filter(t=>(t.title+' '+t.description+' '+projectName(t.project_id)).toLocaleLowerCase('hr-HR').includes(state.search));
    $('plTasks').innerHTML=items.length?items.map(t=>`<article class="pl-task ${t.status==='done'?'completed':''}">
      <div class="pl-task-check"><button type="button" class="pl-check" data-done="${escape(t.id)}" aria-label="${t.status==='done'?'Vrati zadatak u tijek':'Označi dovršenim'}">${t.status==='done'?'✓':''}</button></div>
      <div class="pl-task-body"><div class="pl-task-head"><h4>${escape(t.title)}</h4><span class="pl-tag ${t.priority==='high'?'danger':t.priority==='low'?'muted':'normal'}">${priorityLabel(t.priority)} prioritet</span>${dueBadge(t)}</div>
      <p class="pl-task-description">${escape(t.description||'Bez dodatnih bilješki')}</p>
      <div class="pl-task-meta"><span>▣ ${escape(projectName(t.project_id))}</span><span>◷ ${niceDate(t.due_date)}</span><span>${statusName(t.status)}</span></div></div>
      <div class="pl-task-actions"><button type="button" class="pl-small-button" data-edit="${escape(t.id)}">Uredi</button><a class="pl-small-button" href="${pathForProject(t.project_id)}">Projekt ↗</a></div>
    </article>`).join(''):'<div class="pl-empty">Nema zadataka za ove filtre. Klikni „Novi zadatak” i dodaj prvi zadatak.</div>';
    $('plTaskCount').textContent=`${items.length} prikazano`;
  }
  function eventsForDate(day){
    const taskEvents=state.tasks.filter(t=>t.due_date===day).map(t=>({kind:'task',text:t.title,project:t.project_id,status:t.status}));
    const projectEvents=state.projects.filter(p=>projectDeadline(p)===day).map(p=>({kind:'project',text:p.name,project:p.id,status:p.status}));
    return [...taskEvents,...projectEvents];
  }
  function renderCalendar(){
    const d=state.month,yr=d.getFullYear(),mo=d.getMonth();
    $('plMonthTitle').textContent=new Date(yr,mo,1).toLocaleDateString('hr-HR',{month:'long',year:'numeric'});
    const offset=(new Date(yr,mo,1).getDay()+6)%7;
    let html='';
    for(let i=0;i<42;i++){
      const cell=new Date(yr,mo,1-offset+i);const key=localISO(cell);const ev=eventsForDate(key);
      const classes=['pl-day',cell.getMonth()!==mo?'outside':'',key===today()?'is-today':'',key===state.selectedDate?'selected':''].filter(Boolean).join(' ');
      html+=`<button type="button" class="${classes}" data-day="${key}" aria-label="${escape(niceDate(key))}, ${ev.length} događaja"><span class="pl-day-number">${cell.getDate()}</span><span class="pl-day-dots">${ev.slice(0,3).map(e=>`<i class="${e.kind==='task'?'task-dot':'project-dot'}"></i>`).join('')}</span></button>`;
    }
    $('plCalendarDays').innerHTML=html;
    $('plSelectedDate').textContent=`${niceDate(state.selectedDate)} · ${eventsForDate(state.selectedDate).length} događaja`;
    const ev=eventsForDate(state.selectedDate);
    $('plDayEvents').innerHTML=ev.length?ev.map(e=>`<div class="pl-day-event"><span class="pl-event-symbol">${e.kind==='task'?'✓':'▤'}</span><div><b>${escape(e.text)}</b><small>${e.kind==='task'?'Zadatak':'Rok projekta'} · ${escape(projectName(e.project))}</small></div><a href="${pathForProject(e.project)}">Otvori ↗</a></div>`).join(''):'<p class="pl-muted">Za odabrani datum nema rokova.</p>';
    $('plUpcomingEvents').innerHTML=upcomingMarkup();
  }
  function upcomingMarkup(){
    const all=[];const start=today(),end=shifted(start,30);
    for(const t of state.tasks){if(t.due_date&&t.due_date>=start&&t.due_date<=end&&t.status!=='done')all.push({date:t.due_date,text:t.title,type:'Zadatak',id:t.project_id});}
    for(const p of state.projects){const date=projectDeadline(p);if(date&&date>=start&&date<=end)all.push({date,text:p.name,type:'Projekt',id:p.id});}
    all.sort((a,b)=>a.date.localeCompare(b.date));
    return all.length?all.slice(0,12).map(x=>`<a class="pl-upcoming" href="${pathForProject(x.id)}"><span>${escape(niceDate(x.date))}</span><strong>${escape(x.text)}</strong><small>${x.type}</small></a>`).join(''):'<p class="pl-muted">Nema rokova u idućih 30 dana.</p>';
  }
  function renderReminders(){
    let items=[
      ...state.reminders.map(r=>({...r,source:'reminder',type:'reminder',at:r.created_at,read:!!r.read_at})),
      ...state.feed.map(x=>({...x,source:'inbox',at:x.created_at,read:!!x.read}))
    ].sort((a,b)=>Date.parse(b.at||0)-Date.parse(a.at||0));
    if(state.notifFilter!=='all')items=items.filter(x=>x.type===state.notifFilter);
    if(state.unreadOnly)items=items.filter(x=>!x.read);
    $('plReminders').innerHTML=items.length ? items.map(x=>{
      if(x.source==='reminder'){
        const url=reminderLink(x);
        const open=x.kind==='task'&&x.task_id
          ? `<button type="button" class="pl-small-button" data-open-task="${escape(x.task_id)}">Otvori zadatak</button>`
          : `<a class="pl-small-button" href="${escape(url)}">Otvori projekt</a>`;
        return `<article class="pl-reminder ${x.read?'seen':'new'}" data-reminder-id="${escape(x.id)}">
          <span class="pl-notif-icon" aria-hidden="true">${x.title.includes('prošao')?'!':x.kind==='task'?'✓':'▤'}</span>
          <div class="pl-reminder-content"><span class="pl-notif-type">Rok ${x.kind==='task'?'zadatka':'projekta'}</span><div class="pl-reminder-head"><h4>${escape(x.title)}</h4>${x.read?'<span class="pl-tag muted">Pregledano</span>':'<span class="pl-tag warn">Novo</span>'}</div>
          <p>${escape(x.body)}</p><small>Rok: ${escape(niceDate(x.target_date))} · ${escape(projectName(x.project_id))}</small><span class="pl-notif-time">${escape(niceTimestamp(x.created_at))}</span></div>
          <div class="pl-reminder-actions">${open}${x.read?'':`<button type="button" class="pl-small-button" data-read="${escape(x.id)}">Označi pregledanim</button>`}</div>
        </article>`;
      }
      const label=({message:'Poruke',upload:'Dokumenti',request:'Zahtjevi'})[x.type]||'Aktivnost';
      const ico=({message:'✉',upload:'▧',request:'♧'})[x.type]||'•';
      return `<article class="pl-reminder ${x.read?'seen':'new'}">
        <span class="pl-notif-icon" aria-hidden="true">${ico}</span>
        <div class="pl-reminder-content"><span class="pl-notif-type">${label}</span><div class="pl-reminder-head"><h4>${escape(x.title)}</h4>${x.read?'<span class="pl-tag muted">Pregledano</span>':'<span class="pl-tag warn">Novo</span>'}</div>
          <p>${escape(x.subtitle||'')}</p><span class="pl-notif-time">${escape(niceTimestamp(x.created_at))}</span></div>
        <div class="pl-reminder-actions"><button type="button" class="pl-small-button" data-inbox-open="${escape(x.key)}">Otvori</button>${x.read?'':`<button type="button" class="pl-small-button" data-inbox-read="${escape(x.key)}">Označi pregledanim</button>`}</div>
      </article>`;
    }).join('') : '<div class="pl-empty">Nema obavijesti za odabrane filtre.</div>';
  }
  function renderAll(){renderStats();renderSelects();renderTasks();renderCalendar();renderSettings();renderReminders();}
  function tab(name,updateHash=true){if(!['tasks','calendar','reminders'].includes(name))name='tasks';state.tab=name;
    document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===name;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
    ['tasks','calendar','reminders'].forEach(x=>{$(`plTab-${x}`).hidden=x!==name;});
    if(updateHash){history.replaceState(null,'',`#${name}`);deepLinkHandled=name;}
  }
  function openTask(t){
    $('plTaskForm').reset();$('plTaskId').value=t?.id||'';
    $('plDialogTitle').textContent=t?'Uredi zadatak':'Novi zadatak';
    $('plSave').textContent=t?'Spremi promjene':'Dodaj zadatak';$('plDelete').hidden=!t;
    if(t){$('plProject').value=String(t.project_id);$('plTitle').value=t.title;$('plDescription').value=t.description||'';$('plPriority').value=t.priority;$('plStatus').value=t.status;$('plDue').value=t.due_date||'';$('plLead').value=String(t.remind_days_before??1);}
    else { $('plLead').value='1';const params=new URLSearchParams(location.search);const id=params.get('project');if(id&&state.projects.some(p=>String(p.id)===id))$('plProject').value=id; }
    $('plDialog').showModal();$('plTitle').focus();
  }
  async function saveTask(e){e.preventDefault();const id=$('plTaskId').value;
    const values={project_id:$('plProject').value,title:$('plTitle').value.trim(),description:$('plDescription').value.trim(),status:$('plStatus').value,priority:$('plPriority').value,due_date:$('plDue').value||null,remind_days_before:Number($('plLead').value)};
    if(!values.project_id||values.title.length<2){notice('Odaberi projekt i upiši naziv zadatka.','error');return;}
    $('plSave').disabled=true;
    try{let result;if(id){result=await db.from('ptech_admin_tasks').update(values).eq('id',id).select('id');}
      else result=await db.from('ptech_admin_tasks').insert({...values,created_by:state.user.id}).select('id');
      if(result.error)throw result.error;
      $('plDialog').close();await readAll();notice(id?'Zadatak je ažuriran.':'Zadatak je dodan.','success');
    }catch(e){notice(e.message||'Spremanje zadatka nije uspjelo.','error');}
    finally{$('plSave').disabled=false;}
  }
  async function markDone(id){const t=state.tasks.find(t=>t.id===id);if(!t)return;
    const r=await db.from('ptech_admin_tasks').update({status:t.status==='done'?'todo':'done'}).eq('id',id).select('id');
    if(r.error)return notice(r.error.message,'error');await readAll();
  }
  async function deleteTask(){const id=$('plTaskId').value;if(!id||!confirm('Trajno obrisati ovaj interni zadatak?'))return;
    const r=await db.from('ptech_admin_tasks').delete().eq('id',id).select('id');
    if(r.error)return notice(r.error.message,'error');$('plDialog').close();await readAll();
  }
  async function markRead(id){const r=await db.from('ptech_admin_task_reminders').update({read_at:new Date().toISOString()}).eq('id',id).eq('admin_id',state.user.id).select('id');
    if(r.error)return notice(r.error.message,'error');await readAll();}
  function attach(){
    $('plRefresh').addEventListener('click',readAll);
    $('plNew').addEventListener('click',()=>openTask(null));$('plNewTop').addEventListener('click',()=>openTask(null));
    $('plTaskForm').addEventListener('submit',saveTask);$('plDialogCancel').addEventListener('click',()=>$('plDialog').close());$('plDelete').addEventListener('click',deleteTask);
    $('plSearch').addEventListener('input',e=>{state.search=e.target.value.trim().toLocaleLowerCase('hr-HR');renderTasks();});
    $('plStatusFilter').addEventListener('change',e=>{state.filter=e.target.value;renderTasks();});
    $('plProjectFilter').addEventListener('change',e=>{state.projectFilter=e.target.value;renderTasks();});
    $('plTasks').addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),done=e.target.closest('[data-done]');if(edit)openTask(state.tasks.find(t=>t.id===edit.dataset.edit));if(done)markDone(done.dataset.done);});
    $('plReminders').addEventListener('click',async e=>{
      const read=e.target.closest('[data-read]'),openTaskButton=e.target.closest('[data-open-task]'),
        inboxRead=e.target.closest('[data-inbox-read]'),inboxOpen=e.target.closest('[data-inbox-open]');
      try{
        if(read)await markRead(read.dataset.read);
        if(openTaskButton){
          const id=openTaskButton.dataset.openTask, t=state.tasks.find(x=>String(x.id)===id);
          if(t){history.replaceState(null,'',`#task=${id}`);deepLinkHandled=`task=${id}`;tab('tasks',false);openTask(t);}
          else notice('Zadatak je uklonjen ili nije dostupan.','error');
        }
        if(inboxRead)await markInboxRead(inboxRead.dataset.inboxRead);
        if(inboxOpen){
          const item=state.feed.find(x=>x.key===inboxOpen.dataset.inboxOpen);
          if(item){if(!item.read)await markInboxRead(item.key);location.assign(safeAdminHref(item.href));}
        }
      }catch(error){notice(error.message||'Obavijest nije obrađena.','error');}
    });
    $('plSettingsSave').addEventListener('click',saveSettings);
    for(const id of ['plNotifyTime','plOverdueEvery','plOverdueEnabled','plPushEnabled']){
      $(id).addEventListener('change',()=>{
        settingsDirty=true;
        settingsMessage('Postavke su promijenjene. Klikni Spremi postavke.', 'info');
        $('plSettingsSave').textContent='Spremi postavke';
      });
      $(id).addEventListener('input',()=>{
        settingsDirty=true;
        settingsMessage('Postavke su promijenjene. Klikni Spremi postavke.', 'info');
        $('plSettingsSave').textContent='Spremi postavke';
      });
    }
    $('plNotifFilter').addEventListener('change',e=>{state.notifFilter=e.target.value;renderReminders();});
    $('plUnreadOnly').addEventListener('change',e=>{state.unreadOnly=e.target.checked;renderReminders();});
    window.addEventListener('hashchange',()=>{if(state.user)activateDeepLink();});
    $('plMonthPrev').addEventListener('click',()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);renderCalendar();});
    $('plMonthNext').addEventListener('click',()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);renderCalendar();});
    $('plCalendarDays').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(!b)return;state.selectedDate=b.dataset.day;const d=dateObj(b.dataset.day);state.month=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar();});
    document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.user)readAll();});
  }
  async function init(){attach();try{await authorized();tab(location.hash.startsWith('#task=')?'tasks':location.hash.slice(1)||'tasks',false);await readAll();setInterval(()=>{if(!document.hidden&&state.user)readAll();},60000);}catch(e){notice(e.message||'Prijava nije uspjela.','error');document.querySelectorAll('#plNew,#plNewTop').forEach(b=>b.disabled=true);}}
  init();
})();
