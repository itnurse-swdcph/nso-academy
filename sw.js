const CACHE_NAME = 'nso-academy-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/components.css',
  './css/pages.css',
  './js/api.js',
  './js/ui.js',
  './js/utils.js',
  './js/router.js',
  './js/app.js',
  './js/pages/home.js',
  './js/pages/create-training.js',
  './js/pages/register.js',
  './js/pages/verify.js',
  './js/pages/manage.js',
  './js/pages/pretest.js',
  './js/pages/posttest.js',
  './js/pages/satisfaction.js',
  './js/pages/dashboard.js',
  './manifest.json'
];

// Install Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch events
self.addEventListener('fetch', (e) => {
  // Do not cache API requests or external CDN components that change frequently
  if (e.request.url.includes('script.google.com') || e.request.method !== 'GET') {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first falling back to cache for standard pages & assets
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Cache valid responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(e.request);
      })
  );
});
