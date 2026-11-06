/* PTech Digital - Admin notifications V6
   Realtime unread indicator on all admin pages. No push permission here.
*/
(() => {
  'use strict';
  if (!window.supabase) return;
  const db = window.supabase.createClient(
    'https://agivwsbczzvvuzszcvxz.supabase.co',
    'sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE'
  );
  const badge = document.getElementById('supportUnreadBadge');
  if (!badge) return;
  let channel = null;
  let latestCount = 0;
  let active = true;
  const setBadge = count => {
    latestCount = Number(count) || 0;
    badge.hidden = latestCount === 0;
    badge.textContent = latestCount > 99 ? '99+' : String(latestCount);
    badge.setAttribute('aria-label', `${latestCount} nepročitanih poruka`);
    const supportLink = badge.closest('a');
    if (supportLink) supportLink.title = latestCount ? `Nepročitanih poruka: ${latestCount}` : 'Poruke';
    // Badge in browser title, only for non-chat admin pages
    const originalTitle = document.title.replace(/^\(\d+\+?\)\s*/, '');
    document.title = latestCount ? `(${latestCount > 99 ? '99+' : latestCount}) ${originalTitle}` : originalTitle;
  };
  const load = async () => {
    try {
      const { count, error } = await db.from('support_messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_role', 'client').is('admin_read_at', null);
      if (error) throw error;
      if (active) setBadge(count);
    } catch (error) { console.warn('[PTech] Nepovezan broj nepročitanih poruka:', error); }
  };
  const initialize = async () => {
    try {
      const { data: { user }, error } = await db.auth.getUser();
      if (error || !user) return;
      const { data: isAdmin, error: roleError } = await db.rpc('is_admin_user', { check_user_id: user.id });
      if (roleError || isAdmin !== true) return;
      await load();
      channel = db.channel('ptech-admin-notifications-v6')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, load)
        .subscribe(status => { if (status === 'SUBSCRIBED') load(); });
    } catch (error) { console.warn('[PTech] Admin notifications initialization:', error); }
  };
  const visibility = () => { if (document.visibilityState === 'visible') load(); };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('focus', load);
  window.addEventListener('pagehide', () => {
    active = false;
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('focus', load);
    if (channel) db.removeChannel(channel);
  }, { once: true });
  initialize();
})();
