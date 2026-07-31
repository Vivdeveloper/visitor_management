import { useMemo } from "react";
import type { DashboardKpis, VisitorListRow } from "@/api/vms";
import { filterRowsByDate } from "@/lib/visitorFlow";
import { resolveStatusCounts, type VisitorStatusKey } from "@/lib/visitorStatusDashboard";

type StageCountsReportProps = {
  kpis?: DashboardKpis;
  rows?: VisitorListRow[];
  loading?: boolean;
  selectedDate: string;
  isToday?: boolean;
  dateLabel?: string;
  className?: string;
};

const REPORT_STAGES: Array<{ key: VisitorStatusKey; hint: string; tone: string }> = [
  { key: "Pending Approval", hint: "Waiting for approval", tone: "amber" },
  { key: "Approved", hint: "Approved, not yet checked in", tone: "green" },
  { key: "Checked In", hint: "Currently inside premises", tone: "blue" },
  { key: "Meeting Done", hint: "Meeting completed", tone: "indigo" },
  { key: "Checkout Pending", hint: "Awaiting gate checkout", tone: "orange" },
  { key: "Checked Out", hint: "Visit completed and exited", tone: "slate" },
  { key: "Rejected", hint: "Visit not allowed", tone: "red" },
  { key: "Transferred", hint: "Host reassigned", tone: "slate" },
];

export function StageCountsReport({
  kpis = {},
  rows = [],
  loading = false,
  selectedDate,
  isToday = false,
  dateLabel,
  className = "",
}: StageCountsReportProps) {
  const dayRows = useMemo(() => filterRowsByDate(rows, selectedDate), [rows, selectedDate]);
  const counts = useMemo(() => resolveStatusCounts(kpis, dayRows), [kpis, dayRows]);

  const totalVisitors = Number(kpis.total ?? 0);
  const activeInside = Number(kpis["On Premises"] ?? 0);

  const subtitle = isToday
    ? "Today's visitor counts by stage"
    : dateLabel
      ? `Counts for ${dateLabel}`
      : "Visitor counts by stage";

  return (
    <section className={`vm-stage-report ${className}`.trim()} aria-label="Stage counts report">
      <div className="vm-stage-report-head">
        <div>
          <h2 className="vm-stage-report-title">Stage counts</h2>
          <p className="vm-stage-report-sub">{subtitle}</p>
        </div>
      </div>

      <div className="vm-stage-report-summary">
        <div className="vm-stage-report-summary-item">
          <span>Total visitors</span>
          <strong>{loading ? "—" : totalVisitors}</strong>
        </div>
        <div className="vm-stage-report-summary-item">
          <span>Active inside</span>
          <strong>{loading ? "—" : activeInside}</strong>
        </div>
      </div>

      <div className="vm-stage-report-list">
        {REPORT_STAGES.map((stage) => (
          <div key={stage.key} className={`vm-stage-report-row tone-${stage.tone}`}>
            <div className="vm-stage-report-row-main">
              <span className="vm-stage-report-dot" aria-hidden />
              <div className="vm-stage-report-copy">
                <span className="vm-stage-report-label">{stage.key}</span>
                <span className="vm-stage-report-hint">{stage.hint}</span>
              </div>
            </div>
            <strong className="vm-stage-report-value">{loading ? "—" : counts[stage.key]}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
