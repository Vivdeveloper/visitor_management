import { useState } from "react";
import { enableHostAlertPermissions } from "@/services/hostAlertManager";
import { isNativePlatform } from "@/native/platform";
import { notificationPermissionState } from "@/native/services/notifications";
import { getWebPushStatus } from "@/services/webPush";

const SKIP_SESSION_KEY = "vms_notify_modal_skip";
const SKIP_LOCAL_KEY = "vms_notify_modal_skip_until";
const SETUP_DONE_KEY = "vms_notify_setup_done";
/** How long "Not now" hides the prompt across refreshes. */
const SKIP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Props = {
  open: boolean;
  onClose: () => void;
  onEnabled: () => void;
};

function isSkipActive(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(SKIP_SESSION_KEY) === "1") return true;

  if (localStorage.getItem(SETUP_DONE_KEY) === "1") {
    const state = notificationPermissionState();
    // Still allowed — never re-prompt.
    if (state === "granted") return true;
    // User revoked permission — allow the prompt again when browser resets to default.
    if (state === "default") {
      localStorage.removeItem(SETUP_DONE_KEY);
    } else {
      return true;
    }
  }

  const untilRaw = localStorage.getItem(SKIP_LOCAL_KEY);
  if (!untilRaw) return false;
  const until = Number(untilRaw);
  if (!Number.isFinite(until) || Date.now() >= until) {
    localStorage.removeItem(SKIP_LOCAL_KEY);
    return false;
  }
  return true;
}

function markSetupDone(): void {
  localStorage.setItem(SETUP_DONE_KEY, "1");
  localStorage.removeItem(SKIP_LOCAL_KEY);
  sessionStorage.removeItem(SKIP_SESSION_KEY);
}

function markSkipped(): void {
  sessionStorage.setItem(SKIP_SESSION_KEY, "1");
  localStorage.setItem(SKIP_LOCAL_KEY, String(Date.now() + SKIP_TTL_MS));
}

/** Clear skip flags when the user opens setup from Profile. */
export function clearNotificationPermissionSkip(): void {
  sessionStorage.removeItem(SKIP_SESSION_KEY);
  localStorage.removeItem(SKIP_LOCAL_KEY);
  localStorage.removeItem(SETUP_DONE_KEY);
}

export function NotificationPermissionModal({ open, onClose, onEnabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const denied = notificationPermissionState() === "denied";

  if (!open) return null;

  async function onAllow() {
    setBusy(true);
    setError(null);
    try {
      const result = await enableHostAlertPermissions();
      if (!result.notifications) {
        setError("Notification permission was not granted.");
        return;
      }
      /* Web PWA: background alerts need a saved Web Push subscription. */
      if (!isNativePlatform() && !result.webPush) {
        const status = await getWebPushStatus();
        if (!status.secureContext) {
          setError("Background alerts need HTTPS. Open GatePass over https:// (or localhost).");
          return;
        }
        setError("Could not enable background push. Check connection and try again.");
        return;
      }
      markSetupDone();
      onEnabled();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  function onSkip() {
    markSkipped();
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
          Allow background notifications
        </h2>
        <p className="vm-notify-perm-body">
          {denied
            ? "Notifications are blocked. Open your phone Settings → GatePass → Notifications and turn them on for visitor ring alerts."
            : "Enable notifications so you get visitor alerts even when GatePass is closed or in the background."}
        </p>

        <ul className="vm-notify-perm-list">
          <li>System notification when a visitor is waiting</li>
          <li>Works with the app closed (background)</li>
          <li>Ring + vibration when the app is open</li>
        </ul>

        {error ? <p className="vm-notify-perm-error">{error}</p> : null}

        <div className="vm-notify-perm-actions">
          {!denied ? (
            <button type="button" className="vm-notify-perm-allow" onClick={() => void onAllow()} disabled={busy}>
              {busy ? "Please wait…" : "Enable background alerts"}
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
  if (isSkipActive()) return false;
  const state = notificationPermissionState();
  // Already granted in the browser — do not prompt again.
  if (state === "granted" || state === "unsupported") return false;
  return state === "default" || state === "denied";
}

/**
 * True only when the host still needs to grant notification permission.
 * If permission is already granted, Web Push is (re)subscribed silently —
 * never reopen this modal on every refresh.
 */
export async function needsBackgroundPushSetup(): Promise<boolean> {
  if (isSkipActive()) return false;
  if (isNativePlatform()) return false;
  const state = notificationPermissionState();
  // Already allowed — Web Push is (re)subscribed silently in initWebHostNotifications.
  if (state === "granted" || state === "unsupported") return false;
  return state === "default" || state === "denied";
}
