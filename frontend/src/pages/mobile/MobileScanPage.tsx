import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { securityApi } from "@/api/vms";
import { extractError, initials } from "@/lib/format";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function MobileScanPage() {
  const [token, setToken] = useState("");
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);

  async function onScan(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    setPreview(null);
    const cleaned = token.trim().replace(/^.*\/pass\//, "").replace(/\?.*$/, "");
    try {
      const res = (await securityApi.scanQr(cleaned)) as Record<string, unknown>;
      setToken(cleaned);
      setPreview(res);
      setMessage(String(res.message || (res.valid ? "QR valid" : "QR invalid")));
    } catch (err: unknown) {
      setError(extractError(err, "Scan failed"));
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    setBusy(true);
    setError(null);
    try {
      const res = (await securityApi.checkInByToken(token.trim())) as { message?: string };
      setMessage(res.message || "Checked in");
      setPreview(null);
    } catch (err: unknown) {
      setError(extractError(err, "Check-in failed"));
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    setBusy(true);
    setError(null);
    try {
      const res = (await securityApi.checkOutByToken(token.trim(), remarks || undefined)) as {
        message?: string;
      };
      setMessage(res.message || "Checked out");
      setPreview(null);
    } catch (err: unknown) {
      setError(extractError(err, "Check-out failed"));
    } finally {
      setBusy(false);
    }
  }

  const pass = (preview?.pass || null) as Record<string, unknown> | null;
  const entryName = String(pass?.visitor_entry || token || "");

  return (
    <section className="m-page ad-page">
      <div className="ad-dash-top">
        <h1 className="ad-title">Scan QR</h1>
      </div>
      <p className="m-sub">Validate a gate pass, then check in or check out at the desk.</p>

      <form className="ad-form" onSubmit={(e) => void onScan(e)}>
        <div className="ad-field">
          <label>Pass token / QR</label>
          <input
            className="ad-input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Pass no. or /vms/pass/…"
            required
          />
        </div>
        <div className="ad-field">
          <label>Checkout remarks</label>
          <input
            className="ad-input"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <button type="submit" className="ad-btn" disabled={busy}>
          {busy ? "Scanning…" : "Validate QR"}
        </button>
      </form>

      {message ? <p className="login-msg">{message}</p> : null}
      {error ? <p className="login-error">{error}</p> : null}

      {pass ? (
        <div className="ad-pass">
          <BrandLogo variant="on-dark" className="ad-pass-logo" />
          <div className="ad-pass-name">{String(pass.full_name || "Visitor")}</div>
          <div className="ad-pass-sub">
            {[pass.visitor_company, pass.status].filter(Boolean).map(String).join(" · ") || "Gate pass"}
          </div>
          <div className="ad-pass-meta-row">
            <span>Meeting with</span>
            <span>{String(pass.person_to_meet_name || pass.host_name || "—")}</span>
          </div>
          <div className="ad-pass-meta-row">
            <span>Floor</span>
            <span>{String(pass.floor || "—")}</span>
          </div>
          <div className="ad-pass-meta-row">
            <span>Pass no.</span>
            <span>{entryName || "—"}</span>
          </div>
          <div className="ad-pass-who">
            <div className="ad-avatar on-dark">{initials(String(pass.full_name || "V"))}</div>
          </div>
          <div className="ad-pass-foot">
            <button type="button" className="ad-pass-btn" disabled={busy} onClick={() => void checkIn()}>
              Check in
            </button>
            <button type="button" className="ad-pass-btn solid" disabled={busy} onClick={() => void checkOut()}>
              Check out
            </button>
          </div>
          {entryName ? (
            <Link className="ad-link" style={{ marginTop: 10, color: "var(--vms-pass-meta)" }} to={`/pass/${encodeURIComponent(entryName)}`}>
              Open full pass
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
