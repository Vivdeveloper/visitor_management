interface MeetingInProgressCardProps {
  hostName?: string;
  department?: string;
  checkInTime?: string;
  expectedCheckout?: string;
  expectedDuration?: string;
  busy?: boolean;
  onFinishMeeting: () => void;
}

export function MeetingInProgressCard({
  hostName = "Rahul Mehta",
  department = "Production Dept.",
  checkInTime = "23 Jul 2026, 09:15 AM",
  expectedCheckout = "05:30 PM",
  expectedDuration = "08:15 Hrs",
  busy = false,
  onFinishMeeting,
}: MeetingInProgressCardProps) {
  return (
    <div style={{ textAlign: "center" }}>
      {/* Light Green Avatar Circle Badge */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "#DCFCE7",
          margin: "0.5rem auto 1rem",
          display: "grid",
          placeItems: "center",
          fontSize: "2.2rem",
          color: "#16A34A",
          boxShadow: "0 0 0 10px #F0FDF4",
        }}
      >
        👥
      </div>

      <h1 className="vm-page-title" style={{ fontSize: "1.35rem", textAlign: "center", color: "#0F172A" }}>
        Meeting in Progress
      </h1>
      <p style={{ textAlign: "center", color: "#64748B", fontSize: "0.85rem", margin: "0.25rem 0 1.25rem" }}>
        You are checked-in / Meeting in progress
      </p>

      {/* Light Green To Meet Card */}
      <div
        style={{
          background: "#F0FDF4",
          borderRadius: "16px",
          padding: "1rem",
          border: "1px solid #DCFCE7",
          marginBottom: "1rem",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "grid", placeItems: "center", fontSize: "1rem" }}>
            👤
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>To Meet</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0F172A" }}>{hostName}</span>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>{department}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid #DCFCE7", paddingTop: "0.65rem", marginBottom: "0.65rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "grid", placeItems: "center", fontSize: "1rem" }}>
            📅
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>Check-in Time</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>{checkInTime}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", borderTop: "1px solid #DCFCE7", paddingTop: "0.65rem" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#DCFCE7", color: "#16A34A", display: "grid", placeItems: "center", fontSize: "1rem" }}>
            🕒
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>Expected Check-out</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0F172A" }}>{expectedCheckout}</span>
          </div>
        </div>
      </div>

      {/* Light Blue Visit Details Card */}
      <div
        style={{
          background: "#F8FAFC",
          borderRadius: "16px",
          padding: "0.85rem 1rem",
          border: "1px solid #E2E8F0",
          marginBottom: "1.25rem",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.65rem", color: "#2563EB", fontWeight: 700, fontSize: "0.88rem" }}>
          <span>🛡️</span>
          <span>Visit Details</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.82rem", color: "#475569" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>🕒 Check-in Time</span>
            <span style={{ fontWeight: 700, color: "#0F172A" }}>{checkInTime}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>🕒 Expected Check-out</span>
            <span style={{ fontWeight: 700, color: "#0F172A" }}>{expectedCheckout}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>⏳ Expected Duration</span>
            <span style={{ fontWeight: 700, color: "#0F172A" }}>{expectedDuration}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        className="vm-btn-primary"
        disabled={busy}
        onClick={onFinishMeeting}
        style={{ background: "linear-gradient(135deg, #0A3D91 0%, #1D4ED8 100%)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
      >
        ✓ {busy ? "Processing…" : "I’m Done with Meeting"}
      </button>
    </div>
  );
}
