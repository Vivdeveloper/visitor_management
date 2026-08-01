import { useMemo } from "react";
import type { DashboardKpis, VisitorListRow } from "@/api/vms";
import { filterRowsByDate } from "@/lib/visitorFlow";
import { resolveStatusCounts, type VisitorStatusKey } from "@/lib/visitorStatusDashboard";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { formatCount } from "@/lib/format";
import { translateVisitorStatus, ut, type UiCopyKey } from "@/i18n/uiChrome";

type StageCountsReportProps = {
  kpis?: DashboardKpis;
  rows?: VisitorListRow[];
  loading?: boolean;
  selectedDate: string;
  isToday?: boolean;
  dateLabel?: string;
  className?: string;
};

const REPORT_STAGES: Array<{ key: VisitorStatusKey; hintKey: UiCopyKey; tone: string }> = [
  { key: "Pending Approval", hintKey: "hint_pending_approval", tone: "amber" },
  { key: "Approved", hintKey: "hint_approved", tone: "green" },
  { key: "Checked In", hintKey: "hint_checked_in", tone: "blue" },
  { key: "Meeting Done", hintKey: "hint_meeting_done", tone: "indigo" },
  { key: "Checkout Pending", hintKey: "hint_checkout_pending", tone: "orange" },
  { key: "Checked Out", hintKey: "hint_checked_out", tone: "slate" },
  { key: "Rejected", hintKey: "hint_rejected", tone: "red" },
  { key: "Transferred", hintKey: "hint_transferred", tone: "slate" },
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
  const { lang } = useAppLanguage();
  const dayRows = useMemo(() => filterRowsByDate(rows, selectedDate), [rows, selectedDate]);
  const counts = useMemo(() => resolveStatusCounts(kpis, dayRows), [kpis, dayRows]);

  const totalVisitors = Number(kpis.total ?? 0);
  const activeInside = Number(kpis["On Premises"] ?? 0);

  const subtitle = isToday
    ? ut(lang, "stage_counts_today_sub")
    : dateLabel
      ? ut(lang, "stage_counts_for", { date: dateLabel })
      : ut(lang, "stage_counts_sub");

  return (
    <section className={`vm-stage-report ${className}`.trim()} aria-label={ut(lang, "stage_counts")}>
      <div className="vm-stage-report-head">
        <div>
          <h2 className="vm-stage-report-title">{ut(lang, "stage_counts")}</h2>
          <p className="vm-stage-report-sub">{subtitle}</p>
        </div>
      </div>

      <div className="vm-stage-report-summary">
        <div className="vm-stage-report-summary-item">
          <span>{ut(lang, "total_visitors")}</span>
          <strong>{loading ? "—" : formatCount(totalVisitors, lang)}</strong>
        </div>
        <div className="vm-stage-report-summary-item">
          <span>{ut(lang, "active_inside")}</span>
          <strong>{loading ? "—" : formatCount(activeInside, lang)}</strong>
        </div>
      </div>

      <div className="vm-stage-report-list">
        {REPORT_STAGES.map((stage) => (
          <div key={stage.key} className={`vm-stage-report-row tone-${stage.tone}`}>
            <div className="vm-stage-report-row-main">
              <span className="vm-stage-report-dot" aria-hidden />
              <div className="vm-stage-report-copy">
                <span className="vm-stage-report-label">{translateVisitorStatus(lang, stage.key)}</span>
                <span className="vm-stage-report-hint">{ut(lang, stage.hintKey)}</span>
              </div>
            </div>
            <strong className="vm-stage-report-value">
              {loading ? "—" : formatCount(counts[stage.key], lang)}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
