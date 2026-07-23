import { useState, type FormEvent } from "react";
import { securityApi } from "@/api/vms";

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
      setError(err instanceof Error ? err.message : "Scan failed");
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
      setError(err instanceof Error ? err.message : "Check-in failed");
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
      setError(err instanceof Error ? err.message : "Check-out failed");
    } finally {
      setBusy(false);
    }
  }

  const pass = (preview?.pass || null) as Record<string, unknown> | null;

  return (
    <section className="m-page">
      <h1>Scan QR</h1>
      <p className="m-sub">Paste pass token or Visitor Entry name from the QR link.</p>

      <form className="gp-form" onSubmit={onScan}>
        <label>
          Pass token
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="VE01-00001 or /vms/pass/…"
            required
          />
        </label>
        <label>
          Checkout remarks
          <input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <button type="submit" className="gp-submit" disabled={busy}>
          {busy ? "Scanning…" : "Validate QR"}
        </button>
      </form>

      {message ? <p className="login-msg">{message}</p> : null}
      {error ? <p className="login-error">{error}</p> : null}

      {pass ? (
        <div className="m-card" style={{ marginTop: "1rem" }}>
          <div className="m-card-title">{String(pass.full_name || "Visitor")}</div>
          <div className="m-card-meta">
            {String(pass.status || "")}
            {pass.person_to_meet_name ? ` · ${String(pass.person_to_meet_name)}` : ""}
          </div>
          <div className="m-card-actions">
            <button type="button" className="m-btn primary" disabled={busy} onClick={() => void checkIn()}>
              Check In
            </button>
            <button type="button" className="m-btn success" disabled={busy} onClick={() => void checkOut()}>
              Check Out
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
