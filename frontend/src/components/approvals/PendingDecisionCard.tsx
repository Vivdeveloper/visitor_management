import { useEffect, useRef, useState } from "react";
import type { VisitorListRow } from "@/api/vms";
import { PhotoPreviewModal } from "@/components/common/PhotoPreviewModal";
import { formatTime, resolveFileUrl } from "@/lib/format";
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
  onViewDetails,
  onCallHost,
  onGenerateGatePass,
  onCheckIn,
  onMeetingDone,
  onCheckOut,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const visitorName = item.full_name || item.name;
  const hostName = item.person_to_meet_name || "—";
  const purpose = item.visit_purpose_type || "—";
  const rawTimestamp = item.check_in || item.checked_in_on || item.modified || item.creation;
  const dateLabel = (() => {
    if (!rawTimestamp) return "";
    const d = new Date(rawTimestamp);
    if (isNaN(d.getTime())) return "";
    // Compact date: "27 Jul"
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
  const showCardMenu = !!(onTransfer || onViewDetails || onCallHost);
  const showPendingActions = isPending && (!!onReject || !!onNotifyHost || !!onApprove);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [menuOpen]);

  return (
    <>
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
        <button
          type="button"
          aria-label={`Preview photo for ${visitorName}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            const src = resolveFileUrl(item.photo);
            if (src) setPhotoPreviewSrc(src);
          }}
          style={{
            background: "transparent",
            border: 0,
            padding: 0,
            margin: 0,
            cursor: item.photo ? "pointer" : "default",
            borderRadius: 12,
          }}
        >
          <VisitorAvatar
            name={visitorName}
            photo={item.photo}
            className={`vm-pending-redesign-avatar ${tone}`}
          />
        </button>

        <div className="vm-pending-redesign-title-block">
          <span className="vm-pending-redesign-name">{visitorName}</span>
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
          {showCardMenu ? (
            <div className="vm-pending-card-menu-wrap" ref={menuRef}>
              <button
                type="button"
                className="vm-pending-card-menu-btn"
                aria-label={`More actions for ${visitorName}`}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                  <circle cx="12" cy="5" r="1.75" />
                  <circle cx="12" cy="12" r="1.75" />
                  <circle cx="12" cy="19" r="1.75" />
                </svg>
              </button>

              {menuOpen ? (
                <div className="vm-pending-card-menu" role="menu">
                  {isPending && onTransfer ? (
                    <button
                      type="button"
                      className="vm-pending-card-menu-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onTransfer(item);
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                        <path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7" />
                      </svg>
                      <span>Transfer</span>
                    </button>
                  ) : null}

                  {onViewDetails ? (
                    <button
                      type="button"
                      className="vm-pending-card-menu-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onViewDetails(item);
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                      </svg>
                      <span>View Details</span>
                    </button>
                  ) : null}

                  {onCallHost ? (
                    <button
                      type="button"
                      className="vm-pending-card-menu-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onCallHost(item);
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
                      </svg>
                      <span>Call Host</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <span className="vm-pending-redesign-id">{item.name}</span>
          <div className="vm-pending-redesign-time-row">
            <span className="vm-pending-redesign-time">{dateTimeLabel}</span>
            <svg className="vm-pending-redesign-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
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
            <span>FLOOR</span>
          </div>
          <span className="vm-pending-redesign-val">{item.floor || "—"}</span>
        </div>
      </div>

      {/* Action Buttons Row */}
      {showPendingActions ? (
        <div className="vm-pending-redesign-actions">
          {onReject ? (
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
          ) : null}

          {onNotifyHost ? (
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
          ) : null}

          {onApprove ? (
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
          ) : null}
        </div>
      ) : null}

      {/* Gate pass & Check In — Approved tab cards only */}
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

      {/* Inside tab — Meeting Done (locks after complete) & Check Out (always available) */}
      {showInsideActions ? (
        <div className="vm-pending-redesign-actions is-approved-pass has-both">
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
