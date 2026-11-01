
/* PTECH DIGITAL - ADMIN PUSH V1 */

(() => {
    "use strict";

    const URL = "https://agivwsbczzvvuzszcvxz.supabase.co";
    const KEY = "sb_publishable_MzG913KSwZpDph7KUGqiUA_Dk7LY3wE";

    // Javni VAPID kljuc - isti kao u profile.js
    const VAPID = "BCHPYHoWaiLMmcqnDV3TpqrBqHNVmGUrPOvovVvkXoUY4s22q93AXvCdSPPZe2dF8LCKQStdpbCuFB_Hs24MqqQ";

    const db = supabase.createClient(URL, KEY);
    const enable = document.getElementById("adminEnablePush");
    const disable = document.getElementById("adminDisablePush");
    const status = document.getElementById("adminPushStatus");

    if (!enable || !disable || !status) return;

    const supported = () =>
        window.isSecureContext &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

    function setStatus(message, active = false) {
        status.textContent = message;
        enable.hidden = active;
        disable.hidden = !active;
    }

    function vapidBytes() {
        const padded = VAPID + "=".repeat((4 - VAPID.length % 4) % 4);
        const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
        return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    }

    async function getAdmin() {
        const { data, error } = await db.auth.getUser();
        if (error || !data.user) {
            throw new Error("Prijavite se kao administrator.");
        }

        const { data: isAdmin, error: adminError } =
            await db.rpc("is_admin_user", {
                check_user_id: data.user.id
            });

        if (adminError || isAdmin !== true) {
            throw new Error("Administratorski pristup nije potvrđen.");
        }

        return data.user;
    }

    async function ownRow(userId, subscription) {
        if (!subscription) return null;

        const { data, error } = await db
            .from("ptech_push_subscriptions")
            .select("id")
            .eq("user_id", userId)
            .eq("endpoint", subscription.endpoint)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async function refresh() {
        if (!supported()) {
            enable.disabled = true;
            setStatus("Ovaj preglednik ne podržava push.");
            return;
        }

        if (Notification.permission === "denied") {
            enable.disabled = true;
            setStatus("Obavijesti su blokirane u pregledniku.");
            return;
        }

        try {
            const user = await getAdmin();
            const reg = await navigator.serviceWorker.getRegistration("./");
            const subscription = await reg?.pushManager.getSubscription();
            const row = await ownRow(user.id, subscription);

            setStatus(
                row && Notification.permission === "granted"
                    ? "Obavijesti su uključene."
                    : "Obavijesti nisu uključene na ovom uređaju.",
                Boolean(row && Notification.permission === "granted")
            );
        } catch (error) {
            setStatus(error.message);
        }
    }

    enable.addEventListener("click", async () => {
        if (!supported()) return;

        enable.disabled = true;

        try {
            // Dopuštenje tražimo izravno nakon klika.
            const permission = Notification.permission === "granted"
                ? "granted"
                : await Notification.requestPermission();

            if (permission !== "granted") {
                throw new Error("Dopuštenje za obavijesti nije odobreno.");
            }

            const user = await getAdmin();

            await navigator.serviceWorker.register("./sw.js", {
                scope: "./",
                updateViaCache: "none"
            });

            const reg = await navigator.serviceWorker.ready;
            let subscription = await reg.pushManager.getSubscription();
            const keyBytes = vapidBytes();

            if (subscription) {
                const previousKey =
                    subscription.options?.applicationServerKey;

                const bytes = previousKey
                    ? new Uint8Array(previousKey)
                    : null;

                if (
                    !bytes ||
                    bytes.length !== keyBytes.length ||
                    !bytes.every((v, i) => v === keyBytes[i])
                ) {
                    throw new Error(
                        "Postoji pretplata s drugim VAPID ključem. " +
                        "Prvo je uklonite na prethodnom računu."
                    );
                }
            } else {
                subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: keyBytes
                });
            }

            const json = subscription.toJSON();

            if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
                throw new Error("Neispravna push pretplata.");
            }

            const { error } = await db
                .from("ptech_push_subscriptions")
                .upsert({
                    user_id: user.id,
                    endpoint: json.endpoint,
                    p256dh: json.keys.p256dh,
                    auth_key: json.keys.auth,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: "endpoint"
                });

            if (error) {
                if (["23505", "42501"].includes(error.code)) {
                    throw new Error(
                        "Uređaj je možda povezan s drugim računom. " +
                        "Isključite obavijesti na tom računu."
                    );
                }
                throw error;
            }

            setStatus("Obavijesti su uključene!", true);

        } catch (error) {
            console.error("Admin push:", error);
            setStatus(error.message || "Uključivanje nije uspjelo.");
        } finally {
            enable.disabled = false;
        }
    });

    disable.addEventListener("click", async () => {
        disable.disabled = true;

        try {
            const user = await getAdmin();
            const reg = await navigator.serviceWorker.getRegistration("./");
            const subscription = await reg?.pushManager.getSubscription();
            const row = await ownRow(user.id, subscription);

            if (row) {
                const { error } = await db
                    .from("ptech_push_subscriptions")
                    .delete()
                    .eq("id", row.id)
                    .eq("user_id", user.id);

                if (error) throw error;
                await subscription.unsubscribe();
            }

            setStatus("Obavijesti su isključene.");
        } catch (error) {
            console.error("Admin push disable:", error);
            setStatus("Isključivanje nije uspjelo: " + error.message, true);
        } finally {
            disable.disabled = false;
        }
    });

    refresh();
})();
