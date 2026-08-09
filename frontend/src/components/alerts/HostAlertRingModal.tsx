import type { ActiveHostAlert } from "@/services/hostAlertManager";

type Props = {
  alert: ActiveHostAlert;
  onReview: () => void;
};

export function HostAlertRingModal({ alert, onReview }: Props) {
  const minutesWaiting = Math.max(1, Math.floor((Date.now() - alert.receivedAt) / 60_000));
  const isSecurity = alert.variant === "security";
  const isCreator = alert.variant === "creator";

  const kicker = isSecurity
    ? "Checkout required"
    : isCreator
      ? alert.title || "Visitor update"
      : alert.title || "Visitor at gate";

  const meta = isSecurity
    ? `Checkout pending${alert.reminderCount > 0 ? ` · Reminder ${alert.reminderCount + 1}` : ""}`
    : isCreator
      ? `Action needed${alert.reminderCount > 0 ? ` · Ring ${alert.reminderCount + 1}` : ""}`
      : `Waiting ${minutesWaiting} min${alert.reminderCount > 0 ? ` · Ring ${alert.reminderCount + 1}` : ""}`;

  const cta = isSecurity
    ? "Open Inside / Checkout"
    : isCreator
      ? "Open visit"
      : "Allow / Review";

  return (
    <div className="vm-host-ring-modal" role="alertdialog" aria-modal="true" aria-live="assertive">
      <div className="vm-host-ring-backdrop" aria-hidden />
      <div className="vm-host-ring-waves" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <div className="vm-host-ring-card">
        <div className="vm-host-ring-bell" aria-hidden>
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.2">
            {isSecurity ? (
              <>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </>
            ) : (
              <>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </>
            )}
          </svg>
        </div>

        <p className="vm-host-ring-kicker">{kicker}</p>
        <h2 className="vm-host-ring-name">{alert.visitorName}</h2>
        <p className="vm-host-ring-message">{alert.message}</p>
        <p className="vm-host-ring-meta">{meta}</p>

        <button type="button" className="vm-host-ring-cta" onClick={onReview}>
          {cta}
        </button>
      </div>
    </div>
  );
}
