// Rio Flex Service Worker with Web Push & Notification Support
const CACHE_NAME = 'rioflex-v4';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache error (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass API calls completely - never intercept /api/
  if (url.pathname.startsWith('/api')) {
    return;
  }

  // Bypass external origins
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first with proper async cache fallback for HTML / navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status !== 404) {
            return networkResponse;
          }
        } catch (_err) {
          // rede offline
        }
        const cached = (await caches.match('/index.html')) || (await caches.match('/'));
        if (cached) return cached;
        return fetch(event.request);
      })()
    );
    return;
  }

  // Stale-while-revalidate for static assets
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })()
  );
});

// ============================================================================
// PWA NATIVE PUSH & NOTIFICATIONS SUPPORT (ANDROID & iOS 16.4+)
// ============================================================================

// 1. Recebimento de Web Push do Servidor (mesmo com o app fechado)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_err) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Rio Flex';
  const options = {
    body: data.body || 'Janela Solar aberta! A Light está com 4,8 GW de excedente limpo no RJ. Economize até R$ 25,65 na sua recarga.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'rio-flex-alert',
    renotify: true,
    data: {
      url: data.url || '/app/session',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Ver Oportunidade' },
      { action: 'close', title: 'Fechar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Clique na Notificação no Celular: abre ou foca no PWA Rio Flex
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetPath = event.notification.data?.url || '/app';
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se o app já estiver aberto em alguma aba/janela, focar nela e navegar
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Se o app estiver fechado, abrir uma nova janela do PWA
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Comunicação direta do App com o Service Worker para disparo de notificação nativa
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NATIVE_NOTIFICATION') {
    const { title, body, url, tag } = event.data.payload || {};
    const notificationTitle = title || 'Rio Flex';
    const options = {
      body: body || 'Alerta de Flexibilidade da Rede Elétrica',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: tag || 'rio-flex-local',
      renotify: true,
      data: {
        url: url || '/app',
      },
    };

    event.waitUntil(self.registration.showNotification(notificationTitle, options));
  }
});
