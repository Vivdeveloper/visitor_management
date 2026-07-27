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
import { HostAlertBanner } from "@/components/alerts/HostAlertBanner";
import { PendingApprovalSheet } from "@/components/visitors/PendingApprovalSheet";
import {
  type ActiveHostAlert,
  type HostAlertPayload,
  fireHostAlertFeedback,
  primeHostAlertAudio,
  pushHostAlertNotification,
  startHostAlertReminders,
  stopAllHostAlertReminders,
  stopHostAlertReminders,
} from "@/services/hostAlertManager";
import { getVmsSocket } from "@/services/vmsSocket";
import { requestNotificationPermission } from "@/native/services/notifications";

type HostAlertContextValue = {
  activeAlert: ActiveHostAlert | null;
  clearAlert: (visitorEntry: string) => void;
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
  const [alerts, setAlerts] = useState<Record<string, ActiveHostAlert>>({});
  const [sheetVisitor, setSheetVisitor] = useState<VisitorListRow | null>(null);

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

    void requestNotificationPermission();
    void fireHostAlertFeedback();
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
    if (!user?.user) return;

    void requestNotificationPermission();
    getVmsSocket();

    const primeFeedback = () => {
      primeHostAlertAudio();
    };
    document.addEventListener("pointerdown", primeFeedback, { once: true });
    document.addEventListener("keydown", primeFeedback, { once: true });

    return () => {
      document.removeEventListener("pointerdown", primeFeedback);
      document.removeEventListener("keydown", primeFeedback);
    };
  }, [user?.user]);

  useEffect(() => {
    return () => {
      stopAllHostAlertReminders();
    };
  }, []);

  const handleReview = useCallback(() => {
    if (!activeAlert) return;
    setSheetVisitor(toVisitorRow(activeAlert));
  }, [activeAlert]);

  const value = useMemo<HostAlertContextValue>(
    () => ({
      activeAlert,
      clearAlert,
    }),
    [activeAlert, clearAlert],
  );

  return (
    <HostAlertContext.Provider value={value}>
      {children}
      {activeAlert && !sheetVisitor ? (
        <HostAlertBanner alert={activeAlert} onReview={handleReview} />
      ) : null}
      {sheetVisitor ? (
        <PendingApprovalSheet
          visitor={sheetVisitor}
          open
          onClose={() => setSheetVisitor(null)}
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
