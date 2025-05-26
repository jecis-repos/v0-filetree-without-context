const CACHE_NAME = "filetree-explorer-v1"
const urlsToCache = [
  "/",
  "/static/js/bundle.js",
  "/static/css/main.css",
  "/wasm/filetree_wasm.wasm",
  "/wasm/filetree_wasm.js",
]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request)
    }),
  )
})

// Handle WASM module requests
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "WASM_REQUEST") {
    // Handle WebAssembly module communication
    const { method, params } = event.data

    // Simulate WASM processing
    setTimeout(() => {
      event.ports[0].postMessage({
        type: "WASM_RESPONSE",
        result: `Processed ${method} with params: ${JSON.stringify(params)}`,
      })
    }, 100)
  }
})
