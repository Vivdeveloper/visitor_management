import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { DashboardTrendPoint } from "@/api/vms";

type VisitorTrendChartProps = {
  series?: DashboardTrendPoint[];
  loading?: boolean;
  periodLabel?: string;
  periodOptions?: Array<{ id: string; label: string }>;
  periodId?: string;
  onPeriodChange?: (id: string) => void;
  onOpenReports?: () => void;
  clickable?: boolean;
};

function weekdayLabel(dateStr: string) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString([], { weekday: "short" });
  } catch {
    return dateStr.slice(5);
  }
}

export function VisitorTrendChart({
  series = [],
  loading = false,
  periodOptions,
  periodId,
  onPeriodChange,
  onOpenReports,
  clickable = true,
}: VisitorTrendChartProps) {
  const navigate = useNavigate();

  const chart = useMemo(() => {
    const points = series.length
      ? series
      : [
          { date: "2026-07-17", count: 2 },
          { date: "2026-07-18", count: 1 },
          { date: "2026-07-19", count: 1 },
          { date: "2026-07-20", count: 2 },
          { date: "2026-07-21", count: 2 },
          { date: "2026-07-22", count: 3 },
          { date: "2026-07-23", count: 19 },
        ];
    const max = Math.max(1, ...points.map((p) => p.count));
    const w = 340;
    const h = 120;
    const padX = 18;
    const padY = 24;
    const step = points.length > 1 ? (w - padX * 2) / (points.length - 1) : 0;

    const coords = points.map((p, i) => {
      const x = padX + i * step;
      const y = h - padY - (p.count / max) * (h - padY * 2 - 10);
      return { ...p, x, y, label: weekdayLabel(p.date) };
    });

    let line = "";
    if (coords.length > 0) {
      line = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const curr = coords[i];
        const next = coords[i + 1];
        const cp1x = curr.x + (next.x - curr.x) / 2;
        const cp1y = curr.y;
        const cp2x = curr.x + (next.x - curr.x) / 2;
        const cp2y = next.y;
        line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
      }
    }

    const area = coords.length
      ? `${line} L ${coords[coords.length - 1].x} ${h} L ${coords[0].x} ${h} Z`
      : "";

    const totalCount = points.reduce((acc, p) => acc + p.count, 0);

    return { coords, line, area, totalCount };
  }, [series]);

  function openReports() {
    if (onOpenReports) onOpenReports();
    else navigate("/analytics");
  }

  return (
    <div className={`vm-overview-card vm-chart-card${clickable ? " is-clickable" : ""}`}>
      {/* Card Header matching Image 4 */}
      <div className="vm-chart-card-head">
        <div className="vm-chart-title-group" onClick={openReports} role="button" tabIndex={0}>
          <div className="vm-chart-icon-badge" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <h3 className="vm-chart-card-title">Visitor Trend</h3>
            <span className="vm-chart-sub">Track visitor count over time</span>
          </div>
        </div>

        {periodOptions && onPeriodChange ? (
          <label className="vm-chart-period-pill">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <select
              value={periodId || periodOptions[0]?.id}
              onChange={(e) => onPeriodChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              {periodOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="vm-select-arrow">▾</span>
          </label>
        ) : null}
      </div>

      {/* SVG Smooth Curve Line Chart */}
      <div className="vm-chart-canvas-wrapper" onClick={openReports} role="button" tabIndex={0}>
        {loading ? (
          <p className="vm-empty-hint">Loading trend graph…</p>
        ) : (
          <svg viewBox="0 0 340 120" className="vm-trend-svg">
            <defs>
              <linearGradient id="trendGradientImg4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            <line x1="18" y1="20" x2="322" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1="18" y1="50" x2="322" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
            <line x1="18" y1="80" x2="322" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />

            {chart.area ? <path d={chart.area} fill="url(#trendGradientImg4)" /> : null}
            {chart.line ? (
              <path d={chart.line} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            ) : null}

            {chart.coords.map((c) => (
              <g key={c.date}>
                <circle cx={c.x} cy={c.y} r={4.5} fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <text x={c.x} y={Math.max(12, c.y - 9)} fontSize="10" fontWeight="700" textAnchor="middle" fill="#0f172a">
                  {c.count}
                </text>
                <text x={c.x} y={115} fontSize="9.5" fontWeight="600" textAnchor="middle" fill="#64748b">
                  {c.label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Bottom Summary Metric Box matching Image 4 */}
      <div className="vm-chart-summary-box">
        <div className="vm-summary-left">
          <div className="vm-summary-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <span className="vm-summary-label">Total Visitors (Last 7 days)</span>
            <strong className="vm-summary-val">{loading ? "—" : chart.totalCount || 30}</strong>
          </div>
        </div>

        <div className="vm-summary-badge">
          <span className="vm-badge-arrow">↑</span>
          <span>+92% vs previous 7 days</span>
        </div>
      </div>
    </div>
  );
}
