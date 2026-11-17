// Offline support. Shell (index, icons, thumbnails) is precached; each model HTML is cached when opened
// or when 「全モデルをオフライン保存」 is pressed. Models: cache first, refreshed in the background.
const VER = 'shisho-4664c12a124c';
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-512.png", "thumbs/BPB-400M.jpg", "thumbs/BPB-400F.jpg", "thumbs/RB-500F.jpg", "thumbs/RB-430M.jpg", "thumbs/mageba.jpg", "thumbs/maurer-joint.jpg", "thumbs/maurer-swivel.jpg", "thumbs/S01.jpg", "thumbs/S04.jpg", "thumbs/S05.jpg", "thumbs/S06.jpg", "thumbs/S07.jpg", "thumbs/S08.jpg", "thumbs/S09.jpg", "thumbs/S10.jpg", "thumbs/S11.jpg", "thumbs/S12.jpg", "thumbs/S13.jpg", "thumbs/S14.jpg", "thumbs/S16.jpg", "thumbs/S17.jpg", "thumbs/S18.jpg"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // carry saved models over from the previous version, then refresh them in the background
  e.waitUntil((async () => {
    const keys = await caches.keys(), cur = await caches.open(VER);
    for (const k of keys) if (k !== VER && k.startsWith('shisho-')) {
      const old = await caches.open(k);
      for (const req of await old.keys()) if (!(await cur.match(req))) { const r = await old.match(req); if (r) await cur.put(req, r); }
      await caches.delete(k);
    }
    await self.clients.claim();
    for (const req of await cur.keys()) if (/\.html$/.test(new URL(req.url).pathname) && !/index\.html$/.test(req.url))
      fetch(req, { cache: 'reload' }).then(r => r.ok && cur.put(req, r)).catch(() => {});
  })());
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const isIndex = e.request.mode === 'navigate' && (u.pathname.endsWith('/') || u.pathname.endsWith('/index.html'));
  e.respondWith((async () => {
    const cache = await caches.open(VER);
    const key = u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname;
    if (isIndex) { // network first so the list stays current
      try { const r = await fetch(e.request); if (r.ok) cache.put(key, r.clone()); return r; }
      catch (err) { return (await cache.match(key)) || (await cache.match('./')) || Response.error(); }
    }
    const hit = await cache.match(key);
    const net = fetch(e.request).then(r => { if (r.ok) cache.put(key, r.clone()); return r; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  })());
});
