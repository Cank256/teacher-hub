const CACHE_NAME = 'teacher-hub-v1';
const STATIC_CACHE = 'teacher-hub-static-v1';
const DYNAMIC_CACHE = 'teacher-hub-dynamic-v1';

// Workbox will inject the manifest here
const STATIC_ASSETS = self.__WB_MANIFEST || [
  '/',
  '/dashboard',
  '/resources',
  '/communities',
  '/messages',
  '/profile',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
  // self.skipWaiting(); // Commented out to prevent auto-refresh
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http(s) requests (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip non-GET requests for caching
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses (only GET requests)
          if (response.status === 200 && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone).catch((error) => {
                console.warn('Failed to cache API response:', error);
              });
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Handle static assets and pages
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses or non-basic types
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache).catch((error) => {
                console.warn('Failed to cache response:', error);
              });
            });

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Process queued offline actions
      processOfflineQueue()
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');

  let notificationData = {
    title: 'Teacher Hub',
    body: 'New update available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {}
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/favicon.ico',
    badge: notificationData.badge || '/favicon.ico',
    vibrate: [100, 50, 100],
    data: notificationData.data || {},
    actions: notificationData.actions || [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ],
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    tag: notificationData.tag
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  // Send message to main thread
  event.waitUntil(
    clients.matchAll().then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].postMessage({
          type: 'notification-click',
          action: action,
          data: data
        });
        
        if (action === 'view' || !action) {
          return clientList[0].focus();
        }
      } else if (action === 'view' || !action) {
        return clients.openWindow('/');
      }
    })
  );
});

// Helper function to process offline queue
async function processOfflineQueue() {
  try {
    // Get queued actions from IndexedDB or localStorage
    const queuedActions = await getQueuedActions();

    for (const action of queuedActions) {
      try {
        await fetch(action.url, action.options);
        await removeFromQueue(action.id);
      } catch (error) {
        console.error('Failed to sync action:', error);
      }
    }
  } catch (error) {
    console.error('Failed to process offline queue:', error);
  }
}

// Placeholder functions for queue management
async function getQueuedActions() {
  // Implementation would use IndexedDB
  return [];
}

async function removeFromQueue(id) {
  // Implementation would remove from IndexedDB
  console.log('Removing action from queue:', id);
}