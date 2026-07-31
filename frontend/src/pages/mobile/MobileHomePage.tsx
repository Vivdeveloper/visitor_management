import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dashboardApi,
  visitorApi,
  type DashboardKpis as DashboardKpiData,
  type VisitorListRow,
} from "@/api/vms";
import { formatTime } from "@/lib/format";
import { getCurrentStageTimestamp } from "@/lib/visitStages";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { usePageChrome } from "@/context/PageChromeContext";
import { VisitorStatusDashboard } from "@/components/dashboard/VisitorStatusDashboard";
import { RecentVisitorsList, type RecentVisitorItem } from "@/components/dashboard/RecentVisitorsList";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { ut } from "@/i18n/uiChrome";

function statusLabel(status?: string) {
  if (!status) return "—";
  if (status === "Checked In") return "Checked-in";
  if (status === "Checked Out") return "Checked-out";
  if (status === "Pending Approval") return "Pending";
  return status;
}

function toRecent(rows: VisitorListRow[]): RecentVisitorItem[] {
  return rows.slice(0, 5).map((r) => ({
    name: r.name,
    full_name: r.full_name || r.name,
    purpose: r.visit_purpose_type || r.person_to_meet_name || "—",
    time: formatTime(getCurrentStageTimestamp(r)) || "—",
    status: statusLabel(r.status),
    photo: r.photo,
  }));
}

function formatClock(now: Date) {
  return formatTime(now);
}

export function MobileHomePage() {
  const { lang } = useAppLanguage();

  usePageChrome({
    title: "Precious Alloys",
    subtitle: "MAIN GATE DESK",
    showBack: false,
    showNotification: true,
    showProfile: true,
  });

  const [kpis, setKpis] = useState<DashboardKpiData>({});
  const [recentRows, setRecentRows] = useState<VisitorListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpi, detailed] = await Promise.all([
        dashboardApi.getKpis(),
        visitorApi.listDetailed(200),
      ]);
      setKpis(kpi || {});
      setRecentRows(detailed || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load gate desk");
      setKpis({});
      setRecentRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  usePageRefresh(load);

  useVmsRealtime(() => {
    void load();
  }, true);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const recentVisitors = useMemo(() => toRecent(recentRows), [recentRows]);

  const totalVisitors = Number(kpis.total ?? 0);

  return (
    <div className="vm-home-page">

      <div className="vm-home-top-block">
        <section className="vm-gate-ops-header" aria-label="Live gate desk">
        <div className="vm-gate-ops-top">
          <div className="vm-gate-ops-live">
            <span className="vm-live-dot" aria-hidden />
            <span className="vm-gate-ops-live-label">{ut(lang, "live_gate_desk")}</span>
          </div>
          <button
            type="button"
            className="vm-gate-refresh-btn"
            onClick={() => void load()}
            disabled={loading}
            aria-label={ut(lang, "refresh")}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M21 12a9 9 0 1 1-2.6-6.3" />
              <path d="M21 3v6h-6" />
            </svg>
            {loading ? ut(lang, "refreshing") : ut(lang, "refresh")}
          </button>
        </div>

        <div className="vm-gate-ops-meta">
          <div className="vm-gate-ops-meta-item">
            <span className="vm-gate-ops-meta-label">{ut(lang, "current_time")}</span>
            <strong className="vm-gate-ops-meta-value">{formatClock(now)}</strong>
          </div>
          <div className="vm-gate-ops-meta-item">
            <span className="vm-gate-ops-meta-label">{ut(lang, "todays_visitors")}</span>
            <strong className="vm-gate-ops-meta-value">{loading ? "—" : totalVisitors}</strong>
          </div>
        </div>
      </section>
      </div>

      {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}

      <main className="vm-main-body vm-home-stack">
        <VisitorStatusDashboard
          kpis={kpis}
          rows={recentRows}
          loading={loading}
          title="Status overview"
          subtitle="Today's visitor counts by stage"
        />

        <RecentVisitorsList visitors={recentVisitors} loading={loading} />
      </main>
    </div>
  );
}
