// Mis Gastos · modo sin conexion v3 (24/11/2026, GitHub Pages).
// - Con internet: SIEMPRE pide la version mas nueva de la app (GitHub deja guardar la pagina 10 min; aqui se salta eso).
// - Sin internet o si GitHub falla: abre la copia guardada en el telefono.
// - Nunca se guarda una respuesta de error en lugar de la app.
const CACHE = 'mis-gastos-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => fetch(u, {cache: 'no-cache'}).then(r => r.ok ? c.put(u, r) : null).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.open(k).then(viejo => caches.open(CACHE).then(nuevo =>
        viejo.keys().then(rs => Promise.all(rs.map(r => nuevo.match(r).then(ya => ya ? null : viejo.match(r).then(res => res && res.ok ? nuevo.put(r, res) : null))))))
      ).then(() => caches.delete(k)))))   // lo bueno de la cache vieja pasa a la nueva antes de borrarla
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'})   // la version mas nueva, sin la copia de 10 min
        .then(r => {
          if (r.ok) {
            const cp = r.clone();
            caches.open(CACHE).then(c => c.put('./index.html', cp));
            return r;
          }
          return caches.match('./index.html').then(hit => hit || r);          // GitHub con error: la copia guardada
        })
        .catch(() => caches.match('./index.html'))                            // sin internet
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(req, cp));
      }
      return r;
    }))
  );
});
