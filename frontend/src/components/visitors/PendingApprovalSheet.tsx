import { useEffect, useMemo, useState } from "react";
import {
  approvalApi,
  settingsApi,
  type HostOption,
  type VisitorListRow,
} from "@/api/vms";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { buildFloorOptions } from "@/lib/floorOptions";
import { VisitorAvatar } from "@/components/ui/VisitorAvatar";

type SheetMode = "actions" | "accept" | "reject" | "transfer";

type Props = {
  visitor: VisitorListRow;
  open: boolean;
  initialMode?: SheetMode;
  onClose: () => void;
  onDone: () => void;
  onViewDetails: () => void;
};

export function PendingApprovalSheet({ visitor, open, initialMode = "actions", onClose, onDone, onViewDetails }: Props) {
  const [mode, setMode] = useState<SheetMode>("actions");
  const [remarks, setRemarks] = useState("");
  const [hosts, setHosts] = useState<HostOption[]>([]);
  const [transferToUser, setTransferToUser] = useState("");
  const [floor, setFloor] = useState("");
  const [floorOptions, setFloorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setRemarks("");
    setTransferToUser("");
    setFloor(visitor.floor || "");
    setError(null);
    setBusy(false);
  }, [open, visitor.name, initialMode]);

  useEffect(() => {
    if (!open || mode !== "transfer") return;
    let cancelled = false;
    void settingsApi
      .getHosts()
      .then((list) => {
        if (!cancelled) setHosts(list || []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
      setError(err instanceof Error ? err.message : "Could not load people");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  useEffect(() => {
    if (!open || mode !== "accept") return;
    let cancelled = false;
    setLoadingFloors(true);
    void settingsApi
      .getMasters()
      .then((masters) => {
        if (cancelled) return;
        setFloorOptions(
          buildFloorOptions(masters || {}).map((f) => ({
            value: f.value,
            label: f.display,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setFloorOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFloors(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  const transferHostOptions = useMemo(
    () =>
      hosts
        .filter((h) => h.value !== visitor.person_to_meet)
        .map((h) => ({
          value: h.value,
          label: h.label,
          sublabel: h.email || h.value,
        })),
    [hosts, visitor.person_to_meet],
  );

  if (!open) return null;

  async function runAccept() {
    if (!floor.trim()) {
      setError("Please select a floor.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await approvalApi.approve(visitor.name, remarks.trim() || undefined, floor.trim());
      onDone();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setBusy(false);
    }
  }

  async function runReject() {
    if (!remarks.trim()) {
      setError("Remarks are required to reject.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await approvalApi.reject(visitor.name, remarks.trim());
      onDone();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  async function runTransfer() {
    if (!transferToUser) {
      setError("Select a person to transfer to.");
      return;
    }
    if (!remarks.trim()) {
      setError("Reason / remarks are required to transfer.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await approvalApi.transfer(visitor.name, transferToUser, remarks.trim());
      onDone();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  const title = (() => {
    switch (mode) {
      case "accept":
        return "Accept Visitor";
      case "reject":
        return "Reject Visitor";
      case "transfer":
        return "Transfer Visitor";
      case "actions":
        return "Approval";
      default: {
        const _exhaustive: never = mode;
        return _exhaustive;
      }
    }
  })();

  return (
    <div className="vm-sheet-root" role="presentation">
      <button type="button" className="vm-sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className="vm-sheet-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="vm-sheet-handle" aria-hidden />

        <div className="vm-sheet-visitor">
          <VisitorAvatar
            name={visitor.full_name || visitor.name}
            photo={visitor.photo}
            className="vm-activity-avatar avatar-orange"
          />
          <div className="vm-sheet-visitor-copy">
            <strong>{visitor.full_name || visitor.name}</strong>
            <span>{visitor.person_to_meet_name || visitor.mobile || "Pending approval"}</span>
          </div>
          <span className="vm-badge-pending">PENDING</span>
        </div>

        {error ? <p className="login-error vm-sheet-error">{error}</p> : null}

        {mode === "actions" ? (
          <div className="vm-sheet-actions">
            <div className="vm-sheet-action-list">
              <button
                type="button"
                className="vm-sheet-action-row is-accept"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setMode("accept");
                }}
              >
                <span aria-hidden>✓</span>
                Accept
              </button>
              <button
                type="button"
                className="vm-sheet-action-row is-transfer"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setMode("transfer");
                }}
              >
                <span aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7" />
                  </svg>
                </span>
                Transfer
              </button>
              <button
                type="button"
                className="vm-sheet-action-row is-reject"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setMode("reject");
                }}
              >
                <span aria-hidden>×</span>
                Reject
              </button>
              <button
                type="button"
                className="vm-sheet-action-row is-call"
                disabled={busy}
                onClick={() => {
                  const mobile = visitor.mobile;
                  if (mobile && mobile !== "—") {
                    window.location.href = `tel:${mobile.replace(/\s+/g, "")}`;
                    return;
                  }
                  setError("Host / visitor phone not available.");
                }}
              >
                <span aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
                  </svg>
                </span>
                Call Host
              </button>
              <button type="button" className="vm-sheet-action-row is-details" onClick={onViewDetails}>
                <span aria-hidden>›</span>
                View Details
              </button>
            </div>
            <button type="button" className="vm-sheet-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        ) : null}

        {mode === "accept" ? (
          <div className="vm-sheet-form">
            <label className="vm-sheet-label" htmlFor="pa-accept-floor">
              Floor No.
            </label>
            <SearchSelect
              id="pa-accept-floor"
              value={floor}
              options={floorOptions}
              onChange={(val) => {
                setFloor(val);
                setError(null);
              }}
              placeholder="Select"
              searchPlaceholder="Search floor"
              loading={loadingFloors}
              loadingText="Loading floors…"
              required
              allowEmpty
              disabled={busy}
              aria-label="Floor"
            />
            <label className="vm-sheet-label" htmlFor="pa-accept-remarks">
              Remarks (optional)
            </label>
            <textarea
              id="pa-accept-remarks"
              className="vm-input-field vm-sheet-textarea"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional note for the record"
              rows={3}
            />
            <button type="button" className="vm-btn-primary vm-sheet-submit" disabled={busy} onClick={() => void runAccept()}>
              {busy ? "Accepting…" : "Accept"}
            </button>
            <button type="button" className="vm-sheet-cancel" disabled={busy} onClick={() => setMode("actions")}>
              Back
            </button>
          </div>
        ) : null}

        {mode === "reject" ? (
          <div className="vm-sheet-form">
            <label className="vm-sheet-label" htmlFor="pa-reject-remarks">
              Remarks (required)
            </label>
            <textarea
              id="pa-reject-remarks"
              className="vm-input-field vm-sheet-textarea"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Reason for rejection"
              rows={3}
            />
            <button type="button" className="vm-btn-primary vm-sheet-submit is-danger" disabled={busy} onClick={() => void runReject()}>
              {busy ? "Rejecting…" : "Reject"}
            </button>
            <button type="button" className="vm-sheet-cancel" disabled={busy} onClick={() => setMode("actions")}>
              Back
            </button>
          </div>
        ) : null}

        {mode === "transfer" ? (
          <div className="vm-sheet-form">
            <label className="vm-sheet-label" htmlFor="pa-transfer-host">
              Transfer to
            </label>
            <SearchSelect
              id="pa-transfer-host"
              value={transferToUser}
              options={transferHostOptions}
              onChange={(val) => {
                setTransferToUser(val);
                setError(null);
              }}
              placeholder="Select"
              searchPlaceholder="Search person to meet"
              required
              allowEmpty
              aria-label="Transfer to"
            />
            <label className="vm-sheet-label" htmlFor="pa-transfer-remarks">
              Reason / Remarks (required)
            </label>
            <textarea
              id="pa-transfer-remarks"
              className="vm-input-field vm-sheet-textarea"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Why are you transferring?"
              rows={2}
            />
            <button type="button" className="vm-btn-primary vm-sheet-submit" disabled={busy} onClick={() => void runTransfer()}>
              {busy ? "Transferring…" : "Transfer"}
            </button>
            <button type="button" className="vm-sheet-cancel" disabled={busy} onClick={() => setMode("actions")}>
              Back
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
