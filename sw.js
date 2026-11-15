// Astrodoc service worker: the whole app works with no internet, as it must on a spacecraft.
// Every page, script, style, font, the 3D model and the data are kept on the device.
// Pages are served from the device first and refreshed in the background when online.
const CACHE = "astrodoc-r13";
const FILES = [
  "./", "index.html", "check.html", "chat.html", "science.html", "report.html", "dashboard.html",
  "style.css", "check.css", "type.css", "bodymap.css", "modes.css", "polish.css", "patch.css",
  "core.js", "sidebar.js", "mood.js", "dose.js", "history.js", "app.js", "sensor.js", "bodymap.js",
  "mission.js", "story.js", "check.js", "voice.js", "modes.js", "report.js",
  "data/space-medicine-cases.js", "assets/js/body3d.js", "assets/models/astronaut.glb",
  "assets/fonts/atkinson-next.woff2", "assets/fonts/sora.woff2", "assets/fonts/archivo.woff2", "assets/planets/earth.jpg", "assets/planets/mars.jpg",
  "assets/bg/space.svg", "assets/bg/companion.svg", "assets/bg/check.svg",
  "assets/bg/checkin.svg", "assets/bg/crew.svg", "assets/bg/breathe.svg",
  "assets/astrodoc-favicon.png", "assets/astrodoc-logo-mark.png", "assets/astrodoc-icon-192.png", "assets/astrodoc-icon-512.png", "manifest.webmanifest"
];

self.addEventListener("install", e => {
  // One missing file must not stop the rest from being saved
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // AI, voice and other servers: straight to the internet
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(r => { if (r && r.ok) c.put(url.pathname === "/" ? req : new Request(url.origin + url.pathname), r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    return (await fresh) || (req.mode === "navigate" ? c.match("index.html") : Response.error());
  }));
});
