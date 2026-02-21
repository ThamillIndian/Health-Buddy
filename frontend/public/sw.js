// Service Worker for Chronic Health Buddy PWA
// Handles offline caching, background sync, and medication reminders

const CACHE_NAME = 'health-buddy-v1';
const URLS_TO_CACHE = [
  '/',
  '/dashboard',
  '/log',
  '/medications',
  '/health-records',
  '/reports',
  '/settings',
  '/offline.html',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ Caching app shell');
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.warn('Some assets could not be cached:', err);
        // Continue even if some files fail
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
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

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network only for API calls (don't cache - data changes frequently)
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Return response directly without caching
          // API responses change frequently and should always be fresh
          return response;
        })
        .catch((error) => {
          // If network fails, return error response
          console.warn('❌ API request failed:', request.url, error);
          return new Response(
            JSON.stringify({ error: 'Network request failed' }),
            { 
              status: 503, 
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Cache first for static assets (CSS, JS, images, etc.)
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        console.log('📦 Served from cache:', request.url);
        return response;
      }

      return fetch(request).then((fetchResponse) => {
        // Only cache successful responses for static assets
        if (fetchResponse && fetchResponse.status === 200) {
          // Clone the response before caching (static assets safe to clone)
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
            console.log('💾 Cached:', request.url);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      // If both cache and network fail, return offline page if available
      console.warn('⚠️ Both cache and network failed for:', request.url);
      return caches.match('/offline.html') || new Response('Offline');
    })
  );
});

// Background sync for medication reminders
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-medications') {
    event.waitUntil(checkAndNotifyMedications());
  }
});

// Store reminder interval ID
let reminderIntervalId = null;

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_MEDS') {
    console.log('📱 Checking medications from client message...');
    checkAndNotifyMedications();
  } else if (event.data && event.data.type === 'START_REMINDER_CHECKS') {
    const userId = event.data.userId;
    console.log('🔔 Starting reminder checks for user:', userId);
    
    // Store userId in IndexedDB for later retrieval
    storeUserIdInIndexedDB(userId).then(() => {
      console.log('✅ UserId stored in IndexedDB');
    }).catch((err) => {
      console.error('❌ Failed to store userId:', err);
    });
    
    // Start checking every minute
    if (!reminderIntervalId) {
      console.log('🟢 Setting up reminder interval...');
      
      // Check immediately on startup
      console.log('▶️ First check (immediate)...');
      checkAndNotifyMedications();
      
      // Then check every 60 seconds
      reminderIntervalId = setInterval(() => {
        const now = new Date();
        console.log(`🔄 Periodic check at ${now.toLocaleTimeString()}`);
        checkAndNotifyMedications();
      }, 60000); // Check every 60 seconds
      
      console.log('✅ Reminder checks started - checking every 60 seconds');
      console.log('📍 Interval ID:', reminderIntervalId);
    } else {
      console.log('⚠️ Reminder checks already running');
    }
  } else if (event.data && event.data.type === 'STOP_REMINDER_CHECKS') {
    console.log('🛑 Stopping reminder checks');
    if (reminderIntervalId) {
      clearInterval(reminderIntervalId);
      reminderIntervalId = null;
      console.log('✅ Reminder checks stopped');
    }
  }
});

// Main function to check medications and send notifications
async function checkAndNotifyMedications() {
  try {
    // Get userId from IndexedDB or localStorage equivalent
    const userId = await getStoredUserId();
    if (!userId) {
      console.log('❌ No user ID found');
      return;
    }

    console.log('📋 Fetching medications for user:', userId);
    
    // Fetch user's medications
    const response = await fetch(`/api/users/${userId}/medications`, {
      cache: 'no-store' // Always fetch fresh data, don't use cache
    });
    
    if (!response.ok) {
      console.error('❌ Failed to fetch medications:', response.status, response.statusText);
      return;
    }

    const medications = await response.json();
    console.log('✅ Fetched medications:', medications.length, 'items');

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    console.log('⏰ Current time:', currentTime);
    let notificationsSent = 0;

    // Check each medication
    medications.forEach((med) => {
      if (!med.times || !Array.isArray(med.times)) {
        console.warn('⚠️ Medication missing times array:', med.name);
        return;
      }

      med.times.forEach((time) => {
        console.log(`   Checking: ${med.name} at ${time} vs current ${currentTime}`);
        
        if (time === currentTime) {
          console.log('🔔 ✅ TIME MATCH! Sending notification for:', med.name);

          // Send notification
          self.registration.showNotification('💊 Time for your medication!', {
            body: `${med.name} ${med.strength}`,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: `med-${med.id}`,
            requireInteraction: true,
            actions: [
              { action: 'taken', title: '✅ Taken' },
              { action: 'snooze', title: '⏰ Snooze 5min' },
              { action: 'dismiss', title: '✕ Dismiss' },
            ],
            data: {
              medicationId: med.id,
              medicationName: med.name,
              medicationStrength: med.strength,
              userId: userId,
            },
          });

          notificationsSent++;
        }
      });
    });

    if (notificationsSent > 0) {
      console.log(`✅ Sent ${notificationsSent} notification(s)`);
    } else {
      console.log('ℹ️ No medications due at this time');
    }
  } catch (error) {
    console.error('❌ Error checking medications:', error);
  }
}

// Get stored userId (from IndexedDB)
async function getStoredUserId() {
  return new Promise((resolve) => {
    const request = indexedDB.open('HealthBuddy', 1);
    request.onerror = () => resolve(null);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction('user', 'readonly');
      const objectStore = transaction.objectStore('user');
      const getRequest = objectStore.get('userId');
      getRequest.onsuccess = () => resolve(getRequest.result?.value);
      getRequest.onerror = () => resolve(null);
    };
  });
}

// Store userId in IndexedDB
async function storeUserIdInIndexedDB(userId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HealthBuddy', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('user')) {
        db.createObjectStore('user');
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction('user', 'readwrite');
      const objectStore = transaction.objectStore('user');
      const putRequest = objectStore.put(userId, 'userId');
      
      putRequest.onsuccess = () => {
        console.log('✅ UserId stored in IndexedDB:', userId);
        resolve(true);
      };
      putRequest.onerror = () => reject(putRequest.error);
    };
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification.data;

  console.log('🔔 Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'taken') {
    // Log medication as taken
    console.log('📝 Logging medication as taken');
    
    // Send to backend
    fetch(`/api/users/${data.userId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'medication',
        payload: {
          action: 'taken',
          medication_id: data.medicationId,
          source: 'notification',
        },
        source: 'web',
        language: 'en',
      }),
    }).then(() => {
      console.log('✅ Medication logged');
      // Show confirmation notification
      self.registration.showNotification('✅ Medication logged!', {
        body: `${data.medicationName} marked as taken`,
        icon: '/icon-192x192.png',
      });
    });
  } else if (event.action === 'snooze') {
    // Snooze for 5 minutes
    console.log('⏰ Snoozing for 5 minutes');
    setTimeout(() => {
      self.registration.showNotification('💊 Reminder: Time for your medication!', {
        body: `${data.medicationName} ${data.medicationStrength}`,
        icon: '/icon-192x192.png',
        tag: `med-${data.medicationId}`,
        requireInteraction: true,
        actions: [
          { action: 'taken', title: '✅ Taken' },
          { action: 'snooze', title: '⏰ Snooze 5min' },
          { action: 'dismiss', title: '✕ Dismiss' },
        ],
        data: data,
      });
    }, 5 * 60 * 1000); // 5 minutes
  } else if (event.action === 'dismiss') {
    console.log('✕ Notification dismissed');
    // Just close - already done above
  }

  // Focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

console.log('✅ Service Worker loaded');
