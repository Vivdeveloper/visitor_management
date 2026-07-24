import { useNavigate } from "react-router-dom";

const NOTIFICATIONS = [
  {
    id: "n-1",
    title: "Your visit request approved",
    subtitle: "To meet Rahul Mehta",
    time: "10:05 AM",
    icon: "🔵",
    bg: "#EFF6FF",
  },
  {
    id: "n-2",
    title: "Check-in successful",
    subtitle: "23 Jul 2026, 09:15 AM",
    time: "09:15 AM",
    icon: "✓",
    bg: "#DCFCE7",
  },
  {
    id: "n-3",
    title: "Meeting started",
    subtitle: "You are checked-in",
    time: "09:20 AM",
    icon: "🤝",
    bg: "#FFF7ED",
  },
  {
    id: "n-4",
    title: "Check-out successful",
    subtitle: "23 Jul 2026, 05:30 PM",
    time: "05:30 PM",
    icon: "✓",
    bg: "#DCFCE7",
  },
  {
    id: "n-5",
    title: "New announcement",
    subtitle: "Company holiday on 25 Jul",
    time: "Yesterday",
    icon: "📢",
    bg: "#F3E8FF",
  },
];

export function MobileNotificationsPage() {
  const navigate = useNavigate();

  return (
    <div className="vm-home-page">
      <header className="vm-page-header">
        <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ‹
        </button>
        <h1 className="vm-page-title" style={{ fontSize: "1.3rem" }}>
          Notifications
        </h1>
        <button
          type="button"
          style={{ background: "none", border: "none", color: "#2563EB", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
        >
          Mark all as read
        </button>
      </header>

      <main className="vm-main-body">
        <div className="vm-menu-card" style={{ padding: "0.5rem 1rem" }}>
          {NOTIFICATIONS.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.95rem 0",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: item.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0F172A", display: "block" }}>
                    {item.title}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#64748B" }}>{item.subtitle}</span>
                </div>
              </div>
              <span style={{ fontSize: "0.78rem", color: "#94A3B8" }}>{item.time}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
