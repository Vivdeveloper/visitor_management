import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { VisitorListRow } from "@/api/vms";
import { useAuth } from "@/context/AuthContext";
import { useVmsRealtimeEvent } from "@/hooks/useVmsRealtime";
import { HostAlertRingModal } from "@/components/alerts/HostAlertRingModal";
import {
  NotificationPermissionModal,
  shouldShowNotificationPermissionModal,
} from "@/components/alerts/NotificationPermissionModal";
import { PendingApprovalSheet } from "@/components/visitors/PendingApprovalSheet";
import { resolveMode } from "@/lib/roles";
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
  openPermissionSetup: () => void;
};

const HostAlertContext = createContext<HostAlertContextValue | null>(null);

function toVisitorRow(alert: ActiveHostAlert): VisitorListRow {
  return {
    name: alert.visitorEntry,
    full_name: alert.visitorName,
    status: "Pending Approval",
  };
}

export function HostAlertProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mode = resolveMode(user);
  const [alerts, setAlerts] = useState<Record<string, ActiveHostAlert>>({});
  const [sheetVisitor, setSheetVisitor] = useState<VisitorListRow | null>(null);
  const [notifyPerm, setNotifyPerm] = useState(notificationPermissionState());
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);

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

  useVmsRealtimeEvent<HostAlertPayload>(
    "vms_host_alert",
    (payload) => {
      const currentUser = user?.user;
      if (!currentUser) return;
      if (payload?.host_user && payload.host_user !== currentUser) return;
      registerAlert(payload);
    },
    Boolean(user?.user),
  );

  useVmsRealtimeEvent<HostAlertPayload>(
    "vms_visitor_update",
    (payload) => {
      if (payload?.event !== "host_notified") return;
      const currentUser = user?.user;
      if (!currentUser) return;
      if (payload?.host_user && payload.host_user !== currentUser) return;
      registerAlert(payload);
    },
    Boolean(user?.user),
  );

  useVmsRealtimeEvent<{ visitor_entry?: string; event?: string }>(
    "vms_visitor_update",
    (payload) => {
      const visitorEntry = payload?.visitor_entry;
      const event = payload?.event;
      if (!visitorEntry) return;
      if (event === "approved" || event === "rejected" || event === "transferred" || event === "checked_in") {
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

    void initWebHostNotifications();
    connectVmsSocket();

    const needsPermission =
      (mode === "host" || mode === "security") &&
      notifyPerm !== "granted" &&
      notifyPerm !== "unsupported" &&
      shouldShowNotificationPermissionModal();

    if (needsPermission) {
      const timer = window.setTimeout(() => setPermissionModalOpen(true), 600);
      return () => window.clearTimeout(timer);
    }

    setPermissionModalOpen(false);
  }, [user?.user, mode, notifyPerm]);

  useEffect(() => {
    if (!user?.user) return;

    const primeFeedback = () => {
      primeHostAlertAudio();
    };
    document.addEventListener("pointerdown", primeFeedback, { once: true });
    document.addEventListener("keydown", primeFeedback, { once: true });

    const onVisible = () => {
      if (document.visibilityState === "visible") connectVmsSocket();
    };
    document.addEventListener("visibilitychange", onVisible);

    const sock = getVmsSocket();
    const onConnect = () => {
      /* socket ready for host alerts */
    };
    sock?.on("connect", onConnect);

    return () => {
      document.removeEventListener("pointerdown", primeFeedback);
      document.removeEventListener("keydown", primeFeedback);
      document.removeEventListener("visibilitychange", onVisible);
      sock?.off("connect", onConnect);
    };
  }, [user?.user]);

  useEffect(() => {
    return () => {
      stopAllHostAlertReminders();
    };
  }, []);

  const handleReview = useCallback(() => {
    if (!activeAlert) return;
    stopHostAlertRing();
    setSheetVisitor(toVisitorRow(activeAlert));
  }, [activeAlert]);

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
      openPermissionSetup,
    }),
    [activeAlert, clearAlert, openPermissionSetup],
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
      {activeAlert && !sheetVisitor ? (
        <HostAlertRingModal alert={activeAlert} onReview={handleReview} />
      ) : null}
      {sheetVisitor ? (
        <PendingApprovalSheet
          visitor={sheetVisitor}
          open
          onClose={() => {
            setSheetVisitor(null);
          }}
          onDone={() => {
            clearAlert(sheetVisitor.name);
            setSheetVisitor(null);
          }}
          onViewDetails={() => {
            const name = sheetVisitor.name;
            setSheetVisitor(null);
            navigate(`/visitor/${encodeURIComponent(name)}`);
          }}
        />
      ) : null}
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
