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
import { useAppLanguage } from "@/context/AppLanguageContext";
import { formatCount } from "@/lib/format";
import { translateVisitorStatus, ut, type UiCopyKey } from "@/i18n/uiChrome";

interface VisitorStatusDashboardProps {
  kpis?: DashboardKpis;
  rows?: VisitorListRow[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

const STATUS_FOOT_KEYS: Partial<Record<VisitorStatusKey, UiCopyKey>> = {
  "Pending Approval": "needs_action",
  "Checkout Pending": "awaiting_gate",
};

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
  title,
  subtitle,
  className = "",
}: VisitorStatusDashboardProps) {
  const navigate = useNavigate();
  const { lang } = useAppLanguage();
  const counts = resolveStatusCounts(kpis, rows);
  const heading = title ?? ut(lang, "status_overview");
  const sub = subtitle ?? ut(lang, "status_overview_sub");

  return (
    <section className={`vm-status-dashboard ${className}`.trim()} aria-label={heading}>
      <div className="vm-status-dashboard-head">
        <div>
          <h2 className="vm-status-dashboard-title">{heading}</h2>
          {sub ? <p className="vm-status-dashboard-sub">{sub}</p> : null}
        </div>
      </div>

      <div className="vm-kpi-grid vm-kpi-grid--status">
        {STATUS_DASHBOARD_TILES.map((tile) => {
          const value = counts[tile.key];
          const showWarn = tile.key === "Pending Approval" && !loading && value > 0;
          const showCheckout = tile.key === "Checkout Pending" && !loading && value > 0;
          const label = translateVisitorStatus(lang, tile.key);
          const footKey = STATUS_FOOT_KEYS[tile.key];
          const footWarn = footKey ? ut(lang, footKey) : ut(lang, "today");

          return (
            <button
              key={tile.key}
              type="button"
              className="vm-kpi-tile vm-kpi-tile--status"
              data-badge={tile.badge}
              onClick={() => navigate(tile.to)}
              aria-label={`${label}: ${loading ? "loading" : value}`}
            >
              <div className="vm-kpi-tile-status-inner">
                <div className={`vm-kpi-badge ${tile.badge}`}>{iconFor(tile.key)}</div>
                <div className="vm-kpi-tile-status-body">
                  <span className="vm-kpi-label">{label}</span>
                  {showWarn || showCheckout ? (
                    <span className="vm-kpi-foot is-warn">{footWarn}</span>
                  ) : (
                    <span className="vm-kpi-foot">{ut(lang, "today")}</span>
                  )}
                </div>
                <span className="vm-kpi-value">{loading ? "—" : formatCount(value, lang)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
