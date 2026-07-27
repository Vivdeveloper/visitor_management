import { apiClient } from "@/api/client";
import { isNativePlatform } from "@/native/platform";

const METHOD = "visitor_management.react_api.push_notification";
const SW_URL = "/vms_sw.js";
const SW_SCOPE = "/vms/";

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
  secureContext: boolean;
};

export function isWebPushSupported(): boolean {
  if (isNativePlatform()) return false;
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Ensure the GatePass service worker is registered and active (needed for background push). */
export async function ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    let registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    if (!registration) {
      registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
    }
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function getWebPushStatus(): Promise<WebPushStatus> {
  const secureContext = typeof window !== "undefined" && window.isSecureContext;
  if (!isWebPushSupported()) {
    return {
      supported: false,
      permission: "Notification" in window ? Notification.permission : "unsupported",
      serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
      subscribed: false,
      pushManager: typeof window !== "undefined" && "PushManager" in window,
      secureContext,
    };
  }

  let subscribed = false;
  try {
    const registration = await ensureServiceWorkerReady();
    const sub = registration ? await registration.pushManager.getSubscription() : null;
    subscribed = Boolean(sub);
  } catch {
    subscribed = false;
  }

  return {
    supported: true,
    permission: Notification.permission,
    serviceWorker: true,
    subscribed,
    pushManager: true,
    secureContext,
  };
}

/** Subscribe browser to Web Push (VAPID) and save on Frappe — required for background alerts. */
export async function subscribeWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) return false;

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") return false;

  try {
    const { data } = await apiClient.get(`/api/method/${METHOD}.get_vapid_public_key`);
    const vapidKey = data.message as string;
    if (!vapidKey) return false;

    const registration = await ensureServiceWorkerReady();
    if (!registration?.pushManager) return false;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }

    await apiClient.post(`/api/method/${METHOD}.save_push_subscription`, {
      subscription_json: JSON.stringify(subscription.toJSON()),
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * If the user already allowed notifications, (re)subscribe and save endpoint on the server.
 * Call on login so background push works without opening the permission modal again.
 */
export async function ensureBackgroundPushReady(): Promise<boolean> {
  if (isNativePlatform() || !isWebPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  return subscribeWebPush();
}
