import { useState } from "react";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { ut } from "@/i18n/uiChrome";
import { applyAppUpdate, isPwaInstalled } from "@/lib/pwaUpdate";
import { isNativePlatform } from "@/native/platform";
import { usePwaInstall } from "@/hooks/usePwaInstall";

type Props = {
  /** popup = profile menu row · settings = full settings button */
  variant?: "popup" | "settings";
  className?: string;
  onStarted?: () => void;
};

/** Shown after PWA install (or on Capacitor) to pull the latest app build. */
export function PwaAppUpdateButton({
  variant = "popup",
  className = "",
  onStarted,
}: Props) {
  const { lang } = useAppLanguage();
  const { installed } = usePwaInstall();
  const [busy, setBusy] = useState(false);
  const visible = installed || isPwaInstalled() || isNativePlatform();

  if (!visible) return null;

  const runUpdate = () => {
    if (busy) return;
    setBusy(true);
    onStarted?.();
    void applyAppUpdate().finally(() => {
      /* reload usually unmounts; reset if store opened */
      setBusy(false);
    });
  };

  if (variant === "settings") {
    return (
      <button
        type="button"
        className={`vm-profile-popup-settings ${className}`.trim()}
        disabled={busy}
        onClick={runUpdate}
      >
        {busy ? ut(lang, "app_updating") : ut(lang, "app_update")}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`vm-profile-popup-action vm-profile-popup-update ${className}`.trim()}
      disabled={busy}
      onClick={runUpdate}
      aria-label={ut(lang, "app_update")}
    >
      <span className="vm-profile-popup-action-icon" aria-hidden>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      </span>
      <span className="vm-profile-popup-action-copy">
        <strong>{busy ? ut(lang, "app_updating") : ut(lang, "app_update")}</strong>
        <span>{ut(lang, "app_update_hint")}</span>
      </span>
      <span className="vm-profile-popup-action-trail" aria-hidden>
        ›
      </span>
    </button>
  );
}
