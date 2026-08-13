import type { AdditionalGuest } from "@/lib/additionalGuests";

type Props = {
  open: boolean;
  primaryName: string;
  visitorCount: number;
  guests: AdditionalGuest[];
  onClose: () => void;
};

export function AdditionalGuestsInfoModal({
  open,
  primaryName,
  visitorCount,
  guests,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="vm-confirm-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vm-additional-guests-info-title"
    >
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onClose} aria-label="Close" />

      <div className="vm-confirm-modal-card vm-additional-guests-card">
        <div className="vm-confirm-modal-top">
          <h2 id="vm-additional-guests-info-title" className="vm-confirm-modal-title">
            Visitors ({visitorCount})
          </h2>
          <p className="vm-confirm-modal-sub">
            Primary contact and additional guests for this entry.
          </p>
        </div>

        <div className="vm-additional-guests-list">
          <div className="vm-additional-guest-row is-readonly">
            <p className="vm-additional-guest-kicker">Guest 1 (primary)</p>
            <p className="vm-additional-guest-info-name">{primaryName || "—"}</p>
          </div>

          {guests.length ? (
            guests.map((guest, index) => (
              <div key={`${guest.name}-${index}`} className="vm-additional-guest-row is-readonly">
                <p className="vm-additional-guest-kicker">Guest {index + 2}</p>
                <p className="vm-additional-guest-info-name">{guest.name.trim() || "—"}</p>
                {guest.mobile.trim() ? (
                  <p className="vm-additional-guest-info-mobile">{guest.mobile.trim()}</p>
                ) : null}
              </div>
            ))
          ) : visitorCount > 1 ? (
            <p className="vm-confirm-modal-sub" style={{ margin: 0 }}>
              No additional guest details were saved in remarks for this entry.
            </p>
          ) : null}
        </div>

        <div className="vm-confirm-modal-actions">
          <button type="button" className="vm-confirm-act-btn is-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
