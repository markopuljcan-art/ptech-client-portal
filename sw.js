
/* =====================================
   PTECH DIGITAL
   SERVICE WORKER V1
===================================== */

self.addEventListener("install", (event) => {

    event.waitUntil(
        self.skipWaiting()
    );

});

self.addEventListener("activate", (event) => {

    event.waitUntil(
        self.clients.claim()
    );

});

/*
   Ne spremamo privatne projekte,
   poruke, dokumente niti Supabase
   odgovore u cache.
*/

self.addEventListener("fetch", (event) => {

    if (event.request.mode !== "navigate") {
        return;
    }

    const url = new URL(event.request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {

            return new Response(
                "Nema internetske veze. " +
                "Ponovno se povežite i otvorite PTech Digital.",
                {
                    status: 503,
                    headers: {
                        "Content-Type":
                            "text/plain; charset=utf-8",
                        "Cache-Control": "no-store"
                    }
                }
            );

        })
    );

});

/* =====================================
   SIGURNA ADRESA ZA OBAVIJEST
===================================== */

function safePortalUrl(value) {

    const base = new URL(
        self.registration.scope
    );

    const target = new URL(
        value || "./form.html",
        base
    );

    if (
        target.origin === base.origin &&
        target.pathname.startsWith(base.pathname)
    ) {
        return target.href;
    }

    return new URL(
        "./form.html",
        base
    ).href;
}

/* =====================================
   PRIMANJE PUSH OBAVIJESTI
===================================== */

self.addEventListener("push", (event) => {

    let data = {};

    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (error) {
        data = {};
    }

    if (!data || typeof data !== "object") {
        data = {};
    }

    const scope = self.registration.scope;

    const title = String(
        data.title || "PTech Digital"
    ).slice(0, 100);

    const body = String(
        data.body || "Imate novu obavijest."
    ).slice(0, 180);

    event.waitUntil(

        self.registration.showNotification(
            title,
            {
                body: body,

                icon: new URL(
                    "assets/ptech-pwa-192.png",
                    scope
                ).href,

                badge: new URL(
                    "assets/ptech-pwa-192.png",
                    scope
                ).href,

                data: {
                    url: safePortalUrl(data.url)
                }
            }
        )

    );

});

/* =====================================
   KLIK NA OBAVIJEST
===================================== */

self.addEventListener(
    "notificationclick",
    (event) => {

        event.notification.close();

        const url = safePortalUrl(
            event.notification.data?.url
        );

        event.waitUntil(
            (async () => {

                const windows =
                    await self.clients.matchAll({
                        type: "window",
                        includeUncontrolled: true
                    });

                const opened = windows.find(
                    client => client.url.startsWith(
                        self.registration.scope
                    )
                );

                if (opened) {

                    try {
                        await opened.navigate(url);
                    } catch (error) {
                        // Navigacija nije uspjela.
                    }

                    return opened.focus();

                }

                return self.clients.openWindow(url);

            })()
        );

    }
);
