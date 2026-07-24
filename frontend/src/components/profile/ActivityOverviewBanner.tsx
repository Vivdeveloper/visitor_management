interface ActivityOverviewBannerProps {
  count?: number;
  onViewStats?: () => void;
}

export function ActivityOverviewBanner({
  count = 28,
  onViewStats,
}: ActivityOverviewBannerProps) {
  return (
    <div
      className="vm-overview-card"
      style={{
        padding: "0.85rem 1rem",
        background: "#F3E8FF",
        border: "1px solid #E9D5FF",
        borderRadius: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#9333EA", display: "grid", placeItems: "center", color: "#FFFFFF", fontSize: "1.2rem" }}>
          👑
        </div>
        <div>
          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0F172A", display: "block" }}>Your Activity Overview</span>
          <span style={{ fontSize: "0.75rem", color: "#64748B" }}>You’ve managed {count} visitors this week</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onViewStats}
        style={{ background: "#FFFFFF", border: "1px solid #C084FC", color: "#9333EA", fontSize: "0.75rem", fontWeight: 700, padding: "0.35rem 0.75rem", borderRadius: "10px", cursor: "pointer" }}
      >
        View Stats
      </button>
    </div>
  );
}
