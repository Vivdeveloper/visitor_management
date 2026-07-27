import { useNavigate } from "react-router-dom";
import { IconApprovals, IconExit, IconInside, IconUser, IconUserInside } from "@/components/ui/MobileIcons";

interface DashboardKpisProps {
  totalVisitors?: number;
  checkedIn?: number;
  pendingApproval?: number;
  currentlyInside?: number;
  checkedOut?: number;
  loading?: boolean;
}

type KpiKey = "total" | "in" | "pending" | "live" | "out";

const CARDS: Array<{
  key: KpiKey;
  label: string;
  badge: "badge-blue" | "badge-green" | "badge-amber" | "badge-indigo" | "badge-slate";
  to: string;
}> = [
  {
    key: "total",
    label: "Today's Visitors",
    badge: "badge-blue",
    to: "/inside?status=all",
  },
  {
    key: "in",
    label: "Checked In",
    badge: "badge-green",
    to: "/inside?status=inside",
  },
  {
    key: "pending",
    label: "Pending Approval",
    badge: "badge-amber",
    to: "/approvals",
  },
  {
    key: "live",
    label: "Currently Inside",
    badge: "badge-indigo",
    to: "/inside?status=inside",
  },
  {
    key: "out",
    label: "Checked Out",
    badge: "badge-slate",
    to: "/inside?status=checked_out",
  },
];

function iconFor(key: KpiKey) {
  switch (key) {
    case "total":
      return <IconUser size={18} />;
    case "in":
      return <IconUserInside size={18} />;
    case "pending":
      return <IconApprovals size={18} />;
    case "live":
      return <IconInside size={18} />;
    case "out":
      return <IconExit size={18} />;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function DashboardKpis({
  totalVisitors = 0,
  checkedIn = 0,
  pendingApproval = 0,
  currentlyInside = 0,
  checkedOut = 0,
  loading = false,
}: DashboardKpisProps) {
  const navigate = useNavigate();

  const values: Record<KpiKey, number> = {
    total: totalVisitors,
    in: checkedIn,
    pending: pendingApproval,
    live: currentlyInside,
    out: checkedOut,
  };

  return (
    <div className="vm-kpi-grid vm-kpi-grid--ops">
      {CARDS.map((card) => {
        const value = loading ? "—" : values[card.key];
        return (
          <button
            key={card.key}
            type="button"
            className="vm-kpi-tile"
            onClick={() => navigate(card.to)}
            aria-label={`${card.label}: ${value}`}
          >
            <div className={`vm-kpi-badge ${card.badge}`}>{iconFor(card.key)}</div>
            <span className="vm-kpi-label">{card.label}</span>
            <span className="vm-kpi-value">{value}</span>
            {card.key === "live" ? (
              <span className="vm-kpi-foot is-live">
                Live <span className="vm-live-dot" aria-hidden />
              </span>
            ) : card.key === "pending" && !loading && pendingApproval > 0 ? (
              <span className="vm-kpi-foot is-warn">Needs action</span>
            ) : (
              <span className="vm-kpi-foot">Today</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
