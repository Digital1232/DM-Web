/**
 * One Desk - PWA Service Worker
 * Provides offline shell support, asset caching, and PWABuilder / TWA compliance.
 */

const CACHE_NAME = 'onedesk-pwa-v1.0.0';

// Core shell assets to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/mobile-app.css',
  '/js/mobile-app.js',
  '/img/Fav-Icon.png',
  '/img/favicon.svg',
  '/img/onedesk-logo.png'
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

// Fetch Event - Network First with Cache Fallback for dynamic content
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET, chrome-extension, or cross-origin analytics/firestore calls from caching
  if (
    event.request.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com')
  ) {
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
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to root index for HTML navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
      })
  );
});
