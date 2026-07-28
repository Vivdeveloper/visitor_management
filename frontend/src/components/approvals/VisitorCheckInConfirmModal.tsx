import { useState } from "react";
import type { VisitorListRow } from "@/api/vms";
import { initials } from "@/lib/format";
import { formatStageTimestamp, getCurrentStageTimestamp } from "@/lib/visitStages";

type Props = {
  visitor: VisitorListRow | null;
  open: boolean;
  onClose: () => void;
  onGeneratePass: (visitor: VisitorListRow) => Promise<void> | void;
  onSendPassToMobile: (visitor: VisitorListRow) => Promise<void> | void;
};

export function VisitorCheckInConfirmModal({
  visitor,
  open,
  onClose,
  onGeneratePass,
  onSendPassToMobile,
}: Props) {
  const [busyGen, setBusyGen] = useState(false);
  const [busySend, setBusySend] = useState(false);

  if (!open || !visitor) return null;

  const visitorName = visitor.full_name || visitor.name;
  const mobile = visitor.mobile || "—";
  const host = visitor.person_to_meet_name || "—";
  const purpose = visitor.visit_purpose_type || "—";
  const time = formatStageTimestamp(
    visitor.approved_on || getCurrentStageTimestamp(visitor),
    true,
  );

  async function handleGenerate() {
    if (!visitor) return;
    setBusyGen(true);
    try {
      await onGeneratePass(visitor);
    } finally {
      setBusyGen(false);
    }
  }

  async function handleSend() {
    if (!visitor) return;
    setBusySend(true);
    try {
      await onSendPassToMobile(visitor);
    } finally {
      setBusySend(false);
    }
  }

  return (
    <div className="vm-confirm-modal-root" role="dialog" aria-modal="true">
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onClose} aria-label="Close modal" />

      <div className="vm-confirm-modal-card">
        <button type="button" className="vm-confirm-modal-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="vm-confirm-modal-top">
          <div className="vm-confirm-modal-icon-badge-wrap">
            <span className="vm-sparkle sp-1">+</span>
            <span className="vm-sparkle sp-2">+</span>
            <span className="vm-sparkle sp-3">+</span>
            <span className="vm-sparkle sp-4">+</span>
            <div className="vm-confirm-modal-icon-badge">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#16a34a" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          </div>

          <h2 className="vm-confirm-modal-title">Visitor Check-In Confirmed</h2>
          <p className="vm-confirm-modal-sub">
            Check-in for <strong>{visitorName}</strong> has been successfully confirmed.
          </p>
        </div>

        <div className="vm-confirm-modal-info-box">
          <div className="vm-confirm-modal-visitor-row">
            <div className="vm-activity-avatar avatar-green">{initials(visitorName)}</div>
            <div className="vm-confirm-modal-visitor-copy">
              <strong>{visitorName}</strong>
              <span>Mobile: {mobile}</span>
            </div>
            <span className="vm-badge-approved">CONFIRMED</span>
          </div>

          <div className="vm-confirm-modal-grid">
            <div className="vm-confirm-modal-item">
              <span className="vm-confirm-modal-label">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2.2" aria-hidden>
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                HOST
              </span>
              <strong className="vm-confirm-modal-val">{host}</strong>
            </div>

            <div className="vm-confirm-modal-item">
              <span className="vm-confirm-modal-label">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2.2" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                PURPOSE
              </span>
              <strong className="vm-confirm-modal-val">{purpose}</strong>
            </div>

            <div className="vm-confirm-modal-item">
              <span className="vm-confirm-modal-label">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563eb" strokeWidth="2.2" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                TIME
              </span>
              <strong className="vm-confirm-modal-val">{time}</strong>
            </div>
          </div>
        </div>

        <div className="vm-confirm-modal-actions">
          <button
            type="button"
            className="vm-confirm-act-btn is-primary"
            disabled={busyGen || busySend}
            onClick={() => void handleGenerate()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M7 8h5M7 12h5M7 16h3" />
              <circle cx="16.5" cy="11.5" r="2.5" />
            </svg>
            <span>{busyGen ? "Opening Gate Pass…" : "View Gate Pass"}</span>
          </button>

          <button
            type="button"
            className="vm-confirm-act-btn is-secondary"
            disabled={busyGen || busySend}
            onClick={() => void handleSend()}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span>{busySend ? "Sending Gate Pass..." : `Send Gate Pass to Visitor (${mobile})`}</span>
          </button>
        </div>

        <button type="button" className="vm-confirm-modal-done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
