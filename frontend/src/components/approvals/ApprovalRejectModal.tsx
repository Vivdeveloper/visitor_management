import { useEffect, useState } from "react";
import { approvalApi, type VisitorListRow } from "@/api/vms";
import { initials } from "@/lib/format";

type Props = {
  visitor: VisitorListRow | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onDone: (visitor: VisitorListRow) => void;
};

export function ApprovalRejectModal({ visitor, open, busy = false, onClose, onDone }: Props) {
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !visitor) return;
    setRemarks("");
    setError(null);
    setSubmitting(false);
  }, [open, visitor]);

  if (!open || !visitor) return null;

  const visitorName = visitor.full_name || visitor.name;
  const isBusy = busy || submitting;

  async function handleReject() {
    if (!visitor) return;
    if (!remarks.trim()) {
      setError("Remarks are required to reject.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await approvalApi.reject(visitor.name, remarks.trim());
      onDone(visitor);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="vm-confirm-modal-root" role="dialog" aria-modal="true" aria-labelledby="vm-approval-reject-title">
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onClose} aria-label="Close" />

      <div className="vm-confirm-modal-card vm-checkin-floor-card">
        <button type="button" className="vm-confirm-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="vm-confirm-modal-top">
          <div className="vm-confirm-modal-icon-badge is-danger" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          </div>
          <h2 id="vm-approval-reject-title" className="vm-confirm-modal-title">
            Reject Visitor
          </h2>
          <p className="vm-confirm-modal-sub">
            Add a reason for rejecting <strong>{visitorName}</strong>.
          </p>
        </div>

        <div className="vm-confirm-modal-info-box">
          <div className="vm-confirm-modal-visitor-row">
            <div className="vm-activity-avatar avatar-orange">{initials(visitorName)}</div>
            <div className="vm-confirm-modal-visitor-copy">
              <strong>{visitorName}</strong>
              <span>{visitor.name}</span>
            </div>
            <span className="vm-badge-pending">PENDING</span>
          </div>
        </div>

        <div className="vm-checkin-floor-form">
          <label className="vm-sheet-label" htmlFor="approval-reject-remarks">
            Remarks (required)
          </label>
          <textarea
            id="approval-reject-remarks"
            className="vm-input-field vm-sheet-textarea"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Reason for rejection"
            rows={3}
            disabled={isBusy}
          />
          {error ? <p className="login-error vm-sheet-error">{error}</p> : null}
        </div>

        <div className="vm-confirm-modal-actions">
          <button type="button" className="vm-confirm-act-btn is-secondary" disabled={isBusy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="vm-confirm-act-btn is-danger"
            disabled={isBusy}
            onClick={() => void handleReject()}
          >
            {isBusy ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
