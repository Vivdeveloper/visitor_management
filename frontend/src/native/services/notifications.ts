import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications, Token, PushNotificationSchema } from "@capacitor/push-notifications";
import { isNativePlatform } from "@/native/platform";

export type PushTokenHandler = (token: string) => void;
export type PushMessageHandler = (notification: PushNotificationSchema) => void;

let pushInitialized = false;

export async function initPushNotifications(
  onToken: PushTokenHandler,
  onMessage?: PushMessageHandler,
): Promise<void> {
  if (!isNativePlatform() || pushInitialized) return;
  pushInitialized = true;

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

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    const perm = await PushNotifications.requestPermissions();
    return perm.receive === "granted";
  }
  if (!("Notification" in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}
