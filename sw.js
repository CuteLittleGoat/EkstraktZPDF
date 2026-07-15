"use strict";

const cacheName = "ds2-checklist-v1";
const appShell = [
    "./",
    "./index.html",
    "./DS2.html",
    "./manifest.webmanifest"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(cacheName)
            .then(cache => cache.addAll(appShell))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== cacheName)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copy = response.clone();
                    caches.open(cacheName).then(cache => cache.put(event.request, copy));
                    return response;
                })
                .catch(() => caches.match(event.request).then(response => response || caches.match("./index.html")))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const networkResponse = fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(cacheName).then(cache => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() => cachedResponse);

            return cachedResponse || networkResponse;
        })
    );
});
