/* Service worker — enables installing the app on phone/desktop and lets it keep working
   without internet after the first successful load. Bump CACHE_NAME whenever index.html
   changes so devices pick up the new version instead of an old cached one. */
const CACHE_NAME = 'sijil-clinic-v1';
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=> cache.addAll(CORE_FILES)).then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=> k!==CACHE_NAME).map(k=> caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

/* Network-first for the app file itself (so a connected device always gets the latest version
   right away), falling back to the cached copy when offline. Cache-first for everything else
   (fonts/CDN scripts/icons) since those rarely change and cache-first means instant, reliable
   offline loading of them once fetched successfully one time. */
self.addEventListener('fetch', (event)=>{
  if(event.request.method !== 'GET') return;
  const url = event.request.url;
  const isAppShell = url.endsWith('index.html') || url.endsWith('/');

  if(isAppShell){
    event.respondWith(
      fetch(event.request).then(resp=>{
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache=> cache.put(event.request, copy));
        return resp;
      }).catch(()=> caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;
      return fetch(event.request).then(resp=>{
        // Only cache successful, cacheable responses (skip opaque cross-origin errors etc.)
        if(resp && resp.status===200){
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache=> cache.put(event.request, copy));
        }
        return resp;
      }).catch(()=> cached);
    })
  );
});
