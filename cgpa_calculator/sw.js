const CACHE_NAME = 'ev-cgpa-cache-v12';
const urlsToCache = [
    './',
    './index.html',
    './calculator.html',
    './academic_guide.html',
    './about_app.html',
    './privacy_policy.html',
    './terms_and_conditions_ev.html',
    './styles.css',
    './config.js',
    './main.js',
    './logo4.png',
    './icon-192-padded.png',
    './icon-512-padded.png',
    './manifest.json'
];

// FORCE INSTALLATION: This ensures the browser downloads everything to phone storage immediately
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('PWA: Force-downloading new version to phone storage...');
                return cache.addAll(urlsToCache);
            })
            .then(() => console.log('PWA: Force-overwrite complete. Files are now permanent.'))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Force-deleting old version:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of all pages immediately
    );
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Use network-first for HTML/doc requests so deployments show immediately.
    if (event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // STALE-WHILE-REVALIDATE Strategy
    // 1. Respond from cache immediately (speed)
    // 2. Fetch from network in the background and update cache (freshness)
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Silent catch: network failed, we already have cache
                });

                // Return cached version if available, otherwise wait for network
                return cachedResponse || fetchPromise;
            });
        })
    );
});
