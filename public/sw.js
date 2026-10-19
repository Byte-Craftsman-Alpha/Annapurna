const CACHE = 'annapurna-shell-v3'
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    const response = await fetch('/', { cache: 'no-store' })
    const html = await response.clone().text()
    await cache.put('/', response)
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"']+)"/g)].map(match => match[1])
    await cache.addAll([...new Set([...assets, '/favicon.svg', '/manifest.webmanifest', '/images/households.webp', '/fonts/dm-sans.woff2', '/fonts/manrope.woff2', '/icon-192.png', '/icon-512.png'])])
    await self.skipWaiting()
  })())
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key.startsWith('annapurna-shell-') && key !== CACHE).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || (!url.pathname.startsWith('/assets/') && request.mode !== 'navigate' && !url.pathname.startsWith('/images/') && !url.pathname.startsWith('/fonts/') && !['/favicon.svg', '/manifest.webmanifest'].includes(url.pathname))) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put('/', copy)) }
      return response
    }).catch(async () => (await caches.match('/')) || Response.error()))
  } else {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put(request, copy)) }
      return response
    })))
  }
})
