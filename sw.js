/**
 * One Desk - PWA Service Worker
 * Provides offline shell support, asset caching, and PWABuilder / TWA compliance.
 */

const CACHE_NAME = 'onedesk-pwa-v1.0.88';

// Core shell assets to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/chat.html',
  '/manifest.json',
  '/mobile-app.css',
  '/app-realistic-ui.css',
  '/js/mobile-app.js',
  '/js/toasts.js',
  '/img/app-icon-192.jpg',
  '/img/Fav-Icon.png',
  '/img/favicon-64.png',
  '/img/onedesk-logo.png',
  '/img/loading_logo.webp'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical pre-cache error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up outdated caches
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

// Fetch Event - Network First with Cache Fallback for same-origin content
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Do not intercept cross-origin requests, chrome extensions, or external APIs
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-First with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback to root index for HTML navigation requests
        if (event.request.mode === 'navigate') {
          const navFallback = (await caches.match('/index.html')) || (await caches.match('/'));
          if (navFallback) {
            return navFallback;
          }
        }
        // Fallback error response to ensure a valid Response is always returned
        return new Response('Network request failed and no offline cache available.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Notification Click Event - Focus window and post routing data
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  const isChatPage = (c) => {
    try { return new URL(c.url).pathname.endsWith('/chat.html'); } catch (e) { return false; }
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Prefer an already-open dedicated chat window, then any other One Desk window.
      const target = clientList.find(isChatPage) || clientList.find((c) => c.url && 'focus' in c);
      if (target) {
        return target.focus().then((focusedClient) => {
          (focusedClient || target).postMessage({
            type: 'NOTIFICATION_CLICK',
            chatData: data
          });
        });
      }

      // Nothing open: open the dedicated chat page straight on the conversation.
      if (self.clients.openWindow) {
        const url = new URL('chat.html', self.registration.scope);
        if (data.convId) {
          url.searchParams.set('conv', data.convId);
          if (data.type) url.searchParams.set('type', data.type);
          if (data.name) url.searchParams.set('name', data.name);
          if (data.senderEmail) url.searchParams.set('email', data.senderEmail);
          // Photos can be huge data: URIs; only pass real URLs.
          if (/^https?:\/\//.test(data.profilePicture || '') && data.profilePicture.length < 500) {
            url.searchParams.set('pic', data.profilePicture);
          }
        }
        return self.clients.openWindow(url.href);
      }
    })
  );
});

// Push Event - Handle Web Push messages if triggered
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title || 'One Desk Alert';
    const options = {
      body: payload.body || '',
      icon: payload.icon || '/img/Fav-Icon.png',
      badge: payload.badge || '/img/Fav-Icon.png',
      tag: payload.tag || 'onedesk-notification',
      renotify: true,
      data: payload.data || {}
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('One Desk', {
        body: text,
        icon: '/img/Fav-Icon.png',
        badge: '/img/Fav-Icon.png'
      })
    );
  }
});
