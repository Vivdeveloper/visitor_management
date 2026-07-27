import { apiClient } from "@/api/client";
import { isNativePlatform } from "@/native/platform";

const METHOD = "visitor_management.react_api.push_notification";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export type WebPushStatus = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  serviceWorker: boolean;
  subscribed: boolean;
  pushManager: boolean;
};

export function isWebPushSupported(): boolean {
  if (isNativePlatform()) return false;
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getWebPushStatus(): Promise<WebPushStatus> {
  if (!isWebPushSupported()) {
    return {
      supported: false,
      permission: "unsupported",
      serviceWorker: false,
      subscribed: false,
      pushManager: false,
    };
  }

  let subscribed = false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    subscribed = Boolean(sub);
  } catch {
    subscribed = false;
  }

  return {
    supported: true,
    permission: Notification.permission,
    serviceWorker: "serviceWorker" in navigator,
    subscribed,
    pushManager: "PushManager" in window,
  };
}

/** Subscribe browser to Web Push (VAPID) and save on Frappe. */
export async function subscribeWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const { data } = await apiClient.get(`/api/method/${METHOD}.get_vapid_public_key`);
  const vapidKey = data.message as string;
  if (!vapidKey) return false;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  await apiClient.post(`/api/method/${METHOD}.save_push_subscription`, {
    subscription_json: JSON.stringify(subscription.toJSON()),
  });

  return true;
}
