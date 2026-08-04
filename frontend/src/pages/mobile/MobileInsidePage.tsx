import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { securityApi, visitorApi, type VisitorListRow } from "@/api/vms";
import { CheckoutPendingReport } from "@/components/reports/CheckoutPendingReport";
import { extractError } from "@/lib/format";
import { filterRowsByLiveRange } from "@/lib/visitorFlow";
import { SimpleStatusFilter } from "@/components/ui/SimpleStatusFilter";
import type { StatusFilterOption } from "@/components/ui/SlidingStatusFilter";
import {
  WaterDropRangeToggle,
  type LiveRangeMode,
} from "@/components/ui/WaterDropRangeToggle";
import { LiveVisitorsCalendarButton } from "@/components/ui/LiveVisitorsCalendarButton";
import { VisitorListRowCard } from "@/components/visitors/VisitorListRowCard";
import { usePageChrome } from "@/context/PageChromeContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { useAuth } from "@/context/AuthContext";
import { canPerformCheckout, visitorScopeFilters } from "@/lib/roles";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { ut, type UiCopyKey } from "@/i18n/uiChrome";

const INSIDE_STATUSES = new Set(["Checked In", "Meeting Done"]);
const CHECKOUT_PENDING_STATUS = "Meeting Done";

type FilterId =
  | "all"
  | "pending"
  | "inside"
  | "checkout_pending"
  | "approved"
  | "checked_in"
  | "checked_out"
  | "rejected"
  | "transferred";

const FILTER_DEFS: Array<{
  id: FilterId;
  labelKey: UiCopyKey;
  tone: StatusFilterOption["tone"];
  match: (row: VisitorListRow) => boolean;
}> = [
  { id: "all", labelKey: "tab_all", tone: "slate", match: () => true },
  { id: "inside", labelKey: "tab_inside", tone: "green", match: (row) => !!row.status && INSIDE_STATUSES.has(row.status) },
  { id: "pending", labelKey: "tab_pending", tone: "amber", match: (row) => row.status === "Pending Approval" },
  { id: "checkout_pending", labelKey: "status_checkout_pending", tone: "indigo", match: (row) => row.status === CHECKOUT_PENDING_STATUS },
  { id: "checked_in", labelKey: "status_checked_in", tone: "blue", match: (row) => row.status === "Checked In" },
  { id: "approved", labelKey: "tab_approved", tone: "blue", match: (row) => row.status === "Approved" },
  { id: "checked_out", labelKey: "status_checkout", tone: "slate", match: (row) => row.status === "Checked Out" },
  { id: "transferred", labelKey: "status_transferred", tone: "slate", match: (row) => Boolean(row.transfer_to_user) },
  { id: "rejected", labelKey: "status_rejected", tone: "red", match: (row) => row.status === "Rejected" },
];

function parseFilter(raw: string | null): FilterId {
  if (raw === "meeting_done") return "checkout_pending";
  const found = FILTER_DEFS.find((f) => f.id === raw);
  return found?.id ?? "inside";
}

function parseRange(raw: string | null): LiveRangeMode {
  return raw === "last_7_days" ? "last_7_days" : "overall";
}

export function MobileInsidePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { lang } = useAppLanguage();
  const { user } = useAuth();
  const showCheckout = canPerformCheckout(user);

  usePageChrome({
    title: ut(lang, "live_visitors"),
    subtitle: ut(lang, "on_premises"),
    showBack: false,
    showNotification: true,
    showProfile: true,
  });

  const filter = parseFilter(params.get("status"));
  const rangeMode = parseRange(params.get("range"));

  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState("");

  const loadVisitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await visitorApi.listDetailed(200, visitorScopeFilters(user));
      setRows(list || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load visitors");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadVisitors();
  }, [loadVisitors]);

  usePageRefresh(loadVisitors);

  useVmsRealtime(() => {
    void loadVisitors();
  }, true);

  const handleCheckout = useCallback(
    async (row: VisitorListRow) => {
      setCheckoutBusy(row.name);
      setError(null);
      try {
        await securityApi.checkOut(row.name);
        await loadVisitors();
      } catch (err: unknown) {
        setError(extractError(err, "Checkout failed"));
      } finally {
        setCheckoutBusy(null);
      }
    },
    [loadVisitors],
  );

  const rangedRows = useMemo(
    () => filterRowsByLiveRange(rows, rangeMode, selectedDateTime),
    [rows, rangeMode, selectedDateTime],
  );

  const searchedRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rangedRows;
    return rangedRows.filter((item) => {
      const hay = `${item.full_name || ""} ${item.person_to_meet_name || ""} ${item.mobile || ""} ${item.status || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rangedRows, query]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(FILTER_DEFS.map((def) => [def.id, 0])) as Record<FilterId, number>;
    result.all = rangedRows.length;
    for (const row of rangedRows) {
      for (const def of FILTER_DEFS) {
        if (def.id === "all") continue;
        if (def.match(row)) result[def.id] += 1;
      }
    }
    return result;
  }, [rangedRows]);

  const filterOptions: StatusFilterOption[] = FILTER_DEFS.map((def) => ({
    id: def.id,
    label: ut(lang, def.labelKey),
    tone: def.tone,
    count: counts[def.id],
  }));

  const displayList = useMemo(() => {
    const def = FILTER_DEFS.find((f) => f.id === filter) || FILTER_DEFS[0];
    return searchedRows.filter((r) => def.match(r));
  }, [searchedRows, filter]);

  function setFilter(id: string) {
    const next = parseFilter(id);
    const nextParams = new URLSearchParams(params);
    nextParams.set("status", next);
    setParams(nextParams, { replace: true });
  }

  function setRangeMode(next: LiveRangeMode) {
    const nextParams = new URLSearchParams(params);
    if (next === "overall") nextParams.delete("range");
    else nextParams.set("range", next);
    setParams(nextParams, { replace: true });
    // Range toggle clears calendar pick so modes stay clear
    setSelectedDateTime("");
  }

  return (
    <div className="vm-home-page vm-visitors-page">

      <header className="vm-live-visitors-head">
        <div className="vm-live-visitors-title-row">
          <h1 className="vm-live-visitors-title">{ut(lang, "live_visitors")}</h1>
          <div className="vm-live-visitors-controls">
            <WaterDropRangeToggle
              value={rangeMode}
              onChange={setRangeMode}
              lang={lang}
            />
            <LiveVisitorsCalendarButton
              value={selectedDateTime}
              onChange={setSelectedDateTime}
              lang={lang}
            />
          </div>
        </div>
      </header>

      <SimpleStatusFilter options={filterOptions} value={filter} onChange={setFilter} pinAllFilter />

      <div className="vm-visitors-search">
        <input
          className="vm-input-field vm-visitors-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ut(lang, "search_visitor_or_host")}
          aria-label={ut(lang, "search_visitor_or_host")}
        />
        <span className="vm-search-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
      </div>

      {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}

      {filter === "checkout_pending" ? (
        <CheckoutPendingReport
          rows={searchedRows}
          loading={loading}
          showCheckoutAction={showCheckout}
          checkoutBusyId={checkoutBusy}
          onOpenVisitor={(row) => navigate(`/visitor/${encodeURIComponent(row.name)}`)}
          onCheckout={handleCheckout}
        />
      ) : (
      <div className="vm-overview-card vm-visitor-list-card">
        {loading ? (
          <p className="vm-empty-hint">{ut(lang, "loading_visitors")}</p>
        ) : displayList.length === 0 ? (
          <p className="vm-empty-hint">—</p>
        ) : (
          displayList.map((item, index) => (
            <VisitorListRowCard
              key={item.name}
              item={item}
              index={index}
              onOpen={(row) => navigate(`/visitor/${encodeURIComponent(row.name)}`)}
            />
          ))
        )}
      </div>
      )}
    </div>
  );
}
