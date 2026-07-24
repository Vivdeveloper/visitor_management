import { useEffect, useState } from "react";
import {
  approvalApi,
  settingsApi,
  type HostOption,
  type VisitorListRow,
} from "@/api/vms";
import { initials } from "@/lib/format";

type SheetMode = "actions" | "accept" | "reject" | "transfer";

type Props = {
  visitor: VisitorListRow;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  onViewDetails: () => void;
};

export function PendingApprovalSheet({ visitor, open, onClose, onDone, onViewDetails }: Props) {
  const [mode, setMode] = useState<SheetMode>("actions");
  const [remarks, setRemarks] = useState("");
  const [hostQuery, setHostQuery] = useState("");
  const [hosts, setHosts] = useState<HostOption[]>([]);
  const [transferTo, setTransferTo] = useState<HostOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("actions");
    setRemarks("");
    setHostQuery("");
    setTransferTo(null);
    setError(null);
    setBusy(false);
  }, [open, visitor.name]);

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

  if (!open) return null;

  const filteredHosts = hosts.filter((h) => {
    const q = hostQuery.trim().toLowerCase();
    if (!q) return true;
    return `${h.label} ${h.value} ${h.email || ""}`.toLowerCase().includes(q);
  });

  async function runAccept() {
    setBusy(true);
    setError(null);
    try {
      // Pending Approval → host Approve
      await approvalApi.approve(visitor.name, remarks.trim() || undefined);
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
    if (!transferTo) {
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
      await approvalApi.transfer(visitor.name, transferTo.value, remarks.trim());
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
          <div className="vm-activity-avatar avatar-orange">{initials(visitor.full_name || visitor.name)}</div>
          <div className="vm-sheet-visitor-copy">
            <strong>{visitor.full_name || visitor.name}</strong>
            <span>{visitor.person_to_meet_name || visitor.mobile || "Pending approval"}</span>
          </div>
          <span className="vm-badge-pending">PENDING</span>
        </div>

        {error ? <p className="login-error vm-sheet-error">{error}</p> : null}

        {mode === "actions" ? (
          <div className="vm-sheet-actions">
            <p className="vm-sheet-hint">Choose an approval action</p>
            <div className="vm-pill-actions">
              <button
                type="button"
                className="vm-pill-btn is-decline"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setMode("reject");
                }}
              >
                <span aria-hidden>×</span>
                Decline
              </button>
              <button
                type="button"
                className="vm-pill-btn is-transfer"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setMode("transfer");
                }}
              >
                <span aria-hidden>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7" />
                  </svg>
                </span>
                Transfer
              </button>
              <button
                type="button"
                className="vm-pill-btn is-accept"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setMode("accept");
                }}
              >
                <span aria-hidden>✓</span>
                Accept
              </button>
            </div>
            <p className="vm-sheet-hint vm-sheet-hint-soft">
              Accept confirms host approval. Gate check-in happens after approval.
            </p>
            <button type="button" className="vm-btn-outline vm-sheet-secondary" onClick={onViewDetails}>
              View details
            </button>
            <button type="button" className="vm-sheet-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        ) : null}

        {mode === "accept" ? (
          <div className="vm-sheet-form">
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
            <input
              id="pa-transfer-host"
              className="vm-input-field"
              value={hostQuery}
              onChange={(e) => setHostQuery(e.target.value)}
              placeholder="Search person to meet"
              aria-label="Search person to meet"
            />
            <div className="vm-sheet-host-list">
              {filteredHosts.length === 0 ? (
                <p className="vm-empty-hint">No people found</p>
              ) : (
                filteredHosts.slice(0, 8).map((host) => {
                  const selected = transferTo?.value === host.value;
                  return (
                    <button
                      key={host.value}
                      type="button"
                      className={`vm-sheet-host-row${selected ? " is-selected" : ""}`}
                      onClick={() => setTransferTo(host)}
                    >
                      <span className="vm-activity-avatar avatar-blue">{initials(host.label)}</span>
                      <span className="vm-sheet-host-copy">
                        <strong>{host.label}</strong>
                        <span>{host.email || host.value}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
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
