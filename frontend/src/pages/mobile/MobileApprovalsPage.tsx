import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  approvalApi,
  meetingApi,
  securityApi,
  visitorApi,
  type VisitorListRow,
} from "@/api/vms";
import { ErpNextToast, type ErpToastData } from "@/components/common/ErpNextToast";
import { PendingDecisionCard } from "@/components/approvals/PendingDecisionCard";
import { ApprovalFloorModal } from "@/components/approvals/ApprovalFloorModal";
import { ApprovalRejectModal } from "@/components/approvals/ApprovalRejectModal";
import { ApprovalTransferModal } from "@/components/approvals/ApprovalTransferModal";
import { ViewGatePassModal } from "@/components/approvals/ViewGatePassModal";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { usePageChrome } from "@/context/PageChromeContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { formatCount, formatNowTime } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import {
  canApproveReject,
  canCallNotifyHost,
  canGateCheckIn,
  canMarkMeetingDone,
  canPerformCheckout,
  canTransferVisitor,
  resolveMode,
  visitorScopeFilters,
} from "@/lib/roles";
import { ut, type UiCopyKey } from "@/i18n/uiChrome";

const INSIDE_STATUSES = new Set(["Checked In", "Meeting Done"]);
const ACTIVE_STATUSES = new Set(["Pending Approval", "Pending", "Approved", "Checked In", "Meeting Done"]);

type TabId = "all" | "pending" | "approved" | "inside";
type DateFilterMode = "today" | "yesterday" | "week";

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekStart(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function matchesDateFilter(rawDate: string | undefined | null, mode: DateFilterMode): boolean {
  if (!rawDate) return false;

  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return false;

  const isoDate = toIsoDate(d);
  const today = new Date();
  const todayIso = toIsoDate(today);

  if (mode === "today") {
    return isoDate === todayIso;
  }

  if (mode === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return isoDate === toIsoDate(yesterday);
  }

  if (mode === "week") {
    const weekStart = getWeekStart(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return d >= weekStart && d <= weekEnd;
  }

  return true;
}

const TABS: Array<{ id: TabId; labelKey: UiCopyKey; match: (s?: string) => boolean }> = [
  { id: "all", labelKey: "tab_all", match: (s) => !!s && ACTIVE_STATUSES.has(s) },
  { id: "pending", labelKey: "tab_pending", match: (s) => s === "Pending Approval" || s === "Pending" },
  { id: "approved", labelKey: "tab_approved", match: (s) => s === "Approved" },
  { id: "inside", labelKey: "tab_inside", match: (s) => !!s && INSIDE_STATUSES.has(s) },
];

function parseApprovalsTab(raw: string | null): TabId {
  if (raw === "all" || raw === "pending" || raw === "approved" || raw === "inside") {
    return raw;
  }
  return "pending";
}

export function MobileApprovalsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useAppLanguage();
  const { user } = useAuth();
  const showCheckout = canPerformCheckout(user);
  const mode = resolveMode(user);
  const canDecide = canApproveReject(user);
  const canMeetingDone = canMarkMeetingDone(user);
  // Notify is gate-desk only — host is the person being notified.
  const canHostOps = mode === "security" && canCallNotifyHost(user);
  const canTransfer = canTransferVisitor(user);
  // Approver (no create DocPerm) → View Gate Pass only; gate create → Check In too.
  const showGateCheckIn = canGateCheckIn(user);

  usePageChrome({
    title: ut(lang, "pending"),
    subtitle: ut(lang, "approvals_queue"),
    showBack: true,
    backTo: "/",
    showNotification: true,
    showProfile: true,
  });

  const [tab, setTab] = useState<TabId>(() => parseApprovalsTab(searchParams.get("tab")));
  const [query, setQuery] = useState("");
  const [dateMode, setDateMode] = useState<DateFilterMode>("week");
  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectVisitor, setRejectVisitor] = useState<VisitorListRow | null>(null);
  const [transferVisitor, setTransferVisitor] = useState<VisitorListRow | null>(null);
  const [toast, setToast] = useState<ErpToastData | null>(null);
  const [approveVisitor, setApproveVisitor] = useState<VisitorListRow | null>(null);
  const [passVisitor, setPassVisitor] = useState<VisitorListRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await visitorApi.listDetailed(200, visitorScopeFilters(user));
      setRows(list || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load approvals");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTab(parseApprovalsTab(searchParams.get("tab")));
  }, [searchParams]);

  const setApprovalsTab = useCallback(
    (nextTab: TabId) => {
      setTab(nextTab);
      const next = new URLSearchParams(searchParams);
      if (nextTab === "pending") {
        next.delete("tab");
      } else {
        next.set("tab", nextTab);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  usePageRefresh(load);

  useVmsRealtime(() => {
    void load();
  });

  const handleApprove = useCallback((item: VisitorListRow) => {
    setApproveVisitor(item);
  }, []);

  const handleApproveWithFloor = useCallback(
    async (visitor: VisitorListRow, floor: string) => {
      setBusy(visitor.name);
      try {
        await approvalApi.approve(visitor.name, undefined, floor);
        setApproveVisitor(null);
        setToast({
          id: Date.now().toString(),
          title: "Visitor approved",
          message: `${visitor.full_name || visitor.name} was approved${floor ? ` for ${floor}` : ""}.`,
          time: formatNowTime(lang),
        });
        void load();
      } catch (err: unknown) {
        throw err instanceof Error ? err : new Error("Approve failed");
      } finally {
        setBusy(null);
      }
    },
    [load, lang],
  );

  const handleReject = useCallback((item: VisitorListRow) => {
    setRejectVisitor(item);
  }, []);

  const handleNotifyHost = useCallback(async (item: VisitorListRow) => {
    const host = item.person_to_meet_name || item.person_to_meet || "Host";
    const time = formatNowTime(lang);
    try {
      const res = await approvalApi.notifyHost(item.name);
      const deliveredLive = res.realtime_sent !== false;
      setToast({
        id: Date.now().toString(),
        title: deliveredLive
          ? `Notification pushed to ${res.host_name || host}`
          : `Alert logged for ${res.host_name || host}`,
        message: deliveredLive
          ? `Live alert sent to ${res.host_name || host} for visitor ${item.full_name || item.name} (${time}).`
          : `Notification saved for ${res.host_name || host}, but live push failed. Ask the host to refresh the app and ensure socket.io is running.`,
        hostName: res.host_name || host,
        time,
      });
    } catch (err: unknown) {
      setToast({
        id: Date.now().toString(),
        title: "Host notification failed",
        message: err instanceof Error ? err.message : "Could not notify the host. Check Person to Meet is assigned.",
        time,
      });
    }
  }, []);

  const handleCheckIn = useCallback(
    async (visitor: VisitorListRow) => {
      setBusy(visitor.name);
      setError(null);
      try {
        await securityApi.checkIn(visitor.name);
        setToast({
          id: Date.now().toString(),
          title: "Visitor Checked In",
          message: `${visitor.full_name || visitor.name} checked in successfully.`,
          time: formatNowTime(lang),
        });
        void load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Check-in failed");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const handleMeetingDone = useCallback(
    async (visitor: VisitorListRow) => {
      setBusy(visitor.name);
      setError(null);
      try {
        await meetingApi.complete(visitor.name);
        setToast({
          id: Date.now().toString(),
          title: "Meeting Completed",
          message: `Meeting with ${visitor.full_name || visitor.name} marked as complete.`,
          time: formatNowTime(lang),
        });
        void load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Meeting complete failed");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const handleCheckOut = useCallback(
    async (visitor: VisitorListRow) => {
      setBusy(visitor.name);
      setError(null);
      try {
        await securityApi.checkOut(visitor.name);
        setToast({
          id: Date.now().toString(),
          title: "Visitor Checked Out",
          message: `${visitor.full_name || visitor.name} checked out successfully.`,
          time: formatNowTime(lang),
        });
        void load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Check-out failed");
      } finally {
        setBusy(null);
      }
    },
    [load, lang],
  );

  const handleCancel = useCallback(
    async (visitor: VisitorListRow) => {
      setBusy(visitor.name);
      setError(null);
      try {
        await approvalApi.cancel(visitor.name);
        setToast({
          id: Date.now().toString(),
          title: "Visit cancelled",
          message: `${visitor.full_name || visitor.name} was cancelled.`,
          time: formatNowTime(lang),
        });
        void load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Cancel failed");
      } finally {
        setBusy(null);
      }
    },
    [load, lang],
  );

  const counts = useMemo(() => {
    const next: Record<TabId, number> = {
      all: 0,
      pending: 0,
      approved: 0,
      inside: 0,
    };
    for (const row of rows) {
      const itemDate = row.check_in || row.checked_in_on || row.modified || row.creation;
      if (!matchesDateFilter(itemDate, dateMode)) continue;
      for (const t of TABS) {
        if (t.match(row.status)) next[t.id] += 1;
      }
    }
    return next;
  }, [rows, dateMode]);

  const filteredItems = useMemo(() => {
    const def = TABS.find((t) => t.id === tab) || TABS[0];
    const q = query.trim().toLowerCase();
    return rows
      .filter((item) => def.match(item.status))
      .filter((item) => {
        const itemDate = item.check_in || item.checked_in_on || item.modified || item.creation;
        return matchesDateFilter(itemDate, dateMode);
      })
      .filter((item) => {
        if (!q) return true;
        const haystack = `${item.full_name || ""} ${item.name || ""} ${item.person_to_meet_name || ""} ${item.mobile || ""} ${item.visitor_company || ""} ${item.visit_purpose_type || ""}`.toLowerCase();
        return haystack.includes(q);
      });
  }, [rows, tab, query, dateMode]);

  const viewOnlyAll = tab === "all";

  return (
    <div className="vm-home-page vm-approvals-page">
      <ErpNextToast toast={toast} onClose={() => setToast(null)} />

      <main className="vm-main-body vm-approvals-stack vm-page-content-start">
        <div className="vm-meetings-search" style={{ margin: 0 }}>
          <span className="vm-search-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            className="vm-input-field vm-meetings-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ut(lang, "search_visitor_host_company")}
            aria-label={ut(lang, "search_visitor_host_company")}
          />
        </div>

        <div className="vm-reports-tabs" role="tablist" aria-label="Visitor status">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`vm-reports-tab${tab === t.id ? " is-active" : ""}`}
              onClick={() => setApprovalsTab(t.id)}
            >
              {ut(lang, t.labelKey)}
              <span className="vm-reports-tab-count">{formatCount(counts[t.id], lang)}</span>
            </button>
          ))}
        </div>

        <div className="vm-approvals-filter-bar">
          <div className="vm-approvals-filter-pills">
            <button
              type="button"
              className={`vm-filter-pill${dateMode === "today" ? " is-active" : ""}`}
              onClick={() => setDateMode("today")}
            >
              {ut(lang, "filter_today")}
            </button>

            <button
              type="button"
              className={`vm-filter-pill${dateMode === "yesterday" ? " is-active" : ""}`}
              onClick={() => setDateMode("yesterday")}
            >
              {ut(lang, "filter_yesterday")}
            </button>

            <button
              type="button"
              className={`vm-filter-pill${dateMode === "week" ? " is-active" : ""}`}
              onClick={() => setDateMode("week")}
            >
              {ut(lang, "filter_this_week")}
            </button>
          </div>

          {dateMode !== "week" || query ? (
            <button
              type="button"
              className="vm-filter-clear-btn"
              onClick={() => {
                setDateMode("week");
                setQuery("");
              }}
              title={ut(lang, "filter_clear")}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
              <span>{ut(lang, "filter_clear")}</span>
            </button>
          ) : null}
        </div>

        {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}
        {loading ? <p className="vm-empty-hint">{ut(lang, "loading")}</p> : null}

        {!loading && filteredItems.length === 0 ? (
          <div className="vm-overview-card vm-approvals-empty">
            <strong>
              {ut(lang, "no_tab_items", {
                label: ut(lang, TABS.find((t) => t.id === tab)?.labelKey || "tab_pending"),
              })}
            </strong>
          </div>
        ) : null}

        <div className="vm-decide-list">
          {filteredItems.map((item) => (
            <PendingDecisionCard
              key={item.name}
              item={item}
              busy={busy === item.name}
              onOpen={viewOnlyAll ? undefined : () => navigate(`/visitor/${encodeURIComponent(item.name)}`)}
              onApprove={viewOnlyAll || !canDecide ? undefined : (v) => handleApprove(v)}
              onReject={viewOnlyAll || !canDecide ? undefined : () => handleReject(item)}
              onNotifyHost={viewOnlyAll || !canHostOps ? undefined : () => handleNotifyHost(item)}
              onTransfer={viewOnlyAll || !canTransfer ? undefined : (v) => setTransferVisitor(v)}
              onGenerateGatePass={
                viewOnlyAll ? undefined : item.status === "Approved" ? (v) => setPassVisitor(v) : undefined
              }
              onCheckIn={
                viewOnlyAll || !showGateCheckIn
                  ? undefined
                  : item.status === "Approved"
                    ? (v) => void handleCheckIn(v)
                    : undefined
              }
              onMeetingDone={
                viewOnlyAll || !canMeetingDone
                  ? undefined
                  : item.status === "Checked In"
                    ? (v) => void handleMeetingDone(v)
                    : undefined
              }
              onCheckOut={
                showCheckout && !viewOnlyAll && item.status === "Meeting Done"
                  ? (v) => void handleCheckOut(v)
                  : undefined
              }
              onCancel={
                showCheckout &&
                !viewOnlyAll &&
                (item.status === "Pending Approval" ||
                  item.status === "Pending" ||
                  item.status === "Approved")
                  ? (v) => void handleCancel(v)
                  : undefined
              }
            />
          ))}
        </div>
      </main>

      <ApprovalRejectModal
        visitor={rejectVisitor}
        open={!!rejectVisitor}
        busy={!!rejectVisitor && busy === rejectVisitor.name}
        onClose={() => setRejectVisitor(null)}
        onDone={(visitor, remarks) => {
          const name = visitor.full_name || visitor.name;
          setToast({
            id: Date.now().toString(),
            title: "Visitor rejected",
            message: remarks
              ? `${name} was rejected. Reason: ${remarks}`
              : `${name} was rejected.`,
            time: formatNowTime(lang),
          });
          void load();
        }}
      />

      <ApprovalTransferModal
        visitor={transferVisitor}
        open={!!transferVisitor}
        busy={!!transferVisitor && busy === transferVisitor.name}
        onClose={() => setTransferVisitor(null)}
        onDone={() => {
          void load();
        }}
      />

      <ApprovalFloorModal
        visitor={approveVisitor}
        open={!!approveVisitor}
        busy={!!approveVisitor && busy === approveVisitor.name}
        onClose={() => setApproveVisitor(null)}
        onConfirm={handleApproveWithFloor}
      />

      <ViewGatePassModal
        visitor={passVisitor}
        open={!!passVisitor}
        onClose={() => setPassVisitor(null)}
      />
    </div>
  );
}
