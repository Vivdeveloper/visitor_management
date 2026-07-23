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
        if (!cancelled) {
          setResult(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load pass");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    if (token) {
      void load();
    }
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="pass-public">
        <div className="pass-card">Loading pass…</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="pass-public">
        <div className="pass-card">
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
      <div className="pass-card">
        <p className="pass-brand">Visitor Management</p>
        <h1>{pass?.full_name || "Visitor Pass"}</h1>
        <p className={`pass-status ${result.valid ? "ok" : "bad"}`}>
          {result.valid ? "Valid pass" : result.reason || "Invalid pass"}
        </p>

        {pass?.photo ? (
          <img className="pass-photo" src={pass.photo} alt={pass.full_name || "Visitor"} />
        ) : null}

        <dl className="pass-meta">
          <div>
            <dt>Pass No.</dt>
            <dd>{pass?.pass_number || "—"}</dd>
          </div>
          <div>
            <dt>Host</dt>
            <dd>{pass?.host_name || "—"}</dd>
          </div>
          <div>
            <dt>Company</dt>
            <dd>{pass?.visitor_company || "—"}</dd>
          </div>
          <div>
            <dt>Building / Floor</dt>
            <dd>
              {[pass?.building, pass?.floor, pass?.unit].filter(Boolean).join(" · ") || "—"}
            </dd>
          </div>
          <div>
            <dt>Meeting</dt>
            <dd>{formatDt(pass?.expected_meeting_time)}</dd>
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
      </div>
    </div>
  );
}

/** Authenticated placeholder — public passes use /pass/:token */
export function PassPage() {
  return (
    <section className="page">
      <h1>Visitor Pass</h1>
      <p>Open a visitor’s public pass from Desk (QR Pass → Open Pass) or share `/vms/pass/&lt;token&gt;`.</p>
    </section>
  );
}

function formatDt(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}
