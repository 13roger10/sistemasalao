// Belezza.ai Custom Service Worker
// Este arquivo é combinado com o SW gerado pelo next-pwa

// Cache names
const CACHE_NAME = 'belezza-v1';
const OFFLINE_CACHE = 'belezza-offline-v1';
const STATIC_CACHE = 'belezza-static-v1';

// Offline page
const OFFLINE_URL = '/offline';

// Files to cache for offline
const STATIC_FILES = [
  '/',
  '/offline',
  '/salon/dashboard',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_FILES);
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName.startsWith('belezza-') &&
              cacheName !== CACHE_NAME &&
              cacheName !== OFFLINE_CACHE &&
              cacheName !== STATIC_CACHE
            );
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls and external requests
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache non-success responses
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url: data.url || '/salon/dashboard',
      type: data.type || 'general',
      appointmentId: data.appointmentId,
      timestamp: Date.now(),
    },
    actions: data.actions || [],
    tag: data.tag || `belezza-${Date.now()}`,
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
  };

  // Add actions based on notification type
  if (data.type === 'appointment_reminder') {
    options.actions = [
      { action: 'confirm', title: 'Confirmar' },
      { action: 'view', title: 'Ver Detalhes' },
    ];
    options.requireInteraction = true;
  } else if (data.type === 'new_appointment') {
    options.actions = [
      { action: 'view', title: 'Ver Agendamento' },
      { action: 'dismiss', title: 'Dispensar' },
    ];
  } else if (data.type === 'appointment_cancelled') {
    options.actions = [
      { action: 'view', title: 'Ver Agenda' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Belezza.ai', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  let targetUrl = data.url || '/salon/dashboard';

  // Handle action buttons
  if (event.action === 'confirm' && data.appointmentId) {
    targetUrl = `/salon/appointments/${data.appointmentId}/confirm`;
  } else if (event.action === 'view' && data.appointmentId) {
    targetUrl = `/salon/appointments/${data.appointmentId}`;
  } else if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes('/salon') && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Notification close handling (for analytics)
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data;

  // Track notification dismissal (send to analytics if needed)
  console.log('[SW] Notification dismissed:', data.type);
});

// Background sync for offline appointments
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  } else if (event.tag === 'sync-reminders') {
    event.waitUntil(syncReminders());
  }
});

async function syncAppointments() {
  try {
    const cache = await caches.open('belezza-pending-sync');
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const data = await response.json();

        // Try to send the appointment to the server
        const result = await fetch('/api/salon/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (result.ok) {
          await cache.delete(request);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Sync appointments failed:', error);
  }
}

async function syncReminders() {
  try {
    // Fetch pending reminders from server
    const response = await fetch('/api/salon/reminders/pending');
    if (response.ok) {
      const reminders = await response.json();

      for (const reminder of reminders) {
        await self.registration.showNotification(reminder.title, {
          body: reminder.body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          data: {
            type: 'appointment_reminder',
            appointmentId: reminder.appointmentId,
            url: `/salon/appointments/${reminder.appointmentId}`,
          },
          actions: [
            { action: 'confirm', title: 'Confirmar' },
            { action: 'view', title: 'Ver Detalhes' },
          ],
          requireInteraction: true,
          tag: `reminder-${reminder.appointmentId}`,
        });
      }
    }
  } catch (error) {
    console.error('[SW] Sync reminders failed:', error);
  }
}

// Periodic background sync for reminders (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkAndSendReminders());
  }
});

async function checkAndSendReminders() {
  try {
    const response = await fetch('/api/salon/reminders/check');
    if (response.ok) {
      const data = await response.json();

      for (const reminder of data.reminders) {
        await self.registration.showNotification(reminder.title, {
          body: reminder.body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          data: reminder.data,
          actions: reminder.actions,
          tag: reminder.tag,
          requireInteraction: reminder.requireInteraction,
        });
      }
    }
  } catch (error) {
    console.error('[SW] Check reminders failed:', error);
  }
}

// Message handling from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    scheduleLocalReminder(event.data.reminder);
  }

  if (event.data && event.data.type === 'CANCEL_REMINDER') {
    cancelLocalReminder(event.data.reminderId);
  }
});

// Local reminder scheduling using setTimeout
const scheduledReminders = new Map();

function scheduleLocalReminder(reminder) {
  const now = Date.now();
  const delay = reminder.scheduledTime - now;

  if (delay > 0) {
    const timeoutId = setTimeout(async () => {
      await self.registration.showNotification(reminder.title, {
        body: reminder.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          type: 'appointment_reminder',
          appointmentId: reminder.appointmentId,
          url: `/salon/appointments/${reminder.appointmentId}`,
        },
        actions: [
          { action: 'confirm', title: 'Confirmar' },
          { action: 'view', title: 'Ver Detalhes' },
        ],
        requireInteraction: true,
        tag: `reminder-${reminder.appointmentId}`,
      });

      scheduledReminders.delete(reminder.id);
    }, delay);

    scheduledReminders.set(reminder.id, timeoutId);
  }
}

function cancelLocalReminder(reminderId) {
  const timeoutId = scheduledReminders.get(reminderId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    scheduledReminders.delete(reminderId);
  }
}

console.log('[SW] Belezza.ai Service Worker loaded');
