export function SecurityPriorityBanner() {
  return (
    <div
      className="vm-overview-card"
      style={{
        padding: "0.85rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#F0F9FF",
        border: "1px solid #BAE6FD",
        borderRadius: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#2563EB", display: "grid", placeItems: "center", color: "#FFFFFF" }}>
          🛡️
        </div>
        <div>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0F172A", display: "block" }}>Your security is our priority</span>
          <span style={{ fontSize: "0.75rem", color: "#64748B" }}>All visitor data is secure and encrypted</span>
        </div>
      </div>
      <span style={{ color: "#2563EB", fontWeight: 700 }}>›</span>
    </div>
  );
}
