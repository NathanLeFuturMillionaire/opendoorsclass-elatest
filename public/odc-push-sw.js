/* OpenDoorsClass push service worker.
   Messaging only: no app shell caching, no offline interception. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "OpenDoorsClass", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "OpenDoorsClass";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon.png",
    badge: payload.badge || "/favicon.png",
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    requireInteraction: Boolean(payload.requireInteraction),
    data: {
      url: payload.url || "/admin/finance",
      notificationId: payload.notificationId || null,
    },
    actions: payload.actionLabel ? [{ action: "open", title: payload.actionLabel }] : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/admin/finance";

  event.waitUntil(
    (async () => {
      const url = new URL(target, self.location.origin).href;
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(url);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener("notificationclose", () => {
  /* reserved for future analytics */
});
