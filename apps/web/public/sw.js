self.addEventListener("push", (event) => {
  if (!event.data) return;
  const { title, body } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title || "Cloud Drive", {
      body: body || "You have a new notification.",
      icon: "/logo.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.startsWith(self.location.origin));
      return existing ? existing.focus() : clients.openWindow("/");
    })
  );
});
