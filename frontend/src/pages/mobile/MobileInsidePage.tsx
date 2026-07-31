import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { securityApi, visitorApi, type VisitorListRow } from "@/api/vms";
import { CheckoutPendingReport } from "@/components/reports/CheckoutPendingReport";
import { extractError } from "@/lib/format";
import { SimpleStatusFilter } from "@/components/ui/SimpleStatusFilter";
import type { StatusFilterOption } from "@/components/ui/SlidingStatusFilter";
import { VisitorListRowCard } from "@/components/visitors/VisitorListRowCard";
import { usePageChrome } from "@/context/PageChromeContext";
import { useAuth } from "@/context/AuthContext";
import { canPerformCheckout, visitorScopeFilters } from "@/lib/roles";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { usePageRefresh } from "@/hooks/usePageRefresh";

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
  label: string;
  tone: StatusFilterOption["tone"];
  match: (row: VisitorListRow) => boolean;
}> = [
  { id: "all", label: "All", tone: "slate", match: () => true },
  { id: "inside", label: "Inside", tone: "green", match: (row) => !!row.status && INSIDE_STATUSES.has(row.status) },
  { id: "pending", label: "Pending", tone: "amber", match: (row) => row.status === "Pending Approval" },
  { id: "checkout_pending", label: "Checkout Pending", tone: "indigo", match: (row) => row.status === CHECKOUT_PENDING_STATUS },
  { id: "checked_in", label: "Checked In", tone: "blue", match: (row) => row.status === "Checked In" },
  { id: "approved", label: "Approved", tone: "blue", match: (row) => row.status === "Approved" },
  { id: "checked_out", label: "Checkout", tone: "slate", match: (row) => row.status === "Checked Out" },
  { id: "transferred", label: "Transferred", tone: "slate", match: (row) => Boolean(row.transfer_to_user) },
  { id: "rejected", label: "Rejected", tone: "red", match: (row) => row.status === "Rejected" },
];

function parseFilter(raw: string | null): FilterId {
  if (raw === "meeting_done") return "checkout_pending";
  const found = FILTER_DEFS.find((f) => f.id === raw);
  return found?.id ?? "inside";
}

export function MobileInsidePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const showCheckout = canPerformCheckout(user);

  usePageChrome({
    title: "Live Visitors",
    subtitle: "On premises",
    showBack: false,
    showNotification: true,
    showProfile: true,
  });

  const filter = parseFilter(params.get("status"));

  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);

  const loadVisitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await visitorApi.listDetailed(100, visitorScopeFilters(user));
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

  const searchedRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => {
      const hay = `${item.full_name || ""} ${item.person_to_meet_name || ""} ${item.mobile || ""} ${item.status || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(FILTER_DEFS.map((def) => [def.id, 0])) as Record<FilterId, number>;
    result.all = rows.length;
    for (const row of rows) {
      for (const def of FILTER_DEFS) {
        if (def.id === "all") continue;
        if (def.match(row)) result[def.id] += 1;
      }
    }
    return result;
  }, [rows]);

  const filterOptions: StatusFilterOption[] = FILTER_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    tone: def.tone,
    count: counts[def.id],
  }));

  const displayList = useMemo(() => {
    const def = FILTER_DEFS.find((f) => f.id === filter) || FILTER_DEFS[0];
    return searchedRows.filter((r) => def.match(r));
  }, [searchedRows, filter]);

  const liveCount = counts.inside;

  function setFilter(id: string) {
    const next = parseFilter(id);
    const nextParams = new URLSearchParams(params);
    nextParams.set("status", next);
    setParams(nextParams, { replace: true });
  }

  return (
    <div className="vm-home-page vm-visitors-page">

      <header className="vm-live-visitors-head">
        <div className="vm-live-visitors-title-row">
          <h1 className="vm-live-visitors-title">Live Visitors</h1>
          <span className="vm-live-visitors-count" aria-label={`${liveCount} visitors`}>
            <span className="vm-live-dot" aria-hidden />
            {loading ? "—" : liveCount}
          </span>
        </div>
      </header>

      <SimpleStatusFilter options={filterOptions} value={filter} onChange={setFilter} pinAllFilter />

      <div className="vm-visitors-search">
        <input
          className="vm-input-field vm-visitors-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search visitor or host"
          aria-label="Search visitors"
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
          <p className="vm-empty-hint">Loading…</p>
        ) : displayList.length === 0 ? (
          <p className="vm-empty-hint">No visitors in this filter</p>
        ) : (
          displayList.map((item, idx) => (
            <VisitorListRowCard
              key={item.name}
              item={item}
              index={idx}
              onOpen={(row) => navigate(`/visitor/${encodeURIComponent(row.name)}`)}
            />
          ))
        )}
      </div>
      )}
    </div>
  );
}
