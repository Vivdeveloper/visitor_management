import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { securityApi, visitorApi } from "@/api/vms";
import { extractError } from "@/lib/format";
import { HeaderBar } from "@/components/common/HeaderBar";
import { CheckoutConfirmationCard } from "@/components/checkin/CheckoutConfirmationCard";

type VisitorDoc = {
  name?: string;
  full_name?: string;
  visitor_company?: string;
  status?: string;
  mobile?: string;
};

export function MobileCheckoutPage() {
  const { name: routeName = "" } = useParams();
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState<VisitorDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedOutSuccess, setCheckedOutSuccess] = useState(false);

  useEffect(() => {
    if (!routeName) return;
    let cancelled = false;
    async function load() {
      try {
        const doc = (await visitorApi.get(routeName)) as VisitorDoc;
        if (!cancelled) {
          setVisitor(doc);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(extractError(err, "Visitor not found"));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [routeName]);

  async function onCheckout() {
    const id = visitor?.name || routeName;
    setBusy(true);
    setError(null);
    try {
      if (id) {
        await securityApi.checkOut(id, "Checked out via mobile");
      }
      setCheckedOutSuccess(true);
    } catch (err: unknown) {
      setError(extractError(err, "Checkout failed"));
    } finally {
      setBusy(false);
    }
  }

  if (checkedOutSuccess) {
    return (
      <div className="vm-home-page">
        <HeaderBar title="Check-out" showNotification showProfile />

        <main className="vm-main-body" style={{ marginTop: "1rem" }}>
          <div className="vm-status-circle circle-green-light" style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", margin: "0 auto 1rem", display: "grid", placeItems: "center", fontSize: "2.2rem" }}>
            ✓
          </div>

          <h1 className="vm-page-title" style={{ textAlign: "center", fontSize: "1.4rem", color: "#0F172A" }}>
            Checked-out
          </h1>
          <p style={{ textAlign: "center", color: "#16A34A", fontWeight: 700, fontSize: "1rem", margin: "0.2rem 0 0.2rem" }}>
            Checked-out Successfully!
          </p>
          <p style={{ textAlign: "center", color: "#64748B", fontSize: "0.88rem", margin: "0 0 1.5rem" }}>
            Thank you for visiting.
          </p>

          <div className="vm-overview-card" style={{ padding: "1.25rem", textAlign: "left", background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E2E8F0" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748B", display: "block" }}>To Meet</span>
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0F172A", display: "block", marginTop: "0.2rem" }}>
              Rahul Mehta
            </span>
            <span style={{ fontSize: "0.85rem", color: "#475569", display: "block", marginBottom: "1rem" }}>
              Production Dept.
            </span>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", borderTop: "1px solid #F1F5F9", paddingTop: "0.75rem" }}>
              <span style={{ color: "#64748B" }}>Check-out Time</span>
              <span style={{ fontWeight: 600, color: "#0F172A" }}>23 Jul 2026, 05:30 PM</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              <span style={{ color: "#64748B" }}>Total Duration</span>
              <span style={{ fontWeight: 600, color: "#0F172A" }}>08:15 Hrs.</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "1.5rem" }}>
            <button type="button" className="vm-btn-primary" onClick={() => navigate("/my-pass")}>
              View Gate Pass
            </button>
            <button type="button" className="vm-btn-outline" onClick={() => navigate("/")}>
              Back to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="vm-home-page">
      <HeaderBar title="Check-out" showNotification showProfile />

      <main className="vm-main-body" style={{ marginTop: "1rem", background: "#FFFFFF", borderRadius: "24px", padding: "1.5rem 1.25rem", border: "1px solid #E2E8F0" }}>
        <CheckoutConfirmationCard
          hostName="Rahul Mehta"
          department="Production Dept."
          checkInTime="23 Jul 2026, 09:15 AM"
          expectedCheckout="05:30 PM"
          expectedDuration="08:15 Hrs"
          busy={busy}
          onConfirmCheckout={() => void onCheckout()}
          onCancel={() => navigate(-1)}
        />
        {error ? <p className="login-error" style={{ textAlign: "center", marginTop: "0.5rem" }}>{error}</p> : null}
      </main>
    </div>
  );
}
