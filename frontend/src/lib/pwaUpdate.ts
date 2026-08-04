import { checkForAppUpdate, openAppStore } from "@/native/services/appUpdate";
import { isNativePlatform } from "@/native/platform";

/** True when running as installed PWA (home-screen / standalone). */
export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(media || iosStandalone);
}

/**
 * Force-fetch the latest PWA bundle: update SW, clear caches, reload.
 * On Capacitor native, opens the store when an update is available.
 */
export async function applyAppUpdate(): Promise<"reloading" | "store" | "done"> {
  if (isNativePlatform()) {
    const availability = await checkForAppUpdate();
    if (availability === "available") {
      await openAppStore();
      return "store";
    }
  }

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (registration) => {
          await registration.update();
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        }),
      );
    } catch {
      /* ignore SW errors and still reload */
    }
  }

  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      /* ignore cache clear failures */
    }
  }

  window.location.reload();
  return "reloading";
}
