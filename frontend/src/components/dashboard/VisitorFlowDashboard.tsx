import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { DashboardKpis, VisitorListRow } from "@/api/vms";
import {
  formatAvgVisitDuration,
  formatFlowDateLabel,
  resolveFlowSummary,
  toFlowInputDate,
} from "@/lib/visitorFlow";

type VisitorFlowDashboardProps = {
  kpis?: DashboardKpis;
  rows?: VisitorListRow[];
  loading?: boolean;
  selectedDate: string;
  onDateChange?: (date: string) => void;
  hideDateFilter?: boolean;
  className?: string;
};

function FlowChevron() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function FlowCount({ value, loading }: { value: number; loading?: boolean }) {
  return <span className="vm-flow-count">{loading ? "—" : value}</span>;
}

export function VisitorFlowDashboard({
  kpis = {},
  rows = [],
  loading = false,
  selectedDate,
  onDateChange,
  hideDateFilter = false,
  className = "",
}: VisitorFlowDashboardProps) {
  const navigate = useNavigate();
  const today = toFlowInputDate(new Date());
  const isToday = selectedDate === today;

  const summary = useMemo(
    () => resolveFlowSummary(kpis, rows, selectedDate),
    [kpis, rows, selectedDate],
  );
  const c = summary.counts;

  function shiftDate(days: number) {
    if (!onDateChange) return;
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + days);
    const next = toFlowInputDate(d);
    if (next > today) return;
    onDateChange(next);
  }

  return (
    <section className={`vm-visitor-flow ${className}`.trim()} aria-label="Visitor flow">
      <div className="vm-visitor-flow-head">
        <div>
          <h2 className="vm-visitor-flow-title">Visitor Flow</h2>
          <p className="vm-visitor-flow-sub">
            {isToday ? "Today's Visitor Journey" : `Visitor journey · ${formatFlowDateLabel(selectedDate)}`}
          </p>
        </div>
        {!hideDateFilter && onDateChange ? (
          <div className="vm-visitor-flow-date-wrap">
            <div className="vm-date-nav vm-visitor-flow-date-nav">
              <button type="button" className="vm-date-nav-btn" onClick={() => shiftDate(-1)} aria-label="Previous day">
                ‹
              </button>
              <label className="vm-date-picker-inline vm-visitor-flow-date-picker">
                <span className="vm-date-picker-left">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 11h18" />
                  </svg>
                  <span>{formatFlowDateLabel(selectedDate)}</span>
                </span>
                <input
                  type="date"
                  className="vm-date-input"
                  value={selectedDate}
                  max={today}
                  onChange={(e) => onDateChange(e.target.value || today)}
                  aria-label="Select flow date"
                />
              </label>
              <button
                type="button"
                className="vm-date-nav-btn"
                onClick={() => shiftDate(1)}
                disabled={isToday}
                aria-label="Next day"
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="vm-visitor-flow-track">
        {/* Step 1 */}
        <div className="vm-flow-step">
          <div className="vm-flow-rail"><span className="vm-flow-step-no">1</span></div>
          <button type="button" className="vm-flow-card is-pending" onClick={() => navigate("/approvals")}>
            <span className="vm-flow-card-icon is-amber" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" />
              </svg>
            </span>
            <span className="vm-flow-card-copy">
              <strong>Pending Approval</strong>
              <span>Waiting for admin action</span>
            </span>
            <FlowCount value={c["Pending Approval"]} loading={loading} />
            <FlowChevron />
          </button>
        </div>

        {/* Step 2 */}
        <div className="vm-flow-step">
          <div className="vm-flow-rail"><span className="vm-flow-step-no">2</span></div>
          <div className="vm-flow-panel">
            <button type="button" className="vm-flow-panel-head" onClick={() => navigate("/approvals")}>
              <span className="vm-flow-card-copy">
                <strong>Approve / Reject / Transfer</strong>
                <span>Take action on visitor</span>
              </span>
              <FlowChevron />
            </button>
            <div className="vm-flow-action-grid">
              <button type="button" className="vm-flow-action is-approve" onClick={() => navigate("/inside?status=approved")}>
                <span className="vm-flow-action-icon" aria-hidden>✓</span>
                <span>Approve</span>
                <strong>{loading ? "—" : c.Approved}</strong>
              </button>
              <button type="button" className="vm-flow-action is-reject" onClick={() => navigate("/inside?status=rejected")}>
                <span className="vm-flow-action-icon" aria-hidden>×</span>
                <span>Reject</span>
                <strong>{loading ? "—" : c.Rejected}</strong>
              </button>
              <button type="button" className="vm-flow-action is-transfer" onClick={() => navigate("/inside?status=transferred")}>
                <span className="vm-flow-action-icon" aria-hidden>⇄</span>
                <span>Transfer</span>
                <strong>{loading ? "—" : c.Transferred}</strong>
              </button>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="vm-flow-step">
          <div className="vm-flow-rail"><span className="vm-flow-step-no">3</span></div>
          <button type="button" className="vm-flow-card is-checked-in" onClick={() => navigate("/inside?status=checked_in")}>
            <span className="vm-flow-card-icon is-indigo" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </span>
            <span className="vm-flow-card-copy">
              <strong>Checked In</strong>
              <span>Visitor entered</span>
            </span>
            <FlowCount value={c["Checked In"]} loading={loading} />
            <FlowChevron />
          </button>
        </div>

        {/* Step 4 */}
        <div className="vm-flow-step">
          <div className="vm-flow-rail"><span className="vm-flow-step-no">4</span></div>
          <div className="vm-flow-stack">
            <button type="button" className="vm-flow-card is-meeting" onClick={() => navigate("/inside?status=checkout_pending")}>
              <span className="vm-flow-card-icon is-teal" aria-hidden>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span className="vm-flow-card-copy">
                <strong>Meeting Done</strong>
                <span>Visit completed</span>
              </span>
              <FlowCount value={c["Meeting Done"]} loading={loading} />
              <FlowChevron />
            </button>
            <button type="button" className="vm-flow-card is-checkout-pending" onClick={() => navigate("/inside?status=checkout_pending")}>
              <span className="vm-flow-card-icon is-orange" aria-hidden>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <span className="vm-flow-card-copy">
                <strong>Checkout Pending</strong>
                <span>Waiting to exit</span>
              </span>
              <FlowCount value={c["Checkout Pending"]} loading={loading} />
              <FlowChevron />
            </button>
          </div>
        </div>

        {/* Step 5 */}
        <div className="vm-flow-step is-last">
          <div className="vm-flow-rail"><span className="vm-flow-step-no">5</span></div>
          <button type="button" className="vm-flow-card is-checked-out" onClick={() => navigate("/inside?status=checked_out")}>
            <span className="vm-flow-card-icon is-green" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <span className="vm-flow-card-copy">
              <strong>Checked Out</strong>
              <span>Visitor exited</span>
            </span>
            <FlowCount value={c["Checked Out"]} loading={loading} />
            <FlowChevron />
          </button>
        </div>
      </div>

      <div className="vm-visitor-flow-summary">
        <div className="vm-flow-summary-card">
          <span className="vm-flow-summary-icon is-purple" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span className="vm-flow-summary-label">Total Visitors</span>
          <strong>{loading ? "—" : summary.totalVisitors}</strong>
        </div>
        <div className="vm-flow-summary-card">
          <span className="vm-flow-summary-icon is-green" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </span>
          <span className="vm-flow-summary-label">Active Inside</span>
          <strong>{loading ? "—" : summary.activeInside}</strong>
        </div>
        <div className="vm-flow-summary-card">
          <span className="vm-flow-summary-icon is-orange" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <span className="vm-flow-summary-label">Pending Checkout</span>
          <strong>{loading ? "—" : summary.pendingCheckout}</strong>
        </div>
        <div className="vm-flow-summary-card">
          <span className="vm-flow-summary-icon is-blue" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <span className="vm-flow-summary-label">Avg. Visit Duration</span>
          <strong>{loading ? "—" : formatAvgVisitDuration(summary.avgVisitMinutes)}</strong>
        </div>
      </div>
    </section>
  );
}
