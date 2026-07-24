import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  dashboardApi,
  visitorApi,
  type DashboardKpis,
  type DashboardTrendPoint,
  type VisitorListRow,
} from "@/api/vms";
import { extractError, formatDate, formatTime, initials } from "@/lib/format";
import { VisitorTrendChart } from "@/components/dashboard/VisitorTrendChart";
import { VisitorBarChart } from "@/components/dashboard/VisitorBarChart";
import { VisitorCalendarGrid } from "@/components/dashboard/VisitorCalendarGrid";
import { AnalyticsInsightWidgets } from "@/components/dashboard/AnalyticsInsightWidgets";
import { HeaderBar } from "@/components/common/HeaderBar";

type MeetAgg = { name: string; count: number; color: string };
type SubTab = "overview" | "visitors" | "meet";
type ChartMode = "line" | "bar" | "calendar";
type StatusFilter = "all" | "Pending Approval" | "Approved" | "Checked In" | "Checked Out";

const MEET_COLORS = ["green", "blue", "purple", "orange"] as const;

const TREND_PERIODS = [
  { id: "7d", label: "Last 7 days" },
  { id: "14d", label: "Last 14 days" },
  { id: "30d", label: "Last 30 days" },
];

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All statuses" },
  { id: "Pending Approval", label: "Pending" },
  { id: "Approved", label: "Approved" },
  { id: "Checked In", label: "Checked in" },
  { id: "Checked Out", label: "Checked out" },
];

const TAB_LABELS: Record<SubTab, string> = {
  overview: "Overview",
  visitors: "Visitors",
  meet: "Person to meet",
};

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rowDate(r: VisitorListRow) {
  return (r.creation || r.checked_in_on || r.modified || "").slice(0, 10);
}

export function MobileAnalyticsPage() {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<SubTab>("overview");
  const [chartMode, setChartMode] = useState<ChartMode>("line");
  const [selectedDate, setSelectedDate] = useState(() => toInputDate(new Date()));
  const [period, setPeriod] = useState("7d");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [meetFilter, setMeetFilter] = useState("all");
  const [kpis, setKpis] = useState<DashboardKpis>({});
  const [trend, setTrend] = useState<DashboardTrendPoint[]>([]);
  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date: string, periodId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [kpi, trends, detailed] = await Promise.all([
        dashboardApi.getKpis({ from_date: date, to_date: date }),
        dashboardApi.getVisitorTrends({ period: periodId }),
        visitorApi.listDetailed(200),
      ]);
      setKpis(kpi || {});
      setTrend(trends?.series || []);
      setRows(detailed || []);
    } catch (err: unknown) {
      setError(extractError(err, "Could not load analytics"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedDate, period);
  }, [load, selectedDate, period]);

  const meetOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const name = (row.person_to_meet_name || "").trim();
      if (name) set.add(name);
    }
    return ["all", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const stamp = rowDate(r);
      if (stamp !== selectedDate) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (meetFilter !== "all" && (r.person_to_meet_name || "").trim() !== meetFilter) return false;
      return true;
    });
  }, [rows, selectedDate, statusFilter, meetFilter]);

  const topMeet = useMemo(() => {
    const source = subTab === "meet" ? rows : filteredRows;
    const map = new Map<string, number>();
    for (const row of source) {
      const name = (row.person_to_meet_name || "").trim();
      if (!name) continue;
      if (meetFilter !== "all" && name !== meetFilter) continue;
      map.set(name, (map.get(name) || 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count], i): MeetAgg => ({
        name,
        count,
        color: MEET_COLORS[i % MEET_COLORS.length],
      }));
  }, [rows, filteredRows, subTab, meetFilter]);

  const dateLabel = formatDate(selectedDate) || selectedDate;
  const isToday = selectedDate === toInputDate(new Date());

  function shiftDate(days: number) {
    const d = new Date(`${selectedDate}T12:00:00`);
    d.setDate(d.getDate() + days);
    const next = toInputDate(d);
    const today = toInputDate(new Date());
    if (next > today) return;
    setSelectedDate(next);
  }

  return (
    <div className="vm-home-page vm-reports-page">
      <HeaderBar title="Precious Alloys" showNotification showProfile />

      <header className="vm-reports-head">
        <div>
          <p className="vm-reports-eyebrow">Analytics</p>
          <h1 className="vm-reports-title">Reports</h1>
        </div>
        <span className={`vm-live-pill${isToday ? " is-live" : ""}`}>{isToday ? "Live" : "Historic"}</span>
      </header>

      <main className="vm-main-body vm-reports-stack">
        <div className="vm-overview-card vm-reports-filters">
          <div className="vm-date-nav">
            <button type="button" className="vm-date-nav-btn" onClick={() => shiftDate(-1)} aria-label="Previous day">
              ‹
            </button>
            <label className="vm-date-picker-inline">
              <span className="vm-date-picker-left">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 11h18" />
                </svg>
                <span>{dateLabel}</span>
              </span>
              <input
                type="date"
                className="vm-date-input"
                value={selectedDate}
                max={toInputDate(new Date())}
                onChange={(e) => setSelectedDate(e.target.value || toInputDate(new Date()))}
                aria-label="Select report date"
              />
            </label>
            <button
              type="button"
              className="vm-date-nav-btn"
              onClick={() => shiftDate(1)}
              aria-label="Next day"
              disabled={isToday}
            >
              ›
            </button>
          </div>

          <div className="vm-filter-row">
            <label className="vm-filter-field">
              <span>Person to meet</span>
              <select value={meetFilter} onChange={(e) => setMeetFilter(e.target.value)}>
                {meetOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "all" ? "All people" : opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="vm-filter-field">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                {STATUS_FILTERS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <AnalyticsInsightWidgets
          insideCount={Number(kpis["On Premises"] ?? 0)}
          totalToday={Number(kpis.total ?? 0)}
          checkedIn={Number(kpis["Checked In"] ?? 0)}
          checkedOut={Number(kpis["Checked Out"] ?? 0)}
          trend={trend}
          loading={loading}
          onOpenInside={() => navigate("/inside?status=inside")}
          onOpenFlow={() => {
            setSubTab("overview");
            setChartMode("line");
          }}
        />

        <button type="button" className="vm-meetings-cta" onClick={() => navigate("/meetings")}>
          <span className="vm-meetings-cta-copy">
            <strong>Meetings by day</strong>
            <span>Timeline cards with time · person to meet</span>
          </span>
          <span aria-hidden>›</span>
        </button>

        <div className="vm-reports-tabs" role="tablist" aria-label="Reports sections">
          {(["overview", "visitors", "meet"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={subTab === t}
              className={`vm-reports-tab${subTab === t ? " is-active" : ""}`}
              onClick={() => setSubTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}

        {(subTab === "overview" || subTab === "visitors") && (
          <>
            <div className="vm-overview-card vm-reports-kpi-grid vm-analytics-card">
              {(
                [
                  { label: "Total today", value: Number(kpis.total ?? 0), to: "/inside?status=all" },
                  { label: "On premises", value: Number(kpis["On Premises"] ?? 0), to: "/inside?status=inside" },
                  { label: "Pending", value: Number(kpis["Pending Approval"] ?? 0), to: "/inside?status=pending" },
                  { label: "Checked out", value: Number(kpis["Checked Out"] ?? 0), to: "/inside?status=checked_out" },
                ] as const
              ).map((item, idx) => (
                <button
                  key={item.label}
                  type="button"
                  className="vm-reports-kpi"
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onClick={() => navigate(item.to)}
                >
                  <span>{item.label}</span>
                  <strong>{loading ? "—" : item.value}</strong>
                </button>
              ))}
            </div>

            <div className="vm-chart-mode-tabs" role="tablist" aria-label="Chart type">
              {(
                [
                  { id: "line", label: "Line" },
                  { id: "bar", label: "Bar" },
                  { id: "calendar", label: "Calendar" },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={chartMode === mode.id}
                  className={`vm-chart-mode-tab${chartMode === mode.id ? " is-active" : ""}`}
                  onClick={() => {
                    setChartMode(mode.id);
                    if (mode.id === "calendar" && period === "7d") setPeriod("30d");
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {chartMode === "line" ? (
              <VisitorTrendChart
                series={trend}
                loading={loading}
                periodId={period}
                periodOptions={TREND_PERIODS}
                onPeriodChange={setPeriod}
                clickable={false}
              />
            ) : null}
            {chartMode === "bar" ? (
              <VisitorBarChart
                series={trend}
                loading={loading}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            ) : null}
            {chartMode === "calendar" ? (
              <VisitorCalendarGrid
                series={trend}
                loading={loading}
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  navigate(`/meetings?date=${encodeURIComponent(date)}`);
                }}
              />
            ) : null}
          </>
        )}

        {subTab === "visitors" ? (
          <div className="vm-overview-card vm-reports-visitors vm-analytics-card">
            <div className="vm-chart-card-head">
              <h3 className="vm-chart-card-title">
                Visitors · {dateLabel}
                <span className="vm-reports-count-badge">{filteredRows.length}</span>
              </h3>
              <button type="button" className="vm-card-link-btn" onClick={() => navigate("/inside")}>
                View All ›
              </button>
            </div>
            {loading ? (
              <p className="vm-empty-hint">Loading…</p>
            ) : filteredRows.length === 0 ? (
              <p className="vm-empty-hint">No visitors for these filters</p>
            ) : (
              filteredRows.slice(0, 12).map((row, idx) => (
                <button
                  key={row.name}
                  type="button"
                  className="vm-activity-row vm-visitor-row is-interactive"
                  style={{ animationDelay: `${Math.min(idx, 10) * 35}ms` }}
                  onClick={() => navigate(`/visitor/${encodeURIComponent(row.name)}`)}
                >
                  <div className="vm-activity-avatar avatar-green">{initials(row.full_name || row.name)}</div>
                  <div className="vm-activity-info">
                    <span className="vm-activity-name">{row.full_name || row.name}</span>
                    <span className="vm-activity-status">
                      {row.person_to_meet_name || row.visit_purpose_type || "—"}
                    </span>
                  </div>
                  <div className="vm-activity-meta">
                    <span className="vm-activity-time">
                      {formatTime(row.check_in || row.checked_in_on || row.modified || row.creation) || "—"}
                    </span>
                    <span className="vm-badge-out">{row.status || "—"}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : null}

        {(subTab === "overview" || subTab === "meet") && (
          <div className="vm-overview-card vm-reports-hosts vm-analytics-card">
            <h3 className="vm-card-heading" style={{ fontSize: "1rem", marginBottom: "0.85rem" }}>
              Top people to meet
            </h3>
            {loading ? (
              <p className="vm-empty-hint">Loading…</p>
            ) : topMeet.length === 0 ? (
              <p className="vm-empty-hint">No person-to-meet data yet</p>
            ) : (
              <div className="vm-host-list">
                {topMeet.map((person, idx) => (
                  <button
                    key={person.name}
                    type="button"
                    className="vm-host-row is-interactive"
                    style={{ animationDelay: `${idx * 40}ms` }}
                    onClick={() => {
                      setMeetFilter(person.name);
                      setSubTab("visitors");
                    }}
                  >
                    <div className="vm-host-row-left">
                      <div className={`vm-activity-avatar avatar-${person.color}`} style={{ width: "36px", height: "36px" }}>
                        {initials(person.name)}
                      </div>
                      <span className="vm-host-name">{person.name}</span>
                    </div>
                    <span className="vm-host-count">{String(person.count).padStart(2, "0")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
