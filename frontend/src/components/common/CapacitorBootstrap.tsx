import { useEffect } from "react";

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * Native-only bootstrap. Browser PWA never loads Capacitor plugins.
 */
export function CapacitorBootstrap() {
  useEffect(() => {
    if (!isCapacitorNative()) return;

    let cancelled = false;
    let teardown: (() => void) | undefined;

    void import("@/native/capacitor-init")
      .then(async (mod) => {
        if (cancelled) return;
        mod.initNativeTapToDismissKeyboard();
        teardown = await mod.initCapacitorNative();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return null;
}
