import { AppUpdate, AppUpdateAvailability } from "@capawesome/capacitor-app-update";
import { isNativePlatform, isAndroid } from "@/native/platform";

export type UpdateAvailability = "available" | "unavailable" | "web";

export async function checkForAppUpdate(): Promise<UpdateAvailability> {
  if (!isNativePlatform()) return "web";
  try {
    const info = await AppUpdate.getAppUpdateInfo();
    if (isAndroid()) {
      return info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE
        ? "available"
        : "unavailable";
    }
    /* iOS: App Store lookup via plugin */
    return info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE
      ? "available"
      : "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function openAppStore(): Promise<void> {
  if (!isNativePlatform()) return;
  await AppUpdate.openAppStore();
}
