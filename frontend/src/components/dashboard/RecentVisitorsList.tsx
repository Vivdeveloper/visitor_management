import { useNavigate } from "react-router-dom";
import { VisitorAvatar } from "@/components/ui/VisitorAvatar";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { ut } from "@/i18n/uiChrome";

export type RecentVisitorItem = {
  name: string;
  full_name: string;
  purpose?: string;
  time: string;
  status: string;
  /** Raw ERP status for tone styling (optional). */
  statusRaw?: string;
  photo?: string | null;
};

type RecentVisitorsListProps = {
  visitors?: RecentVisitorItem[];
  loading?: boolean;
};

function statusTone(status: string) {
  const s = status.toLowerCase();
  if (s.includes("out") || s.includes("चेक-आउट") || s.includes("नाकार") || s.includes("अस्वीकृत")) {
    return { color: "#ea580c", bg: "#ffedd5" };
  }
  if (
    s.includes("pending") ||
    s.includes("reject") ||
    s.includes("प्रलंबित") ||
    s.includes("पेंडिंग") ||
    s.includes("नाकार") ||
    s.includes("अस्वीकृत")
  ) {
    return { color: "#d97706", bg: "#fff7ed" };
  }
  return { color: "#16a34a", bg: "#dcfce7" };
}

function toneFromRaw(raw?: string, fallbackStatus?: string) {
  if (raw) {
    const s = raw.toLowerCase();
    if (s.includes("out") || s.includes("reject")) return { color: "#ea580c", bg: "#ffedd5" };
    if (s.includes("pending")) return { color: "#d97706", bg: "#fff7ed" };
    return { color: "#16a34a", bg: "#dcfce7" };
  }
  return statusTone(fallbackStatus || "");
}

export function RecentVisitorsList({ visitors = [], loading = false }: RecentVisitorsListProps) {
  const navigate = useNavigate();
  const { lang } = useAppLanguage();
  const displayVisitors = visitors;

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
          <h3 className="vm-chart-card-title">{ut(lang, "recent_visitors")}</h3>
        </div>
        <button type="button" className="vm-card-link-btn" onClick={() => navigate("/inside")}>
          {ut(lang, "view_all")}
        </button>
      </div>

      <div className="vm-recent-list">
        {loading ? (
          <span className="vm-empty-hint">{ut(lang, "loading_visitors")}</span>
        ) : displayVisitors.length === 0 ? (
          <span className="vm-empty-hint">—</span>
        ) : (
          displayVisitors.map((v) => {
            const tone = toneFromRaw(v.statusRaw, v.status);
            return (
              <button
                key={v.name}
                type="button"
                className="vm-recent-row"
                onClick={() => navigate(`/visitor/${encodeURIComponent(v.name)}`)}
              >
                <div className="vm-recent-row-left">
                  <VisitorAvatar
                    name={v.full_name}
                    photo={v.photo}
                    className="vm-recent-avatar-circle"
                  />
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
        <span>{ut(lang, "view_visitor_history")}</span>
        <span className="vm-cta-arrow">›</span>
      </button>
    </div>
  );
}
