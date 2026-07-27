import type { ActiveHostAlert } from "@/services/hostAlertManager";

type Props = {
  alert: ActiveHostAlert;
  onReview: () => void;
};

export function HostAlertRingModal({ alert, onReview }: Props) {
  const minutesWaiting = Math.max(1, Math.floor((Date.now() - alert.receivedAt) / 60_000));

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
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        <p className="vm-host-ring-kicker">Visitor at gate</p>
        <h2 className="vm-host-ring-name">{alert.visitorName}</h2>
        <p className="vm-host-ring-message">{alert.message}</p>
        <p className="vm-host-ring-meta">
          Waiting {minutesWaiting} min
          {alert.reminderCount > 0 ? ` · Ring ${alert.reminderCount + 1}` : ""}
        </p>

        <button type="button" className="vm-host-ring-cta" onClick={onReview}>
          Review &amp; Approve
        </button>
      </div>
    </div>
  );
}
