import { useCallback, useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallSheet } from "@/components/ui/PwaInstallSheet";
import { isNativePlatform } from "@/native/platform";

const DISMISS_KEY = "vms_install_nudge_dismissed_at";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 2200;

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
 * Auto “Add to Home Screen” nudge when running in a mobile browser
 * (not already installed, not Capacitor native).
 */
export function PwaInstallNudge() {
  const { installed, ios, canPrompt, install, showButton } = usePwaInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isNativePlatform()) return;
    if (installed || !showButton) return;
    if (wasRecentlyDismissed()) return;

    const timer = window.setTimeout(() => {
      setOpen(true);
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [installed, showButton]);

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
      onClose={close}
      onInstall={() => void handleInstall()}
    />
  );
}
