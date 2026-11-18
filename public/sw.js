/* Flexon service worker: installable app shell, offline fallback for the app pages,
   and browser notifications for followed matches (proposal sections 2, 13). */
const CACHE = "flexon-v2";
const SHELL = ["/", "/owner", "/hub/styles.css", "/hub/app.js", "/shared/flx.js", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (e) => { // addAll is all-or-nothing; cache each entry on its own so one miss never blocks install
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) {
    // Bootstrap data: network first, fall back to the last good copy so referees can open the app offline.
    if (url.pathname === "/api/bootstrap") e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return r; }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); } return r; }).catch(() => caches.match(req).then((r) => r || caches.match("/"))));
});

self.addEventListener("push", (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.title || "Flexon Sports Hub", { body: d.body || "", icon: "/icon.svg", badge: "/icon.svg", data: { url: d.url || "/" } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data.url));
});
