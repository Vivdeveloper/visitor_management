import { useCallback, useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallSheet } from "@/components/ui/PwaInstallSheet";
import { isNativePlatform } from "@/native/platform";

const DISMISS_KEY = "vms_install_nudge_dismissed_at";
const DISMISS_DAYS = 7;
/** Delay before first auto-nudge (HRMS shows ASAP on beforeinstallprompt). */
const SHOW_DELAY_MS = 1200;

function wasRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Auto “Install Visitor Gate” nudge — same idea as HRMS InstallPrompt:
 * show when browser fires beforeinstallprompt, or guide iOS Add to Home Screen.
 */
export function PwaInstallNudge() {
  const { installed, ios, canPrompt, install, showButton, secure, localhostUrl } = usePwaInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isNativePlatform()) return;
    if (installed || !showButton) return;
    if (wasRecentlyDismissed()) return;

    // When Chrome is ready to install, open immediately (HRMS-style).
    if (canPrompt) {
      setOpen(true);
      return;
    }

    // On insecure http://site-name, explain how to get the real Install button.
    const delay = secure ? SHOW_DELAY_MS : 800;
    const timer = window.setTimeout(() => {
      setOpen(true);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [installed, showButton, canPrompt, secure]);

  const close = useCallback(() => {
    markDismissed();
    setOpen(false);
  }, []);

  const handleInstall = useCallback(async () => {
    await install();
    if (canPrompt) {
      markDismissed();
      setOpen(false);
    }
  }, [install, canPrompt]);

  if (isNativePlatform() || installed) return null;

  return (
    <PwaInstallSheet
      open={open}
      ios={ios}
      canPrompt={canPrompt}
      secure={secure}
      localhostUrl={localhostUrl}
      onClose={close}
      onInstall={() => void handleInstall()}
    />
  );
}
