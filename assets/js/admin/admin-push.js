/* PTech Digital - Admin push subscriptions V6
   Uses existing Supabase Auth, Storage-free, VAPID push subscriptions.
   The notification permission is requested only after user action.
*/
(() => {
  'use strict';
  if (!window.supabase) return;
  const URL = 'https://agivwsbczzvvuzszcvxz.supabase.co';
  const KEY = 'sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE';
  const VAPID = 'BCHPYHoWaiLMmcqnDV3TpqrBqHNVmGUrPOvovVvkXoUY4s22q93AXvCdSPPZe2dF8LCKQStdpbCuFB_Hs24MqqQ';
  const db = window.supabase.createClient(URL, KEY);
  const enable = document.getElementById('adminEnablePush');
  const disable = document.getElementById('adminDisablePush');
  const status = document.getElementById('adminPushStatus');
  if (!enable || !disable || !status) return;
  const supported = () => window.isSecureContext && 'serviceWorker' in navigator &&
    'PushManager' in window && 'Notification' in window;
  const tell = (text, isActive = false) => {
    status.textContent = text;
    enable.hidden = isActive;
    disable.hidden = !isActive;
  };
  const keyBytes = () => {
    const encoded = VAPID.replace(/-/g, '+').replace(/_/g, '/');
    const padded = encoded + '='.repeat((4 - encoded.length % 4) % 4);
    return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
  };
  const admin = async () => {
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) throw new Error('Prijavite se kao administrator.');
    const { data, error: roleError } = await db.rpc('is_admin_user', { check_user_id: user.id });
    if (roleError || data !== true) throw new Error('Admin prava nisu potvrđena.');
    return user;
  };
  const regFor = async () => navigator.serviceWorker.getRegistration('./');
  const saved = async (id, subscription) => {
    if (!subscription) return null;
    const { data, error } = await db.from('ptech_push_subscriptions')
      .select('id').eq('user_id', id).eq('endpoint', subscription.endpoint).maybeSingle();
    if (error) throw error;
    return data;
  };
  const refresh = async () => {
    if (!supported()) { enable.disabled = true; tell('Ovaj preglednik ne podržava push.'); return; }
    if (Notification.permission === 'denied') { enable.disabled = true; tell('Obavijesti su blokirane u postavkama preglednika.'); return; }
    try {
      const user = await admin();
      const reg = await regFor();
      const subscription = await reg?.pushManager.getSubscription();
      const row = await saved(user.id, subscription);
      tell(row && Notification.permission === 'granted' ? 'Obavijesti su uključene na ovom uređaju.' :
        'Obavijesti nisu uključene na ovom uređaju.', !!row && Notification.permission === 'granted');
    } catch (error) { tell(error.message || 'Status nije dostupan.'); }
  };
  enable.addEventListener('click', async () => {
    if (!supported()) return;
    enable.disabled = true;
    try {
      // On certain browsers user activation must remain in this event handler.
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Dopuštenje za obavijesti nije odobreno.');
      const user = await admin();
      await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      const desiredKey = keyBytes();
      if (subscription) {
        const existing = subscription.options?.applicationServerKey;
        const current = existing ? new Uint8Array(existing) : null;
        if (!current || current.length !== desiredKey.length || !current.every((x, i) => x === desiredKey[i])) {
          throw new Error('Uređaj koristi drugu VAPID pretplatu. Provjerite postojeću pretplatu.');
        }
      } else {
        subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: desiredKey });
      }
      const payload = subscription.toJSON();
      if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) throw new Error('Nisu dostupni svi push ključevi.');
      const { error } = await db.from('ptech_push_subscriptions').upsert({
        user_id: user.id, endpoint: payload.endpoint, p256dh: payload.keys.p256dh,
        auth_key: payload.keys.auth, updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' });
      if (error) throw new Error(error.code === '23505' || error.code === '42501' ?
        'Pretplata ovog uređaja pripada drugom korisniku. Isključite je na prethodnom računu.' : error.message);
      tell('Obavijesti su uključene na ovom uređaju.', true);
    } catch (error) { console.error('[PTech] Admin push:', error); tell(error.message || 'Aktivacija nije uspjela.'); }
    finally { enable.disabled = false; }
  });
  disable.addEventListener('click', async () => {
    disable.disabled = true;
    try {
      const user = await admin();
      const reg = await regFor();
      const subscription = await reg?.pushManager.getSubscription();
      const row = await saved(user.id, subscription);
      if (row) {
        const { error } = await db.from('ptech_push_subscriptions').delete().eq('user_id', user.id).eq('id', row.id);
        if (error) throw error;
        await subscription.unsubscribe();
      }
      tell('Obavijesti su isključene.');
    } catch (error) { console.error('[PTech] Isključivanje pusha:', error); tell(error.message || 'Isključivanje nije uspjelo.', true); }
    finally { disable.disabled = false; }
  });
  refresh();
})();
