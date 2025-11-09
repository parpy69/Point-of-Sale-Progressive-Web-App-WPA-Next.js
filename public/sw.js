const CACHE_VERSION = "v1.0.1";
const CACHE_NAME = `pos-app-${CACHE_VERSION}`;

self.addEventListener("install", (event) => {
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
	self.clients.claim();
});

// Network-first strategy - always try network first, don't cache HTML/JS
self.addEventListener("fetch", (event) => {
	const { request } = event;
	
	// For navigation and API calls, always use network first
	if (request.mode === "navigate" || request.url.includes("/_next/")) {
		event.respondWith(
			fetch(request)
				.catch(() => {
					// Only fallback to cache if network fails
					return caches.match(request);
				})
		);
		return;
	}
	
	// For other resources, pass through without caching
	event.respondWith(fetch(request));
});


