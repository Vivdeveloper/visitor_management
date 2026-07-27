import { useEffect, useState } from "react";
import { settingsApi, type VisitorListRow } from "@/api/vms";
import { buildFloorOptions } from "@/lib/floorOptions";
import { initials } from "@/lib/format";

type Props = {
  visitor: VisitorListRow | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (visitor: VisitorListRow, floor: string) => Promise<void> | void;
};

export function CheckInFloorModal({ visitor, open, busy = false, onClose, onConfirm }: Props) {
  const [floor, setFloor] = useState("");
  const [floors, setFloors] = useState<Array<{ value: string; display: string }>>([]);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !visitor) return;
    setError(null);
    setFloor(visitor.floor || "");
    setLoadingFloors(true);
    let cancelled = false;
    void settingsApi
      .getMasters()
      .then((masters) => {
        if (cancelled) return;
        const options = buildFloorOptions(masters || {});
        setFloors(options);
        if (!visitor.floor && options.length) {
          setFloor(options[0].value);
        }
      })
      .catch(() => {
        if (!cancelled) setFloors([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFloors(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, visitor]);

  if (!open || !visitor) return null;

  const visitorName = visitor.full_name || visitor.name;

  async function handleConfirm() {
    if (!visitor) return;
    if (!floor.trim()) {
      setError("Please select a floor.");
      return;
    }
    setError(null);
    await onConfirm(visitor, floor.trim());
  }

  return (
    <div className="vm-confirm-modal-root" role="dialog" aria-modal="true" aria-labelledby="vm-checkin-floor-title">
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onClose} aria-label="Close" />

      <div className="vm-confirm-modal-card vm-checkin-floor-card">
        <button type="button" className="vm-confirm-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="vm-confirm-modal-top">
          <div className="vm-confirm-modal-icon-badge is-checkin" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
            </svg>
          </div>
          <h2 id="vm-checkin-floor-title" className="vm-confirm-modal-title">
            Check In Visitor
          </h2>
          <p className="vm-confirm-modal-sub">
            Select the floor for <strong>{visitorName}</strong> before check-in.
          </p>
        </div>

        <div className="vm-confirm-modal-info-box">
          <div className="vm-confirm-modal-visitor-row">
            <div className="vm-activity-avatar avatar-green">{initials(visitorName)}</div>
            <div className="vm-confirm-modal-visitor-copy">
              <strong>{visitorName}</strong>
              <span>{visitor.name}</span>
            </div>
            <span className="vm-badge-approved">APPROVED</span>
          </div>
        </div>

        <div className="vm-checkin-floor-form">
          <label className="vm-sheet-label" htmlFor="checkin-floor-select">
            Floor No.
          </label>
          <select
            id="checkin-floor-select"
            className="vm-input-field"
            value={floor}
            disabled={busy || loadingFloors}
            onChange={(e) => setFloor(e.target.value)}
          >
            <option value="">{loadingFloors ? "Loading floors…" : "Select floor"}</option>
            {floors.map((f) => (
              <option key={f.value} value={f.value}>
                {f.display}
              </option>
            ))}
          </select>
          {error ? <p className="login-error vm-sheet-error">{error}</p> : null}
        </div>

        <div className="vm-confirm-modal-actions">
          <button type="button" className="vm-confirm-act-btn is-secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="vm-confirm-act-btn is-primary" disabled={busy || loadingFloors} onClick={() => void handleConfirm()}>
            {busy ? "Checking in…" : "Check In"}
          </button>
        </div>
      </div>
    </div>
  );
}
