import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi, type DashboardKpis, type DashboardQueueItem } from "@/api/vms";
import { useAuth } from "@/context/AuthContext";
import { resolveMode } from "@/lib/roles";
import { IconApprovals, IconCheckIn, IconPass, IconScan } from "@/components/ui/MobileIcons";

export function MobileHomePage() {
  const { user } = useAuth();
  const mode = resolveMode(user);
  const [kpis, setKpis] = useState<DashboardKpis>({});
  const [recent, setRecent] = useState<DashboardQueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [kpi, live] = await Promise.all([
          dashboardApi.getKpis(),
          dashboardApi.getLiveVisitors(),
        ]);
        if (!cancelled) {
          setKpis(kpi || {});
          setRecent((live || []).slice(0, 5));
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load dashboard");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const inside = Number(kpis["On Premises"] || 0);
  const pending = Number(kpis["Pending Approval"] || 0);
  const checkedInToday = Number(kpis["Checked In"] || 0);
  const checkedOut = Number(kpis["Checked Out"] || 0);
  const total = Number(kpis.total || 0);
  const now = new Date();

  return (
    <section className="m-page gp-dash">
      <div className="gp-hero">
        <div className="gp-hero-top">
          <div>
            <p className="gp-hero-label">Visitors Inside</p>
            <p className="gp-hero-value">{inside}</p>
          </div>
          <div className="gp-hero-meta">
            <div>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div>{now.toLocaleDateString()}</div>
          </div>
        </div>
        <div className="gp-hero-spark" aria-hidden />
      </div>

      {error ? <p className="login-error">{error}</p> : null}

      <div className="gp-stat-grid">
        <div className="gp-stat">
          <span className="gp-stat-label">Check-ins</span>
          <strong>{checkedInToday}</strong>
        </div>
        <div className="gp-stat">
          <span className="gp-stat-label">Check-outs</span>
          <strong>{checkedOut}</strong>
        </div>
        <div className="gp-stat">
          <span className="gp-stat-label">Total today</span>
          <strong>{total}</strong>
        </div>
        <div className="gp-stat gp-stat-warn">
          <span className="gp-stat-label">Pending</span>
          <strong>{pending}</strong>
        </div>
      </div>

      {(mode === "host" || mode === "security") && pending > 0 ? (
        <Link className="gp-alert" to="/approvals">
          <span>
            <strong>{pending} pending approvals</strong>
            <small>Requires action</small>
          </span>
          <IconApprovals size={20} />
        </Link>
      ) : null}

      <div className="gp-section-head">
        <h2>Recently inside</h2>
        <Link to="/inside">See all</Link>
      </div>
      {recent.length === 0 ? (
        <p className="m-sub">No visitors on premises right now.</p>
      ) : (
        <ul className="m-list">
          {recent.map((row) => (
            <li key={row.name} className="m-card gp-person">
              <div className="gp-avatar">{initials(row.full_name || row.name)}</div>
              <div>
                <div className="m-card-title">{row.full_name || row.name}</div>
                <div className="m-card-meta">
                  {row.person_to_meet_name || row.host_name || row.status}
                  {row.check_in || row.checked_in_on
                    ? ` · ${formatTime(row.check_in || row.checked_in_on)}`
                    : ""}
                </div>
              </div>
              <span className="gp-badge success">Inside</span>
            </li>
          ))}
        </ul>
      )}

      <div className="gp-section-head">
        <h2>Quick actions</h2>
      </div>
      <div className="gp-quick">
        <Link className="gp-quick-btn primary" to="/check-in">
          <IconCheckIn size={18} /> New Check-in
        </Link>
        <Link className="gp-quick-btn" to="/scan">
          <IconScan size={18} /> Scan QR
        </Link>
        <Link className="gp-quick-btn" to="/approvals">
          <IconApprovals size={18} /> Approvals
        </Link>
        <Link className="gp-quick-btn" to="/my-pass">
          <IconPass size={18} /> My Pass
        </Link>
      </div>
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function formatTime(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}
