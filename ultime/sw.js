// Service worker "Ultime modifiche": rende l'app installabile e apribile anche con rete lenta.
// Mette in cache solo il guscio dell'app. Nessuna risposta delle API (GitHub, Apps Script) viene salvata.
var CACHE = "ultime-v1";
var GUSCIO = ["./", "index.html", "config.js", "manifest.json", "icona-192.png?v=1", "icona-512.png?v=1"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(GUSCIO); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET") return;
  var u = new URL(r.url);
  if (u.origin !== location.origin) return; // niente cache per GitHub, Google, Apps Script
  // prima la rete, la cache solo se la rete non risponde
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok && u.pathname.indexOf("/ultime/") === 0) {
      var copia = res.clone();
      caches.open(CACHE).then(function (c) { c.put(r, copia); });
    }
    return res;
  }).catch(function () { return caches.match(r); }));
});
