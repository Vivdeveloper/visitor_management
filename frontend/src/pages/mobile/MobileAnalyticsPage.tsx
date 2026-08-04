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
import { extractError, formatCount, formatDate } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { canPerformCheckout, visitorScopeFilters } from "@/lib/roles";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { usePageChrome } from "@/context/PageChromeContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { ut, type UiCopyKey } from "@/i18n/uiChrome";

type SubTab = "overview" | "checkout_pending";

const TAB_KEYS: Record<SubTab, UiCopyKey> = {
  overview: "tab_overview",
  checkout_pending: "status_checkout_pending",
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
  const { lang } = useAppLanguage();
  const { user } = useAuth();
  const showCheckout = canPerformCheckout(user);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);

  usePageChrome({
    title: ut(lang, "reports_title"),
    subtitle: ut(lang, "visitor_analytics"),
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
        visitorApi.listDetailed(200, visitorScopeFilters(user)),
      ]);
      setKpis(kpi || {});
      setRows(detailed || []);
    } catch (err: unknown) {
      setError(extractError(err, "Could not load analytics"));
    } finally {
      setLoading(false);
    }
  }, [user]);

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

  const dateLabel = formatDate(selectedDate, lang) || selectedDate;
  const isToday = selectedDate === toInputDate(new Date());
  const pendingCountLabel = formatCount(checkoutPendingCount, lang);
  const pendingCopyKey =
    checkoutPendingCount === 1 ? "checkout_pending_visitor_one" : "checkout_pending_visitors";

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
          <p className="vm-reports-eyebrow">{ut(lang, "analytics_eyebrow")}</p>
          <h1 className="vm-reports-title">{ut(lang, "reports_title")}</h1>
        </div>
        <span className={`vm-live-pill${isToday ? " is-live" : ""}`}>
          {isToday ? ut(lang, "live_pill") : ut(lang, "historic_pill")}
        </span>
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
            <strong>{ut(lang, "checkout_pending_report")}</strong>
            <span>
              {loading
                ? ut(lang, "loading")
                : ut(lang, pendingCopyKey, { n: pendingCountLabel })}
            </span>
          </span>
          <span className="vm-meetings-cta-count">{loading ? "…" : pendingCountLabel}</span>
        </button>

        <button type="button" className="vm-meetings-cta is-secondary" onClick={() => navigate("/meetings")}>
          <span className="vm-meetings-cta-copy">
            <strong>{ut(lang, "meetings_by_day")}</strong>
            <span>{ut(lang, "meetings_by_day_sub")}</span>
          </span>
          <span aria-hidden>›</span>
        </button>

        <div className="vm-reports-tabs vm-reports-tabs--compact" role="tablist" aria-label={ut(lang, "reports_title")}>
          {(["overview", "checkout_pending"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={subTab === t}
              className={`vm-reports-tab${subTab === t ? " is-active" : ""}`}
              onClick={() => setReportsTab(t)}
            >
              {ut(lang, TAB_KEYS[t])}
              {t === "checkout_pending" ? (
                <span className="vm-reports-tab-count">{formatCount(checkoutPendingCount, lang)}</span>
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
