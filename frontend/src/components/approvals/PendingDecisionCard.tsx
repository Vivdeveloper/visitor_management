import { useState } from "react";
import type { VisitorListRow } from "@/api/vms";
import { PhotoPreviewModal } from "@/components/common/PhotoPreviewModal";
import { formatTime, resolveFileUrl } from "@/lib/format";
import { formatVisitorCardTitle } from "@/lib/visitorDisplay";
import { getCurrentStageTimestamp } from "@/lib/visitStages";
import { VisitorAvatar } from "@/components/ui/VisitorAvatar";

type Props = {
  item: VisitorListRow;
  busy?: boolean;
  onOpen?: () => void;
  onApprove?: (item: VisitorListRow) => void;
  onReject?: (item: VisitorListRow) => void;
  onNotifyHost?: (item: VisitorListRow) => void;
  onTransfer?: (item: VisitorListRow) => void;
  onViewDetails?: (item: VisitorListRow) => void;
  onCallHost?: (item: VisitorListRow) => void;
  onGenerateGatePass?: (item: VisitorListRow) => void;
  onCheckIn?: (item: VisitorListRow) => void;
  onMeetingDone?: (item: VisitorListRow) => void;
  onCheckOut?: (item: VisitorListRow) => void;
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
  if (status === "Meeting Done") return "Meeting Done";
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
  onTransfer,
  onCallHost,
  onGenerateGatePass,
  onCheckIn,
  onMeetingDone,
  onCheckOut,
}: Props) {
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState<string | null>(null);

  const visitorName = item.full_name || item.name;
  const cardTitle = formatVisitorCardTitle(visitorName, item.visitor_company);
  const hostName = item.person_to_meet_name || "—";
  const purpose = item.visit_purpose_type || "—";
  const rawTimestamp = getCurrentStageTimestamp(item);
  const dateLabel = (() => {
    if (!rawTimestamp) return "";
    const d = new Date(rawTimestamp);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString([], { day: "2-digit", month: "short" });
  })();
  const timeLabel = formatTime(rawTimestamp) || "—";
  const dateTimeLabel = dateLabel ? `${dateLabel} • ${timeLabel}` : timeLabel;
  const displayStatus = statusLabel(item.status);
  const tone = statusTone(item.status);

  const isPending = item.status === "Pending Approval" || item.status === "Pending";
  const isApproved = item.status === "Approved";
  const isMeetingDone = item.status === "Meeting Done";
  const showInsideActions = !!(onMeetingDone || onCheckOut);
  const showPendingPrimaryActions = isPending && (!!onReject || !!onApprove);
  const showPendingSecondaryActions = isPending && (!!onTransfer || !!onCallHost || !!onNotifyHost);
  const gridThirdLabel = "FLOOR";
  const gridThirdValue = item.floor || "—";

  return (
    <>
      <div className={`vm-pending-redesign-card${busy ? " is-busy" : ""}`} data-status={item.status}>
        <div
          className="vm-pending-redesign-head"
          onClick={onOpen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onOpen?.()}
        >
          <button
            type="button"
            className={`vm-pending-redesign-avatar-btn${item.photo ? " is-clickable" : ""}`}
            aria-label={`Preview photo for ${visitorName}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const src = resolveFileUrl(item.photo);
              if (src) setPhotoPreviewSrc(src);
            }}
          >
            <VisitorAvatar
              name={visitorName}
              photo={item.photo}
              className={`vm-pending-redesign-avatar ${tone}`}
            />
          </button>

          <div className="vm-pending-redesign-title-block">
            <div className="vm-pending-redesign-title-row">
              <span className="vm-pending-redesign-name" title={cardTitle}>
                {cardTitle}
              </span>
              {item.floor ? (
                <span className="vm-pending-floor-pill" title={`Floor ${item.floor}`}>
                  Floor {item.floor}
                </span>
              ) : null}
            </div>
            <span className={`vm-pending-redesign-badge ${tone}`}>{displayStatus}</span>
            <div className="vm-pending-redesign-host-row">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              </svg>
              <span className="vm-pending-redesign-host-text">
                Host: <span className="vm-pending-redesign-host-name">{hostName}</span>
              </span>
            </div>
          </div>

          <div className="vm-pending-redesign-time-block">
            <span className="vm-pending-redesign-id">{item.name}</span>
            <span className="vm-pending-redesign-time">{dateTimeLabel}</span>
          </div>
        </div>

        <div className="vm-pending-redesign-divider" />

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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>VISITORS</span>
            </div>
            <span className="vm-pending-redesign-val">{item.number_of_visitors ? String(item.number_of_visitors) : "1"}</span>
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

          <div className="vm-pending-redesign-col">
            <div className="vm-pending-redesign-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
              </svg>
              <span>{gridThirdLabel}</span>
            </div>
            <span className="vm-pending-redesign-val">{gridThirdValue}</span>
          </div>
        </div>

        {showPendingPrimaryActions ? (
          <div className="vm-pending-redesign-actions is-pending-row">
            {onReject ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-reject"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(item);
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
            ) : null}

            {onApprove ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-accept"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(item);
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
            ) : null}
          </div>
        ) : null}

        {showPendingSecondaryActions ? (
          <div className="vm-pending-redesign-actions is-pending-sub-row">
            {onTransfer ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-transfer"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onTransfer(item);
                }}
                aria-label={`Transfer ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7" />
                  </svg>
                </span>
                <span>Transfer</span>
              </button>
            ) : null}

            {onCallHost ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-callhost"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onCallHost(item);
                }}
                aria-label={`Call host for ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
                  </svg>
                </span>
                <span>Call Host</span>
              </button>
            ) : null}

            {onNotifyHost ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-bell"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onNotifyHost(item);
                }}
                aria-label={`Notify host for ${visitorName}`}
                title="Push notification to host"
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <span>Notify</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {isApproved && (onGenerateGatePass || onCheckIn) ? (
          <div className={`vm-pending-redesign-actions is-approved-pass${onGenerateGatePass && onCheckIn ? " has-both" : ""}`}>
            {onGenerateGatePass ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-gate-pass"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateGatePass(item);
                }}
                aria-label={`View gate pass for ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M7 9h4M7 13h10" />
                    <circle cx="16.5" cy="9.5" r="1.5" />
                  </svg>
                </span>
                <span>View Gate Pass</span>
              </button>
            ) : null}

            {onCheckIn ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-checkin-direct"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckIn(item);
                }}
                aria-label={`Check in ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>Check In</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {showInsideActions ? (
          <div
            className={`vm-pending-redesign-actions is-approved-pass${onMeetingDone && onCheckOut ? " has-both" : ""}`}
          >
            {onMeetingDone ? (
              <button
                type="button"
                className={`vm-redesign-act-btn is-meeting-done${isMeetingDone ? " is-done" : ""}`}
                disabled={busy || isMeetingDone || !onMeetingDone}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMeetingDone || !onMeetingDone) return;
                  onMeetingDone(item);
                }}
                aria-label={
                  isMeetingDone
                    ? `Meeting already completed for ${visitorName}`
                    : `Mark meeting done for ${visitorName}`
                }
                title={isMeetingDone ? "Meeting already completed" : "Mark meeting done"}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                <span>Meeting Done</span>
              </button>
            ) : null}

            {onCheckOut ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-checkout-direct"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckOut(item);
                }}
                aria-label={`Check out ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </span>
                <span>Check Out</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <PhotoPreviewModal
        src={photoPreviewSrc}
        alt={`${visitorName} photo`}
        onClose={() => setPhotoPreviewSrc(null)}
      />
    </>
  );
}
