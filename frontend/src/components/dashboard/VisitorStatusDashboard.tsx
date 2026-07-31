import { useNavigate } from "react-router-dom";
import {
  STATUS_DASHBOARD_TILES,
  resolveStatusCounts,
  type VisitorStatusKey,
} from "@/lib/visitorStatusDashboard";
import type { DashboardKpis, VisitorListRow } from "@/api/vms";
import {
  IconApprovals,
  IconExit,
  IconInside,
  IconUser,
  IconUserInside,
} from "@/components/ui/MobileIcons";

interface VisitorStatusDashboardProps {
  kpis?: DashboardKpis;
  rows?: VisitorListRow[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

function iconFor(key: VisitorStatusKey) {
  switch (key) {
    case "Pending Approval":
      return <IconApprovals size={15} />;
    case "Approved":
      return <IconUser size={15} />;
    case "Checked In":
      return <IconUserInside size={15} />;
    case "Meeting Done":
    case "Checkout Pending":
      return <IconInside size={15} />;
    case "Checked Out":
    case "Rejected":
    case "Transferred":
      return <IconExit size={15} />;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function VisitorStatusDashboard({
  kpis = {},
  rows = [],
  loading = false,
  title = "Status overview",
  subtitle = "Today's visitor counts by stage",
  className = "",
}: VisitorStatusDashboardProps) {
  const navigate = useNavigate();
  const counts = resolveStatusCounts(kpis, rows);

  return (
    <section className={`vm-status-dashboard ${className}`.trim()} aria-label={title}>
      <div className="vm-status-dashboard-head">
        <div>
          <h2 className="vm-status-dashboard-title">{title}</h2>
          {subtitle ? <p className="vm-status-dashboard-sub">{subtitle}</p> : null}
        </div>
      </div>

      <div className="vm-kpi-grid vm-kpi-grid--status">
        {STATUS_DASHBOARD_TILES.map((tile) => {
          const value = counts[tile.key];
          const showWarn = tile.key === "Pending Approval" && !loading && value > 0;
          const showCheckout = tile.key === "Checkout Pending" && !loading && value > 0;

          return (
            <button
              key={tile.key}
              type="button"
              className="vm-kpi-tile vm-kpi-tile--status"
              data-badge={tile.badge}
              onClick={() => navigate(tile.to)}
              aria-label={`${tile.label}: ${loading ? "loading" : value}`}
            >
              <div className="vm-kpi-tile-status-inner">
                <div className={`vm-kpi-badge ${tile.badge}`}>{iconFor(tile.key)}</div>
                <div className="vm-kpi-tile-status-body">
                  <span className="vm-kpi-label">{tile.label}</span>
                  {showWarn ? (
                    <span className="vm-kpi-foot is-warn">{tile.foot || "Needs action"}</span>
                  ) : showCheckout ? (
                    <span className="vm-kpi-foot is-warn">{tile.foot || "Awaiting gate"}</span>
                  ) : (
                    <span className="vm-kpi-foot">Today</span>
                  )}
                </div>
                <span className="vm-kpi-value">{loading ? "—" : value}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
