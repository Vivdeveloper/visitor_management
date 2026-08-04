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
  needsBackgroundPushSetup,
  shouldShowNotificationPermissionModal,
} from "@/components/alerts/NotificationPermissionModal";
import { visitorApi, type AuthProfile } from "@/api/vms";
import { canApproveReject, resolveMode, visitorScopeFilters } from "@/lib/roles";
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
import { connectVmsSocket, getVmsSocket } from "@/services/vmsSocket";
import {
  initWebHostNotifications,
  notificationPermissionState,
  requestNotificationPermission,
} from "@/native/services/notifications";

type HostAlertContextValue = {
  activeAlert: ActiveHostAlert | null;
  clearAlert: (visitorEntry: string) => void;
  goToPendingApprovals: () => void;
  openPermissionSetup: () => void;
};

const HostAlertContext = createContext<HostAlertContextValue | null>(null);

const HOST_ALERT_EVENTS = new Set(["host_notified", "created", "transferred"]);

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
  const [notifyPerm, setNotifyPerm] = useState(notificationPermissionState());
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const catchUpUserRef = useRef<string | null>(null);
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  const activeAlert = useMemo(() => {
    const list = Object.values(alerts);
    if (!list.length) return null;
    return list.sort((a, b) => b.receivedAt - a.receivedAt)[0] ?? null;
  }, [alerts]);

  const clearAlert = useCallback((visitorEntry: string) => {
    stopHostAlertReminders(visitorEntry);
    setAlerts((prev) => {
      if (!prev[visitorEntry]) return prev;
      const next = { ...prev };
      delete next[visitorEntry];
      if (!Object.keys(next).length) stopHostAlertRing();
      return next;
    });
  }, []);

  const goToPendingApprovals = useCallback(() => {
    stopHostAlertRing();
    setAlerts({});
    navigate("/approvals");
  }, [navigate]);

  const registerAlert = useCallback((payload: HostAlertPayload) => {
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

    setAlerts((prev) => ({ ...prev, [visitorEntry]: alert }));

    void requestNotificationPermission().then(() => setNotifyPerm(notificationPermissionState()));
    startHostAlertRing();
    void pushHostAlertNotification(visitorEntry, "Visitor waiting at gate", message, 0);

    startHostAlertReminders(alert, (next) => {
      setAlerts((prev) => {
        if (!prev[visitorEntry]) return prev;
        return { ...prev, [visitorEntry]: next };
      });
    });
  }, []);

  const registerSecurityAlert = useCallback((payload: HostAlertPayload) => {
    const visitorEntry = payload.visitor_entry;
    if (!visitorEntry) return;

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

    setAlerts((prev) => ({ ...prev, [visitorEntry]: alert }));

    void requestNotificationPermission().then(() => setNotifyPerm(notificationPermissionState()));
    startHostAlertRing();
    void pushHostAlertNotification(visitorEntry, "Visitor ready for checkout", message, 0);

    startHostAlertReminders(alert, (next) => {
      setAlerts((prev) => {
        if (!prev[visitorEntry]) return prev;
        return { ...prev, [visitorEntry]: next };
      });
    });
  }, []);

  const tryHostAlertFromPayload = useCallback(
    (payload: HostAlertPayload | null | undefined) => {
      if (!receivesHostAlerts || !payload) return;
      if (!payloadTargetsCurrentHost(payload, user)) return;
      const event = payload.event || "";
      const isHostRing =
        HOST_ALERT_EVENTS.has(event) ||
        payload.alert_variant === "host" ||
        !event; /* dedicated vms_host_alert channel */
      if (!isHostRing) return;
      registerAlert(payload);
    },
    [receivesHostAlerts, registerAlert, user],
  );

  const catchUpPendingHostAlert = useCallback(
    async (force = false) => {
      const uid = user?.user;
      if (!uid || !receivesHostAlerts) return;
      if (!force && catchUpUserRef.current === uid && Object.keys(alertsRef.current).length) {
        return;
      }
      catchUpUserRef.current = uid;

      try {
        const list = await visitorApi.listDetailed(50, visitorScopeFilters(user));
        const ids = currentUserIds(user);
        const pending = list.filter((row) => {
          const statusOk = row.status === "Pending Approval" || row.status === "Pending";
          if (!statusOk) return false;
          // Only ring the assigned host (person_to_meet), never the whole gate desk.
          const meet = (row.person_to_meet || "").trim().toLowerCase();
          return Boolean(meet && ids.includes(meet));
        });
        const newest = pending[0];
        if (!newest?.name) return;
        if (alertsRef.current[newest.name]) return;
        registerAlert({
          visitor_entry: newest.name,
          visitor_name: newest.full_name || newest.name,
          host: newest.person_to_meet_name || newest.person_to_meet,
          host_user: uid,
          message: `${newest.full_name || "Visitor"} is waiting for your approval at the gate.`,
          event: "host_notified",
          alert_variant: "host",
        });
      } catch {
        /* ignore catch-up failures */
      }
    },
    [receivesHostAlerts, registerAlert, user],
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
    "vms_visitor_update",
    (payload) => {
      if (!receivesHostAlerts) return;
      if (payload?.event && !HOST_ALERT_EVENTS.has(payload.event)) return;
      tryHostAlertFromPayload(payload);
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

  useVmsRealtimeEvent<HostAlertPayload>(
    "vms_visitor_update",
    (payload) => {
      if (mode !== "security") return;
      // Only the dedicated security channel / checkout event — not host "meeting_done" copy.
      if (payload?.event !== "security_checkout_required") return;
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
      // Previous host dismisses; new host is rung by the HOST_ALERT_EVENTS listener.
      if (event === "transferred" && !payloadTargetsCurrentHost(payload, user)) {
        clearAlert(visitorEntry);
      }
    },
    Boolean(user?.user),
  );

  /** If host missed the realtime ring (offline), show Allow popup for pending entries on login. */
  useEffect(() => {
    if (!user?.user) {
      catchUpUserRef.current = null;
      return;
    }
    if (!receivesHostAlerts) return;

    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await catchUpPendingHostAlert(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.user, receivesHostAlerts, catchUpPendingHostAlert]);

  useEffect(() => {
    if (!user?.user) {
      setPermissionModalOpen(false);
      return;
    }

    void initWebHostNotifications();
    connectVmsSocket();

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (!(mode === "host" || mode === "security" || canApproveReject(user))) {
          if (!cancelled) setPermissionModalOpen(false);
          return;
        }

        const needsPush = await needsBackgroundPushSetup();
        const needsPermission =
          notifyPerm !== "granted" &&
          notifyPerm !== "unsupported" &&
          shouldShowNotificationPermissionModal();

        if (!cancelled) {
          setPermissionModalOpen(needsPush || needsPermission);
        }
      })();
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, mode, notifyPerm]);

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
        void catchUpPendingHostAlert(false);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const sock = getVmsSocket();
    const onConnect = () => {
      void catchUpPendingHostAlert(false);
    };
    sock?.on("connect", onConnect);

    return () => {
      document.removeEventListener("pointerdown", primeFeedback);
      document.removeEventListener("keydown", primeFeedback);
      document.removeEventListener("visibilitychange", onVisible);
      sock?.off("connect", onConnect);
    };
  }, [user?.user, catchUpPendingHostAlert]);

  useEffect(() => {
    return () => {
      stopAllHostAlertReminders();
    };
  }, []);

  const handleReview = useCallback(() => {
    stopHostAlertRing();
    stopAllHostAlertReminders();
    setAlerts({});
    navigate("/approvals");
  }, [navigate]);

  const openPermissionSetup = useCallback(() => {
    sessionStorage.removeItem("vms_notify_modal_skip");
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
          setNotifyPerm(notificationPermissionState());
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
