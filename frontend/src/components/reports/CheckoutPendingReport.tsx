import { useMemo } from "react";
import type { VisitorListRow } from "@/api/vms";
import { formatWaitDuration } from "@/lib/format";
import { formatStageTimestamp } from "@/lib/visitStages";
import { VisitorAvatar } from "@/components/ui/VisitorAvatar";

type CheckoutPendingReportProps = {
  rows: VisitorListRow[];
  loading?: boolean;
  showCheckoutAction?: boolean;
  checkoutBusyId?: string | null;
  onOpenVisitor: (row: VisitorListRow) => void;
  onCheckout?: (row: VisitorListRow) => void;
};

export function CheckoutPendingReport({
  rows,
  loading = false,
  showCheckoutAction = false,
  checkoutBusyId = null,
  onOpenVisitor,
  onCheckout,
}: CheckoutPendingReportProps) {
  const pending = useMemo(
    () =>
      rows
        .filter((row) => row.status === "Meeting Done")
        .sort((a, b) => {
          const left = a.meeting_done_on || a.modified || a.creation || "";
          const right = b.meeting_done_on || b.modified || b.creation || "";
          return left.localeCompare(right);
        }),
    [rows],
  );

  return (
    <div className="vm-checkout-pending-report">
      <div className="vm-checkout-pending-summary">
        <div className="vm-checkout-pending-summary-copy">
          <p className="vm-checkout-pending-kicker">Live queue</p>
          <h3 className="vm-checkout-pending-title">Checkout Pending</h3>
          <p className="vm-checkout-pending-sub">
            Visitors who completed their meeting and are still on premises awaiting gate checkout.
          </p>
        </div>
        <div className="vm-checkout-pending-count" aria-live="polite">
          <strong>{loading ? "—" : pending.length}</strong>
          <span>pending</span>
        </div>
      </div>

      {loading ? (
        <p className="vm-empty-hint">Loading checkout queue…</p>
      ) : pending.length === 0 ? (
        <div className="vm-checkout-pending-empty">
          <div className="vm-checkout-pending-empty-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <strong>No checkout pending</strong>
          <p>All visitors who finished meetings have been checked out.</p>
        </div>
      ) : (
        <div className="vm-checkout-pending-list">
          {pending.map((row, idx) => {
            const visitorName = row.full_name || row.name;
            const waiting = formatWaitDuration(row.meeting_done_on);
            const meetingDoneLabel = formatStageTimestamp(row.meeting_done_on, true);
            const checkedInLabel = formatStageTimestamp(row.checked_in_on, true);

            return (
              <article
                key={row.name}
                className="vm-checkout-pending-card"
                style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
              >
                <button
                  type="button"
                  className="vm-checkout-pending-main"
                  onClick={() => onOpenVisitor(row)}
                >
                  <VisitorAvatar
                    name={visitorName}
                    photo={row.photo}
                    className="vm-checkout-pending-avatar"
                  />
                  <div className="vm-checkout-pending-body">
                    <div className="vm-checkout-pending-head">
                      <strong>{visitorName}</strong>
                      <span className="vm-checkout-pending-id">{row.name}</span>
                    </div>
                    <p className="vm-checkout-pending-host">
                      Host: {row.person_to_meet_name || "—"}
                    </p>
                    <div className="vm-checkout-pending-meta-grid">
                      <div>
                        <span className="lbl">Meeting Done</span>
                        <span className="val">{meetingDoneLabel}</span>
                      </div>
                      <div>
                        <span className="lbl">Checked In</span>
                        <span className="val">{checkedInLabel}</span>
                      </div>
                      <div>
                        <span className="lbl">Purpose</span>
                        <span className="val">{row.visit_purpose_type || "—"}</span>
                      </div>
                      <div>
                        <span className="lbl">Floor</span>
                        <span className="val">{row.floor || "—"}</span>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="vm-checkout-pending-foot">
                  <span className="vm-checkout-pending-wait">
                    {waiting ? `Waiting ${waiting}` : "Awaiting checkout"}
                  </span>
                  <div className="vm-checkout-pending-actions">
                    <button
                      type="button"
                      className="vm-checkout-pending-link"
                      onClick={() => onOpenVisitor(row)}
                    >
                      View
                    </button>
                    {showCheckoutAction && onCheckout ? (
                      <button
                        type="button"
                        className="vm-checkout-pending-checkout"
                        disabled={checkoutBusyId === row.name}
                        onClick={() => onCheckout(row)}
                      >
                        {checkoutBusyId === row.name ? "Checking out…" : "Check Out"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
