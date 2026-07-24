interface CheckoutConfirmationCardProps {
  hostName?: string;
  department?: string;
  checkInTime?: string;
  expectedCheckout?: string;
  expectedDuration?: string;
  busy?: boolean;
  onConfirmCheckout: () => void;
  onCancel?: () => void;
}

export function CheckoutConfirmationCard({
  hostName = "Rahul Mehta",
  department = "Production Dept.",
  checkInTime = "23 Jul 2026, 09:15 AM",
  expectedCheckout = "05:30 PM",
  expectedDuration = "08:15 Hrs",
  busy = false,
  onConfirmCheckout,
  onCancel,
}: CheckoutConfirmationCardProps) {
  return (
    <div style={{ textAlign: "center" }}>
      {/* Exit Door Orange Circle Badge */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "#FFEDD5",
          margin: "0.5rem auto 1rem",
          display: "grid",
          placeItems: "center",
          fontSize: "2.2rem",
          color: "#EA580C",
          boxShadow: "0 0 0 10px #FFF7ED",
        }}
      >
        🚪
      </div>

      <h1 className="vm-page-title" style={{ fontSize: "1.35rem", textAlign: "center", color: "#0F172A" }}>
        Check-out
      </h1>
      <p style={{ textAlign: "center", color: "#64748B", fontSize: "0.85rem", margin: "0.25rem 0 1.25rem" }}>
        Are you sure you want to check-out?
      </p>

      {/* Details Card */}
      <div
        style={{
          background: "#F8FAFC",
          borderRadius: "16px",
          padding: "1rem",
          border: "1px solid #E2E8F0",
          marginBottom: "1rem",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#EFF6FF", color: "#2563EB", display: "grid", placeItems: "center", fontSize: "1rem" }}>
            👤
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>To Meet</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A" }}>{hostName}</span>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>{department}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid #E2E8F0", paddingTop: "0.65rem", marginBottom: "0.65rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#EFF6FF", color: "#2563EB", display: "grid", placeItems: "center", fontSize: "1rem" }}>
            📅
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>Check-in Time</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>{checkInTime}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid #E2E8F0", paddingTop: "0.65rem", marginBottom: "0.65rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#EFF6FF", color: "#2563EB", display: "grid", placeItems: "center", fontSize: "1rem" }}>
            🕒
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>Expected Check-out</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>{expectedCheckout}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid #E2E8F0", paddingTop: "0.65rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#EFF6FF", color: "#2563EB", display: "grid", placeItems: "center", fontSize: "1rem" }}>
            ⏳
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>Expected Duration</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>{expectedDuration}</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div
        style={{
          background: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: "12px",
          padding: "0.75rem 0.85rem",
          display: "flex",
          alignItems: "center",
          gap: "0.55rem",
          fontSize: "0.82rem",
          color: "#1E40AF",
          marginBottom: "1.25rem",
          textAlign: "left",
        }}
      >
        <span>ℹ️</span>
        <span>After check-out, your visit will be completed and recorded.</span>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        <button
          type="button"
          className="vm-btn-primary"
          disabled={busy}
          onClick={onConfirmCheckout}
          style={{ background: "linear-gradient(135deg, #0A3D91 0%, #1D4ED8 100%)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
        >
          🚪 {busy ? "Checking-out…" : "Confirm Check-out"}
        </button>

        {onCancel ? (
          <button
            type="button"
            className="vm-btn-outline"
            onClick={onCancel}
            style={{ color: "#475569", borderColor: "#CBD5E1", background: "#FFFFFF" }}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
