import { useMemo } from "react";
import type { VisitorListRow } from "@/api/vms";
import { formatCount, formatWaitDuration } from "@/lib/format";
import { formatStageTimestamp } from "@/lib/visitStages";
import { localizeFloorLabel, localizePersonName } from "@/lib/transliterate";
import { VisitorAvatar } from "@/components/ui/VisitorAvatar";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { ut } from "@/i18n/uiChrome";

type CheckoutPendingReportProps = {
  rows: VisitorListRow[];
  loading?: boolean;
  showCheckoutAction?: boolean;
  checkoutBusyId?: string | null;
  onOpenVisitor: (row: VisitorListRow) => void;
  onCheckout?: (row: VisitorListRow) => void;
};

export function CheckoutPendingReport({
  rows,
  loading = false,
  showCheckoutAction = false,
  checkoutBusyId = null,
  onOpenVisitor,
  onCheckout,
}: CheckoutPendingReportProps) {
  const { lang } = useAppLanguage();
  const pending = useMemo(
    () =>
      rows
        .filter((row) => row.status === "Meeting Done")
        .sort((a, b) => {
          const left = a.meeting_done_on || a.modified || a.creation || "";
          const right = b.meeting_done_on || b.modified || b.creation || "";
          return left.localeCompare(right);
        }),
    [rows],
  );

  return (
    <div className="vm-checkout-pending-report">
      <div className="vm-checkout-pending-summary">
        <div className="vm-checkout-pending-summary-copy">
          <p className="vm-checkout-pending-kicker">{ut(lang, "live_queue")}</p>
          <h3 className="vm-checkout-pending-title">{ut(lang, "status_checkout_pending")}</h3>
          <p className="vm-checkout-pending-sub">{ut(lang, "checkout_pending_queue_sub")}</p>
        </div>
        <div className="vm-checkout-pending-count" aria-live="polite">
          <strong>{loading ? "—" : formatCount(pending.length, lang)}</strong>
          <span>{ut(lang, "pending_count_label")}</span>
        </div>
      </div>

      {loading ? (
        <p className="vm-empty-hint">{ut(lang, "loading_checkout_queue")}</p>
      ) : pending.length === 0 ? (
        <div className="vm-checkout-pending-empty">
          <div className="vm-checkout-pending-empty-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <strong>{ut(lang, "no_checkout_pending")}</strong>
          <p>{ut(lang, "no_checkout_pending_sub")}</p>
        </div>
      ) : (
        <div className="vm-checkout-pending-list">
          {pending.map((row, idx) => {
            const visitorName = localizePersonName(row.full_name || row.name, lang);
            const waiting = formatWaitDuration(row.meeting_done_on, lang);
            const meetingDoneLabel = formatStageTimestamp(row.meeting_done_on, true, lang);
            const checkedInLabel = formatStageTimestamp(row.checked_in_on, true, lang);
            const hostName = localizePersonName(row.person_to_meet_name || "—", lang);
            const purpose = row.visit_purpose_type
              ? localizePersonName(row.visit_purpose_type, lang)
              : "—";
            const floor = row.floor ? localizeFloorLabel(row.floor, lang) || row.floor : "—";

            return (
              <article
                key={row.name}
                className="vm-checkout-pending-card"
                style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
              >
                <button
                  type="button"
                  className="vm-checkout-pending-main"
                  onClick={() => onOpenVisitor(row)}
                >
                  <VisitorAvatar
                    name={row.full_name || row.name}
                    photo={row.photo}
                    className="vm-checkout-pending-avatar"
                  />
                  <div className="vm-checkout-pending-body">
                    <div className="vm-checkout-pending-head">
                      <strong>{visitorName}</strong>
                      <span className="vm-checkout-pending-id">{row.name}</span>
                    </div>
                    <p className="vm-checkout-pending-host">
                      {ut(lang, "host_prefix")} {hostName}
                    </p>
                    <div className="vm-checkout-pending-meta-grid">
                      <div>
                        <span className="lbl">{ut(lang, "action_meeting_done")}</span>
                        <span className="val">{meetingDoneLabel}</span>
                      </div>
                      <div>
                        <span className="lbl">{ut(lang, "action_check_in")}</span>
                        <span className="val">{checkedInLabel}</span>
                      </div>
                      <div>
                        <span className="lbl">{ut(lang, "label_purpose")}</span>
                        <span className="val">{purpose}</span>
                      </div>
                      <div>
                        <span className="lbl">{ut(lang, "label_floor")}</span>
                        <span className="val">{floor}</span>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="vm-checkout-pending-foot">
                  <span className="vm-checkout-pending-wait">
                    {waiting
                      ? `${ut(lang, "waiting_label")} ${waiting}`
                      : ut(lang, "awaiting_checkout")}
                  </span>
                  <div className="vm-checkout-pending-actions">
                    <button
                      type="button"
                      className="vm-checkout-pending-link"
                      onClick={() => onOpenVisitor(row)}
                    >
                      {ut(lang, "view")}
                    </button>
                    {showCheckoutAction && onCheckout ? (
                      <button
                        type="button"
                        className="vm-checkout-pending-checkout"
                        disabled={checkoutBusyId === row.name}
                        onClick={() => onCheckout(row)}
                      >
                        {checkoutBusyId === row.name
                          ? ut(lang, "checking_out")
                          : ut(lang, "action_check_out")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
