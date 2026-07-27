import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { approvalApi, frappeGetList, passApi, visitorApi, type VisitorListRow } from "@/api/vms";
import { ErpNextToast, type ErpToastData } from "@/components/common/ErpNextToast";
import { PendingDecisionCard } from "@/components/approvals/PendingDecisionCard";
import { ApprovalFloorModal } from "@/components/approvals/ApprovalFloorModal";
import { ApprovalRejectModal } from "@/components/approvals/ApprovalRejectModal";
import { ApprovalTransferModal } from "@/components/approvals/ApprovalTransferModal";
import { VisitorCheckInConfirmModal } from "@/components/approvals/VisitorCheckInConfirmModal";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { usePageChrome } from "@/context/PageChromeContext";

const PENDING_STATUSES = new Set(["Pending Approval", "Pending"]);
type DateFilterMode = "today" | "yesterday" | "week";

function isPendingStatus(status?: string | null): boolean {
  return !!status && PENDING_STATUSES.has(status);
}

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

export function MobileApprovalsPage() {
  const navigate = useNavigate();

  usePageChrome({
    title: "Pending",
    subtitle: "Approvals queue",
    showBack: true,
    backTo: "/",
    showNotification: true,
    showProfile: true,
  });

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
  const statusMapRef = useState(() => new Map<string, string>())[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = (await visitorApi.listDetailed(200)).filter((row) => isPendingStatus(row.status));
      const newList = list || [];

      // Check if any visitor changed from Pending -> Approved (e.g. approved on Desk)
      for (const v of newList) {
        const prevStatus = statusMapRef.get(v.name);
        if (prevStatus && (prevStatus === "Pending Approval" || prevStatus === "Pending") && v.status === "Approved") {
          setConfirmVisitor(v);
        }
        statusMapRef.set(v.name, v.status || "");
      }

      // Check if newly submitted visitor by this session was approved
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
      } catch (err: unknown) {
        console.warn("Approve API notice:", err);
      } finally {
        setApproveVisitor(null);
        setConfirmVisitor({
          ...visitor,
          status: "Approved",
          floor,
        });
        setBusy(null);
        void load();
      }
    },
    [load],
  );

  const handleReject = useCallback((item: VisitorListRow) => {
    setRejectVisitor(item);
  }, []);

  const handleNotifyHost = useCallback(async (item: VisitorListRow) => {
    const host = item.person_to_meet_name || item.person_to_meet || "Host";
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  const handleCallHost = useCallback(async (item: VisitorListRow) => {
    const hostId = item.person_to_meet;
    if (!hostId) {
      setToast({
        id: Date.now().toString(),
        title: "Host phone unavailable",
        message: "No host assigned for this visitor.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
        return;
      }
      window.location.href = `tel:${phone.replace(/\s+/g, "")}`;
    } catch {
      setToast({
        id: Date.now().toString(),
        title: "Could not call host",
        message: "Unable to fetch host contact details.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }
  }, []);

  const handleGeneratePass = useCallback(
    async (visitor: VisitorListRow) => {
      try {
        const res = await passApi.generate(visitor.name);
        setConfirmVisitor(null);
        if (res.pass_url) {
          window.open(res.pass_url, "_blank");
        } else {
          navigate(`/pass/${encodeURIComponent(visitor.name)}`);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not generate pass");
      }
    },
    [navigate],
  );

  const handleSendPassToMobile = useCallback(async (visitor: VisitorListRow) => {
    try {
      const res = await passApi.sendPassToMobile(visitor.name, visitor.mobile);
      setConfirmVisitor(null);
      setToast({
        id: Date.now().toString(),
        title: "Gate Pass Sent",
        message: res.message || `Gate pass link sent to ${visitor.mobile || "visitor"}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send pass to mobile");
    }
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((item) => isPendingStatus(item.status))
      .filter((item) => {
        const itemDate = item.check_in || item.checked_in_on || item.modified || item.creation;
        return matchesDateFilter(itemDate, dateMode);
      })
      .filter((item) => {
        if (!q) return true;
        const haystack = `${item.full_name || ""} ${item.name || ""} ${item.person_to_meet_name || ""} ${item.mobile || ""} ${item.visitor_company || ""} ${item.visit_purpose_type || ""}`.toLowerCase();
        return haystack.includes(q);
      });
  }, [rows, query, dateMode]);

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
            <strong>No pending approvals</strong>
          </div>
        ) : null}

        <div className="vm-decide-list">
          {filteredItems.map((item) => (
            <PendingDecisionCard
              key={item.name}
              item={item}
              busy={busy === item.name}
              onOpen={() => navigate(`/visitor/${encodeURIComponent(item.name)}`)}
              onApprove={(v) => handleApprove(v)}
              onReject={() => handleReject(item)}
              onNotifyHost={() => handleNotifyHost(item)}
              onTransfer={(v) => setTransferVisitor(v)}
              onViewDetails={(v) => navigate(`/visitor/${encodeURIComponent(v.name)}`)}
              onCallHost={(v) => void handleCallHost(v)}
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
    </div>
  );
}
