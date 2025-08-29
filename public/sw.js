/**
 * Service Worker for Offline Functionality
 * Provides caching and offline support for the Nebula platform
 */

const CACHE_NAME = 'nebula-v1';
const STATIC_CACHE_NAME = 'nebula-static-v1';
const DYNAMIC_CACHE_NAME = 'nebula-dynamic-v1';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  // Add critical CSS and JS files
  '/_next/static/css/',
  '/_next/static/js/',
  // Add critical images
  '/favicon.ico'
];

// API endpoints that should be cached
const CACHEABLE_APIS = [
  '/api/health',
  '/api/templates',
  '/api/repositories',
  '/api/content'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('_next')));
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleStaticAssets(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(handleStaticAssets(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());
    
    // Cache successful responses for certain endpoints
    if (networkResponse.ok && shouldCacheAPI(url.pathname)) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for API request, trying cache', url.pathname);
    
    // Try cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }
    
    // Return offline response for critical APIs
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'offline',
        timestamp: new Date().toISOString(),
        message: 'Service Worker: Offline mode'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return error response
    return new Response(JSON.stringify({
      error: 'Network unavailable',
      message: 'This request requires an internet connection',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network if not in cache
    const networkResponse = await fetch(request);
    
    // Cache the response
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset', request.url);
    
    // Try cache again as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return 404 for missing assets
    return new Response('Asset not available offline', { status: 404 });
  }
}

// Handle page requests with network-first, fallback to cache
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful page responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for page request, trying cache');
    
    // Try cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page as fallback
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Final fallback - basic offline message
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Nebula</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 100%);
              color: white;
              margin: 0;
              padding: 2rem;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
            }
            .container {
              background: rgba(255, 255, 255, 0.05);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 16px;
              padding: 2rem;
              max-width: 400px;
            }
            h1 { margin-top: 0; color: #6366f1; }
            button {
              background: rgba(99, 102, 241, 0.2);
              border: 1px solid rgba(99, 102, 241, 0.3);
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 8px;
              cursor: pointer;
              margin-top: 1rem;
            }
            button:hover {
              background: rgba(99, 102, 241, 0.3);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📡 You're Offline</h1>
            <p>This page isn't available offline. Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Determine if API endpoint should be cached
function shouldCacheAPI(pathname) {
  return CACHEABLE_APIS.some(api => pathname.startsWith(api));
}

// Handle background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'retry-failed-requests') {
    event.waitUntil(retryFailedRequests());
  }
});

// Retry failed requests when back online
async function retryFailedRequests() {
  try {
    // Get failed requests from IndexedDB or cache
    const failedRequests = await getFailedRequests();
    
    for (const request of failedRequests) {
      try {
        const response = await fetch(request.url, request.options);
        if (response.ok) {
          // Remove from failed requests
          await removeFailedRequest(request.id);
          
          // Notify clients of successful retry
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'REQUEST_RETRY_SUCCESS',
                url: request.url
              });
            });
          });
        }
      } catch (error) {
        console.log('Service Worker: Retry failed for', request.url, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Failed to retry requests', error);
  }
}

// Store failed request for later retry
async function storeFailedRequest(request) {
  // Implementation would use IndexedDB to store failed requests
  console.log('Service Worker: Storing failed request for retry', request.url);
}

// Get failed requests from storage
async function getFailedRequests() {
  // Implementation would retrieve from IndexedDB
  return [];
}

// Remove failed request from storage
async function removeFailedRequest(id) {
  // Implementation would remove from IndexedDB
  console.log('Service Worker: Removing failed request', id);
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(data.urls));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(data.cacheName));
      break;
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      }));
      break;
  }
});

// Cache specific URLs
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  return Promise.all(
    urls.map(url => 
      fetch(url)
        .then(response => response.ok ? cache.put(url, response) : null)
        .catch(error => console.log('Failed to cache', url, error))
    )
  );
}

// Clear specific cache
async function clearCache(cacheName) {
  return caches.delete(cacheName || DYNAMIC_CACHE_NAME);
}

// Get cache status
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = {
      size: keys.length,
      urls: keys.map(request => request.url)
    };
  }
  
  return status;
}