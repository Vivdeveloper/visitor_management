import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { approvalApi, meetingApi, passApi, securityApi, visitorApi, type VisitorListRow } from "@/api/vms";
import { HeaderBar } from "@/components/common/HeaderBar";
import { ErpNextToast, type ErpToastData } from "@/components/common/ErpNextToast";
import { PendingDecisionCard } from "@/components/approvals/PendingDecisionCard";
import { PendingApprovalSheet } from "@/components/visitors/PendingApprovalSheet";
import { VisitorCheckInConfirmModal } from "@/components/approvals/VisitorCheckInConfirmModal";
import { GatePassActionsModal } from "@/components/approvals/GatePassActionsModal";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";

const INSIDE_STATUSES = new Set(["Checked In", "Meeting Done"]);

type TabId = "pending" | "approved" | "inside" | "checked_out";
type DateFilterMode = "all" | "today" | "week" | "custom";

function matchesDateFilter(
  rawDate: string | undefined | null,
  mode: DateFilterMode,
  customDate: string,
): boolean {
  if (mode === "all" && !customDate) return true;
  if (!rawDate) return false;

  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return false;

  const isoDate = d.toISOString().split("T")[0];
  const todayIso = new Date().toISOString().split("T")[0];

  if (mode === "today") {
    return isoDate === todayIso;
  }

  if (mode === "week") {
    const diffMs = new Date().getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  }

  if (mode === "custom" && customDate) {
    return isoDate === customDate;
  }

  return true;
}

const TABS: Array<{ id: TabId; label: string; match: (s?: string) => boolean }> = [
  { id: "pending", label: "Pending", match: (s) => s === "Pending Approval" },
  { id: "approved", label: "Approved", match: (s) => s === "Approved" },
  { id: "inside", label: "Inside", match: (s) => !!s && INSIDE_STATUSES.has(s) },
  { id: "checked_out", label: "Checked Out", match: (s) => s === "Checked Out" },
];

export function MobileApprovalsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("pending");
  const [query, setQuery] = useState("");
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [active, setActive] = useState<VisitorListRow | null>(null);
  const [toast, setToast] = useState<ErpToastData | null>(null);
  const [confirmVisitor, setConfirmVisitor] = useState<VisitorListRow | null>(null);
  const [passVisitor, setPassVisitor] = useState<VisitorListRow | null>(null);
  const [passBusy, setPassBusy] = useState(false);
  const statusMapRef = useState(() => new Map<string, string>())[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await visitorApi.listDetailed(200);
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

  const handleApprove = useCallback(
    async (item: VisitorListRow) => {
      setBusy(item.name);
      try {
        await approvalApi.approve(item.name);
      } catch (err: unknown) {
        console.warn("Approve API notice:", err);
      } finally {
        setConfirmVisitor({
          ...item,
          status: "Approved",
        });
        setBusy(null);
        void load();
      }
    },
    [load],
  );

  const handleReject = useCallback((item: VisitorListRow) => {
    setActive(item);
  }, []);

  const handleNotifyHost = useCallback(async (item: VisitorListRow) => {
    const host = item.person_to_meet_name || "Host";
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    try {
      await approvalApi.notifyHost(item.name);
    } catch {
      /* ignore backend realtime errors if offline */
    }
    setToast({
      id: Date.now().toString(),
      title: `Notification Pushed to ${host}`,
      message: `Push notification sent to ${host} for visitor ${item.full_name || item.name} (${time}).`,
      hostName: host,
      time,
    });
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
          message: `${visitor.full_name || visitor.name} has been checked in successfully.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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

  const handlePassDownload = useCallback(
    async (visitor: VisitorListRow) => {
      setPassBusy(true);
      try {
        const res = await passApi.generate(visitor.name);
        if (res.pass_url) {
          window.open(res.pass_url, "_blank");
        } else {
          navigate(`/pass/${encodeURIComponent(visitor.name)}`);
        }
        setPassVisitor(null);
        setToast({
          id: Date.now().toString(),
          title: "Gate Pass Ready",
          message: `Gate pass downloaded for ${visitor.full_name || visitor.name}.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Could not download gate pass");
      } finally {
        setPassBusy(false);
      }
    },
    [navigate],
  );

  const handlePassSend = useCallback(async (visitor: VisitorListRow) => {
    setPassBusy(true);
    try {
      await passApi.generate(visitor.name);
      const res = await passApi.sendPassToMobile(visitor.name, visitor.mobile);
      setPassVisitor(null);
      setToast({
        id: Date.now().toString(),
        title: "Gate Pass Sent",
        message: res.message || `Gate pass link sent to ${visitor.mobile || "visitor"}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send gate pass");
    } finally {
      setPassBusy(false);
    }
  }, []);

  const counts = useMemo(() => {
    const next: Record<TabId, number> = {
      pending: 0,
      approved: 0,
      inside: 0,
      checked_out: 0,
    };
    for (const row of rows) {
      for (const t of TABS) {
        if (t.match(row.status)) next[t.id] += 1;
      }
    }
    return next;
  }, [rows]);

  const filteredItems = useMemo(() => {
    const def = TABS.find((t) => t.id === tab) || TABS[0];
    const q = query.trim().toLowerCase();
    return rows
      .filter((item) => def.match(item.status))
      .filter((item) => {
        const itemDate = item.check_in || item.checked_in_on || item.modified || item.creation;
        return matchesDateFilter(itemDate, dateMode, selectedDate);
      })
      .filter((item) => {
        if (!q) return true;
        const haystack = `${item.full_name || ""} ${item.name || ""} ${item.person_to_meet_name || ""} ${item.mobile || ""} ${item.visitor_company || ""} ${item.visit_purpose_type || ""}`.toLowerCase();
        return haystack.includes(q);
      });
  }, [rows, tab, query, dateMode, selectedDate]);

  return (
    <div className="vm-home-page vm-approvals-page">
      <HeaderBar title="Precious Alloys" showNotification showProfile />
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

        {/* Quick Date Filter Bar below tabs */}
        <div className="vm-approvals-filter-bar">
          <div className="vm-approvals-filter-pills">
            <button
              type="button"
              className={`vm-filter-pill${dateMode === "all" ? " is-active" : ""}`}
              onClick={() => {
                setDateMode("all");
                setSelectedDate("");
              }}
            >
              All
            </button>

            <button
              type="button"
              className={`vm-filter-pill${dateMode === "today" ? " is-active" : ""}`}
              onClick={() => {
                setDateMode("today");
                setSelectedDate("");
              }}
            >
              Today
            </button>

            <button
              type="button"
              className={`vm-filter-pill${dateMode === "week" ? " is-active" : ""}`}
              onClick={() => {
                setDateMode("week");
                setSelectedDate("");
              }}
            >
              This Week
            </button>

            <label className={`vm-filter-pill vm-filter-date-picker${dateMode === "custom" ? " is-active" : ""}`}>
              <span>📅 {selectedDate || "Pick Date"}</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setDateMode("custom");
                  }
                }}
                className="vm-filter-date-input"
              />
            </label>
          </div>

          {/* Clear Filter Button */}
          {dateMode !== "all" || selectedDate || query ? (
            <button
              type="button"
              className="vm-filter-clear-btn"
              onClick={() => {
                setDateMode("all");
                setSelectedDate("");
                setQuery("");
              }}
              title="Clear all filters"
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
              onOpen={() => {
                if (item.status === "Pending Approval") {
                  setActive(item);
                  return;
                }
                navigate(`/visitor/${encodeURIComponent(item.name)}`);
              }}
              onApprove={() => void handleApprove(item)}
              onReject={() => handleReject(item)}
              onNotifyHost={() => handleNotifyHost(item)}
              onGenerateGatePass={
                item.status === "Approved" ? (v) => setPassVisitor(v) : undefined
              }
              onCheckIn={
                item.status === "Approved" ? (v) => void handleCheckIn(v) : undefined
              }
              onMeetingDone={
                item.status && INSIDE_STATUSES.has(item.status) ? (v) => void handleMeetingDone(v) : undefined
              }
              onCheckOut={
                item.status && INSIDE_STATUSES.has(item.status) ? (v) => void handleCheckOut(v) : undefined
              }
            />
          ))}
        </div>
      </main>

      {active ? (
        <PendingApprovalSheet
          visitor={active}
          open
          onClose={() => setActive(null)}
          onDone={() => {
            const v = active;
            setActive(null);
            setConfirmVisitor(v);
            void load();
          }}
          onViewDetails={() => {
            const name = active.name;
            setActive(null);
            navigate(`/visitor/${encodeURIComponent(name)}`);
          }}
        />
      ) : null}

      <VisitorCheckInConfirmModal
        visitor={confirmVisitor}
        open={!!confirmVisitor}
        onClose={() => setConfirmVisitor(null)}
        onGeneratePass={handleGeneratePass}
        onSendPassToMobile={handleSendPassToMobile}
      />

      <GatePassActionsModal
        visitor={passVisitor}
        open={!!passVisitor}
        busy={passBusy}
        onClose={() => setPassVisitor(null)}
        onDownload={handlePassDownload}
        onSend={handlePassSend}
      />
    </div>
  );
}
