interface CheckInSuccessCardProps {
  hostName?: string;
  department?: string;
  checkInTime?: string;
  duration?: string;
  busy?: boolean;
  onGeneratePass?: () => void;
}

export function CheckInSuccessCard({
  hostName = "Rahul Mehta",
  department = "Production Dept.",
  checkInTime = "23 Jul 2026, 09:15 AM",
  duration = "06:15 Hrs",
  busy = false,
  onGeneratePass,
}: CheckInSuccessCardProps) {
  return (
    <div style={{ textAlign: "center" }}>
      {/* Green Radiating Aura Circle */}
      <div
        style={{
          width: "90px",
          height: "90px",
          borderRadius: "50%",
          background: "#DCFCE7",
          margin: "0.5rem auto 1.25rem",
          display: "grid",
          placeItems: "center",
          fontSize: "2.5rem",
          color: "#16A34A",
          boxShadow: "0 0 0 12px #F0FDF4",
        }}
      >
        ✓
      </div>

      <h1 className="vm-page-title" style={{ fontSize: "1.35rem", textAlign: "center" }}>
        Checked-in Successfully!
      </h1>
      <p style={{ textAlign: "center", color: "#64748B", fontSize: "0.85rem", margin: "0.3rem 0 1.5rem" }}>
        Your visit has been recorded.
      </p>

      {/* Visit Info Card */}
      <div style={{ background: "#F8FAFC", borderRadius: "16px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem", border: "1px solid #E2E8F0", marginBottom: "1.25rem", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "grid", placeItems: "center", fontSize: "1rem" }}>👤</div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>To Meet</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A" }}>{hostName}</span>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>{department}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid #E2E8F0", paddingTop: "0.65rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "grid", placeItems: "center", fontSize: "1rem" }}>📅</div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>Check-in Time</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>{checkInTime}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid #E2E8F0", paddingTop: "0.65rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "grid", placeItems: "center", fontSize: "1rem" }}>🕒</div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>Visit Duration (Expected)</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>{duration}</span>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: "12px", padding: "0.75rem 0.85rem", display: "flex", alignItems: "center", gap: "0.55rem", fontSize: "0.82rem", color: "#1E40AF", marginBottom: "1.25rem", textAlign: "left" }}>
        <span>ℹ️</span>
        <span>You will be notified once approved.</span>
      </div>

      <button type="button" className="vm-btn-primary" disabled={busy} onClick={onGeneratePass} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
        💳 {busy ? "Loading…" : "Generate Gate Pass"}
      </button>
    </div>
  );
}
