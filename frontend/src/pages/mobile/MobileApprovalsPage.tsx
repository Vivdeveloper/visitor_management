import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  approvalApi,
  frappeGetList,
  meetingApi,
  passApi,
  securityApi,
  visitorApi,
  type VisitorListRow,
} from "@/api/vms";
import { ErpNextToast, type ErpToastData } from "@/components/common/ErpNextToast";
import { PendingDecisionCard } from "@/components/approvals/PendingDecisionCard";
import { ApprovalFloorModal } from "@/components/approvals/ApprovalFloorModal";
import { ApprovalRejectModal } from "@/components/approvals/ApprovalRejectModal";
import { ApprovalTransferModal } from "@/components/approvals/ApprovalTransferModal";
import { VisitorCheckInConfirmModal } from "@/components/approvals/VisitorCheckInConfirmModal";
import { ViewGatePassModal } from "@/components/approvals/ViewGatePassModal";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { usePageChrome } from "@/context/PageChromeContext";
import { formatNowTime } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { canApproveReject, canPerformCheckout } from "@/lib/roles";

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

const TABS: Array<{ id: TabId; label: string; match: (s?: string) => boolean }> = [
  { id: "all", label: "All", match: (s) => !!s && ACTIVE_STATUSES.has(s) },
  { id: "pending", label: "Pending", match: (s) => s === "Pending Approval" || s === "Pending" },
  { id: "approved", label: "Approved", match: (s) => s === "Approved" },
  { id: "inside", label: "Inside", match: (s) => !!s && INSIDE_STATUSES.has(s) },
];

export function MobileApprovalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const showCheckout = canPerformCheckout(user);
  const canDecide = canApproveReject(user);

  usePageChrome({
    title: "Pending",
    subtitle: "Approvals queue",
    showBack: true,
    backTo: "/",
    showNotification: true,
    showProfile: true,
  });

  const [tab, setTab] = useState<TabId>("pending");
  const [query, setQuery] = useState("");
  const [dateMode, setDateMode] = useState<DateFilterMode>("week");
  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectVisitor, setRejectVisitor] = useState<VisitorListRow | null>(null);
  const [transferVisitor, setTransferVisitor] = useState<VisitorListRow | null>(null);
  const [toast, setToast] = useState<ErpToastData | null>(null);
  const [confirmVisitor, setConfirmVisitor] = useState<VisitorListRow | null>(null);
  const [approveVisitor, setApproveVisitor] = useState<VisitorListRow | null>(null);
  const [passVisitor, setPassVisitor] = useState<VisitorListRow | null>(null);
  const statusMapRef = useState(() => new Map<string, string>())[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await visitorApi.listDetailed(200);
      const newList = list || [];

      for (const v of newList) {
        const prevStatus = statusMapRef.get(v.name);
        if (prevStatus && (prevStatus === "Pending Approval" || prevStatus === "Pending") && v.status === "Approved") {
          setConfirmVisitor(v);
        }
        statusMapRef.set(v.name, v.status || "");
      }

      const lastSubName = sessionStorage.getItem("vms_last_submitted_visitor");
      if (lastSubName) {
        const matched = newList.find((r) => r.name === lastSubName);
        if (matched && matched.status === "Approved") {
          setConfirmVisitor(matched);
          sessionStorage.removeItem("vms_last_submitted_visitor");
        }
      }

      setRows(newList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load approvals");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusMapRef]);

  useEffect(() => {
    void load();
  }, [load]);

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
        setConfirmVisitor({
          ...visitor,
          status: "Approved",
          floor,
        });
        void load();
      } catch (err: unknown) {
        throw err instanceof Error ? err : new Error("Approve failed");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const handleReject = useCallback((item: VisitorListRow) => {
    setRejectVisitor(item);
  }, []);

  const handleNotifyHost = useCallback(async (item: VisitorListRow) => {
    const host = item.person_to_meet_name || item.person_to_meet || "Host";
    const time = formatNowTime();
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
          time: formatNowTime(),
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

  const handleCallHost = useCallback(async (item: VisitorListRow) => {
    const hostId = item.person_to_meet;
    if (!hostId) {
      setToast({
        id: Date.now().toString(),
        title: "Host phone unavailable",
        message: "No host assigned for this visitor.",
        time: formatNowTime(),
      });
      return;
    }

    try {
      const users = await frappeGetList<{ name: string; mobile_no?: string; phone?: string }>({
        doctype: "User",
        fields: ["name", "mobile_no", "phone"],
        filters: { name: hostId },
        limit_page_length: 1,
      });
      const phone = users[0]?.mobile_no || users[0]?.phone;
      if (!phone) {
        setToast({
          id: Date.now().toString(),
          title: "Host phone unavailable",
          message: `${item.person_to_meet_name || "Host"} has no phone number on file.`,
          time: formatNowTime(),
        });
        return;
      }
      window.location.href = `tel:${phone.replace(/\s+/g, "")}`;
    } catch {
      setToast({
        id: Date.now().toString(),
        title: "Could not call host",
        message: "Unable to fetch host contact details.",
        time: formatNowTime(),
      });
    }
  }, []);

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
          time: formatNowTime(),
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
          time: formatNowTime(),
        });
        void load();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Check-out failed");
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  const handleGeneratePass = useCallback(async (visitor: VisitorListRow) => {
    setConfirmVisitor(null);
    setPassVisitor(visitor);
  }, []);

  const handleSendPassToMobile = useCallback(async (visitor: VisitorListRow) => {
    try {
      const res = await passApi.sendPassToMobile(visitor.name, visitor.mobile);
      setToast({
        id: Date.now().toString(),
        title: "Gate Pass Sent",
        message: res.message || `Gate pass link sent to ${visitor.mobile || "visitor"}`,
        time: formatNowTime(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send pass to mobile");
    }
  }, []);

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
            placeholder="Search visitor, host or company..."
            aria-label="Search approvals"
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
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <span className="vm-reports-tab-count">{counts[t.id]}</span>
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
              Today
            </button>

            <button
              type="button"
              className={`vm-filter-pill${dateMode === "yesterday" ? " is-active" : ""}`}
              onClick={() => setDateMode("yesterday")}
            >
              Yesterday
            </button>

            <button
              type="button"
              className={`vm-filter-pill${dateMode === "week" ? " is-active" : ""}`}
              onClick={() => setDateMode("week")}
            >
              This Week
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
              title="Clear filters"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
              <span>Clear</span>
            </button>
          ) : null}
        </div>

        {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}
        {loading ? <p className="vm-empty-hint">Loading…</p> : null}

        {!loading && filteredItems.length === 0 ? (
          <div className="vm-overview-card vm-approvals-empty">
            <strong>No {TABS.find((t) => t.id === tab)?.label || tab} items</strong>
          </div>
        ) : null}

        <div className="vm-decide-list">
          {filteredItems.map((item) => (
            <PendingDecisionCard
              key={item.name}
              item={item}
              busy={busy === item.name}
              approveBlocked={!viewOnlyAll && !canDecide}
              onOpen={viewOnlyAll ? undefined : () => navigate(`/visitor/${encodeURIComponent(item.name)}`)}
              onApprove={viewOnlyAll || !canDecide ? undefined : (v) => handleApprove(v)}
              onReject={viewOnlyAll || !canDecide ? undefined : () => handleReject(item)}
              onNotifyHost={viewOnlyAll ? undefined : () => handleNotifyHost(item)}
              onTransfer={viewOnlyAll ? undefined : (v) => setTransferVisitor(v)}
              onCallHost={viewOnlyAll ? undefined : (v) => void handleCallHost(v)}
              onGenerateGatePass={
                viewOnlyAll ? undefined : item.status === "Approved" ? (v) => setPassVisitor(v) : undefined
              }
              onCheckIn={
                viewOnlyAll ? undefined : item.status === "Approved" ? (v) => void handleCheckIn(v) : undefined
              }
              onMeetingDone={
                viewOnlyAll
                  ? undefined
                  : item.status === "Checked In"
                    ? (v) => void handleMeetingDone(v)
                    : undefined
              }
              onCheckOut={
                showCheckout && !viewOnlyAll
                  ? item.status === "Meeting Done"
                    ? (v) => void handleCheckOut(v)
                    : undefined
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
        onDone={() => {
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

      <VisitorCheckInConfirmModal
        visitor={confirmVisitor}
        open={!!confirmVisitor}
        onClose={() => setConfirmVisitor(null)}
        onGeneratePass={handleGeneratePass}
        onSendPassToMobile={handleSendPassToMobile}
      />

      <ViewGatePassModal
        visitor={passVisitor}
        open={!!passVisitor}
        onClose={() => setPassVisitor(null)}
        onSendToMobile={handleSendPassToMobile}
      />
    </div>
  );
}
