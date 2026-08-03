import { useEffect, useState } from "react";
import { apiClient } from "@/api/client";
import { passApi, type VisitorListRow } from "@/api/vms";
import { VisitorGatePassCard } from "@/components/pass/VisitorGatePassCard";
import { formatTime } from "@/lib/format";

type PassPayload = {
  visitor_entry?: string;
  name?: string;
  full_name?: string;
  photo?: string;
  mobile?: string;
  company?: string;
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

async function fetchDefaultCompany(): Promise<string> {
  try {
    const { data } = await apiClient.post(`/api/method/frappe.client.get_single_value`, {
      doctype: "Global Defaults",
      field: "default_company",
    });
    return String(data?.message || "").trim();
  } catch {
    return "";
  }
}

/**
 * Display-only gate pass popup.
 * Pass URL / QR must come from Python (`visitor_pass.get_pass` → `ve.generate_pass`).
 * React never invents pass_url.
 */
export function ViewGatePassModal({ visitor, open, onClose, onSendToMobile }: Props) {
  const [pass, setPass] = useState<PassPayload | null>(null);
  const [defaultCompany, setDefaultCompany] = useState("");
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
    void Promise.all([passApi.get(visitor.name), fetchDefaultCompany()])
      .then(([data, companyFromDefaults]) => {
        if (cancelled) return;
        const payload = (data || {}) as PassPayload;
        if (!payload.pass_url) {
          setPass(null);
          setError("Gate pass not found. Pass is created by server when Visitor Entry is saved.");
          return;
        }
        setPass(payload);
        setDefaultCompany(companyFromDefaults);
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
  const company =
    (pass?.company || visitor.company || defaultCompany || "").trim() || "—";
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
    <div
      className="vm-confirm-modal-root vm-gate-pass-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vm-view-gate-pass-title"
    >
      <button type="button" className="vm-confirm-modal-backdrop vm-no-print" onClick={onClose} aria-label="Close" />

      <div className="vm-confirm-modal-card vm-view-gate-pass-card">
        <button type="button" className="vm-confirm-modal-close vm-no-print" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="vm-confirm-modal-top vm-view-gate-pass-top vm-no-print">
          <span className="vm-gate-pass-om" aria-hidden>
            ॐ
          </span>
          <h2 id="vm-view-gate-pass-title" className="vm-confirm-modal-title">
            View Gate Pass
          </h2>
          <p className="vm-confirm-modal-sub">
            Gate pass for <strong>{visitorName}</strong>
          </p>
        </div>

        {loading ? <p className="vm-empty-hint vm-no-print">Loading gate pass…</p> : null}
        {error ? <p className="login-error vm-no-print">{error}</p> : null}

        {!loading && !error && passUrl ? (
          <VisitorGatePassCard
            passCode={passCode}
            visitorName={visitorName}
            company={company}
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

        <div className="vm-view-gate-pass-footer vm-no-print">
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
