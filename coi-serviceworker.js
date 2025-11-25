/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener("message", (ev) => {
    if (!ev.data) {
      return;
    } else if (ev.data.type === "deregister") {
      self.registration.unregister().then(() => {
        return self.clients.matchAll();
      }).then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    }
  });

  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
      return;
    }

    const request = (coepCredentialless && r.mode === "no-cors")
      ? new Request(r, {
        credentials: "omit",
      })
      : r;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) {
            return response;
          }

          const newHeaders = new Headers(response.headers);
          newHeaders.set("Cross-Origin-Embedder-Policy",
            coepCredentialless ? "credentialless" : "require-corp"
          );
          if (!newHeaders.get("Cross-Origin-Opener-Policy")) {
            newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
          }

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
    window.sessionStorage.removeItem("coiReloadedBySelf");
    const coepHeaders = {
      "coep": document.head.querySelector('meta[http-equiv="Cross-Origin-Embedder-Policy"]')?.content,
      "coop": document.head.querySelector('meta[http-equiv="Cross-Origin-Opener-Policy"]')?.content,
    };
    const coepVal = coepHeaders.coep;
    const coopVal = coepHeaders.coop;

    if (window.navigator && window.navigator.serviceWorker && window.navigator.serviceWorker.controller) {
      window.navigator.serviceWorker.controller.postMessage({
        type: "coep",
        value: coepVal,
      });
    }

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
       // Localhost usually works without this, but we keep it for consistency
    } else {
        // Check if we need to register
        if (!window.crossOriginIsolated) {
            window.sessionStorage.setItem("coiReloadedBySelf", "yes");
            const script = document.querySelector('script[src*="coi-serviceworker.js"]');
            const src = script ? script.src : "coi-serviceworker.js";
            window.navigator.serviceWorker.register(src).then(
                (registration) => {
                    console.log("COI Service Worker registered");
                    window.location.reload();
                },
                (err) => {
                    console.log("COI Service Worker registration failed: ", err);
                }
            );
        }
    }
  })();
}
