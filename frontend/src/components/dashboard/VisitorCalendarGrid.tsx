import { useMemo } from "react";
import type { DashboardTrendPoint } from "@/api/vms";

type Props = {
  series?: DashboardTrendPoint[];
  loading?: boolean;
  selectedDate?: string;
  onSelectDate?: (date: string) => void;
  monthLabel?: string;
};

function parseYmd(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

export function VisitorCalendarGrid({
  series = [],
  loading = false,
  selectedDate,
  onSelectDate,
  monthLabel,
}: Props) {
  const { cells, max, title } = useMemo(() => {
    const map = new Map(series.map((s) => [s.date, s.count]));
    const anchor = selectedDate || series[series.length - 1]?.date || new Date().toISOString().slice(0, 10);
    const { y, m } = parseYmd(anchor);
    const first = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const startPad = first.getDay(); // 0 Sun
    const maxCount = Math.max(1, ...series.map((s) => s.count), 1);
    const built: Array<{ key: string; date?: string; count: number; inMonth: boolean }> = [];

    for (let i = 0; i < startPad; i += 1) {
      built.push({ key: `pad-${i}`, count: 0, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      built.push({ key: date, date, count: map.get(date) || 0, inMonth: true });
    }
    const label =
      monthLabel ||
      first.toLocaleDateString([], { month: "long", year: "numeric" });
    return { cells: built, max: maxCount, title: label };
  }, [series, selectedDate, monthLabel]);

  function intensity(count: number) {
    if (!count) return 0;
    return Math.min(1, count / max);
  }

  return (
    <div className="vm-overview-card vm-chart-card vm-analytics-card">
      <div className="vm-chart-card-head">
        <h3 className="vm-chart-card-title">Calendar heat</h3>
        <span className="vm-chip-muted">{title}</span>
      </div>
      {loading ? (
        <p className="vm-empty-hint">Loading…</p>
      ) : (
        <>
          <div className="vm-cal-weekdays" aria-hidden>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>
          <div className="vm-cal-grid">
            {cells.map((cell, idx) => {
              if (!cell.inMonth || !cell.date) {
                return <span key={cell.key} className="vm-cal-cell is-empty" />;
              }
              const level = intensity(cell.count);
              const active = selectedDate === cell.date;
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={`vm-cal-cell${active ? " is-active" : ""}${cell.count ? " has-count" : ""}`}
                  style={{
                    animationDelay: `${Math.min(idx, 28) * 18}ms`,
                    ["--heat" as string]: String(level),
                  }}
                  onClick={() => onSelectDate?.(cell.date!)}
                  aria-label={`${cell.date}: ${cell.count} visitors`}
                >
                  <span className="vm-cal-day">{Number(cell.date.slice(-2))}</span>
                  {cell.count > 0 ? <span className="vm-cal-count">{cell.count}</span> : null}
                </button>
              );
            })}
          </div>
          <p className="vm-cal-legend">Darker cells = more visitors that day. Tap a day to filter.</p>
        </>
      )}
    </div>
  );
}
