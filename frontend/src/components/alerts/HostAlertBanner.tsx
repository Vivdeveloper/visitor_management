import type { ActiveHostAlert } from "@/services/hostAlertManager";

type Props = {
  alert: ActiveHostAlert;
  onReview: () => void;
};

export function HostAlertBanner({ alert, onReview }: Props) {
  const minutesWaiting = Math.max(1, Math.floor((Date.now() - alert.receivedAt) / 60_000));

  return (
    <div className="vm-host-alert-banner" role="alertdialog" aria-live="assertive" aria-label="Urgent visitor alert">
      <div className="vm-host-alert-pulse" aria-hidden />
      <div className="vm-host-alert-inner">
        <div className="vm-host-alert-icon-wrap" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        <div className="vm-host-alert-copy">
          <strong className="vm-host-alert-title">Visitor waiting at gate</strong>
          <p className="vm-host-alert-name">{alert.visitorName}</p>
          <p className="vm-host-alert-message">{alert.message}</p>
          <span className="vm-host-alert-meta">
            {minutesWaiting} min waiting
            {alert.reminderCount > 0 ? ` · Reminder ${alert.reminderCount + 1}` : ""}
          </span>
        </div>

        <button type="button" className="vm-host-alert-cta" onClick={onReview}>
          Review
        </button>
      </div>
    </div>
  );
}
