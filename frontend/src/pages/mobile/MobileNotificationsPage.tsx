import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  dashboardApi,
  type DashboardQueueItem,
} from "@/api/vms";
import { VisitorAvatar } from "@/components/ui/VisitorAvatar";
import { usePageChrome } from "@/context/PageChromeContext";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { formatTime } from "@/lib/format";
import { getCurrentStageTimestamp } from "@/lib/visitStages";

export function MobileNotificationsPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState<DashboardQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  usePageChrome({
    title: "Notifications",
    subtitle: "Pending approvals",
    showBack: true,
    backTo: "/",
    showNotification: false,
    showProfile: true,
  });

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const list = await dashboardApi.getPendingApprovals();
      setPending(list || []);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  useVmsRealtime(() => {
    void loadPending();
  }, true);

  const unreadCount = useMemo(
    () => pending.filter((item) => !readIds.has(item.name)).length,
    [pending, readIds],
  );

  const markAllRead = () => {
    setReadIds(new Set(pending.map((item) => item.name)));
  };

  const openItem = (item: DashboardQueueItem) => {
    setReadIds((prev) => new Set(prev).add(item.name));
    navigate("/approvals");
  };

  return (
    <div className="vm-home-page vm-notif-page">
      <div className="vm-notif-page-toolbar">
        <div className="vm-notif-page-summary">
          <strong>Pending Approvals</strong>
          <span className="vm-notif-popup-count">{loading ? "…" : pending.length}</span>
        </div>
        {pending.length > 0 && unreadCount > 0 ? (
          <button type="button" className="vm-notif-page-mark-read" onClick={markAllRead}>
            Mark all as read
          </button>
        ) : null}
      </div>

      <main className="vm-notif-page-body">
        {loading ? (
          <p className="vm-notif-popup-empty">Loading live queue…</p>
        ) : pending.length === 0 ? (
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
                      onClick={() => openItem(item)}
                    >
                      <VisitorAvatar
                        name={item.full_name || item.name}
                        photo={item.photo}
                        size={40}
                        className="vm-notif-avatar avatar-orange"
                      />
                      <div className="vm-notif-copy">
                        <strong>{item.full_name || item.name}</strong>
                        <span>{item.person_to_meet_name || item.host_name || "Awaiting assignment"}</span>
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
      </main>
    </div>
  );
}
