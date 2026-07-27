import { useState } from "react";
import type { VisitorListRow } from "@/api/vms";
import { initials } from "@/lib/format";

type Props = {
  visitor: VisitorListRow | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onDownload: (visitor: VisitorListRow) => Promise<void> | void;
  onSend: (visitor: VisitorListRow) => Promise<void> | void;
};

export function GatePassActionsModal({
  visitor,
  open,
  busy = false,
  onClose,
  onDownload,
  onSend,
}: Props) {
  const [busyDownload, setBusyDownload] = useState(false);
  const [busySend, setBusySend] = useState(false);

  if (!open || !visitor) return null;

  const visitorName = visitor.full_name || visitor.name;
  const mobile = visitor.mobile || "—";
  const locked = busy || busyDownload || busySend;

  async function handleDownload() {
    if (!visitor) return;
    setBusyDownload(true);
    try {
      await onDownload(visitor);
    } finally {
      setBusyDownload(false);
    }
  }

  async function handleSend() {
    if (!visitor) return;
    setBusySend(true);
    try {
      await onSend(visitor);
    } finally {
      setBusySend(false);
    }
  }

  return (
    <div className="vm-confirm-modal-root" role="dialog" aria-modal="true" aria-labelledby="vm-gate-pass-title">
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onClose} aria-label="Close" />

      <div className="vm-confirm-modal-card vm-gate-pass-actions-card">
        <button type="button" className="vm-confirm-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="vm-confirm-modal-top">
          <div className="vm-confirm-modal-icon-badge is-pass" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M7 9h4M7 13h10" />
              <circle cx="16.5" cy="9.5" r="1.5" />
            </svg>
          </div>
          <h2 id="vm-gate-pass-title" className="vm-confirm-modal-title">
            Generate Gate Pass
          </h2>
          <p className="vm-confirm-modal-sub">
            Download or send the gate pass for <strong>{visitorName}</strong>.
          </p>
        </div>

        <div className="vm-confirm-modal-info-box">
          <div className="vm-confirm-modal-visitor-row">
            <div className="vm-activity-avatar avatar-green">{initials(visitorName)}</div>
            <div className="vm-confirm-modal-visitor-copy">
              <strong>{visitorName}</strong>
              <span>Mobile: {mobile}</span>
            </div>
            <span className="vm-badge-approved">APPROVED</span>
          </div>
        </div>

        <div className="vm-gate-pass-actions-row">
          <button
            type="button"
            className="vm-confirm-act-btn is-secondary"
            disabled={locked}
            onClick={() => void handleDownload()}
          >
            <span aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 19h14" />
              </svg>
            </span>
            <span>{busyDownload ? "Downloading…" : "Download"}</span>
          </button>

          <button
            type="button"
            className="vm-confirm-act-btn is-primary"
            disabled={locked}
            onClick={() => void handleSend()}
          >
            <span aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </span>
            <span>{busySend ? "Sending…" : "Send"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
