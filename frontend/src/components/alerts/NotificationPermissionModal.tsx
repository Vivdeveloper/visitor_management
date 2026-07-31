import { useState } from "react";
import { enableHostAlertPermissions } from "@/services/hostAlertManager";
import { notificationPermissionState } from "@/native/services/notifications";

const SKIP_SESSION_KEY = "vms_notify_modal_skip";

type Props = {
  open: boolean;
  onClose: () => void;
  onEnabled: () => void;
};

export function NotificationPermissionModal({ open, onClose, onEnabled }: Props) {
  const [busy, setBusy] = useState(false);
  const denied = notificationPermissionState() === "denied";

  if (!open) return null;

  async function onAllow() {
    setBusy(true);
    try {
      const result = await enableHostAlertPermissions();
      if (result.notifications) {
        sessionStorage.removeItem(SKIP_SESSION_KEY);
        onEnabled();
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  function onSkip() {
    sessionStorage.setItem(SKIP_SESSION_KEY, "1");
    onClose();
  }

  return (
    <div className="vm-notify-perm-modal" role="dialog" aria-modal="true" aria-labelledby="vm-notify-perm-title">
      <div className="vm-notify-perm-backdrop" aria-hidden />
      <div className="vm-notify-perm-card">
        <div className="vm-notify-perm-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        <h2 id="vm-notify-perm-title" className="vm-notify-perm-title">
          Allow notifications &amp; sound
        </h2>
        <p className="vm-notify-perm-body">
          {denied
            ? "Notifications are blocked. Open your phone Settings → GatePass → Notifications and turn them on for visitor ring alerts."
            : "GatePass needs notification and sound access so you hear visitor approval alerts instantly — like MyGate or NoBroker."}
        </p>

        <ul className="vm-notify-perm-list">
          <li>Ring + vibration for pending visitors</li>
          <li>Alerts even when the app is in background</li>
          <li>Sound enabled after you tap Allow</li>
        </ul>

        <div className="vm-notify-perm-actions">
          {!denied ? (
            <button type="button" className="vm-notify-perm-allow" onClick={() => void onAllow()} disabled={busy}>
              {busy ? "Please wait…" : "Allow notifications & sound"}
            </button>
          ) : null}
          <button type="button" className="vm-notify-perm-skip" onClick={onSkip}>
            {denied ? "Continue without alerts" : "Not now"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function shouldShowNotificationPermissionModal(): boolean {
  if (sessionStorage.getItem(SKIP_SESSION_KEY) === "1") return false;
  const state = notificationPermissionState();
  return state === "default" || state === "denied";
}
