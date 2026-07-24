import { useNavigate } from "react-router-dom";
import { initials } from "@/lib/format";

export type RecentVisitorItem = {
  name: string;
  full_name: string;
  purpose?: string;
  time: string;
  status: string;
};

type RecentVisitorsListProps = {
  visitors?: RecentVisitorItem[];
  loading?: boolean;
};

const DEMO_VISITORS: RecentVisitorItem[] = [
  { name: "V001", full_name: "Om", purpose: "Audit", time: "19:09", status: "Checked-in" },
  { name: "V002", full_name: "vivek", purpose: "Audit", time: "18:57", status: "Checked-in" },
  { name: "V003", full_name: "vivek sonaw...", purpose: "Audit", time: "18:53", status: "Checked-in" },
  { name: "V004", full_name: "Nikhil Sarin", purpose: "Maintenance", time: "14:40", status: "Checked-out" },
];

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s.includes("out")) return { color: "#ea580c", bg: "#ffedd5" };
  if (s.includes("pending") || s.includes("reject")) return { color: "#d97706", bg: "#fff7ed" };
  return { color: "#16a34a", bg: "#dcfce7" };
}

export function RecentVisitorsList({ visitors = [], loading = false }: RecentVisitorsListProps) {
  const navigate = useNavigate();
  const displayVisitors = visitors.length ? visitors : DEMO_VISITORS;

  return (
    <div className="vm-overview-card vm-chart-card vm-recent-card">
      <div className="vm-chart-card-head">
        <div className="vm-chart-title-group">
          <div className="vm-chart-icon-badge" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h3 className="vm-chart-card-title">Recent Visitors</h3>
        </div>
        <button type="button" className="vm-card-link-btn" onClick={() => navigate("/inside")}>
          View All ›
        </button>
      </div>

      <div className="vm-recent-list">
        {loading ? (
          <span className="vm-empty-hint">Loading visitors…</span>
        ) : (
          displayVisitors.map((v) => {
            const tone = statusTone(v.status);
            return (
              <button
                key={v.name}
                type="button"
                className="vm-recent-row"
                onClick={() => navigate(`/visitor/${encodeURIComponent(v.name)}`)}
              >
                <div className="vm-recent-row-left">
                  <div className="vm-recent-avatar-circle">
                    {initials(v.full_name)}
                  </div>
                  <div className="vm-recent-row-copy">
                    <strong className="vm-recent-name">{v.full_name}</strong>
                    <span className="vm-recent-purpose">{v.purpose || "—"}</span>
                  </div>
                </div>
                <div className="vm-recent-row-meta">
                  <span className="vm-recent-time">{v.time}</span>
                  <span className="vm-recent-status" style={{ color: tone.color, background: tone.bg }}>
                    {v.status}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <button
        type="button"
        className="vm-history-cta-btn"
        onClick={() => navigate("/history")}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>View Visitor History</span>
        <span className="vm-cta-arrow">›</span>
      </button>
    </div>
  );
}
