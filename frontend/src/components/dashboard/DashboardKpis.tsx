import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconExit, IconInside, IconUser, IconUserInside } from "@/components/ui/MobileIcons";

interface DashboardKpisProps {
  totalVisitors?: number;
  checkedIn?: number;
  checkedOut?: number;
  currentlyInside?: number;
  loading?: boolean;
}

type KpiKey = "total" | "in" | "out" | "live";

type Insight = { label: string; value: string; tone?: "good" | "warn" | "info" };

const CARDS: Array<{
  key: KpiKey;
  label: string;
  unit: string;
  badge: "badge-blue" | "badge-green" | "badge-orange" | "badge-indigo";
  foot: string;
  backTitle: string;
  backBody: string;
  to: string;
}> = [
  {
    key: "total",
    label: "Today's Visitors",
    unit: "Total",
    badge: "badge-blue",
    foot: "Today",
    backTitle: "Today's total",
    backBody: "All entries created today across every status.",
    to: "/inside?status=all",
  },
  {
    key: "in",
    label: "Checked-in",
    unit: "Today",
    badge: "badge-green",
    foot: "Gate entries",
    backTitle: "Gate check-ins",
    backBody: "Visitors checked in at the gate with a pass today.",
    to: "/inside?status=inside",
  },
  {
    key: "out",
    label: "Checked-out",
    unit: "Today",
    badge: "badge-orange",
    foot: "Completed exits",
    backTitle: "Completed exits",
    backBody: "Visitors who finished and left through the gate.",
    to: "/inside?status=checked_out",
  },
  {
    key: "live",
    label: "Currently Inside",
    unit: "Visitors",
    badge: "badge-indigo",
    foot: "Live",
    backTitle: "On premises",
    backBody: "Live: Checked In or Meeting Done.",
    to: "/inside?status=inside",
  },
];

function iconFor(key: KpiKey) {
  switch (key) {
    case "total":
      return <IconUser size={18} />;
    case "in":
      return <IconUserInside size={18} />;
    case "out":
      return <IconExit size={18} />;
    case "live":
      return <IconInside size={18} />;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

function buildInsights(
  key: KpiKey,
  values: Record<KpiKey, number>,
): Insight[] {
  const total = Math.max(values.total, 1);
  const inPct = Math.round((values.in / total) * 100);
  const outPct = Math.round((values.out / total) * 100);
  const livePct = Math.round((values.live / total) * 100);
  const stillInside = Math.max(0, values.in - values.out);

  switch (key) {
    case "total":
      return [
        { label: "Inside now", value: String(values.live), tone: "info" },
        { label: "Checked out", value: `${outPct}%`, tone: "warn" },
        { label: "Flow", value: values.in >= values.out ? "In > Out" : "Out > In", tone: "good" },
      ];
    case "in":
      return [
        { label: "Share of day", value: `${inPct}%`, tone: "good" },
        { label: "Net inside", value: String(stillInside), tone: "info" },
        { label: "Exits done", value: String(values.out), tone: "warn" },
      ];
    case "out":
      return [
        { label: "Exit rate", value: `${outPct}%`, tone: "warn" },
        { label: "Still inside", value: String(values.live), tone: "info" },
        { label: "Gate in", value: String(values.in), tone: "good" },
      ];
    case "live":
      return [
        { label: "Occupancy", value: `${livePct}%`, tone: "info" },
        { label: "Entries", value: String(values.in), tone: "good" },
        { label: "Exits", value: String(values.out), tone: "warn" },
      ];
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function DashboardKpis({
  totalVisitors = 0,
  checkedIn = 0,
  checkedOut = 0,
  currentlyInside = 0,
  loading = false,
}: DashboardKpisProps) {
  const navigate = useNavigate();
  const [flipped, setFlipped] = useState<Partial<Record<KpiKey, boolean>>>({});

  const values: Record<KpiKey, number> = useMemo(
    () => ({
      total: totalVisitors,
      in: checkedIn,
      out: checkedOut,
      live: currentlyInside,
    }),
    [totalVisitors, checkedIn, checkedOut, currentlyInside],
  );

  function flip(key: KpiKey, next: boolean) {
    setFlipped((prev) => ({ ...prev, [key]: next }));
  }

  return (
    <div className="vm-kpi-grid">
      {CARDS.map((card) => {
        const isFlipped = Boolean(flipped[card.key]);
        const value = loading ? "—" : values[card.key];
        const insights = buildInsights(card.key, values);

        return (
          <div key={card.key} className={`vm-kpi-flip${isFlipped ? " is-flipped" : ""}`}>
            <div className="vm-kpi-flip-inner">
              <button
                type="button"
                className="vm-kpi-face vm-kpi-front"
                onClick={() => flip(card.key, true)}
                aria-label={`${card.label}: ${value}. Show insights.`}
              >
                <div className="vm-kpi-face-top">
                  <div className={`vm-kpi-badge ${card.badge}`}>{iconFor(card.key)}</div>
                  <span className="vm-kpi-flip-hint" aria-hidden>
                    i
                  </span>
                </div>
                <span className="vm-kpi-label">{card.label}</span>
                <div className="vm-kpi-value-row">
                  <span className="vm-kpi-value">{value}</span>
                  <span className="vm-kpi-unit">{card.unit}</span>
                </div>
                <span className={`vm-kpi-foot${card.key === "live" ? " is-live" : ""}`}>
                  {card.key === "live" ? (
                    <>
                      Live <span className="vm-live-dot" aria-hidden />
                    </>
                  ) : (
                    card.foot
                  )}
                </span>
              </button>

              <div
                className="vm-kpi-face vm-kpi-back"
                onClick={() => flip(card.key, false)}
                role="button"
                tabIndex={0}
                aria-label={`${card.backTitle}: ${value}. Tap to flip back.`}
              >
                <div className="vm-kpi-back-top-row">
                  <div className="vm-kpi-back-titles">
                    <h3 className="vm-kpi-back-main-title">{card.backTitle}</h3>
                    <span className="vm-kpi-back-sub">{card.backBody}</span>
                  </div>
                  <div className="vm-kpi-back-val-group">
                    <span className="vm-kpi-back-big-num">{value}</span>
                    <div className="vm-kpi-back-icon-circle" aria-hidden>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="vm-kpi-back-divider" />

                <div className="vm-kpi-tiles-trio">
                  <div className="vm-kpi-trio-card is-blue">
                    <div className="vm-trio-icon-circle is-blue">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="3.25" />
                        <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
                      </svg>
                    </div>
                    <span className="vm-trio-label">Inside Now</span>
                    <strong className="vm-trio-val text-blue">{loading ? "—" : insights[0]?.value || values.live}</strong>
                  </div>

                  <div className="vm-kpi-trio-card is-orange">
                    <div className="vm-trio-icon-circle is-orange">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </div>
                    <span className="vm-trio-label">Checked In</span>
                    <strong className="vm-trio-val text-orange">{loading ? "—" : insights[1]?.value || "16%"}</strong>
                  </div>

                  <div className="vm-kpi-trio-card is-green">
                    <div className="vm-trio-icon-circle is-green">
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 1l4 4-4 4" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <path d="M7 23l-4-4 4-4" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                    </div>
                    <span className="vm-trio-label">Flow</span>
                    <strong className="vm-trio-val text-green">{loading ? "—" : insights[2]?.value || "In > Out"}</strong>
                  </div>
                </div>

                <div className="vm-kpi-back-footer-note">
                  <span className="vm-info-icon" aria-hidden>ⓘ</span>
                  <span>All entries created today across every location.</span>
                </div>

                <button
                  type="button"
                  className="vm-kpi-view-list-banner"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(card.to);
                  }}
                  aria-label={`View list for ${card.label}`}
                >
                  <div className="vm-kpi-banner-icon-bg" aria-hidden>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                    </svg>
                  </div>
                  <span className="vm-kpi-banner-text">View List</span>
                  <span className="vm-kpi-banner-arrow" aria-hidden>→</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
