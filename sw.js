const CACHE_NAME = 'ev-cgpa-cache-v3';
const urlsToCache = [
    './',
    './index.html',
    './calculator.html',
    './about_app.html',
    './privacy_policy.html',
    './terms_and_conditions_ev.html',
    './styles.css',
    './config.js',
    './main.js',
    './logo4.png',
    './icon-192.png',
    './icon-512.png',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache, pre-caching all files for offline use');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    // Aggressive Cache-First Strategy for all static assets
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response immediately
                if (response) {
                    return response;
                }
                
                // Not in cache - fetch from network and cache for next time
                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return networkResponse;
                }).catch(() => {
                    // Offline and not in cache
                    return new Response("Offline and resource not found in cache.");
                });
            })
    );
});
