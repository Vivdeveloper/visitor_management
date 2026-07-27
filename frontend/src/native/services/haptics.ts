import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNativePlatform } from "@/native/platform";

export async function impactLight(): Promise<void> {
  if (!isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function impactMedium(): Promise<void> {
  if (!isNativePlatform()) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function notifySuccess(): Promise<void> {
  if (!isNativePlatform()) return;
  await Haptics.notification({ type: NotificationType.Success });
}

export async function notifyError(): Promise<void> {
  if (!isNativePlatform()) return;
  await Haptics.notification({ type: NotificationType.Error });
}

export async function selectionChanged(): Promise<void> {
  if (!isNativePlatform()) return;
  await Haptics.selectionChanged();
}

/** Urgent repeating pattern for host approval alerts. */
export async function alertUrgent(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Haptics.vibrate({ duration: 420 });
    await new Promise((resolve) => window.setTimeout(resolve, 520));
    await Haptics.vibrate({ duration: 280 });
  } catch {
    /* haptics unavailable */
  }
}
