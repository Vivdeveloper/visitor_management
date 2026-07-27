import { useEffect, useMemo, useState } from "react";
import { settingsApi, type VisitorListRow } from "@/api/vms";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { buildFloorOptions } from "@/lib/floorOptions";
import { initials } from "@/lib/format";

type Props = {
  visitor: VisitorListRow | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (visitor: VisitorListRow, floor: string) => Promise<void> | void;
};

export function ApprovalFloorModal({ visitor, open, busy = false, onClose, onConfirm }: Props) {
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
        setFloors(buildFloorOptions(masters || {}));
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

  const floorOptions = useMemo(
    () => floors.map((f) => ({ value: f.value, label: f.display })),
    [floors],
  );

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
    <div className="vm-confirm-modal-root" role="dialog" aria-modal="true" aria-labelledby="vm-approval-floor-title">
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onClose} aria-label="Close" />

      <div className="vm-confirm-modal-card vm-checkin-floor-card">
        <button type="button" className="vm-confirm-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="vm-confirm-modal-top">
          <div className="vm-confirm-modal-icon-badge is-checkin" aria-hidden>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <h2 id="vm-approval-floor-title" className="vm-confirm-modal-title">
            Approve Visitor
          </h2>
          <p className="vm-confirm-modal-sub">
            Select the floor for <strong>{visitorName}</strong> before approval.
          </p>
        </div>

        <div className="vm-confirm-modal-info-box">
          <div className="vm-confirm-modal-visitor-row">
            <div className="vm-activity-avatar avatar-orange">{initials(visitorName)}</div>
            <div className="vm-confirm-modal-visitor-copy">
              <strong>{visitorName}</strong>
              <span>{visitor.name}</span>
            </div>
            <span className="vm-badge-pending">PENDING</span>
          </div>
        </div>

        <div className="vm-checkin-floor-form">
          <label className="vm-sheet-label" htmlFor="approval-floor-select">
            Floor No.
          </label>
          <SearchSelect
            id="approval-floor-select"
            value={floor}
            options={floorOptions}
            onChange={setFloor}
            placeholder="Select"
            searchPlaceholder="Search floor"
            loading={loadingFloors}
            loadingText="Loading floors…"
            disabled={busy}
            required
            allowEmpty
            aria-label="Floor"
          />
          {error ? <p className="login-error vm-sheet-error">{error}</p> : null}
        </div>

        <div className="vm-confirm-modal-actions">
          <button type="button" className="vm-confirm-act-btn is-secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="vm-confirm-act-btn is-primary"
            disabled={busy || loadingFloors}
            onClick={() => void handleConfirm()}
          >
            {busy ? "Approving…" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
