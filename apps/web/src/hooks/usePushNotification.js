// React core & third-party libraries
import { useEffect } from "react";

// Services (RTK Query hooks)
import { useRegisterWebPushSubscriptionMutation } from "@services/api/notificationApi";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Registers a Web Push subscription for the current browser session.
 * Requests notification permission on mount, subscribes via PushManager,
 * and posts the subscription to the server.
 *
 * Degrades silently on browsers without serviceWorker / PushManager support,
 * and when VITE_VAPID_PUBLIC_KEY is not configured.
 */
export function usePushNotification() {
  const [registerSubscription] = useRegisterWebPushSubscriptionMutation();

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const existing = await reg.pushManager.getSubscription();
        const sub =
          existing ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          }));

        await registerSubscription(sub.toJSON()).unwrap();
      } catch {
        // Push is a progressive enhancement — swallow all errors silently
      }
    }

    subscribe();
  }, [registerSubscription]);
}
