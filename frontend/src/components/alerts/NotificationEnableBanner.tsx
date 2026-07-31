import { useState } from "react";
import { requestNotificationPermission } from "@/native/services/notifications";

const DISMISS_KEY = "vms_notify_banner_dismissed";

type Props = {
  visible: boolean;
};

export function NotificationEnableBanner({ visible }: Props) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "1");
  const [busy, setBusy] = useState(false);

  if (!visible || dismissed) return null;

  async function onEnable() {
    setBusy(true);
    try {
      await requestNotificationPermission();
      setDismissed(true);
      sessionStorage.setItem(DISMISS_KEY, "1");
    } finally {
      setBusy(false);
    }
  }

  function onDismiss() {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "1");
  }

  return (
    <div className="vm-notify-enable-banner" role="region" aria-label="Enable visitor alerts">
      <div className="vm-notify-enable-copy">
        <strong>Enable gate alerts</strong>
        <span>Get ring + vibration when a visitor needs approval (like MyGate / NoBroker).</span>
      </div>
      <div className="vm-notify-enable-actions">
        <button type="button" className="vm-notify-enable-btn" onClick={() => void onEnable()} disabled={busy}>
          {busy ? "…" : "Enable"}
        </button>
        <button type="button" className="vm-notify-enable-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
