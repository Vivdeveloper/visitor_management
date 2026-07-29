import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { isNativePlatform, isAndroid, isIos } from "@/native/platform";
import { dispatchHardwareBack } from "@/native/backNavigation";
import { lockPortrait } from "@/native/services/screenOrientation";
import { onKeyboardChange, hideKeyboard } from "@/native/services/keyboard";
import { initPushNotifications, ensureUrgentNotificationChannel } from "@/native/services/notifications";
import { saveFcmTokenToServer } from "@/services/fcmPush";
import { startOfflineSyncListener } from "@/offline/sync";

function resolveDeepLinkPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/vms/, "") || "/";
    const search = parsed.search;
    const hash = parsed.hash;
    return `${path}${search}${hash}`;
  } catch {
    return null;
  }
}

function navigateToPath(path: string) {
  // Capacitor live WebView uses HashRouter — History API alone needs a hard refresh.
  if (isNativePlatform() || isAndroid()) {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    window.location.hash = `#${normalized}`;
    return;
  }
  if (window.location.pathname + window.location.search + window.location.hash !== path) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

async function configureStatusBar() {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#0A3D91" });
  } catch {
    /* status bar unavailable */
  }
}

export async function initCapacitorNative(): Promise<() => void> {
  if (!isNativePlatform()) {
    return startOfflineSyncListener();
  }

  document.documentElement.classList.add("cap-native");

  if (isAndroid()) {
    document.documentElement.classList.add("cap-android");
  }
  if (isIos()) {
    document.documentElement.classList.add("cap-ios");
  }

  await configureStatusBar();
  await lockPortrait();
  await ensureUrgentNotificationChannel();

  void SplashScreen.hide();

  const removeKeyboard = onKeyboardChange(() => {
    /* keyboard height applied via CSS variable */
  });

  const removeBack = App.addListener("backButton", () => {
    // Prefer SPA / page handlers — do not use history.length (WebView often exits wrongly).
    if (dispatchHardwareBack()) return;
    void App.exitApp();
  });

  const removeUrl = App.addListener("appUrlOpen", (event) => {
    const path = resolveDeepLinkPath(event.url);
    if (path) navigateToPath(path);
  });

  const removeState = App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      void SplashScreen.hide();
    }
  });

  void initPushNotifications((token) => {
    void saveFcmTokenToServer(token);
  });

  const removeOffline = startOfflineSyncListener();

  return () => {
    removeOffline();
    void removeKeyboard();
    void removeBack.then((h) => h.remove());
    void removeUrl.then((h) => h.remove());
    void removeState.then((h) => h.remove());
  };
}

export function syncNativeStatusBar(): void {
  void configureStatusBar();
}

/** Blur focused input when tapping non-interactive areas on native. */
export function initNativeTapToDismissKeyboard(): void {
  if (!isNativePlatform()) return;
  document.addEventListener(
    "touchstart",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) {
        return;
      }
      void hideKeyboard();
    },
    { passive: true },
  );
}
