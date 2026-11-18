self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'SIGES', body: event.data ? event.data.text() : '' }; }
  const title = (data as any).title || 'SIGES';
  const options = {
    body: (data as any).body || '',
    icon: '/login-illustration.png',
    badge: '/login-illustration.png',
    data: { url: (data as any).url || '/portal' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/portal';
  event.waitUntil(clients.openWindow(url));
});
