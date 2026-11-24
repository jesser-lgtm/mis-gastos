// Mis Gastos · modo sin conexion v2 (23/11/2026). Cambios contra v1:
// - Con internet y el servidor pidiendo sesion (401), se muestra el login (no se abre la copia guardada).
// - Si el servidor no responde bien (caido, tunel apagado, pagina de error de Cloudflare), se abre la copia guardada.
// - Nunca se guarda una respuesta de error ni el login en lugar de la app.
const CACHE = 'mis-gastos-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  // la app y lo demas se guardan si se puede; sin sesion la app da 401 y se guarda despues, al entrar
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => fetch(u).then(r => r.ok ? c.put(u, r) : null).catch(() => null))))
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
  if (['/login', '/salir', '/cuenta'].includes(url.pathname)) return;   // siempre al servidor

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => {
          if (r.ok && !r.redirected) {
            const cp = r.clone();
            caches.open(CACHE).then(c => c.put('./index.html', cp));
            return r;
          }
          if (r.status === 401 || r.status === 429 || r.redirected) return r;   // pide sesion: se muestra el login
          return caches.match('./index.html').then(hit => hit || r);          // servidor con error: la copia guardada
        })
        .catch(() => caches.match('./index.html'))                            // sin internet / servidor apagado
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
