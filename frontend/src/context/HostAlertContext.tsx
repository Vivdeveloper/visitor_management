import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useVmsRealtimeEvent } from "@/hooks/useVmsRealtime";
import { HostAlertRingModal } from "@/components/alerts/HostAlertRingModal";
import {
  NotificationPermissionModal,
  clearNotificationPermissionSkip,
  needsBackgroundPushSetup,
  shouldShowNotificationPermissionModal,
} from "@/components/alerts/NotificationPermissionModal";
import { type AuthProfile } from "@/api/vms";
import { canApproveReject, resolveMode } from "@/lib/roles";
import {
  type ActiveHostAlert,
  type HostAlertPayload,
  primeHostAlertAudio,
  pushHostAlertNotification,
  startHostAlertReminders,
  startHostAlertRing,
  stopAllHostAlertReminders,
  stopHostAlertReminders,
  stopHostAlertRing,
} from "@/services/hostAlertManager";
import { connectVmsSocket } from "@/services/vmsSocket";
import {
  initWebHostNotifications,
  requestNotificationPermission,
} from "@/native/services/notifications";

type HostAlertContextValue = {
  activeAlert: ActiveHostAlert | null;
  clearAlert: (visitorEntry: string) => void;
  goToPendingApprovals: () => void;
  openPermissionSetup: () => void;
};

const HostAlertContext = createContext<HostAlertContextValue | null>(null);

function currentUserIds(user: AuthProfile | null): string[] {
  if (!user) return [];
  const ids = [user.user, user.email]
    .map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""))
    .filter(Boolean);
  return [...new Set(ids)];
}

/** True when this login should receive the host ring for a pending visitor. */
function isHostAlertRecipient(user: AuthProfile | null): boolean {
  if (!user?.authenticated) return false;
  const mode = resolveMode(user);
  if (mode === "visitor" || mode === "guest") return false;
  // Assigned hosts (write/read) always; also gate users who can approve.
  return mode === "host" || canApproveReject(user) || mode === "security";
}

function payloadTargetsCurrentHost(payload: HostAlertPayload, user: AuthProfile | null): boolean {
  const ids = currentUserIds(user);
  if (!ids.length) return false;
  const hostUser = (payload.host_user || "").trim().toLowerCase();
  // Targeted alert: only the assigned host.
  if (hostUser) return ids.includes(hostUser);
  // Untargeted broadcast (legacy) — show to host-mode users only.
  return resolveMode(user) === "host" || canApproveReject(user);
}

export function HostAlertProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mode = resolveMode(user);
  const receivesHostAlerts = isHostAlertRecipient(user);
  const [alerts, setAlerts] = useState<Record<string, ActiveHostAlert>>({});
  /** Entries the host dismissed via Review — reminders still fire every 5 min until approve/reject. */
  const [suppressedEntries, setSuppressedEntries] = useState<Record<string, true>>({});
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  /** Avoid double-register when both vms_security_alert and vms_visitor_update arrive. */
  const securityAlertCooldownRef = useRef<Record<string, number>>({});

  const activeAlert = useMemo(() => {
    const list = Object.values(alerts).filter((a) => !suppressedEntries[a.visitorEntry]);
    if (!list.length) return null;
    return list.sort((a, b) => b.receivedAt - a.receivedAt)[0] ?? null;
  }, [alerts, suppressedEntries]);

  const clearAlert = useCallback((visitorEntry: string) => {
    stopHostAlertReminders(visitorEntry);
    setSuppressedEntries((prev) => {
      if (!prev[visitorEntry]) return prev;
      const next = { ...prev };
      delete next[visitorEntry];
      return next;
    });
    setAlerts((prev) => {
      if (!prev[visitorEntry]) return prev;
      const next = { ...prev };
      delete next[visitorEntry];
      if (!Object.keys(next).length) stopHostAlertRing();
      return next;
    });
  }, []);

  const snoozeAlertModal = useCallback((visitorEntry?: string) => {
    stopHostAlertRing();
    if (!visitorEntry) return;
    setSuppressedEntries((prev) => ({ ...prev, [visitorEntry]: true }));
  }, []);

  const goToPendingApprovals = useCallback(() => {
    const current = Object.values(alerts).sort((a, b) => b.receivedAt - a.receivedAt)[0];
    snoozeAlertModal(current?.visitorEntry);
    navigate(current?.variant === "security" ? "/inside" : "/approvals");
  }, [alerts, navigate, snoozeAlertModal]);

  const onReminderTick = useCallback((next: ActiveHostAlert) => {
    const visitorEntry = next.visitorEntry;
    setAlerts((prev) => {
      if (!prev[visitorEntry]) return prev;
      return { ...prev, [visitorEntry]: next };
    });
    // Re-open the ring modal every 5 minutes until the visit is accepted/rejected.
    setSuppressedEntries((prev) => {
      if (!prev[visitorEntry]) return prev;
      const cleared = { ...prev };
      delete cleared[visitorEntry];
      return cleared;
    });
    startHostAlertRing();
  }, []);

  const registerAlert = useCallback(
    (payload: HostAlertPayload) => {
      const visitorEntry = payload.visitor_entry;
      if (!visitorEntry) return;

      const visitorName = payload.visitor_name || visitorEntry;
      const message = payload.message || `${visitorName} is waiting for your approval at the gate.`;
      const hostName = payload.host || "Host";

      const alert: ActiveHostAlert = {
        visitorEntry,
        visitorName,
        message,
        hostName,
        receivedAt: Date.now(),
        reminderCount: 0,
        variant: "host",
      };

      setSuppressedEntries((prev) => {
        if (!prev[visitorEntry]) return prev;
        const next = { ...prev };
        delete next[visitorEntry];
        return next;
      });
      setAlerts((prev) => ({ ...prev, [visitorEntry]: alert }));

      void requestNotificationPermission();
      startHostAlertRing();
      void pushHostAlertNotification(visitorEntry, "Visitor waiting at gate", message, 0);

      startHostAlertReminders(alert, onReminderTick);
    },
    [onReminderTick],
  );

  const registerSecurityAlert = useCallback(
    (payload: HostAlertPayload) => {
      const visitorEntry = payload.visitor_entry;
      if (!visitorEntry) return;

      const now = Date.now();
      const lastAt = securityAlertCooldownRef.current[visitorEntry] || 0;
      if (now - lastAt < 2500) return;
      securityAlertCooldownRef.current[visitorEntry] = now;

      const visitorName = payload.visitor_name || visitorEntry;
      const message =
        payload.message || `${visitorName} has completed the meeting. Proceed with gate checkout.`;
      const hostName = payload.host || "Host";

      const alert: ActiveHostAlert = {
        visitorEntry,
        visitorName,
        message,
        hostName,
        receivedAt: Date.now(),
        reminderCount: 0,
        variant: "security",
      };

      setSuppressedEntries((prev) => {
        if (!prev[visitorEntry]) return prev;
        const next = { ...prev };
        delete next[visitorEntry];
        return next;
      });
      setAlerts((prev) => ({ ...prev, [visitorEntry]: alert }));

      void requestNotificationPermission();
      startHostAlertRing();
      void pushHostAlertNotification(visitorEntry, "Visitor ready for checkout", message, 0);

      startHostAlertReminders(alert, onReminderTick);
    },
    [onReminderTick],
  );

  useVmsRealtimeEvent<HostAlertPayload>(
    "vms_host_alert",
    (payload) => {
      if (!receivesHostAlerts || !payload) return;
      if (!payloadTargetsCurrentHost(payload, user)) return;
      registerAlert(payload);
    },
    Boolean(user?.user) && receivesHostAlerts,
  );

  useVmsRealtimeEvent<HostAlertPayload>(
    "vms_security_alert",
    (payload) => {
      if (mode !== "security") return;
      registerSecurityAlert(payload);
    },
    Boolean(user?.user) && mode === "security",
  );

  // Fallback when only the generic update channel arrives (older publishers).
  useVmsRealtimeEvent<HostAlertPayload>(
    "vms_visitor_update",
    (payload) => {
      if (mode !== "security") return;
      if (payload?.event !== "security_checkout_required") return;
      // Prefer vms_security_alert; skip if that path already registered this visit recently.
      registerSecurityAlert(payload);
    },
    Boolean(user?.user) && mode === "security",
  );

  useVmsRealtimeEvent<HostAlertPayload>(
    "vms_visitor_update",
    (payload) => {
      const visitorEntry = payload?.visitor_entry;
      const event = payload?.event;
      if (!visitorEntry) return;
      if (event === "approved" || event === "rejected" || event === "checked_in" || event === "checked_out") {
        clearAlert(visitorEntry);
        return;
      }
      if (event === "transferred" && !payloadTargetsCurrentHost(payload, user)) {
        clearAlert(visitorEntry);
      }
    },
    Boolean(user?.user),
  );

  useEffect(() => {
    if (!user?.user) {
      setPermissionModalOpen(false);
      return;
    }

    connectVmsSocket();

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        // Refresh push subscription first when already allowed — do not race the modal check.
        await initWebHostNotifications();

        if (!(mode === "host" || mode === "security" || canApproveReject(user))) {
          if (!cancelled) setPermissionModalOpen(false);
          return;
        }

        const needsPush = await needsBackgroundPushSetup();
        const needsPermission = shouldShowNotificationPermissionModal();

        if (!cancelled) {
          setPermissionModalOpen(needsPush || needsPermission);
        }
      })();
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, mode]);

  useEffect(() => {
    if (!user?.user) return;

    const primeFeedback = () => {
      primeHostAlertAudio();
    };
    document.addEventListener("pointerdown", primeFeedback, { once: true });
    document.addEventListener("keydown", primeFeedback, { once: true });

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        connectVmsSocket();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("pointerdown", primeFeedback);
      document.removeEventListener("keydown", primeFeedback);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user?.user]);

  useEffect(() => {
    return () => {
      stopAllHostAlertReminders();
    };
  }, []);

  const handleReview = useCallback(() => {
    const current = Object.values(alerts).sort((a, b) => b.receivedAt - a.receivedAt)[0];
    snoozeAlertModal(current?.visitorEntry);
    navigate(current?.variant === "security" ? "/inside" : "/approvals");
  }, [alerts, navigate, snoozeAlertModal]);

  const openPermissionSetup = useCallback(() => {
    clearNotificationPermissionSkip();
    setPermissionModalOpen(true);
  }, []);

  const showPermissionModal =
    permissionModalOpen && (mode === "host" || mode === "security") && Boolean(user?.user);

  const value = useMemo<HostAlertContextValue>(
    () => ({
      activeAlert,
      clearAlert,
      goToPendingApprovals,
      openPermissionSetup,
    }),
    [activeAlert, clearAlert, goToPendingApprovals, openPermissionSetup],
  );

  return (
    <HostAlertContext.Provider value={value}>
      <NotificationPermissionModal
        open={showPermissionModal}
        onClose={() => setPermissionModalOpen(false)}
        onEnabled={() => {
          window.dispatchEvent(new CustomEvent("vms-alerts-setup"));
        }}
      />
      {children}
      {activeAlert ? <HostAlertRingModal alert={activeAlert} onReview={handleReview} /> : null}
    </HostAlertContext.Provider>
  );
}

export function useHostAlerts(): HostAlertContextValue {
  const ctx = useContext(HostAlertContext);
  if (!ctx) {
    throw new Error("useHostAlerts must be used within HostAlertProvider");
  }
  return ctx;
}
