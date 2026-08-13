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
  // Targeted alert: only the assigned host login.
  if (hostUser) return ids.includes(hostUser);
  // Untargeted broadcast (legacy) — show to host-mode users only.
  return resolveMode(user) === "host" || canApproveReject(user);
}

function payloadTargetsCurrentCreator(payload: HostAlertPayload, user: AuthProfile | null): boolean {
  const ids = currentUserIds(user);
  if (!ids.length) return false;
  const owner = (payload.owner || "").trim().toLowerCase();
  if (owner) return ids.includes(owner);
  return false;
}

/** Urgent host ring — prefer explicit ring_for from server. */
function isUrgentHostRingEvent(payload: HostAlertPayload): boolean {
  if (payload.ring_for === "host") return true;
  if (payload.ring_for === "creator") return false;
  const event = payload.event || "";
  return event === "host_notified";
}

/** Urgent creator ring — prefer explicit ring_for from server. */
function isUrgentCreatorRingEvent(payload: HostAlertPayload): boolean {
  if (payload.ring_for === "creator") return true;
  if (payload.ring_for === "host") return false;
  const event = payload.event || "";
  return event === "creator_alert";
}

function creatorAlertTitle(payload: HostAlertPayload): string {
  const event = payload.lifecycle_event || payload.event || "";
  switch (event) {
    case "approved":
      return "Visitor approved";
    case "rejected":
      return "Visitor rejected";
    case "meeting_done":
      return "Meeting completed";
    case "creator_alert": {
      if (payload.status === "Approved") return "Visitor approved";
      if (payload.status === "Rejected") return "Visitor rejected";
      if (payload.status === "Meeting Done") return "Meeting completed";
      return "Visitor update";
    }
    default:
      if (payload.status === "Approved") return "Visitor approved";
      if (payload.status === "Rejected") return "Visitor rejected";
      if (payload.status === "Meeting Done") return "Meeting completed";
      return "Visitor update";
  }
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
  /** Avoid double-register when both dedicated alert channel and visitor_update arrive. */
  const securityAlertCooldownRef = useRef<Record<string, number>>({});
  const ringAlertCooldownRef = useRef<Record<string, number>>({});

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
    if (current?.variant === "security" || current?.variant === "creator") {
      navigate("/inside");
      return;
    }
    navigate("/approvals");
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

  const withinRingCooldown = useCallback((key: string): boolean => {
    const now = Date.now();
    const lastAt = ringAlertCooldownRef.current[key] || 0;
    if (now - lastAt < 2500) return true;
    ringAlertCooldownRef.current[key] = now;
    return false;
  }, []);

  const registerAlert = useCallback(
    (payload: HostAlertPayload) => {
      const visitorEntry = payload.visitor_entry;
      if (!visitorEntry) return;
      if (withinRingCooldown(`host:${visitorEntry}`)) return;

      const visitorName = payload.visitor_name || visitorEntry;
      const message = payload.message || `${visitorName} is waiting for your approval at the gate.`;
      const hostName = payload.host || "Host";
      const isCheckedIn =
        payload.lifecycle_event === "checked_in" ||
        payload.event === "checked_in" ||
        payload.status === "Checked In";
      const isCancelled =
        payload.lifecycle_event === "cancelled" ||
        payload.event === "cancelled" ||
        payload.status === "Cancelled";
      const title = isCancelled
        ? "Visit cancelled"
        : isCheckedIn
          ? "Visitor checked in"
          : "Visitor waiting at gate";

      const alert: ActiveHostAlert = {
        visitorEntry,
        visitorName,
        message,
        hostName,
        receivedAt: Date.now(),
        reminderCount: 0,
        variant: "host",
        title,
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
      void pushHostAlertNotification(visitorEntry, title, message, 0);

      startHostAlertReminders(alert, onReminderTick);
    },
    [onReminderTick, withinRingCooldown],
  );

  const registerCreatorAlert = useCallback(
    (payload: HostAlertPayload) => {
      const visitorEntry = payload.visitor_entry;
      if (!visitorEntry) return;
      if (withinRingCooldown(`creator:${visitorEntry}`)) return;

      const visitorName = payload.visitor_name || visitorEntry;
      const title = creatorAlertTitle(payload);
      const message = payload.message || `${visitorName}: ${title}`;
      const hostName = payload.host || "Host";

      const alert: ActiveHostAlert = {
        visitorEntry,
        visitorName,
        message,
        hostName,
        receivedAt: Date.now(),
        reminderCount: 0,
        variant: "creator",
        title,
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
      void pushHostAlertNotification(visitorEntry, title, message, 0);

      startHostAlertReminders(alert, onReminderTick);
    },
    [onReminderTick, withinRingCooldown],
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
        title: "Visitor ready for checkout",
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
    "vms_creator_alert",
    (payload) => {
      if (!user?.authenticated || !payload) return;
      if (!payloadTargetsCurrentCreator(payload, user)) return;
      registerCreatorAlert(payload);
    },
    Boolean(user?.user),
  );

  useVmsRealtimeEvent<HostAlertPayload>(
    "vms_security_alert",
    (payload) => {
      if (mode !== "security") return;
      registerSecurityAlert(payload);
    },
    Boolean(user?.user) && mode === "security",
  );

  // Fallback: site-wide visitor_update carries ring_for when user-room alerts are missed.
  useVmsRealtimeEvent<HostAlertPayload>(
    "vms_visitor_update",
    (payload) => {
      if (!payload || !user?.authenticated) return;

      if (mode === "security" && payload.event === "security_checkout_required") {
        registerSecurityAlert(payload);
      }

      if (isUrgentHostRingEvent(payload) && receivesHostAlerts && payloadTargetsCurrentHost(payload, user)) {
        registerAlert(payload);
      }

      if (isUrgentCreatorRingEvent(payload) && payloadTargetsCurrentCreator(payload, user)) {
        registerCreatorAlert(payload);
      }

      const visitorEntry = payload.visitor_entry;
      const event = payload.event;
      if (!visitorEntry || !event) return;

      // Clear previous ring when status moves past that recipient's job —
      // but never wipe a creator urgent ring that was just registered from this payload.
      if (event === "approved" || event === "rejected" || event === "meeting_done") {
        if (isUrgentCreatorRingEvent(payload) && payloadTargetsCurrentCreator(payload, user)) {
          return;
        }
        clearAlert(visitorEntry);
        return;
      }
      if (event === "checked_out") {
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
    if (current?.variant === "security") {
      navigate("/inside");
      return;
    }
    if (current?.variant === "creator") {
      const title = (current.title || "").toLowerCase();
      navigate(title.includes("reject") ? "/inside?status=rejected" : "/inside");
      return;
    }
    navigate("/approvals");
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
