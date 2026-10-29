
/* =====================================
   PTECH DIGITAL PWA V1
   SERVICE WORKER REGISTRATION
===================================== */

(() => {

    "use strict";

    if (!("serviceWorker" in navigator)) {
        return;
    }

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./sw.js", {
                scope: "./"
            })
            .then(() => {
                console.log(
                    "PTech Digital PWA registriran."
                );
            })
            .catch((error) => {
                console.warn(
                    "PWA registracija nije uspjela:",
                    error
                );
            });

    });

})();
