import { useNavigate } from "react-router-dom";
import type { DashboardKpis } from "@/api/vms";

type GateFlowKpisProps = {
  kpis?: DashboardKpis;
  loading?: boolean;
  className?: string;
};

const FLOW_TILES = [
  {
    key: "pending",
    label: "Pending Approval",
    resolve: (kpis: DashboardKpis) => Number(kpis["Pending Approval"] ?? kpis.pending ?? 0),
    to: "/approvals",
  },
  {
    key: "inside",
    label: "Inside",
    resolve: (kpis: DashboardKpis) => Number(kpis["On Premises"] ?? 0),
    to: "/inside?status=inside",
  },
  {
    key: "in_meeting",
    label: "In Meeting",
    resolve: (kpis: DashboardKpis) => Number(kpis["Checked In"] ?? 0),
    to: "/inside?status=checked_in",
  },
  {
    key: "checkout",
    label: "Meeting Done",
    resolve: (kpis: DashboardKpis) =>
      Number(kpis["Checkout Pending"] ?? kpis["Meeting Done"] ?? 0),
    to: "/inside?status=checkout_pending",
    foot: "Checkout pending",
  },
] as const;

export function GateFlowKpis({ kpis = {}, loading = false, className = "" }: GateFlowKpisProps) {
  const navigate = useNavigate();

  return (
    <section className={`vm-gate-flow ${className}`.trim()} aria-label="Gate flow overview">
      <div className="vm-gate-flow-head">
        <h2 className="vm-gate-flow-title">Gate flow</h2>
        <p className="vm-gate-flow-sub">Live operational snapshot</p>
      </div>

      <div className="vm-gate-flow-grid">
        {FLOW_TILES.map((tile) => {
          const value = tile.resolve(kpis);
          return (
            <button
              key={tile.key}
              type="button"
              className="vm-gate-flow-tile"
              onClick={() => navigate(tile.to)}
              aria-label={`${tile.label}: ${loading ? "loading" : value}`}
            >
              <span className="vm-gate-flow-label">{tile.label}</span>
              <strong className="vm-gate-flow-value">{loading ? "—" : value}</strong>
              {"foot" in tile && tile.foot ? (
                <span className="vm-gate-flow-foot">{tile.foot}</span>
              ) : (
                <span className="vm-gate-flow-foot">Today</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
