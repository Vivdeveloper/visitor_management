import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  dashboardApi,
  visitorApi,
  type DashboardKpis as DashboardKpiData,
  type VisitorListRow,
} from "@/api/vms";
import { formatTime } from "@/lib/format";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { HeaderBar } from "@/components/common/HeaderBar";
import { DashboardKpis } from "@/components/dashboard/DashboardKpis";
import { RecentVisitorsList, type RecentVisitorItem } from "@/components/dashboard/RecentVisitorsList";
import { IconApprovals } from "@/components/ui/MobileIcons";
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
    time: formatTime(r.check_in || r.checked_in_on || r.modified || r.creation) || "—",
    status: statusLabel(r.status),
  }));
}

function formatClock(now: Date) {
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function MobileHomePage() {
  const navigate = useNavigate();
  const { lang } = useAppLanguage();
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
        visitorApi.listDetailed(80),
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

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const recentVisitors = useMemo(() => toRecent(recentRows), [recentRows]);

  const totalVisitors = Number(kpis.total ?? 0);
  const checkedIn = Number(kpis["Checked In"] ?? 0);
  const checkedOut = Number(kpis["Checked Out"] ?? 0);
  const currentlyInside = Number(kpis["On Premises"] ?? 0);
  const pendingApproval = Number(
    kpis["Pending Approval"] ?? kpis.pending ?? recentRows.filter((r) => r.status === "Pending Approval").length,
  );

  return (
    <div className="vm-home-page">
      <HeaderBar title="Precious Alloys" showNotification showProfile />

      <div style={{ padding: "0.55rem 0.1rem 0.2rem" }}>
        <button
          type="button"
          className="vm-pending-cta"
          onClick={() => navigate("/approvals")}
        >
          <span className="vm-pending-cta-icon" aria-hidden>
            <IconApprovals size={18} />
          </span>
          <span className="vm-pending-cta-copy">
            <strong>Pending Approvals</strong>
            <span>{loading ? "Checking..." : `${pendingApproval} waiting`}</span>
          </span>
          <span className="vm-pending-cta-count">{loading ? "—" : pendingApproval}</span>
        </button>
      </div>

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

      {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}

      <main className="vm-main-body vm-home-stack">
        <DashboardKpis
          totalVisitors={totalVisitors}
          checkedIn={checkedIn}
          pendingApproval={pendingApproval}
          currentlyInside={currentlyInside}
          checkedOut={checkedOut}
          loading={loading}
        />

        <section className="vm-gate-quick-actions" aria-label="Quick actions">
          <button type="button" className="vm-gate-action" onClick={() => navigate("/check-in")}>
            <span className="vm-gate-action-icon is-primary" aria-hidden>+</span>
            <span className="vm-gate-action-label">Add Entry</span>
          </button>
          <button type="button" className="vm-gate-action" onClick={() => navigate("/approvals")}>
            <span className="vm-gate-action-icon is-amber" aria-hidden>!</span>
            <span className="vm-gate-action-label">Pending</span>
            {!loading && pendingApproval > 0 ? (
              <span className="vm-gate-action-badge">{pendingApproval}</span>
            ) : null}
          </button>
          <button type="button" className="vm-gate-action" onClick={() => navigate("/inside?status=inside")}>
            <span className="vm-gate-action-icon is-green" aria-hidden>●</span>
            <span className="vm-gate-action-label">Inside</span>
          </button>
          <button type="button" className="vm-gate-action" onClick={() => navigate("/inside?status=all")}>
            <span className="vm-gate-action-icon is-blue" aria-hidden>≡</span>
            <span className="vm-gate-action-label">Visitors</span>
          </button>
        </section>

        <RecentVisitorsList visitors={recentVisitors} loading={loading} />
      </main>
    </div>
  );
}
