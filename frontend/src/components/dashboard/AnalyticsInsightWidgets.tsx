import { useMemo } from "react";
import type { DashboardTrendPoint } from "@/api/vms";

type Props = {
  insideCount: number;
  totalToday: number;
  checkedIn: number;
  checkedOut: number;
  trend?: DashboardTrendPoint[];
  loading?: boolean;
  onOpenInside?: () => void;
  onOpenFlow?: () => void;
};

export function AnalyticsInsightWidgets({
  insideCount,
  totalToday,
  checkedIn,
  checkedOut,
  trend = [],
  loading = false,
  onOpenInside,
  onOpenFlow,
}: Props) {
  const insidePct = useMemo(() => {
    const base = Math.max(totalToday, insideCount, 1);
    return Math.min(100, Math.round((insideCount / base) * 100));
  }, [insideCount, totalToday]);

  const ringStyle = useMemo(() => {
    const deg = (insidePct / 100) * 360;
    return {
      background: `conic-gradient(#0A3D91 ${deg}deg, #E8EDF2 ${deg}deg)`,
    };
  }, [insidePct]);

  const spark = useMemo(() => {
    const points = trend.length ? trend : Array.from({ length: 7 }, (_, i) => ({ date: `d${i}`, count: 0 }));
    const max = Math.max(1, ...points.map((p) => p.count));
    const w = 160;
    const h = 48;
    const pad = 4;
    const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
    const coords = points.map((p, i) => {
      const x = pad + i * step;
      const y = h - pad - (p.count / max) * (h - pad * 2);
      return { x, y, count: p.count };
    });
    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
    const area = coords.length
      ? `${line} L ${coords[coords.length - 1].x} ${h} L ${coords[0].x} ${h} Z`
      : "";
    const latest = points[points.length - 1]?.count ?? 0;
    return { line, area, latest, w, h };
  }, [trend]);

  const netFlow = checkedIn - checkedOut;

  return (
    <div className="vm-widget-grid">
      <button type="button" className="vm-insight-widget is-inside" onClick={onOpenInside}>
        <div className="vm-insight-widget-head">
          <span className="vm-insight-icon is-blue" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8.25" />
              <path d="M12 7.5v5l3 1.75" />
            </svg>
          </span>
          <strong>Inside Time</strong>
        </div>
        <p className="vm-insight-copy">
          {loading
            ? "Loading live occupancy…"
            : `${insideCount} visitors on premises · ${insidePct}% of today’s gate activity.`}
        </p>
        <div className="vm-insight-donut" style={ringStyle} aria-hidden>
          <div className="vm-insight-donut-hole">
            <span>{loading ? "—" : insideCount}</span>
            <small>inside</small>
          </div>
        </div>
      </button>

      <button type="button" className="vm-insight-widget is-flow" onClick={onOpenFlow}>
        <div className="vm-insight-widget-head">
          <span className="vm-insight-icon is-navy" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 14c2-4 4-6 8-6s6 2 8 6" />
              <path d="M4 18c2-3 4-4.5 8-4.5S18 15 20 18" />
            </svg>
          </span>
          <strong>Gate Flow</strong>
        </div>
        <p className="vm-insight-copy">
          {loading
            ? "Loading flow…"
            : `In ${checkedIn} · Out ${checkedOut} · net ${netFlow >= 0 ? "+" : ""}${netFlow}. Latest day ${spark.latest}.`}
        </p>
        <div className="vm-insight-spark">
          <svg viewBox={`0 0 ${spark.w} ${spark.h}`} className="vm-insight-spark-svg">
            <defs>
              <linearGradient id="flowSparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A3D91" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#0A3D91" stopOpacity="0" />
              </linearGradient>
            </defs>
            {spark.area ? <path d={spark.area} fill="url(#flowSparkFill)" /> : null}
            {spark.line ? (
              <path d={spark.line} fill="none" stroke="#0A3D91" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
          </svg>
        </div>
      </button>
    </div>
  );
}
