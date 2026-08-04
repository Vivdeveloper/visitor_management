type Props = {
  open: boolean;
  onContinue: () => void;
  onStartNew: () => void;
};

/** After refresh: keep unfinished entry or clear it. */
export function ResumeEntryModal({ open, onContinue, onStartNew }: Props) {
  if (!open) return null;

  return (
    <div className="vm-confirm-modal-root" role="dialog" aria-modal="true" aria-labelledby="vm-resume-entry-title">
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onContinue} aria-label="Keep editing" />

      <div className="vm-confirm-modal-card vm-discard-entry-card">
        <div className="vm-confirm-modal-top">
          <div className="vm-confirm-modal-icon-badge-wrap">
            <div className="vm-confirm-modal-icon-badge is-pass">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 3v10" />
                <path d="M8 9l4 4 4-4" />
                <path d="M5 17h14" />
                <path d="M7 21h10" />
              </svg>
            </div>
          </div>

          <h2 id="vm-resume-entry-title" className="vm-confirm-modal-title">
            Continue this entry?
          </h2>
          <p className="vm-confirm-modal-sub">
            Your visitor details were saved when the page refreshed. Keep editing, or clear and start a new entry?
          </p>
        </div>

        <div className="vm-confirm-modal-actions">
          <button type="button" className="vm-confirm-act-btn is-primary" onClick={onContinue}>
            Keep editing
          </button>
          <button type="button" className="vm-confirm-act-btn is-danger" onClick={onStartNew}>
            Clear and start new
          </button>
        </div>
      </div>
    </div>
  );
}
