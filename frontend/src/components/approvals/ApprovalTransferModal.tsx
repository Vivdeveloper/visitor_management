import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { approvalApi, settingsApi, type VisitorListRow } from "@/api/vms";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { initials } from "@/lib/format";

type Props = {
  visitor: VisitorListRow | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onDone: (visitor: VisitorListRow) => void;
};

export function ApprovalTransferModal({ visitor, open, busy = false, onClose, onDone }: Props) {
  const [remarks, setRemarks] = useState("");
  const [transferToUser, setTransferToUser] = useState("");
  const [hosts, setHosts] = useState<Array<{ value: string; label: string; email?: string }>>([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !visitor) return;
    setRemarks("");
    setTransferToUser("");
    setError(null);
    setSubmitting(false);
    setLoadingHosts(true);
    let cancelled = false;
    void settingsApi
      .getHosts()
      .then((list) => {
        if (!cancelled) setHosts(list || []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load people");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHosts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, visitor]);

  const transferHostOptions = useMemo(
    () =>
      hosts
        .filter((h) => h.value !== visitor?.person_to_meet)
        .map((h) => ({
          value: h.value,
          label: h.label,
          sublabel: h.email || h.value,
        })),
    [hosts, visitor?.person_to_meet],
  );

  if (!open || !visitor) return null;

  const visitorName = visitor.full_name || visitor.name;
  const isBusy = busy || submitting;

  async function handleTransfer() {
    if (!visitor) return;
    if (!transferToUser) {
      setError("Select a person to transfer to.");
      return;
    }
    if (!remarks.trim()) {
      setError("Reason / remarks are required to transfer.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await approvalApi.transfer(visitor.name, transferToUser, remarks.trim());
      onDone(visitor);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="vm-confirm-modal-root" role="dialog" aria-modal="true" aria-labelledby="vm-approval-transfer-title">
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onClose} aria-label="Close" />

      <div className="vm-confirm-modal-card vm-checkin-floor-card">
        <button type="button" className="vm-confirm-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="vm-confirm-modal-top">
          <div className="vm-confirm-modal-icon-badge is-checkin" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7" />
            </svg>
          </div>
          <h2 id="vm-approval-transfer-title" className="vm-confirm-modal-title">
            Transfer Visitor
          </h2>
          <p className="vm-confirm-modal-sub">
            Reassign <strong>{visitorName}</strong> to another host.
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
          <label className="vm-sheet-label" htmlFor="approval-transfer-host">
            Transfer to
          </label>
          <SearchSelect
            id="approval-transfer-host"
            value={transferToUser}
            options={transferHostOptions}
            onChange={(val) => {
              setTransferToUser(val);
              setError(null);
            }}
            placeholder="Select"
            searchPlaceholder="Search person to meet"
            loading={loadingHosts}
            loadingText="Loading hosts…"
            required
            allowEmpty
            disabled={isBusy}
            menuPlacement="top"
            aria-label="Transfer to"
          />
          <label className="vm-sheet-label" htmlFor="approval-transfer-remarks">
            Reason / Remarks (required)
          </label>
          <textarea
            id="approval-transfer-remarks"
            className="vm-input-field vm-sheet-textarea"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Why are you transferring?"
            rows={2}
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
            className="vm-confirm-act-btn is-primary"
            disabled={isBusy || loadingHosts}
            onClick={() => void handleTransfer()}
          >
            {isBusy ? "Transferring…" : "Transfer"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
