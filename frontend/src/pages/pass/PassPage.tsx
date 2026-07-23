import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { passApi, type PublicPassResult } from "@/api/vms";

export function PublicPassPage() {
  const { token = "" } = useParams();
  const [result, setResult] = useState<PublicPassResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await passApi.getPublicPass(token);
        if (!cancelled) setResult(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load pass");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="pass-public">
        <div className="gp-pass-card">Loading pass…</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="pass-public">
        <div className="gp-pass-card">
          <h1>Visitor Pass</h1>
          <p className="login-error">{error || "Pass not found"}</p>
        </div>
      </div>
    );
  }

  const pass = result.pass;
  const qrTarget = pass?.pass_url || `${window.location.origin}/vms/pass/${token}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrTarget)}`;

  return (
    <div className="pass-public">
      <div className="gp-pass-card">
        <div className="gp-pass-hero">
          <p className="gp-pass-brand">GatePass</p>
          {pass?.photo ? (
            <img className="gp-pass-photo" src={pass.photo} alt={pass.full_name || "Visitor"} />
          ) : (
            <div className="gp-avatar lg on-dark">{initials(pass?.full_name || "V")}</div>
          )}
          <h1>{pass?.full_name || "Visitor Pass"}</h1>
          <p className={result.valid ? "gp-pass-ok" : "gp-pass-bad"}>
            {result.valid ? "Valid pass" : result.reason || "Invalid pass"}
          </p>
        </div>

        <dl className="gp-pass-meta">
          <div>
            <dt>Company</dt>
            <dd>{pass?.visitor_company || "—"}</dd>
          </div>
          <div>
            <dt>Host</dt>
            <dd>{pass?.person_to_meet_name || pass?.host_name || "—"}</dd>
          </div>
          <div>
            <dt>Floor</dt>
            <dd>{pass?.floor || "—"}</dd>
          </div>
          <div>
            <dt>Pass No.</dt>
            <dd>{pass?.visitor_entry || token}</dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd>{formatDt(pass?.qr_expires_on)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{pass?.status || "—"}</dd>
          </div>
        </dl>

        <div className="pass-qr-wrap">
          <img className="pass-qr" src={qrSrc} alt="Visitor QR code" width={220} height={220} />
          <p className="pass-hint">Show this QR at the gate</p>
        </div>

        <div className="m-card-actions">
          <button
            type="button"
            className="m-btn primary"
            onClick={() => {
              if (navigator.share) {
                void navigator.share({ title: "Visitor Pass", url: qrTarget });
              } else {
                void navigator.clipboard?.writeText(qrTarget);
              }
            }}
          >
            Share Pass
          </button>
          <button type="button" className="m-btn" onClick={() => window.print()}>
            Print Pass
          </button>
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function formatDt(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}
