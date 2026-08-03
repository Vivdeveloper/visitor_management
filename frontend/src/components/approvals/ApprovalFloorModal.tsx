import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !visitor) return;
    setError(null);
    setSubmitting(false);
    setFloor(visitor.floor || "");
    setLoadingFloors(true);
    let cancelled = false;
    void settingsApi
      .getMasters()
      .then((masters) => {
        if (cancelled) return;
        const options = buildFloorOptions(masters || {});
        setFloors(options);
        // Keep existing floor only if it still exists in Floor master
        if (visitor.floor && !options.some((o) => o.value === visitor.floor)) {
          setFloor("");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFloors([]);
        setError(err instanceof Error ? err.message : "Could not load floors from Floor master.");
      })
      .finally(() => {
        if (!cancelled) setLoadingFloors(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, visitor]);

  const floorOptions = useMemo(
    () =>
      floors.map((f) => ({
        value: f.value,
        label: f.display,
      })),
    [floors],
  );

  if (!open || !visitor) return null;

  const visitorName = visitor.full_name || visitor.name;
  const isBusy = busy || submitting;

  async function handleConfirm() {
    if (!visitor) return;
    if (!floors.length) {
      setError("No floors found. Add Floor records in Desk (Visitor Management → Floor).");
      return;
    }
    if (!floor.trim()) {
      setError("Please select a floor.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(visitor, floor.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
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
            Floor No. <span className="vm-required-star" aria-hidden>*</span>
          </label>
          <SearchSelect
            id="approval-floor-select"
            value={floor}
            options={floorOptions}
            onChange={(val) => {
              setFloor(val);
              setError(null);
            }}
            placeholder={loadingFloors ? "Loading floors…" : floors.length ? "Select" : "No floors configured"}
            searchPlaceholder="Search floor"
            loading={loadingFloors}
            loadingText="Loading floors…"
            emptyText="No floors found in Floor master"
            disabled={isBusy || loadingFloors || floors.length === 0}
            required
            allowEmpty
            menuPlacement="top"
            aria-label="Floor"
          />
          {error ? <p className="login-error vm-sheet-error">{error}</p> : null}
        </div>

        <div className="vm-confirm-modal-actions">
          <button type="button" className="vm-confirm-act-btn is-secondary" disabled={isBusy} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="vm-confirm-act-btn is-primary"
            disabled={isBusy || loadingFloors || floors.length === 0}
            onClick={() => void handleConfirm()}
          >
            {isBusy ? "Approving…" : "Approve"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
