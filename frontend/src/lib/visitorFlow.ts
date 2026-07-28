import type { DashboardKpis, VisitorListRow } from "@/api/vms";
import { resolveStatusCounts } from "@/lib/visitorStatusDashboard";

export function toFlowInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatFlowDateLabel(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function formatFlowDateShort(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

export function isFlowToday(iso: string) {
  return iso === toFlowInputDate(new Date());
}

export function isFlowYesterday(iso: string) {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return iso === toFlowInputDate(d);
}

/** Gate desk KPI labels/values that follow the visitor-flow date picker. */
export function getGateDeskMetaLabels(iso: string) {
  if (isFlowToday(iso)) {
    return {
      isToday: true as const,
      timeLabel: "Current Time",
      visitorsLabel: "Today's Visitors",
      dateDisplay: null as string | null,
    };
  }

  const dateLabel = formatFlowDateLabel(iso);
  const shortDate = formatFlowDateShort(iso);

  return {
    isToday: false as const,
    timeLabel: "Selected Date",
    dateDisplay: dateLabel,
    visitorsLabel: isFlowYesterday(iso) ? "Yesterday's Visitors" : `${shortDate}'s Visitors`,
  };
}

export function filterRowsByDate(rows: VisitorListRow[], iso: string) {
  return rows.filter((row) => {
    const stamp = (row.creation || row.checked_in_on || row.modified || "").slice(0, 10);
    return stamp === iso;
  });
}

export function computeAvgVisitMinutes(rows: VisitorListRow[], iso: string): number | null {
  const durations: number[] = [];
  for (const row of rows) {
    if (!row.checked_in_on || !row.checked_out_on) continue;
    const stamp = (row.creation || row.checked_in_on).slice(0, 10);
    if (stamp !== iso) continue;
    const start = new Date(row.checked_in_on).getTime();
    const end = new Date(row.checked_out_on).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;
    durations.push((end - start) / 60_000);
  }
  if (!durations.length) return null;
  return Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
}

export function formatAvgVisitDuration(minutes: number | null) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function resolveFlowSummary(
  kpis: DashboardKpis,
  rows: VisitorListRow[],
  dateIso: string,
) {
  const dayRows = filterRowsByDate(rows, dateIso);
  const counts = resolveStatusCounts(kpis, dayRows);

  return {
    counts,
    totalVisitors: Number(kpis.total ?? 0),
    activeInside: Number(kpis["On Premises"] ?? 0),
    pendingCheckout: counts["Checkout Pending"],
    avgVisitMinutes: computeAvgVisitMinutes(dayRows, dateIso),
  };
}
