// Piyee POS — service worker minimal.
// Tujuannya cuma dua: (1) supaya browser mau menawarkan "Install app" / "Add to Home screen",
// dan (2) supaya app shell (index.html) tetap bisa dibuka walau internet sedang putus.
// Data transaksi TIDAK di-cache di sini — itu urusan IndexedDB/localStorage di dalam index.html,
// dan sinkron ke server tetap butuh koneksi seperti biasa.

const CACHE = 'piyee-pos-shell-v1';
const SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // jangan cache POST ke Apps Script

  // Network-first untuk navigasi (index.html) supaya selalu dapat versi terbaru saat online,
  // fallback ke cache saat offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put('./index.html', res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first untuk file shell statis (manifest, ikon).
  if (SHELL.some((s) => req.url.endsWith(s.replace('./', '')))) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
  }
});
