import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications, Token, PushNotificationSchema } from "@capacitor/push-notifications";
import { isNativePlatform } from "@/native/platform";

export type PushTokenHandler = (token: string) => void;
export type PushMessageHandler = (notification: PushNotificationSchema) => void;

const URGENT_CHANNEL_ID = "gatepass_urgent";
const NOTIFY_ICON = "/assets/visitor_management/frontend/icons/icon-192.png";

let pushInitialized = false;
let urgentChannelReady = false;

async function showBrowserNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (!("Notification" in window)) return false;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return false;

  const options = {
    body,
    tag,
    requireInteraction: true,
    icon: NOTIFY_ICON,
    badge: NOTIFY_ICON,
    vibrate: [280, 120, 280, 120, 420],
  } as NotificationOptions & { vibrate?: number[] };

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return true;
    } catch {
      /* fall back to window Notification */
    }
  }

  const notification = new Notification(title, options);
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  return true;
}

export async function ensureUrgentNotificationChannel(): Promise<void> {
  if (!isNativePlatform() || urgentChannelReady) return;

  try {
    await LocalNotifications.createChannel({
      id: URGENT_CHANNEL_ID,
      name: "Urgent Host Alerts",
      description: "High-priority visitor approval alerts with sound and vibration",
      importance: 5,
      vibration: true,
      visibility: 1,
      sound: "default",
    });
    urgentChannelReady = true;
  } catch {
    urgentChannelReady = true;
  }
}

export async function initPushNotifications(
  onToken: PushTokenHandler,
  onMessage?: PushMessageHandler,
): Promise<void> {
  if (!isNativePlatform() || pushInitialized) return;
  pushInitialized = true;

  await ensureUrgentNotificationChannel();

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", (token: Token) => {
    onToken(token.value);
  });

  PushNotifications.addListener("registrationError", () => {
    /* device push unavailable */
  });

  if (onMessage) {
    PushNotifications.addListener("pushNotificationReceived", onMessage);
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      if (action.notification) onMessage(action.notification);
    });
  }
}

/** Warm up PWA notification permission + service worker on host devices. */
export async function initWebHostNotifications(): Promise<void> {
  if (isNativePlatform() || !("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  /* Permission is requested via NotificationEnableBanner — avoid blocking login. */
}

export async function scheduleLocalNotification(options: {
  id: number;
  title: string;
  body: string;
  scheduleAt?: Date;
}): Promise<void> {
  if (!isNativePlatform()) {
    await showBrowserNotification(options.title, options.body, `vms-local-${options.id}`);
    return;
  }

  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: options.id,
        title: options.title,
        body: options.body,
        schedule: options.scheduleAt ? { at: options.scheduleAt } : undefined,
        channelId: "gatepass_default",
        smallIcon: "ic_stat_icon_config_sample",
        iconColor: "#0A3D91",
        sound: "default",
      },
    ],
  });
}

export async function scheduleUrgentHostAlert(options: {
  id: number;
  title: string;
  body: string;
  visitorEntry: string;
  reminderCount: number;
}): Promise<void> {
  const title = options.reminderCount > 0 ? `${options.title} (reminder)` : options.title;
  const tag = `vms-host-alert-${options.visitorEntry}`;

  if (!isNativePlatform()) {
    await showBrowserNotification(title, options.body, tag);
    return;
  }

  await ensureUrgentNotificationChannel();

  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return;

  await LocalNotifications.schedule({
    notifications: [
      {
        id: options.id,
        title,
        body: options.body,
        channelId: URGENT_CHANNEL_ID,
        smallIcon: "ic_stat_icon_config_sample",
        iconColor: "#0A3D91",
        sound: "default",
        ongoing: options.reminderCount === 0,
        autoCancel: true,
        extra: {
          visitor_entry: options.visitorEntry,
          reminder_count: options.reminderCount,
        },
      },
    ],
  });
}

export async function cancelHostAlertNotifications(ids: number[]): Promise<void> {
  if (!ids.length) return;

  if (!isNativePlatform()) return;

  try {
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
  } catch {
    /* ignore */
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    const [pushPerm, localPerm] = await Promise.all([
      PushNotifications.requestPermissions(),
      LocalNotifications.requestPermissions(),
    ]);
    return pushPerm.receive === "granted" || localPerm.display === "granted";
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

export function notificationPermissionState(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
