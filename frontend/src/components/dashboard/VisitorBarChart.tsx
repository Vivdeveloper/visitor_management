import { useMemo } from "react";
import type { DashboardTrendPoint } from "@/api/vms";

type Props = {
  series?: DashboardTrendPoint[];
  loading?: boolean;
  onSelectDate?: (date: string) => void;
  selectedDate?: string;
};

function dayLabel(dateStr: string) {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString([], { weekday: "short" });
  } catch {
    return dateStr.slice(5);
  }
}

export function VisitorBarChart({ series = [], loading = false, onSelectDate, selectedDate }: Props) {
  const bars = useMemo(() => {
    const points = series.length ? series : [];
    const max = Math.max(1, ...points.map((p) => p.count));
    return points.map((p) => ({
      ...p,
      pct: Math.max(6, Math.round((p.count / max) * 100)),
      label: dayLabel(p.date),
    }));
  }, [series]);

  return (
    <div className="vm-overview-card vm-chart-card vm-analytics-card">
      <div className="vm-chart-card-head">
        <h3 className="vm-chart-card-title">Daily volume</h3>
        <span className="vm-chip-muted">Bar</span>
      </div>
      {loading ? (
        <p className="vm-empty-hint">Loading…</p>
      ) : bars.length === 0 ? (
        <p className="vm-empty-hint">No trend data</p>
      ) : (
        <div className="vm-bar-chart" role="img" aria-label="Visitor counts by day">
          {bars.map((bar, idx) => {
            const active = selectedDate === bar.date;
            return (
              <button
                key={bar.date}
                type="button"
                className={`vm-bar-col${active ? " is-active" : ""}`}
                style={{ animationDelay: `${idx * 40}ms` }}
                onClick={() => onSelectDate?.(bar.date)}
                aria-label={`${bar.label} ${bar.count} visitors`}
              >
                <span className="vm-bar-value">{bar.count}</span>
                <span className="vm-bar-track">
                  <span className="vm-bar-fill" style={{ height: `${bar.pct}%` }} />
                </span>
                <span className="vm-bar-label">{bar.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
