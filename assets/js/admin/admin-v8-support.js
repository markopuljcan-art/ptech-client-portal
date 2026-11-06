/* PTech Digital V8: all clients + responsive WhatsApp-style chats.
   Extends existing admin-support.js instead of replacing auth, RLS, send or realtime. */
(() => {
  "use strict";
  const layout = document.querySelector('.admin-support-layout');
  const back = document.getElementById('v8BackChat');
  if (!layout || typeof window.buildConversations !== 'function') return;
  const params = new URLSearchParams(location.search);
  const requested = params.get('client');
  let initialSelectionHandled = false;

  // Existing global variables allProfiles, allMessages and conversations belong
  // to admin-support.js (classic scripts share global lexical environment).
  window.buildConversations = function () {
    const map = new Map();
    for (const profile of allProfiles) {
      const role = String(profile.role || '').toLowerCase();
      if (role !== 'client') continue;
      map.set(String(profile.id), {
        user_id: String(profile.id), profile, messages: []
      });
    }
    for (const msg of allMessages) {
      const id = String(msg.user_id || '');
      // Do not expose orphaned messages as client profiles.
      const convo = map.get(id);
      if (convo) convo.messages.push(msg);
    }
    conversations = Array.from(map.values()).map(c => {
      const last = c.messages.length ? c.messages[c.messages.length - 1] : null;
      return { ...c, lastMessage: last, unreadCount: getUnreadCountForUser(c.user_id) };
    }).sort((a,b) => {
      const ta = new Date(a.lastMessage?.created_at || 0).getTime();
      const tb = new Date(b.lastMessage?.created_at || 0).getTime();
      return (tb-ta) || String(a.profile.display_name||'').localeCompare(String(b.profile.display_name||''),'hr');
    });
    if (supportConversationCount) supportConversationCount.textContent = String(conversations.length);
    renderConversationList();
    if (!initialSelectionHandled && requested && map.has(requested)) {
      initialSelectionHandled = true;
      queueMicrotask(() => window.openConversation?.(requested));
    }
  };

  const originalOpen = window.openConversation;
  if (typeof originalOpen === 'function') {
    window.openConversation = async function(id) {
      await originalOpen(id);
      layout.classList.add('v8-chat-open');
    };
  }
  const originalRender = window.renderActiveMessages;
  if (typeof originalRender === 'function') {
    window.renderActiveMessages = function(messages) {
      originalRender(messages);
      const target = document.getElementById('adminSupportMessages');
      if (target && !messages.length) {
        target.innerHTML = '<div class="v8-blank-thread"><strong>Još nema poruka</strong>Ovaj klijent još nije započeo razgovor. Možeš mu prvi poslati poruku putem polja ispod.</div>';
      }
    };
  }
  back?.addEventListener('click', () => layout.classList.remove('v8-chat-open'));
})();
