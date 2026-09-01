/**
 * One Desk - PWA Service Worker
 * Provides offline shell support, asset caching, and PWABuilder / TWA compliance.
 */

const CACHE_NAME = 'onedesk-pwa-v1.0.8';

// Core shell assets to pre-cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/mobile-app.css',
  '/js/mobile-app.js',
  '/img/Fav-Icon.png',
  '/img/favicon.svg',
  '/img/onedesk-logo.png',
  '/img/loading_logo.gif'
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
