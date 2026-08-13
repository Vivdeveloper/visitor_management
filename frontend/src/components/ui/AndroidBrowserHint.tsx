import { useCallback, useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { isNativePlatform } from "@/native/platform";
import { ut } from "@/i18n/uiChrome";
import { useAppLanguage } from "@/context/AppLanguageContext";

const DISMISS_KEY = "vms_android_browser_hint_dismissed";

function isAndroidBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (!/Android/i.test(ua)) return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  return !standalone;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Shown on Android Chrome tab view — prompts install to hide the browser X / URL bar. */
export function AndroidBrowserHint() {
  const { lang } = useAppLanguage();
  const { installed, canPrompt, install } = usePwaInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNativePlatform() || installed) return;
    if (!isAndroidBrowser() || wasDismissed()) return;
    setVisible(true);
  }, [installed]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const handleInstall = useCallback(() => {
    void install();
  }, [install]);

  if (!visible) return null;

  return (
    <div className="vm-android-browser-hint" role="status">
      <p className="vm-android-browser-hint-copy">{ut(lang, "android_browser_hint")}</p>
      <div className="vm-android-browser-hint-actions">
        <button type="button" className="vm-android-browser-hint-install" onClick={handleInstall}>
          {canPrompt ? ut(lang, "android_browser_install") : ut(lang, "android_browser_how")}
        </button>
        <button type="button" className="vm-android-browser-hint-dismiss" onClick={dismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
