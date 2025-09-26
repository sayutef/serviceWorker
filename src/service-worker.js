// service-worker.js
const CACHE_NAME = 'propan-static-v1';
const RUNTIME = 'propan-runtime';
const PRECACHE_URLS = [
  '/', '/index.html', '/styles.css', '/app.js', '/offline.html', '/manifest.json',
  '/images/pan1.png', '/images/pan2.png'
];

// ---- INSTALL ----
self.addEventListener('install', (event) => {
  console.log('[SW] install -> caching precache files');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---- ACTIVATE ----
self.addEventListener('activate', (event) => {
  console.log('[SW] activate -> limpiando caches antiguas');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== RUNTIME)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ---- FETCH ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  event.respondWith((async () => {
    try {
      // Navegación (HTML pages)
      if (request.mode === 'navigate') {
        const networkResp = await fetch(request);
        if (networkResp && networkResp.type !== "opaqueredirect") {
          const cache = await caches.open(RUNTIME);
          await cache.put(request, networkResp.clone());
        }
        return networkResp;
      }

      // Archivos precacheados o recursos estáticos
      if (PRECACHE_URLS.includes(url.pathname) || ['style','script','image'].includes(request.destination)) {
        const cachedResp = await caches.match(request);
        if (cachedResp) return cachedResp;

        const networkResp = await fetch(request);
        if (networkResp && networkResp.type !== "opaqueredirect") {
          const cache = await caches.open(RUNTIME);
          await cache.put(request, networkResp.clone());
        }
        return networkResp;
      }

      // API requests
      if (url.pathname.startsWith('/api/')) {
        const networkResp = await fetch(request);
        if (networkResp && networkResp.type !== "opaqueredirect") {
          const cache = await caches.open(RUNTIME);
          await cache.put(request, networkResp.clone());
        }
        return networkResp;
      }

      // Default (network first con fallback a cache)
      const networkResp = await fetch(request);
      if (networkResp && networkResp.type !== "opaqueredirect") {
        const cache = await caches.open(RUNTIME);
        await cache.put(request, networkResp.clone());
      }
      return networkResp;

    } catch (err) {
     // ---- FALLBACK OFFLINE ----
console.warn('[SW] Fetch falló, usando cache', request.url, err);

// 1️⃣ Si es navegación (HTML), primero mostramos offline.html
if (request.destination === 'document') {
  const offlineResp = await caches.match('/offline.html');
  if (offlineResp) return offlineResp;
}

// 2️⃣ Si es imagen, mostramos imagen por defecto
if (request.destination === 'image') {
  const imgResp = await caches.match('/images/pan1.png');
  if (imgResp) return imgResp;
}

// 3️⃣ Para otros recursos, buscamos en cache
const cachedResp = await caches.match(request);
if (cachedResp) return cachedResp;

// 4️⃣ Si no hay nada, devolvemos respuesta genérica
return new Response('Offline', { status: 503, statusText: 'Offline' });

    }
  })());
});

// ---- MESSAGE ----
self.addEventListener('message', (event) => {
  console.log('[SW] message recibido:', event.data);
  const data = event.data;
  const port = event.ports && event.ports[0];

  if (data && data.type === 'GENERATE_NUMBER') {
    const limite = Number.parseInt(data.limite) || 100;
    const num = Math.random() * limite;
    const payload = { numero: num };
    console.log('[SW] generando numero:', num);

    if (port) port.postMessage(payload);
    else self.clients.matchAll().then(clients => clients.forEach(c => c.postMessage(payload)));
    return;
  }

  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ---- PUSH ----
self.addEventListener('push', (event) => {
  // Solo si el usuario dio permiso
  if (Notification.permission !== 'granted') {
    console.warn('[SW] No hay permiso para notificaciones');
    return;
  }

  const data = event.data ? event.data.json() : {
    title: 'proPAN',
    body: '¡Tienes una notificación de la panadería!'
  };

  const title = data.title;
  const options = {
    body: data.body,
    icon: '/images/pan1.png',
    badge: '/images/pan1.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});




// ---- BACKGROUND SYNC ----
self.addEventListener('sync', (event) => {
  console.log('[SW] sync event', event.tag);
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  console.log('[SW] sincronizando pedidos pendientes...');
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('[SW] pedidos sincronizados (simulado)');
      resolve();
    }, 2000);
  });
}
