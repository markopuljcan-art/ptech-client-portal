/* PTech Digital Client Portal — Service Worker V1
   No caching of private pages, authenticated responses, documents or Supabase data.
*/

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-only navigation. Offline fallback contains no account information.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode !== "navigate") return;
  const requestedUrl = new URL(request.url);
  if (requestedUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request).catch(() => new Response(
      `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PTech Digital — Nema veze</title><style>body{font:16px system-ui,-apple-system,sans-serif;background:#1b2232;color:#fff8f2;display:grid;place-items:center;min-height:90vh;text-align:center;padding:24px}main{max-width:420px}h1{font-size:26px}p{color:#d2c6be;line-height:1.6}</style></head><body><main><h1>PTech Digital</h1><p>Trenutačno nema internetske veze. Za pristup projektima i dokumentima ponovno se povežite na internet.</p></main></body></html>`,
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
    ))
  );
});

/* PTech Digital Service Worker V4
   - Safe same-origin navigation
   - Original ptech-icon.png icon
   - Best-effort deduplication for retries of the SAME server event
   - No caching of pages, messages, documents, or other private content
*/
const PUSH_TAG_CACHE = "ptech-push-seen-v4";
const PUSH_TAG_TTL = 7 * 24 * 60 * 60 * 1000;

function safePortalUrl(value) {
  const base = new URL(self.registration.scope);
  try {
    const target = new URL(value || "./form.html", base);
    if (target.origin === base.origin && target.pathname.startsWith(base.pathname)) {
      return target.href;
    }
  } catch (_) { /* Untrusted or malformed destination. */ }
  return new URL("./form.html", base).href;
}

// Only push tags generated from the outbox event_id qualify for deduplication.
function shouldDeduplicate(tag) {
  return /^ptech-(message|project|document)-[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(tag);
}

function pushTagRequest(tag) {
  return new Request(new URL(
    "./__push_seen__/" + encodeURIComponent(tag),
    self.registration.scope
  ).href);
}

async function wasAlreadyShown(tag) {
  try {
    const cache = await caches.open(PUSH_TAG_CACHE);
    const response = await cache.match(pushTagRequest(tag));
    if (!response) return false;
    const savedAt = Number(await response.text());
    return Number.isFinite(savedAt) && Date.now() - savedAt < PUSH_TAG_TTL;
  } catch (error) {
    console.warn("Push dedupe unavailable:", error);
    return false;
  }
}

async function markAsShown(tag) {
  try {
    const cache = await caches.open(PUSH_TAG_CACHE);
    await cache.put(pushTagRequest(tag), new Response(String(Date.now())));
    const entries = await cache.keys();
    if (entries.length > 160) {
      await Promise.all(entries.slice(0, entries.length - 160).map(request => cache.delete(request)));
    }
  } catch (error) {
    console.warn("Push dedupe write unavailable:", error);
  }
}

self.addEventListener("push", (event) => {
  let payload = {};
  try { if (event.data) payload = event.data.json(); } catch (_) { payload = {}; }
  if (!payload || typeof payload !== "object") payload = {};

  const title = String(payload.title || "PTech Digital").slice(0, 100);
  const body = String(payload.body || "Imate novu obavijest u portalu.").slice(0, 180);
  const tag = String(payload.tag || "ptech-update").slice(0, 120);
  const url = safePortalUrl(payload.url);
  const iconUrl = new URL("assets/ptech-icon.png", self.registration.scope).href;

  event.waitUntil((async () => {
    const dedupe = shouldDeduplicate(tag);
    if (dedupe && await wasAlreadyShown(tag)) return;
    await self.registration.showNotification(title, {
      body,
      icon: iconUrl,
      badge: iconUrl,
      tag,
      renotify: false,
      data: { url }
    });
    if (dedupe) await markAsShown(tag);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safePortalUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.registration.scope));
    if (existing) {
      try {
        const destination = await existing.navigate(target);
        if (destination) { await destination.focus(); return; }
      } catch (_) { /* Fall back to opening a new app window. */ }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});
