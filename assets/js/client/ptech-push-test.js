"use strict";

/* PTech Digital | Push Test V1
   Only adds a test button to Profile V3. Does not modify Auth,
   VAPID public key, subscriptions, or notification settings.
*/
(() => {
  const button = document.getElementById("testPushButton");
  const status = document.getElementById("pushTestStatus");
  if (!button || !status) return;

  const setMessage = (message, kind = "") => {
    status.textContent = message;
    status.classList.toggle("success", kind === "success");
    status.classList.toggle("error", kind === "error");
  };

  async function getFunctionErrorMessage(error) {
    try {
      const response = error?.context;
      if (response && typeof response.clone === "function") {
        const payload = await response.clone().json();
        const detail = payload?.message || payload?.error;
        if (typeof detail === "string" && detail.length < 250) return detail;
      }
    } catch (_) {
      // Use generic error text below.
    }
    return error?.message || "Nepoznata pogreška pri pozivu funkcije.";
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    setMessage("Provjeravamo uređaj i šaljemo testnu obavijest...");

    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("Ovaj uređaj ne podržava push obavijesti.");
      }
      if (Notification.permission !== "granted") {
        throw new Error("Najprije omogućite mobilne obavijesti u Profilu.");
      }

      const registration = await navigator.serviceWorker.getRegistration("./");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) {
        throw new Error("Uređaj nema push pretplatu. Kliknite 'Omogući obavijesti'.");
      }

      const { data: userResult, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !userResult?.user) {
        throw new Error("Prijavite se ponovno u PTech Portal.");
      }

      // Check that this particular subscription is linked to the signed-in user.
      const { data: ownDevice, error: deviceError } = await supabaseClient
        .from("ptech_push_subscriptions")
        .select("id")
        .eq("user_id", userResult.user.id)
        .eq("endpoint", subscription.endpoint)
        .maybeSingle();

      if (deviceError) throw new Error("Ne mogu provjeriti pretplatu u Supabaseu.");
      if (!ownDevice) {
        throw new Error("Ovaj uređaj nije povezan s vašim računom. Ponovno omogućite obavijesti.");
      }

      const { data, error } = await supabaseClient.functions.invoke(
        "ptech-push-test",
        { body: { test: true } }
      );

      if (error) {
        const detail = await getFunctionErrorMessage(error);
        throw new Error(`Edge Function: ${detail}`);
      }

      if (!data?.success || !(data?.sent > 0)) {
        throw new Error(data?.message || "Push servis nije prihvatio obavijest.");
      }

      setMessage(
        `Push servis prihvatio je ${data.sent} obavijest(i). ` +
        "Zaključajte iPhone i provjerite pojavljuje li se obavijest.",
        "success"
      );
    } catch (error) {
      console.error("PTech push test:", error);
      setMessage(error?.message || "Test nije uspio.", "error");
    } finally {
      button.disabled = false;
      button.setAttribute("aria-busy", "false");
    }
  });
})();
