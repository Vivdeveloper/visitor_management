import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export type PurposeSlice = {
  label: string;
  count: number;
  color: string;
};

type VisitorsByPurposeChartProps = {
  slices?: PurposeSlice[];
  loading?: boolean;
};

const DEFAULT_SLICES: PurposeSlice[] = [
  { label: "Meeting", count: 8, color: "#f97316" },
  { label: "Audit", count: 6, color: "#2563eb" },
  { label: "Interview", count: 6, color: "#8b5cf6" },
  { label: "Maintenance", count: 4, color: "#10b981" },
];

export function VisitorsByPurposeChart({ slices = [], loading = false }: VisitorsByPurposeChartProps) {
  const navigate = useNavigate();

  const activeSlices = slices.length ? slices : DEFAULT_SLICES;

  const { total, gradient, rows } = useMemo(() => {
    const totalCount = activeSlices.reduce((sum, s) => sum + s.count, 0);
    if (!totalCount) {
      return { total: 0, gradient: "#e2e8f0", rows: [] as Array<PurposeSlice & { pct: number }> };
    }
    let cursor = 0;
    const stops: string[] = [];
    const rowsWithPct = activeSlices.map((s) => {
      const pct = Math.round((s.count / totalCount) * 100);
      const start = cursor;
      cursor += pct;
      stops.push(`${s.color} ${start}% ${Math.min(100, cursor)}%`);
      return { ...s, pct };
    });
    return {
      total: totalCount,
      gradient: `conic-gradient(${stops.join(", ")})`,
      rows: rowsWithPct,
    };
  }, [activeSlices]);

  return (
    <div
      className="vm-overview-card vm-chart-card vm-purpose-card is-clickable"
      onClick={() => navigate("/analytics")}
      role="button"
      tabIndex={0}
      aria-label="Visitors by purpose — open reports"
    >
      <div className="vm-chart-card-head">
        <div className="vm-chart-title-group">
          <div className="vm-chart-icon-badge" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3v9h9" />
            </svg>
          </div>
          <h3 className="vm-chart-card-title">Visitors by Purpose</h3>
        </div>
        <button type="button" className="vm-card-link-btn" onClick={(e) => { e.stopPropagation(); navigate("/analytics"); }}>
          View All ›
        </button>
      </div>

      <div className="vm-purpose-body">
        <div className="vm-purpose-donut" style={{ background: loading ? "#e2e8f0" : gradient }}>
          <div className="vm-purpose-donut-hole">
            <span className="vm-purpose-total">{loading ? "—" : total}</span>
            <span className="vm-purpose-total-label">Total</span>
          </div>
        </div>

        <div className="vm-purpose-legend">
          {loading ? (
            <span className="vm-empty-hint">Loading…</span>
          ) : (
            rows.slice(0, 4).map((row) => (
              <div key={row.label} className="vm-purpose-legend-row">
                <span className="vm-legend-dot-label">
                  <span className="vm-legend-dot" style={{ background: row.color }} />
                  <span className="vm-legend-name">{row.label}</span>
                </span>
                <span className="vm-legend-val">
                  <strong>{row.count}</strong> ({row.pct}%)
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="vm-purpose-note-box">
        <div className="vm-note-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </div>
        <span>Meetings are the most common purpose for visits.</span>
      </div>
    </div>
  );
}
