import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  dashboardApi,
  securityApi,
  visitorApi,
  type DashboardKpis,
  type VisitorListRow,
} from "@/api/vms";
import { CheckoutPendingReport } from "@/components/reports/CheckoutPendingReport";
import { StageCountsReport } from "@/components/reports/StageCountsReport";
import { extractError, formatDate } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { canPerformCheckout } from "@/lib/roles";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { usePageChrome } from "@/context/PageChromeContext";

type SubTab = "overview" | "checkout_pending";

const TAB_LABELS: Record<SubTab, string> = {
  overview: "Overview",
  checkout_pending: "Checkout Pending",
};

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseReportsTab(raw: string | null): SubTab {
  return raw === "checkout_pending" ? "checkout_pending" : "overview";
}

export function MobileAnalyticsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const showCheckout = canPerformCheckout(user);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);

  usePageChrome({
    title: "Reports",
    subtitle: "Visitor analytics",
    showBack: false,
    showNotification: true,
    showProfile: true,
  });

  const [subTab, setSubTab] = useState<SubTab>(() => parseReportsTab(searchParams.get("tab")));
  const [selectedDate, setSelectedDate] = useState(() => toInputDate(new Date()));
  const [kpis, setKpis] = useState<DashboardKpis>({});
  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const [kpi, detailed] = await Promise.all([
        dashboardApi.getKpis({ from_date: date, to_date: date }),
        visitorApi.listDetailed(200),
      ]);
      setKpis(kpi || {});
      setRows(detailed || []);
    } catch (err: unknown) {
      setError(extractError(err, "Could not load analytics"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedDate);
  }, [load, selectedDate]);

  usePageRefresh(() => load(selectedDate));

  useVmsRealtime(() => {
    void load(selectedDate);
  }, true);

  useEffect(() => {
    setSubTab(parseReportsTab(searchParams.get("tab")));
  }, [searchParams]);

  const setReportsTab = useCallback(
    (tab: SubTab) => {
      setSubTab(tab);
      const next = new URLSearchParams(searchParams);
      if (tab === "overview") {
        next.delete("tab");
      } else {
        next.set("tab", tab);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const checkoutPendingCount = useMemo(
    () => rows.filter((row) => row.status === "Meeting Done").length,
    [rows],
  );

  const handleCheckout = useCallback(
    async (row: VisitorListRow) => {
      setCheckoutBusy(row.name);
      try {
        await securityApi.checkOut(row.name);
        await load(selectedDate);
      } catch (err: unknown) {
        setError(extractError(err, "Checkout failed"));
      } finally {
        setCheckoutBusy(null);
      }
    },
    [load, selectedDate],
  );

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
        </div>

        <button type="button" className="vm-meetings-cta" onClick={() => setReportsTab("checkout_pending")}>
          <span className="vm-meetings-cta-copy">
            <strong>Checkout Pending Report</strong>
            <span>
              {loading ? "Loading…" : `${checkoutPendingCount} visitor${checkoutPendingCount === 1 ? "" : "s"} awaiting gate checkout`}
            </span>
          </span>
          <span className="vm-meetings-cta-count">{loading ? "…" : checkoutPendingCount}</span>
        </button>

        <button type="button" className="vm-meetings-cta is-secondary" onClick={() => navigate("/meetings")}>
          <span className="vm-meetings-cta-copy">
            <strong>Meetings by day</strong>
            <span>Timeline cards with time · person to meet</span>
          </span>
          <span aria-hidden>›</span>
        </button>

        <div className="vm-reports-tabs vm-reports-tabs--compact" role="tablist" aria-label="Reports sections">
          {(["overview", "checkout_pending"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={subTab === t}
              className={`vm-reports-tab${subTab === t ? " is-active" : ""}`}
              onClick={() => setReportsTab(t)}
            >
              {TAB_LABELS[t]}
              {t === "checkout_pending" ? (
                <span className="vm-reports-tab-count">{checkoutPendingCount}</span>
              ) : null}
            </button>
          ))}
        </div>

        {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}

        {subTab === "overview" ? (
          <StageCountsReport
            kpis={kpis}
            rows={rows}
            loading={loading}
            selectedDate={selectedDate}
            isToday={isToday}
            dateLabel={dateLabel}
          />
        ) : null}

        {subTab === "checkout_pending" ? (
          <div className="vm-overview-card vm-analytics-card">
            <CheckoutPendingReport
              rows={rows}
              loading={loading}
              showCheckoutAction={showCheckout}
              checkoutBusyId={checkoutBusy}
              onOpenVisitor={(row) => navigate(`/visitor/${encodeURIComponent(row.name)}`)}
              onCheckout={(row) => void handleCheckout(row)}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
