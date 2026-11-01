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
  const state = {user:null,tasks:[],projects:[],reminders:[],tab:'tasks',month:new Date(),selectedDate:today(),filter:'all',projectFilter:'all',search:''};
  let busy=false;
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
  async function readAll(){
    if(busy) return;
    busy=true; $('plRefresh').disabled=true;
    try {
      const [a,b,c]=await Promise.all([
        db.from('ptech_admin_tasks').select('*').order('due_date',{ascending:true,nullsFirst:false}).limit(1000),
        db.from('projects').select('id,name,type,status,deadline,user_id').order('name').limit(1000),
        db.from('ptech_admin_task_reminders').select('*').eq('admin_id',state.user.id).order('created_at',{ascending:false}).limit(300)
      ]);
      for(const [label,r] of [['Zadaci',a],['Projekti',b],['Podsjetnici',c]]) if(r.error)throw Error(`${label}: ${r.error.message}`);
      state.tasks=a.data||[];state.projects=b.data||[];state.reminders=c.data||[];
      renderAll();notice('Podaci su ažurirani.','success');
    } catch(e){console.error('[V12 planner]',e);notice(e.message||'Učitavanje nije uspjelo.','error');}
    finally{busy=false;$('plRefresh').disabled=false;}
  }
  function renderStats(){
    const todayDate=today();
    $('plTotal').textContent=String(state.tasks.filter(t=>t.status!=='done').length);
    $('plUpcoming').textContent=String(state.tasks.filter(t=>t.status!=='done'&&t.due_date&&t.due_date>=todayDate&&t.due_date<=shifted(todayDate,7)).length);
    $('plOverdue').textContent=String(state.tasks.filter(t=>t.status!=='done'&&t.due_date&&t.due_date<todayDate).length);
    $('plReminderCount').textContent=String(state.reminders.filter(r=>!r.read_at).length);
    $('plUnreadBadge').textContent=String(state.reminders.filter(r=>!r.read_at).length);
    $('plUnreadBadge').hidden=!state.reminders.some(r=>!r.read_at);
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
    const items=state.reminders;
    $('plReminders').innerHTML=items.length?items.map(r=>`<article class="pl-reminder ${r.read_at?'seen':'new'}"><span class="pl-reminder-icon">${r.kind==='task'?'✓':'▤'}</span><div class="pl-reminder-content"><div class="pl-reminder-head"><h4>${escape(r.title)}</h4>${r.read_at?'<span class="pl-tag muted">Pregledano</span>':'<span class="pl-tag warn">Novo</span>'}</div><p>${escape(r.body)}</p><small>Rok: ${niceDate(r.target_date)} · ${escape(projectName(r.project_id))}</small></div><div class="pl-reminder-actions"><a class="pl-small-button" href="${pathForProject(r.project_id)}">Otvori projekt</a>${!r.read_at?`<button type="button" class="pl-small-button" data-read="${escape(r.id)}">Označi pregledanim</button>`:''}</div></article>`).join(''):'<div class="pl-empty">Trenutačno nema podsjetnika. Automatski će se pojaviti prema rokovima nakon uključivanja Cron zadatka.</div>';
  }
  function renderAll(){renderStats();renderSelects();renderTasks();renderCalendar();renderReminders();}
  function tab(name){if(!['tasks','calendar','reminders'].includes(name))name='tasks';state.tab=name;
    document.querySelectorAll('[data-tab]').forEach(b=>{const active=b.dataset.tab===name;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});
    ['tasks','calendar','reminders'].forEach(x=>{$(`plTab-${x}`).hidden=x!==name;});
    history.replaceState(null,'',`#${name}`);
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
    $('plReminders').addEventListener('click',e=>{const b=e.target.closest('[data-read]');if(b)markRead(b.dataset.read);});
    $('plMonthPrev').addEventListener('click',()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);renderCalendar();});
    $('plMonthNext').addEventListener('click',()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);renderCalendar();});
    $('plCalendarDays').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(!b)return;state.selectedDate=b.dataset.day;const d=dateObj(b.dataset.day);state.month=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar();});
    document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.user)readAll();});
  }
  async function init(){attach();try{await authorized();tab(location.hash.slice(1)||'tasks');await readAll();setInterval(()=>{if(!document.hidden&&state.user)readAll();},60000);}catch(e){notice(e.message||'Prijava nije uspjela.','error');document.querySelectorAll('#plNew,#plNewTop').forEach(b=>b.disabled=true);}}
  init();
})();
