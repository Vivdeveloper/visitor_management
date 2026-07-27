import { useEffect, useState } from "react";
import { passApi, type VisitorListRow } from "@/api/vms";
import { VisitorGatePassCard } from "@/components/pass/VisitorGatePassCard";
import { formatTime } from "@/lib/format";

type PassPayload = {
  visitor_entry?: string;
  name?: string;
  full_name?: string;
  photo?: string;
  mobile?: string;
  visitor_company?: string;
  person_to_meet_name?: string;
  host_name?: string;
  floor?: string;
  status?: string;
  qr_expires_on?: string;
  checked_in_on?: string;
  pass_url?: string;
};

type Props = {
  visitor: VisitorListRow | null;
  open: boolean;
  onClose: () => void;
  onSendToMobile?: (visitor: VisitorListRow) => Promise<void> | void;
};

/**
 * Display-only gate pass popup.
 * Pass URL / QR must come from Python (`visitor_pass.get_pass` → `ve.generate_pass`).
 * React never invents pass_url.
 */
export function ViewGatePassModal({ visitor, open, onClose, onSendToMobile }: Props) {
  const [pass, setPass] = useState<PassPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busySend, setBusySend] = useState(false);

  useEffect(() => {
    if (!open || !visitor) {
      setPass(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void passApi
      .get(visitor.name)
      .then((data) => {
        if (cancelled) return;
        const payload = (data || {}) as PassPayload;
        if (!payload.pass_url) {
          setPass(null);
          setError("Gate pass not found. Pass is created by server when Visitor Entry is saved.");
          return;
        }
        setPass(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPass(null);
          setError(err instanceof Error ? err.message : "Could not load gate pass");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, visitor]);

  if (!open || !visitor) return null;

  const visitorName = pass?.full_name || visitor.full_name || visitor.name;
  const passCode = pass?.visitor_entry || pass?.name || visitor.name;
  const status = pass?.status || visitor.status || "—";
  const hostName = pass?.person_to_meet_name || pass?.host_name || visitor.person_to_meet_name || "—";
  const floor = pass?.floor || visitor.floor || "—";
  const passUrl = pass?.pass_url;
  const validUntil = pass?.qr_expires_on ? formatTime(pass.qr_expires_on) : undefined;
  const gateReady = status === "Checked In" || status === "Meeting Done";
  const noticeMessage = gateReady
    ? undefined
    : status === "Approved"
      ? "Ready for gate — valid after check-in"
      : status
        ? `Pass status: ${status}`
        : undefined;

  async function handleSend() {
    if (!visitor || !onSendToMobile) return;
    setBusySend(true);
    try {
      await onSendToMobile(visitor);
    } finally {
      setBusySend(false);
    }
  }

  return (
    <div className="vm-confirm-modal-root" role="dialog" aria-modal="true" aria-labelledby="vm-view-gate-pass-title">
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onClose} aria-label="Close" />

      <div className="vm-confirm-modal-card vm-view-gate-pass-card">
        <button type="button" className="vm-confirm-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="vm-confirm-modal-top">
          <h2 id="vm-view-gate-pass-title" className="vm-confirm-modal-title">
            View Gate Pass
          </h2>
          <p className="vm-confirm-modal-sub">
            Gate pass for <strong>{visitorName}</strong>
          </p>
        </div>

        {loading ? <p className="vm-empty-hint">Loading gate pass…</p> : null}
        {error ? <p className="login-error">{error}</p> : null}

        {!loading && !error && passUrl ? (
          <VisitorGatePassCard
            passCode={passCode}
            visitorName={visitorName}
            hostName={hostName}
            floor={floor}
            status={status}
            noticeMessage={noticeMessage}
            validUntil={validUntil}
            photoUrl={pass?.photo || visitor.photo}
            qrPayload={passUrl}
            onShare={() => {
              if (navigator.share) {
                void navigator.share({ title: `Gate Pass - ${visitorName}`, url: passUrl });
              } else {
                void navigator.clipboard?.writeText(passUrl);
              }
            }}
            onDownload={() => window.print()}
          />
        ) : null}

        <div className="vm-view-gate-pass-footer">
          {onSendToMobile && passUrl ? (
            <button
              type="button"
              className="vm-confirm-act-btn is-secondary"
              disabled={busySend || loading}
              onClick={() => void handleSend()}
            >
              {busySend ? "Sending…" : "Send to visitor"}
            </button>
          ) : null}
          <button type="button" className="vm-confirm-act-btn is-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
