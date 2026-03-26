const CACHE_NAME = 'ev-cgpa-cache-v1';
const urlsToCache = [
    '/',
    'index.html',
    'calculator.html',
    'styles.css',
    'config.js',
    'main.js',
    'logo4.png',
    'icon-192.png',
    'icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
