import type { VisitorListRow } from "@/api/vms";
import { formatTime, initials } from "@/lib/format";

type Props = {
  item: VisitorListRow;
  busy?: boolean;
  onOpen?: () => void;
  onApprove?: (item: VisitorListRow) => void;
  onReject?: (item: VisitorListRow) => void;
  onNotifyHost?: (item: VisitorListRow) => void;
  onGenerateGatePass?: (item: VisitorListRow) => void;
};

function statusTone(status?: string) {
  if (status === "Pending Approval" || status === "Pending") return "is-awaiting";
  if (status === "Approved") return "is-approved";
  if (status === "Checked In" || status === "Meeting Done") return "is-in";
  if (status === "Rejected") return "is-rejected";
  if (status === "Checked Out") return "is-out";
  return "is-awaiting";
}

function statusLabel(status?: string) {
  if (!status) return "—";
  if (status === "Pending Approval") return "Pending";
  if (status === "Meeting Done") return "Inside";
  if (status === "Approved") return "Approved";
  return status;
}

export function PendingDecisionCard({
  item,
  busy = false,
  onOpen,
  onApprove,
  onReject,
  onNotifyHost,
  onGenerateGatePass,
}: Props) {
  const visitorName = item.full_name || item.name;
  const company = item.visitor_company || "—";
  const hostName = item.person_to_meet_name || "—";
  const purpose = item.visit_purpose_type || "—";
  const timeLabel = formatTime(item.check_in || item.checked_in_on || item.modified || item.creation) || "15:46";
  const displayStatus = statusLabel(item.status);
  const tone = statusTone(item.status);

  const isPending = item.status === "Pending Approval" || item.status === "Pending";
  const isApproved = item.status === "Approved";

  return (
    <div
      className={`vm-pending-redesign-card${busy ? " is-busy" : ""}`}
      data-status={item.status}
    >
      {/* Top Header Row */}
      <div
        className="vm-pending-redesign-head"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onOpen?.()}
      >
        <div className={`vm-pending-redesign-avatar ${tone}`} aria-hidden>
          {initials(visitorName)}
        </div>

        <div className="vm-pending-redesign-title-block">
          <strong className="vm-pending-redesign-name">{visitorName}</strong>
          <span className={`vm-pending-redesign-badge ${tone}`}>{displayStatus}</span>
        </div>

        <div className="vm-pending-redesign-time-block">
          <span className="vm-pending-redesign-time">{timeLabel}</span>
          <svg className="vm-pending-redesign-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>

      <div className="vm-pending-redesign-divider" />

      {/* 3-Column Info Grid */}
      <div
        className="vm-pending-redesign-grid"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onOpen?.()}
      >
        <div className="vm-pending-redesign-col">
          <div className="vm-pending-redesign-label">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
            </svg>
            <span>COMPANY</span>
          </div>
          <span className="vm-pending-redesign-val">{company}</span>
        </div>

        <div className="vm-pending-redesign-col">
          <div className="vm-pending-redesign-label">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
            <span>HOST</span>
          </div>
          <span className="vm-pending-redesign-val">{hostName}</span>
        </div>

        <div className="vm-pending-redesign-col">
          <div className="vm-pending-redesign-label">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span>PURPOSE</span>
          </div>
          <span className="vm-pending-redesign-val">{purpose}</span>
        </div>
      </div>

      {/* Action Buttons Row — Only shown for Pending Approval visitors */}
      {isPending ? (
        <div className="vm-pending-redesign-actions">
          <button
            type="button"
            className="vm-redesign-act-btn is-reject"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onReject?.(item);
            }}
            aria-label={`Reject ${visitorName}`}
          >
            <span className="vm-redesign-act-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="9" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
            </span>
            <span>Reject</span>
          </button>

          <button
            type="button"
            className="vm-redesign-act-btn is-bell"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onNotifyHost?.(item);
            }}
            aria-label={`Notify host for ${visitorName}`}
            title="Push notification to host"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          <button
            type="button"
            className="vm-redesign-act-btn is-accept"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onApprove?.(item);
            }}
            aria-label={`Accept ${visitorName}`}
          >
            <span className="vm-redesign-act-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="9" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <span>Accept</span>
          </button>
        </div>
      ) : null}

      {/* Gate pass — Approved tab cards only */}
      {isApproved && onGenerateGatePass ? (
        <div className="vm-pending-redesign-actions is-approved-pass">
          <button
            type="button"
            className="vm-redesign-act-btn is-gate-pass"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onGenerateGatePass(item);
            }}
            aria-label={`Generate gate pass for ${visitorName}`}
          >
            <span className="vm-redesign-act-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M7 9h4M7 13h10" />
                <circle cx="16.5" cy="9.5" r="1.5" />
              </svg>
            </span>
            <span>Generate Gate Pass</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
