const CACHE_VERSION = 'v8';
const STATIC_CACHE = `unicenutra-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `unicenutra-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `unicenutra-images-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/privacy.html',
  '/terms.html',
  '/assets/products/01-omega3-fish-oil.webp',
  '/assets/products/02-aged-garlic-extract.webp',
  '/assets/products/03-blood-circulation-flow.webp',
  '/assets/products/04-dried-hawthorn-berries.webp',
  '/assets/products/05-nac.webp',
  '/assets/products/06-fresh-moringa.webp',
  '/assets/products/07-rosemary-bundle.avif',
  '/assets/products/08-tulsi-holy-basil.webp',
  '/assets/products/09-fresh-mint.webp',
  '/assets/products/10-lemongrass-bundle.webp',
  '/assets/products/11-turmeric-spice-blend.webp',
  '/assets/products/12-ginger-spice-blend.webp',
  '/assets/products/13-garlic-herb-blend.webp',
  '/assets/products/14-moringa-spice-mix.webp',
  '/assets/products/15-custom-wellness-blend.webp',
  '/assets/products/16-fresh-kefir.webp',
  '/assets/products/17-flavored-kefir.webp',
  '/assets/products/18-classic-kombucha.webp',
  '/assets/products/19-ginger-kombucha.webp',
  '/assets/products/20-hibiscus-kombucha.webp'
];

const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
  'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
  'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js',
  'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js',
  'https://js.paystack.co/v2/inline.js',
  'https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&family=Urbanist:wght@400;500;600;700;800;900&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(async cache => {
      for (const url of PRECACHE_URLS) {
        await cache.add(url).catch(() => console.warn('Failed to cache:', url));
      }
      for (const url of CDN_URLS) {
        await cache.add(url).catch(() => console.warn('Failed to cache CDN:', url));
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== IMAGE_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
    .then(() => self.clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
    }))
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.origin !== self.location.origin) return;

  // Network-First: HTML pages (always get fresh version)
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(networkFirst(request));
    return;
  }

  // Network-First: dynamic JSON
  if (url.pathname.endsWith('.json')) {
    e.respondWith(networkFirst(request));
    return;
  }

  // Cache-First: images
  if (request.destination === 'image' || /\.(png|jpg|jpeg|gif|webp|svg|ico|avif)$/.test(url.pathname)) {
    e.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Cache-First: static assets (HTML, CSS, JS, fonts, CDN)
  e.respondWith(cacheFirst(request, STATIC_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback for navigation
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('{"error":"offline"}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
