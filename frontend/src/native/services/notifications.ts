import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications, Token, PushNotificationSchema } from "@capacitor/push-notifications";
import { isNativePlatform } from "@/native/platform";

export type PushTokenHandler = (token: string) => void;
export type PushMessageHandler = (notification: PushNotificationSchema) => void;

const URGENT_CHANNEL_ID = "gatepass_urgent";

let pushInitialized = false;
let urgentChannelReady = false;

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
    });
    urgentChannelReady = true;
  } catch {
    /* channel may already exist on Android native side */
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

export async function scheduleLocalNotification(options: {
  id: number;
  title: string;
  body: string;
  scheduleAt?: Date;
}): Promise<void> {
  if (!isNativePlatform()) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(options.title, { body: options.body });
    }
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

  if (!isNativePlatform()) {
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(title, {
        body: options.body,
        tag: `vms-host-alert-${options.visitorEntry}`,
        requireInteraction: true,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
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
    const perm = await PushNotifications.requestPermissions();
    return perm.receive === "granted";
  }
  if (!("Notification" in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}
