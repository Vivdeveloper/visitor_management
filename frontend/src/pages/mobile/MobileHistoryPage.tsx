import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { visitorApi, type VisitorListRow } from "@/api/vms";
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
import { visitorScopeFilters } from "@/lib/roles";
import { filterRowsByLiveRange } from "@/lib/visitorFlow";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { usePageRefresh } from "@/hooks/usePageRefresh";
import { ut, type UiCopyKey } from "@/i18n/uiChrome";

const CHECK_IN_STATUSES = new Set(["Checked In", "Meeting Done"]);
const HISTORY_STATUSES = new Set([
  "Checked Out",
  "Rejected",
  "Meeting Done",
  "Approved",
  "Checked In",
  "Cancelled",
]);

type HistoryTab = "all" | "in" | "out";

const TAB_DEFS: Array<{
  id: HistoryTab;
  labelKey: UiCopyKey;
  tone: StatusFilterOption["tone"];
  match: (row: VisitorListRow) => boolean;
}> = [
  {
    id: "all",
    labelKey: "tab_all",
    tone: "slate",
    match: (row) => !!row.status && HISTORY_STATUSES.has(row.status),
  },
  {
    id: "in",
    labelKey: "status_checked_in",
    tone: "blue",
    match: (row) => !!row.status && CHECK_IN_STATUSES.has(row.status),
  },
  {
    id: "out",
    labelKey: "status_checkout",
    tone: "slate",
    match: (row) => row.status === "Checked Out",
  },
];

function parseTab(raw: string | null): HistoryTab {
  if (raw === "in" || raw === "out" || raw === "all") return raw;
  return "all";
}

function parseRange(raw: string | null): LiveRangeMode {
  return raw === "last_7_days" ? "last_7_days" : "overall";
}

export function MobileHistoryPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { lang } = useAppLanguage();
  const { user } = useAuth();

  usePageChrome({
    title: ut(lang, "history"),
    subtitle: "Visitor log",
    showBack: true,
    backTo: "/inside",
    showNotification: false,
    showProfile: true,
  });

  const tab = parseTab(params.get("tab"));
  const rangeMode = parseRange(params.get("range"));

  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateTime, setSelectedDateTime] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await visitorApi.listDetailed(200, visitorScopeFilters(user));
      setRows((list || []).filter((row) => row.status && HISTORY_STATUSES.has(row.status)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load history");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  usePageRefresh(loadHistory);

  useVmsRealtime(() => {
    void loadHistory();
  }, true);

  const rangedRows = useMemo(
    () => filterRowsByLiveRange(rows, rangeMode, selectedDateTime),
    [rows, rangeMode, selectedDateTime],
  );

  const searchedRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rangedRows;
    return rangedRows.filter((item) => {
      const hay =
        `${item.full_name || ""} ${item.person_to_meet_name || ""} ${item.mobile || ""} ${item.name || ""} ${item.visitor_company || ""} ${item.status || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rangedRows, query]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(TAB_DEFS.map((def) => [def.id, 0])) as Record<HistoryTab, number>;
    for (const row of rangedRows) {
      for (const def of TAB_DEFS) {
        if (def.match(row)) result[def.id] += 1;
      }
    }
    return result;
  }, [rangedRows]);

  const filterOptions: StatusFilterOption[] = TAB_DEFS.map((def) => ({
    id: def.id,
    label: ut(lang, def.labelKey),
    tone: def.tone,
    count: counts[def.id],
  }));

  const displayList = useMemo(() => {
    const def = TAB_DEFS.find((f) => f.id === tab) || TAB_DEFS[0];
    return searchedRows.filter((r) => def.match(r));
  }, [searchedRows, tab]);

  function setTab(id: string) {
    const next = parseTab(id);
    const nextParams = new URLSearchParams(params);
    if (next === "all") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setParams(nextParams, { replace: true });
  }

  function setRangeMode(next: LiveRangeMode) {
    const nextParams = new URLSearchParams(params);
    if (next === "overall") nextParams.delete("range");
    else nextParams.set("range", next);
    setParams(nextParams, { replace: true });
    setSelectedDateTime("");
  }

  return (
    <div className="vm-home-page vm-visitors-page vm-history-page">
      <header className="vm-live-visitors-head">
        <div className="vm-live-visitors-title-row">
          <h1 className="vm-live-visitors-title">{ut(lang, "history")}</h1>
          <div className="vm-live-visitors-controls">
            <WaterDropRangeToggle value={rangeMode} onChange={setRangeMode} lang={lang} />
            <LiveVisitorsCalendarButton
              value={selectedDateTime}
              onChange={setSelectedDateTime}
              lang={lang}
            />
          </div>
        </div>
      </header>

      <SimpleStatusFilter options={filterOptions} value={tab} onChange={setTab} pinAllFilter />

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

      {error ? (
        <p className="login-error" style={{ textAlign: "center" }}>
          {error}
        </p>
      ) : null}

      <div className="vm-overview-card vm-visitor-list-card vm-history-list-card">
        {loading ? (
          <p className="vm-empty-hint">{ut(lang, "loading_visitors")}</p>
        ) : displayList.length === 0 ? (
          <p className="vm-empty-hint">No history yet.</p>
        ) : (
          displayList.map((item, index) => (
            <VisitorListRowCard
              key={item.name}
              item={item}
              index={index}
              showEntryId
              timelineFilledOnly
              onOpen={(row) => navigate(`/visitor/${encodeURIComponent(row.name)}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
