import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dashboardApi,
  visitorApi,
  type DashboardKpis as DashboardKpiData,
  type DashboardTrendPoint,
  type VisitorListRow,
} from "@/api/vms";
import { useAuth } from "@/context/AuthContext";
import { formatTime } from "@/lib/format";
import { HeaderBar } from "@/components/common/HeaderBar";
import { DashboardKpis } from "@/components/dashboard/DashboardKpis";
import { VisitorTrendChart } from "@/components/dashboard/VisitorTrendChart";
import { VisitorsByPurposeChart, type PurposeSlice } from "@/components/dashboard/VisitorsByPurposeChart";
import { RecentVisitorsList, type RecentVisitorItem } from "@/components/dashboard/RecentVisitorsList";

const PURPOSE_COLORS = ["#0A3D91", "#16A34A", "#D97706", "#4338CA", "#64748B", "#0F4FB5"];

const TREND_PERIODS = [
  { id: "7d", label: "Last 7 days" },
  { id: "14d", label: "Last 14 days" },
  { id: "30d", label: "Last 30 days" },
];

function firstName(full?: string | null, fallback = "there") {
  const part = (full || "").trim().split(/\s+/)[0];
  return part || fallback;
}

function statusLabel(status?: string) {
  if (!status) return "—";
  if (status === "Checked In") return "Checked-in";
  if (status === "Checked Out") return "Checked-out";
  if (status === "Pending Approval") return "Pending";
  return status;
}

function buildPurposeSlices(rows: VisitorListRow[]): PurposeSlice[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = (row.visit_purpose_type || "Others").trim() || "Others";
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count], i) => ({
      label,
      count,
      color: PURPOSE_COLORS[i % PURPOSE_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count);
}

function toRecent(rows: VisitorListRow[]): RecentVisitorItem[] {
  return rows.slice(0, 4).map((r) => ({
    name: r.name,
    full_name: r.full_name || r.name,
    purpose: r.visit_purpose_type || r.person_to_meet_name || "—",
    time: formatTime(r.check_in || r.checked_in_on || r.modified || r.creation) || "—",
    status: statusLabel(r.status),
  }));
}

export function MobileHomePage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<DashboardKpiData>({});
  const [trend, setTrend] = useState<DashboardTrendPoint[]>([]);
  const [recentRows, setRecentRows] = useState<VisitorListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("7d");

  const load = useCallback(async (periodId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [kpi, trends, detailed] = await Promise.all([
        dashboardApi.getKpis(),
        dashboardApi.getVisitorTrends({ period: periodId }),
        visitorApi.listDetailed(80),
      ]);
      setKpis(kpi || {});
      setTrend(trends?.series || []);
      setRecentRows(detailed || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
      setKpis({});
      setTrend([]);
      setRecentRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  const purposeSlices = useMemo(() => buildPurposeSlices(recentRows), [recentRows]);
  const recentVisitors = useMemo(() => toRecent(recentRows), [recentRows]);

  const totalVisitors = Number(kpis.total ?? 0);
  const checkedIn = Number(kpis["Checked In"] ?? 0);
  const checkedOut = Number(kpis["Checked Out"] ?? 0);
  const currentlyInside = Number(kpis["On Premises"] ?? 0);

  return (
    <div className="vm-home-page">
      <HeaderBar title="Precious Alloys" showNotification showProfile />

      <section className="vm-home-hero">
        <div className="vm-home-hero-copy">
          <p className="vm-home-hero-eyebrow">
            <span className="vm-live-dot" aria-hidden /> Live gate desk
          </p>
          <h1 className="vm-home-hello">Hello, {firstName(user?.full_name || user?.user)}</h1>
          <p className="vm-home-sub">Welcome back! Here’s what’s happening today.</p>
        </div>
        <button
          type="button"
          className="vm-home-hero-chip"
          onClick={() => {
            const el = document.querySelector(".vm-kpi-grid");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          Insights
        </button>
      </section>

      {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}

      <main className="vm-main-body vm-home-stack">
        <DashboardKpis
          totalVisitors={totalVisitors}
          checkedIn={checkedIn}
          checkedOut={checkedOut}
          currentlyInside={currentlyInside}
          loading={loading}
        />

        <VisitorTrendChart
          series={trend}
          loading={loading}
          periodId={period}
          periodOptions={TREND_PERIODS}
          onPeriodChange={setPeriod}
        />

        <div className="vm-home-split">
          <VisitorsByPurposeChart slices={purposeSlices} loading={loading} />
          <RecentVisitorsList visitors={recentVisitors} loading={loading} />
        </div>
      </main>
    </div>
  );
}
