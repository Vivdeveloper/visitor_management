import { useState } from "react";
import type { VisitorListRow } from "@/api/vms";
import { PhotoPreviewModal } from "@/components/common/PhotoPreviewModal";
import { formatCount, formatTime, resolveFileUrl } from "@/lib/format";
import { intlLocale, localizeDigits } from "@/lib/localize";
import { formatVisitorCardTitle } from "@/lib/visitorDisplay";
import { localizeFloorLabel, localizePersonName } from "@/lib/transliterate";
import { getCurrentStageTimestamp } from "@/lib/visitStages";
import { VisitorAvatar } from "@/components/ui/VisitorAvatar";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { translateVisitorStatus, ut } from "@/i18n/uiChrome";

type Props = {
  item: VisitorListRow;
  busy?: boolean;
  /** When true, Accept/Reject stay visible but disabled (non-approver roles). */
  approveBlocked?: boolean;
  onOpen?: () => void;
  onApprove?: (item: VisitorListRow) => void;
  onReject?: (item: VisitorListRow) => void;
  onNotifyHost?: (item: VisitorListRow) => void;
  onTransfer?: (item: VisitorListRow) => void;
  onViewDetails?: (item: VisitorListRow) => void;
  onGenerateGatePass?: (item: VisitorListRow) => void;
  onCheckIn?: (item: VisitorListRow) => void;
  onMeetingDone?: (item: VisitorListRow) => void;
  onCheckOut?: (item: VisitorListRow) => void;
  onCancel?: (item: VisitorListRow) => void;
};

function statusTone(status?: string) {
  if (status === "Pending Approval" || status === "Pending") return "is-awaiting";
  if (status === "Approved") return "is-approved";
  if (status === "Checked In" || status === "Meeting Done") return "is-in";
  if (status === "Rejected") return "is-rejected";
  if (status === "Checked Out") return "is-out";
  return "is-awaiting";
}

export function PendingDecisionCard({
  item,
  busy = false,
  approveBlocked = false,
  onOpen,
  onApprove,
  onReject,
  onNotifyHost,
  onTransfer,
  onGenerateGatePass,
  onCheckIn,
  onMeetingDone,
  onCheckOut,
  onCancel,
}: Props) {
  const { lang } = useAppLanguage();
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState<string | null>(null);

  const visitorName = localizePersonName(item.full_name || item.name, lang);
  const cardTitle = formatVisitorCardTitle(visitorName, item.visitor_company);
  const hostName = localizePersonName(item.person_to_meet_name || "—", lang);
  const company = (item.visitor_company || "").trim();
  const location = (item.visitor_location || "").trim();
  const purpose = item.visit_purpose_type
    ? localizePersonName(item.visit_purpose_type, lang)
    : "—";
  const rawTimestamp = getCurrentStageTimestamp(item);
  const dateLabel = (() => {
    if (!rawTimestamp) return "";
    const d = new Date(rawTimestamp);
    if (isNaN(d.getTime())) return "";
    return localizeDigits(
      d.toLocaleDateString(intlLocale(lang), { day: "2-digit", month: "short" }),
      lang,
    );
  })();
  const timeLabel = formatTime(rawTimestamp, lang) || "—";
  const dateTimeLabel = dateLabel ? `${dateLabel} • ${timeLabel}` : timeLabel;
  const displayStatus = translateVisitorStatus(lang, item.status, { short: true });
  const tone = statusTone(item.status);

  const isPending = item.status === "Pending Approval" || item.status === "Pending";
  const isApproved = item.status === "Approved";
  const isMeetingDone = item.status === "Meeting Done";
  const showCancel = !!onCancel && (isPending || isApproved);
  const showSecurityCheckout = !!onCheckOut && isMeetingDone;
  const showInsideActions = !!(onMeetingDone || showSecurityCheckout);
  const showPendingPrimaryActions = isPending && (!!onReject || !!onApprove || approveBlocked);
  const showPendingSecondaryActions =
    isPending && (!!onTransfer || !!onNotifyHost || showCancel);
  const decideDisabled = busy || approveBlocked;
  const decideTitle = approveBlocked
    ? "You do not have permission to Accept or Reject"
    : undefined;
  const visitorCount = item.number_of_visitors ? Number(item.number_of_visitors) : 1;
  const floorDisplay = item.floor
    ? localizeFloorLabel(item.floor, lang) || localizeDigits(String(item.floor), lang)
    : "—";

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
            </div>
            <span className={`vm-pending-redesign-badge ${tone}`}>{displayStatus}</span>
            <div className="vm-pending-redesign-meta-stack">
              <div className="vm-pending-redesign-host-row">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
                <span className="vm-pending-redesign-host-text">
                  {ut(lang, "host_prefix")}{" "}
                  <span className="vm-pending-redesign-host-name">{hostName}</span>
                </span>
              </div>
              {company ? (
                <div className="vm-pending-redesign-host-row">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <path d="M3 21h18" />
                    <path d="M5 21V7l7-4 7 4v14" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                  <span className="vm-pending-redesign-host-text">
                    {ut(lang, "company_prefix")}{" "}
                    <span className="vm-pending-redesign-host-name">{company}</span>
                  </span>
                </div>
              ) : null}
              {location ? (
                <div className="vm-pending-redesign-host-row">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                    <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  <span className="vm-pending-redesign-host-text">
                    {ut(lang, "location_prefix")}{" "}
                    <span className="vm-pending-redesign-host-name">{location}</span>
                  </span>
                </div>
              ) : null}
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
              <span>{ut(lang, "label_visitors")}</span>
            </div>
            <span className="vm-pending-redesign-val">{formatCount(visitorCount, lang)}</span>
          </div>

          <div className="vm-pending-redesign-col">
            <div className="vm-pending-redesign-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span>{ut(lang, "label_purpose")}</span>
            </div>
            <span className="vm-pending-redesign-val">{purpose}</span>
          </div>

          <div className="vm-pending-redesign-col">
            <div className="vm-pending-redesign-label">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
              </svg>
              <span>{ut(lang, "label_floor")}</span>
            </div>
            <span className="vm-pending-redesign-val">{floorDisplay}</span>
          </div>
        </div>

        {showPendingPrimaryActions ? (
          <div className="vm-pending-redesign-actions is-pending-row">
            <button
              type="button"
              className="vm-redesign-act-btn is-reject"
              disabled={decideDisabled}
              title={decideTitle}
              onClick={(e) => {
                e.stopPropagation();
                if (decideDisabled || !onReject) return;
                onReject(item);
              }}
              aria-label={`${ut(lang, "action_reject")} ${visitorName}`}
            >
              <span className="vm-redesign-act-icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m15 9-6 6M9 9l6 6" />
                </svg>
              </span>
              <span>{ut(lang, "action_reject")}</span>
            </button>

            <button
              type="button"
              className="vm-redesign-act-btn is-accept"
              disabled={decideDisabled}
              title={decideTitle}
              onClick={(e) => {
                e.stopPropagation();
                if (decideDisabled || !onApprove) return;
                onApprove(item);
              }}
              aria-label={`${ut(lang, "action_accept")} ${visitorName}`}
            >
              <span className="vm-redesign-act-icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span>{ut(lang, "action_accept")}</span>
            </button>
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
                aria-label={`${ut(lang, "action_transfer")} ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7" />
                  </svg>
                </span>
                <span>{ut(lang, "action_transfer")}</span>
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
                aria-label={`${ut(lang, "action_notify")} ${visitorName}`}
                title="Push notification to host"
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <span>{ut(lang, "action_notify")}</span>
              </button>
            ) : null}

            {showCancel ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-cancel-entry"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel?.(item);
                }}
                aria-label={`${ut(lang, "action_cancel")} ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m15 9-6 6M9 9l6 6" />
                  </svg>
                </span>
                <span>{ut(lang, "action_cancel")}</span>
              </button>
            ) : null}
          </div>
        ) : null}

        {isApproved && (onGenerateGatePass || onCheckIn || showCancel) ? (
          <div className="vm-pending-redesign-actions is-pending-row is-approved-row">
            {onGenerateGatePass ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-gate-pass"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateGatePass(item);
                }}
                aria-label={`${ut(lang, "action_view_gate_pass")} ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M7 9h4M7 13h10" />
                    <circle cx="16.5" cy="9.5" r="1.5" />
                  </svg>
                </span>
                <span>{ut(lang, "action_view_gate_pass")}</span>
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
                aria-label={`${ut(lang, "action_check_in")} ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>{ut(lang, "action_check_in")}</span>
              </button>
            ) : null}

            {showCancel ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-cancel-entry"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel?.(item);
                }}
                aria-label={`${ut(lang, "action_cancel")} ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m15 9-6 6M9 9l6 6" />
                  </svg>
                </span>
                <span>{ut(lang, "action_cancel")}</span>
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
                aria-label={`${ut(lang, "action_meeting_done")} ${visitorName}`}
                title={ut(lang, "action_meeting_done")}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                <span>{ut(lang, "action_meeting_done")}</span>
              </button>
            ) : null}

            {showSecurityCheckout ? (
              <button
                type="button"
                className="vm-redesign-act-btn is-checkout-direct"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckOut?.(item);
                }}
                aria-label={`${ut(lang, "action_check_out")} ${visitorName}`}
              >
                <span className="vm-redesign-act-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </span>
                <span>{ut(lang, "action_check_out")}</span>
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
