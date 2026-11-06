/* PTech Digital V14.1 - client tasks. Read via RLS, complete only via guarded RPC. */
(() => {
  'use strict';
  const api = window.supabase?.createClient(
    'https://agivwsbczzvvuzszcvxz.supabase.co',
    'sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE'
  );
  const el = id => document.getElementById(id);
  const list = el('clientTaskList');
  const notice = el('clientTasksNotice');
  const selectProject = el('clientTaskProject');
  const selectStatus = el('clientTaskStatus');
  let all = [], projects = new Map(), activeUser = null, busy = false;

  const statuses = {todo:'Za napraviti',doing:'U tijeku',done:'Dovr\u0161eno'};
  function message(text, type='') {notice.hidden=false;notice.textContent=text;notice.className='task-notice'+(type?' '+type:'');}
  function textNode(name, className, content) {const node=document.createElement(name);if(className)node.className=className;node.textContent=String(content ?? '');return node;}
  function pill(label, type='') {return textNode('span','task-pill'+(type?' '+type:''),label);}
  function fmt(value) {if(!value)return 'Bez roka';const date=new Date(value+'T12:00:00');return Number.isNaN(date.getTime())?'Bez roka':date.toLocaleDateString('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'});}
  const isOverdue = task => task.status!=='done' && !!task.due_date && task.due_date < (()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();

  function taskUrl(task) {
    // Predefined destinations only: never open an arbitrary URL saved in the DB.
    const id=encodeURIComponent(task.project_id);
    if(task.action_type==='documents')return 'documents.html';
    if(task.action_type==='messages')return 'messages.html';
    if(task.action_type==='approval')return 'approve.html?id='+id;
    if(task.action_type==='project')return 'project.html?id='+id;
    return null;
  }
  function actionLabel(type) {return ({documents:'Otvori dokumente',messages:'Otvori poruke',approval:'Otvori odobrenja',project:'Otvori projekt'})[type]||'Otvori';}
  function render() {
    const filter=selectProject.value, status=selectStatus.value;
    const visible=all.filter(t=> (!filter||String(t.project_id)===filter) && (status==='all'||(status==='done'?t.status==='done':t.status!=='done')))
      .sort((a,b)=> (a.status==='done')-(b.status==='done') || String(a.due_date||'9999').localeCompare(String(b.due_date||'9999')) || String(b.created_at).localeCompare(String(a.created_at)));
    el('clientOpenCount').textContent=String(all.filter(t=>t.status!=='done').length);
    list.replaceChildren();
    if(!visible.length) {list.append(textNode('div','task-empty',all.length?'Nema zadataka za odabrani filter.':'Trenuta\u010dno nema dodijeljenih zadataka.'));return;}
    for(const task of visible){
      const card=document.createElement('article');card.className='task-card'+(task.status==='done'?' done':'');
      const head=document.createElement('div');head.className='task-card-head';
      const titleWrap=document.createElement('div');
      titleWrap.append(textNode('span','task-eyebrow',projects.get(String(task.project_id))||'Projekt'),textNode('h2','',task.title));
      head.append(titleWrap,pill(statuses[task.status]||task.status,task.status==='done'?'done':''));card.append(head);
      if(task.description)card.append(textNode('p','',task.description));
      const meta=document.createElement('div');meta.className='task-card-meta';
      meta.append(pill(task.due_date?'Rok: '+fmt(task.due_date):'Bez roka',isOverdue(task)?'overdue':'due'));
      if(!task.client_action) meta.append(pill('Potvr\u0111uje administrator'));
      if(task.completed_at) meta.append(pill('Izvr\u0161eno: '+new Date(task.completed_at).toLocaleDateString('hr-HR'),'done'));
      card.append(meta);
      const actions=document.createElement('div');actions.className='task-card-actions';
      const link=taskUrl(task);
      if(link) {const a=document.createElement('a');a.className='task-button task-button-secondary';a.href=link;a.textContent=actionLabel(task.action_type);actions.append(a);}
      if(task.client_action && task.status!=='done') {
        const button=textNode('button','task-button task-button-primary','\u2713 Ozna\u010di izvr\u0161enim');button.type='button';
        button.addEventListener('click',()=>complete(task.id,button));actions.append(button);
      }
      if(actions.childElementCount)card.append(actions);
      list.append(card);
    }
  }
  async function load() {
    if(!activeUser || busy)return;
    message('U\u010ditavanje zadataka...');
    const [taskResult,projectResult]=await Promise.all([
      api.from('ptech_client_tasks').select('id,project_id,title,description,due_date,status,client_action,action_type,created_at,completed_at').order('created_at',{ascending:false}),
      api.from('projects').select('id,name').eq('user_id',activeUser.id)
    ]);
    if(projectResult.error)console.warn('[PTech V14] Projects:',projectResult.error);
    projects=new Map((projectResult.data||[]).map(p=>[String(p.id),p.name]));
    const selected=selectProject.value;
    selectProject.replaceChildren(new Option('Svi projekti',''));
    for(const [id,name] of [...projects].sort((a,b)=>a[1].localeCompare(b[1],'hr'))){selectProject.add(new Option(name,id));}
    selectProject.value=projects.has(selected)?selected:'';
    if(taskResult.error){
      list.replaceChildren(textNode('div','task-empty','Zadaci trenuta\u010dno nisu dostupni.'));
      el('clientOpenCount').textContent='-';
      message(/ptech_client_tasks|schema cache|relation|404|42P01|PGRST205/i.test(taskResult.error.message||'') ?
        'Centar zadataka jo\u0161 nije aktiviran u bazi. Administrator treba pokrenuti SQL migraciju V14.1.' : 'Gre\u0161ka pri u\u010ditavanju zadataka. Poku\u0161aj ponovno.','error');
      console.error('[PTech V14] Tasks:',taskResult.error);return;
    }
    all=taskResult.data||[];message('Zadaci su a\u017eurirani.');render();
  }
  async function complete(id,button) {
    if(busy||!activeUser||!window.confirm('Potvr\u0111uje\u0161 da je ovaj zadatak izvr\u0161en?'))return;
    busy=true;button.disabled=true;button.textContent='Spremanje...';
    try {
      const {error}=await api.rpc('ptech_v14_complete_task',{p_task_id:id});
      if(error)throw error;
      message('Zadatak je ozna\u010den kao izvr\u0161en.','success');
      const task=all.find(t=>t.id===id);if(task){task.status='done';task.completed_at=new Date().toISOString();}
      render();
    }catch(error){console.error('[PTech V14] Complete:',error);message('Nije mogu\u0107e potvrditi zadatak. Provjeri vezu i svoje ovlasti.','error');button.disabled=false;button.textContent='Ozna\u010di izvr\u0161enim';}
    finally{busy=false;}
  }
  function theme(mode,save=true){
    const next=mode==='light'?'light':'dark';document.documentElement.dataset.theme=next;
    document.body.classList.toggle('light-mode',next==='light');
    el('themeToggle').checked=next==='light';
    const themeMeta=document.querySelector('meta[name="theme-color"]');if(themeMeta)themeMeta.content=next==='light'?'#fffaf5':'#192337';
    if(save)try{localStorage.setItem('theme',next);}catch(_){/* ignore */}
  }
  async function start(){
    theme((()=>{try{return localStorage.getItem('theme');}catch(_){return 'dark';}})(),false);
    el('themeToggle').addEventListener('change',e=>theme(e.target.checked?'light':'dark'));
    el('logoutButton').addEventListener('click',async()=>{await api.auth.signOut();location.assign('login.html');});
    el('clientTaskRefresh').addEventListener('click',load);
    selectProject.addEventListener('change',render);selectStatus.addEventListener('change',render);
    if(!api){message('Supabase nije dostupan. Provjeri vezu.','error');return;}
    const {data:{user},error}=await api.auth.getUser();
    if(error||!user){location.replace('login.html');return;}
    activeUser=user;
    const {data:profile}=await api.from('profiles').select('display_name,role').eq('id',user.id).maybeSingle();
    if(profile?.role==='admin'){location.replace('admin-tasks.html');return;}
    el('clientName').textContent=profile?.display_name||user.email?.split('@')[0]||'Klijent';
    await load();
  }
  start().catch(error=>{console.error('[PTech V14] Init:',error);message('Nije mogu\u0107e otvoriti centar zadataka.','error');});
})();
