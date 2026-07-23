import { useState, type FormEvent } from "react";
import { securityApi } from "@/api/vms";

export function MobileGatePage() {
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

  return (
    <section className="m-page">
      <h1>Gate</h1>
      <p className="m-sub">Enter QR token from visitor pass (camera scan in a later phase)</p>

      <form className="login-form" onSubmit={onScan}>
        <label htmlFor="token">Pass token</label>
        <input
          id="token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste token or pass URL fragment"
          required
        />
        <label htmlFor="remarks">Checkout remarks (optional)</label>
        <input
          id="remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Optional"
        />
        <button type="submit" disabled={busy}>
          {busy ? "Working…" : "Validate token"}
        </button>
      </form>

      {preview ? (
        <div className="m-card" style={{ marginTop: "1rem" }}>
          <div className="m-card-title">Validation</div>
          <div className="m-card-meta">{JSON.stringify(preview.pass || preview, null, 0)}</div>
          <div className="m-card-actions">
            <button type="button" className="m-btn primary" disabled={busy} onClick={() => void checkIn()}>
              Check In
            </button>
            <button type="button" className="m-btn" disabled={busy} onClick={() => void checkOut()}>
              Check Out
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="login-msg">{message}</p> : null}
      {error ? <p className="login-error">{error}</p> : null}
    </section>
  );
}
