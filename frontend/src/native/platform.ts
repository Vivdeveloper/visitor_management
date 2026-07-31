type CapWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
  };
};

let nativeCached: boolean | null = null;

/** Android System WebView / Capacitor UA — bridge may inject after first paint. */
export function isLikelyNativeWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Chromium WebView marker used by Capacitor Android
  if (/; wv\)/i.test(ua)) return true;
  if (/Capacitor/i.test(ua)) return true;
  // iOS Capacitor / WKWebView apps often omit Safari token quirks; keep Capacitor check primary.
  return false;
}

function readCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as CapWindow).Capacitor;
  return Boolean(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
}

/**
 * True inside Android/iOS Capacitor WebView (not browser PWA).
 * Does not permanently cache `false` while the bridge may still be injecting
 * (live server URL boots React before Capacitor is ready).
 */
export function isNativePlatform(): boolean {
  if (nativeCached === true) return true;
  if (typeof window === "undefined") {
    nativeCached = false;
    return false;
  }
  if (readCapacitorNative()) {
    nativeCached = true;
    return true;
  }
  // Likely APK WebView but bridge not ready yet — treat as native for routing,
  // but do not freeze false so a later Capacitor probe can upgrade.
  if (isLikelyNativeWebView()) return true;
  return false;
}

/** Prefer hash routing in Capacitor / Android WebView (History API needs hard refresh). */
export function shouldUseHashRouter(): boolean {
  return isNativePlatform() || isLikelyNativeWebView();
}

export const nativePlatform = (): "ios" | "android" | "web" => {
  if (!isNativePlatform()) return "web";
  const cap = (window as CapWindow).Capacitor;
  const platform = cap?.getPlatform?.() ?? (isLikelyNativeWebView() ? "android" : "web");
  if (platform === "ios" || platform === "android") return platform;
  return "web";
};

export const isIos = (): boolean => nativePlatform() === "ios";

export const isAndroid = (): boolean => nativePlatform() === "android";
