import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { securityApi } from "@/api/vms";

export function MobileCheckoutPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const [materialReturned, setMaterialReturned] = useState(false);
  const [laptopReturned, setLaptopReturned] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCheckout() {
    setBusy(true);
    setError(null);
    try {
      const note = [
        remarks.trim(),
        materialReturned ? "Material returned" : "",
        laptopReturned ? "Laptop returned" : "",
      ]
        .filter(Boolean)
        .join("; ");
      await securityApi.checkOut(name, note || undefined);
      navigate("/history", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="m-page">
      <h1>Check Out</h1>
      <p className="m-sub">Exit after Meeting Done · {name}</p>

      <div className="m-card">
        <label className="gp-check">
          <input
            type="checkbox"
            checked={materialReturned}
            onChange={(e) => setMaterialReturned(e.target.checked)}
          />
          Material returned
        </label>
        <label className="gp-check">
          <input
            type="checkbox"
            checked={laptopReturned}
            onChange={(e) => setLaptopReturned(e.target.checked)}
          />
          Laptop returned
        </label>
        <label>
          Remarks
          <textarea
            className="gp-textarea"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional notes / signature note"
          />
        </label>
      </div>

      {error ? <p className="login-error">{error}</p> : null}

      <button type="button" className="gp-submit success" disabled={busy} onClick={() => void onCheckout()}>
        {busy ? "Checking out…" : "Check Out"}
      </button>
    </section>
  );
}
