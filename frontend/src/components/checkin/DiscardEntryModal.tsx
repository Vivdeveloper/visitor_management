type Props = {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
};

/** Confirm leaving Add Entry mid-flow. */
export function DiscardEntryModal({ open, onStay, onLeave }: Props) {
  if (!open) return null;

  return (
    <div className="vm-confirm-modal-root" role="dialog" aria-modal="true" aria-labelledby="vm-discard-entry-title">
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onStay} aria-label="Stay on this page" />

      <div className="vm-confirm-modal-card vm-discard-entry-card">
        <div className="vm-confirm-modal-top">
          <div className="vm-confirm-modal-icon-badge-wrap">
            <div className="vm-confirm-modal-icon-badge is-danger">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </div>
          </div>

          <h2 id="vm-discard-entry-title" className="vm-confirm-modal-title">
            Remove this entry?
          </h2>
          <p className="vm-confirm-modal-sub">
            You have an unfinished visitor entry. Leave this screen and discard the details you entered?
          </p>
        </div>

        <div className="vm-confirm-modal-actions">
          <button type="button" className="vm-confirm-act-btn is-danger" onClick={onLeave}>
            Yes, remove entry
          </button>
          <button type="button" className="vm-confirm-act-btn is-secondary" onClick={onStay}>
            Keep editing
          </button>
        </div>
      </div>
    </div>
  );
}
