import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  notificationApi,
  visitorApi,
  type InAppNotification,
  type VisitorListRow,
} from "@/api/vms";
import { VisitorAvatar } from "@/components/ui/VisitorAvatar";
import { usePageChrome } from "@/context/PageChromeContext";
import { useAuth } from "@/context/AuthContext";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { formatTime } from "@/lib/format";
import { getCurrentStageTimestamp } from "@/lib/visitStages";
import { userHostScopeFilters, resolveMode } from "@/lib/roles";

function isPendingStatus(status?: string): boolean {
  return status === "Pending Approval" || status === "Pending";
}

function alertRoute(item: InAppNotification, mode: ReturnType<typeof resolveMode>): string {
  if (item.document_type === "Visitor Entry" && item.document_name) {
    const subject = (item.subject || "").toLowerCase();
    const body = (item.email_content || "").toLowerCase();
    if (subject.includes("checkout") || body.includes("checkout") || body.includes("check out")) {
      return mode === "security" ? "/inside" : "/approvals";
    }
    if (subject.includes("reject") || body.includes("rejected")) {
      return "/inside?status=rejected";
    }
  }
  return "/approvals";
}

export function MobileNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mode = resolveMode(user);
  const [pending, setPending] = useState<VisitorListRow[]>([]);
  const [alerts, setAlerts] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  usePageChrome({
    title: "Notifications",
    subtitle: "Your pending approvals",
    showBack: true,
    backTo: "/",
    showNotification: false,
    showProfile: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [visitors, logs] = await Promise.all([
        visitorApi.listDetailed(200, userHostScopeFilters(user)).catch(() => [] as VisitorListRow[]),
        notificationApi.list(40).catch(() => [] as InAppNotification[]),
      ]);
      setPending((visitors || []).filter((row) => isPendingStatus(row.status)));
      setAlerts(logs || []);
    } catch {
      setPending([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  usePageRefresh(load);

  useVmsRealtime(() => {
    void load();
  }, true);

  const unreadPending = useMemo(
    () => pending.filter((item) => !readIds.has(item.name)).length,
    [pending, readIds],
  );

  const unreadAlerts = useMemo(
    () => alerts.filter((item) => !item.read).length,
    [alerts],
  );

  const markAllRead = async () => {
    setReadIds(new Set(pending.map((item) => item.name)));
    try {
      await notificationApi.markAllRead();
      setAlerts((prev) => prev.map((row) => ({ ...row, read: 1 })));
    } catch {
      /* ignore */
    }
  };

  const openPending = (item: VisitorListRow) => {
    setReadIds((prev) => new Set(prev).add(item.name));
    navigate("/approvals");
  };

  const openAlert = async (item: InAppNotification) => {
    if (!item.read) {
      try {
        await notificationApi.markRead(item.name);
        setAlerts((prev) =>
          prev.map((row) => (row.name === item.name ? { ...row, read: 1 } : row)),
        );
      } catch {
        /* ignore */
      }
    }
    navigate(alertRoute(item, mode));
  };

  const showMarkAll = pending.length > 0 && unreadPending > 0 || unreadAlerts > 0;

  return (
    <div className="vm-home-page vm-notif-page">
      <div className="vm-notif-page-toolbar">
        <div className="vm-notif-page-summary">
          <strong>Pending Approvals</strong>
          <span className="vm-notif-popup-count">{loading ? "…" : pending.length}</span>
        </div>
        {showMarkAll ? (
          <button type="button" className="vm-notif-page-mark-read" onClick={() => void markAllRead()}>
            Mark all as read
          </button>
        ) : null}
      </div>

      <main className="vm-notif-page-body">
        {loading ? (
          <p className="vm-notif-popup-empty">Loading notifications…</p>
        ) : (
          <>
            {pending.length === 0 ? (
              <div className="vm-notif-page-empty">
                <div className="vm-notif-page-empty-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <strong>No pending approvals</strong>
                <p>You&apos;re all caught up. New visitor alerts will appear here.</p>
              </div>
            ) : (
              <div className="vm-notif-page-card">
                <ul className="vm-notif-list" role="list">
                  {pending.map((item) => {
                    const isUnread = !readIds.has(item.name);
                    return (
                      <li key={item.name}>
                        <button
                          type="button"
                          className={`vm-notif-row${isUnread ? " is-unread" : " is-read"}`}
                          onClick={() => openPending(item)}
                        >
                          <VisitorAvatar
                            name={item.full_name || item.name}
                            photo={item.photo}
                            size={40}
                            className="vm-notif-avatar avatar-orange"
                          />
                          <div className="vm-notif-copy">
                            <strong>{item.full_name || item.name}</strong>
                            <span>
                              {item.person_to_meet_name || item.person_to_meet || "Awaiting assignment"}
                            </span>
                          </div>
                          <span className="vm-notif-time">
                            {formatTime(getCurrentStageTimestamp(item)) || "—"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <button
                  type="button"
                  className="vm-notif-popup-footer"
                  onClick={() => navigate("/approvals")}
                >
                  Open visitors queue ›
                </button>
              </div>
            )}

            {alerts.length > 0 ? (
              <section className="vm-notif-alerts-section" aria-label="Recent alerts">
                <div className="vm-notif-page-toolbar vm-notif-alerts-toolbar">
                  <div className="vm-notif-page-summary">
                    <strong>Recent Alerts</strong>
                    <span className="vm-notif-popup-count">{alerts.length}</span>
                  </div>
                </div>
                <div className="vm-notif-page-card">
                  <ul className="vm-notif-list" role="list">
                    {alerts.map((item) => {
                      const isUnread = !item.read;
                      return (
                        <li key={item.name}>
                          <button
                            type="button"
                            className={`vm-notif-row${isUnread ? " is-unread" : " is-read"}`}
                            onClick={() => void openAlert(item)}
                          >
                            <div className="vm-notif-alert-icon" aria-hidden>
                              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                              </svg>
                            </div>
                            <div className="vm-notif-copy">
                              <strong>{item.subject || "Visitor update"}</strong>
                              <span>{item.email_content || item.document_name || "—"}</span>
                            </div>
                            <span className="vm-notif-time">{formatTime(item.creation) || "—"}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
