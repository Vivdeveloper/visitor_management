let nativeCached: boolean | null = null;

/** True only inside Android/iOS Capacitor WebView (not browser PWA). */
export function isNativePlatform(): boolean {
  if (nativeCached !== null) return nativeCached;
  if (typeof window === "undefined") {
    nativeCached = false;
    return false;
  }
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  nativeCached = Boolean(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
  return nativeCached;
}

export const nativePlatform = (): "ios" | "android" | "web" => {
  if (!isNativePlatform()) return "web";
  const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const platform = cap?.getPlatform?.() ?? "web";
  if (platform === "ios" || platform === "android") return platform;
  return "web";
};

export const isIos = (): boolean => nativePlatform() === "ios";

export const isAndroid = (): boolean => nativePlatform() === "android";
