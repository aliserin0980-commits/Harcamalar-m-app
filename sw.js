// İnternetsiz açılış için uygulama dosyalarını önbelleğe alır. Sürüm değişince eski önbellek silinir.
const CACHE = "harcamalarim-v6";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
// Bu dosya eksik olsa da kurulum düşmesin diye addAll dışında, ayrıca eklenir
const OPTIONAL = "icon-maskable-512.png";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES).then(() => c.add(OPTIONAL).catch(() => {})))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("harcamalarim-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Önce ağ (güncelleme varsa gelsin), ağ yoksa önbellek.
// Yalnız bu uygulamanın kapsamındaki istekler işlenir; aynı origin'deki başka uygulamalara dokunulmaz.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || !req.url.startsWith(self.registration.scope)) return;
  e.respondWith(
    fetch(req).then(r => {
      // Yalnız başarılı cevaplar önbelleğe yazılır (404/500 yazılmaz)
      if (r.ok) {
        const copy = r.clone();
        e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy)));
      }
      return r;
    }).catch(() => caches.open(CACHE).then(c => c.match(req).then(r => {
      if (r) return r;
      // index.html yedeği yalnız sayfa gezinmesinde; diğer istekler hata olarak kalır
      if (req.mode === "navigate") return c.match("index.html").then(i => i || Response.error());
      return Response.error();
    })))
  );
});
