const CACHE_NAME = 'exam-venture-v1.0';

// 1. The Offline "Shopping List" - Updated to match actual unified structure
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/calculator.html',
  '/config.js',
  '/main.js',
  '/styles.css',
  '/terms_and_conditions_ev.html',
  '/privacy_policy.html',
  '/about_app.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo4.png'
];

// 2. INSTALL: Downloading the app to the phone's storage
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Exams Venture: System Caching Complete');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 3. FETCH: The "Money First" Hybrid Strategy
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // A. AD-SHIELD LOGIC: Handle Google Ad requests specifically
  if (url.includes('googlesyndication') || url.includes('doubleclick')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If offline, return an empty response so the UI stays clean
        return new Response('<div style="display:none;"></div>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
  } 
  // B. APP LOGIC: Handle your calculator files
  else {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If offline, serve the file from the local cache
        return caches.match(event.request);
      })
    );
  }
});

// 4. ACTIVATE: Cleaning out old versions when you upgrade
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});