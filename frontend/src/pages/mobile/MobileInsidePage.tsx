import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { visitorApi, type VisitorListRow } from "@/api/vms";
import { formatTime, initials } from "@/lib/format";
import { SlidingStatusFilter, type StatusFilterOption } from "@/components/ui/SlidingStatusFilter";
import { IconApprovals } from "@/components/ui/MobileIcons";
import { PendingApprovalSheet } from "@/components/visitors/PendingApprovalSheet";

const INSIDE_STATUSES = new Set(["Checked In", "Meeting Done"]);

type FilterId = "all" | "pending" | "inside" | "approved" | "checked_out";

const FILTER_DEFS: Array<{ id: FilterId; label: string; tone: StatusFilterOption["tone"]; match: (s?: string) => boolean }> = [
  { id: "all", label: "All", tone: "slate", match: () => true },
  { id: "pending", label: "Pending", tone: "amber", match: (s) => s === "Pending Approval" },
  { id: "inside", label: "Inside", tone: "green", match: (s) => !!s && INSIDE_STATUSES.has(s) },
  { id: "approved", label: "Approved", tone: "blue", match: (s) => s === "Approved" },
  { id: "checked_out", label: "Checked Out", tone: "slate", match: (s) => s === "Checked Out" },
];

function avatarTone(status?: string, idx = 0) {
  if (status === "Pending Approval") return "orange";
  if (status === "Approved") return "blue";
  if (status === "Checked Out") return "purple";
  if (status === "Rejected") return "orange";
  return (["green", "blue", "purple", "orange"] as const)[idx % 4];
}

function badgeFor(status?: string) {
  if (status === "Pending Approval") return { text: "PENDING", className: "vm-badge-pending" };
  if (status === "Approved") return { text: "APPROVED", className: "vm-badge-approved" };
  if (status === "Checked Out") return { text: "OUT", className: "vm-badge-out" };
  if (status === "Meeting Done") return { text: "MEETING", className: "vm-badge-meeting" };
  if (status === "Checked In") return { text: "IN", className: "vm-badge-in" };
  return { text: (status || "—").toUpperCase(), className: "vm-badge-out" };
}

function parseFilter(raw: string | null): FilterId {
  const found = FILTER_DEFS.find((f) => f.id === raw);
  return found?.id ?? "inside";
}

export function MobileInsidePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = parseFilter(params.get("status"));

  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionVisitor, setActionVisitor] = useState<VisitorListRow | null>(null);

  const loadVisitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await visitorApi.listDetailed(100);
      setRows(list || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load visitors");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVisitors();
  }, [loadVisitors]);

  const counts = useMemo(() => {
    const result: Record<FilterId, number> = {
      all: rows.length,
      pending: 0,
      inside: 0,
      approved: 0,
      checked_out: 0,
    };
    for (const row of rows) {
      for (const def of FILTER_DEFS) {
        if (def.id === "all") continue;
        if (def.match(row.status)) result[def.id] += 1;
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
    const list = rows.filter((r) => def.match(r.status));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => {
      const hay = `${item.full_name || ""} ${item.person_to_meet_name || ""} ${item.mobile || ""} ${item.status || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, filter, query]);

  const pendingCount = counts.pending;
  const titleCount = displayList.length;

  function setFilter(id: string) {
    const next = parseFilter(id);
    const nextParams = new URLSearchParams(params);
    nextParams.set("status", next);
    setParams(nextParams, { replace: true });
  }

  return (
    <div className="vm-home-page vm-visitors-page">
      <header className="vm-visitors-topbar">
        <div className="vm-visitors-header">
          <div className="vm-visitors-header-copy">
            <p className="vm-visitors-eyebrow">Gate queue</p>
            <h1 className="vm-visitors-title">Visitors</h1>
            <p className="vm-visitors-sub">Live visitor records from ERPNext</p>
          </div>
          <button
            type="button"
            className={`vm-count-pill is-interactive${filter === "pending" ? " is-amber" : ""}`}
            onClick={() => setFilter(filter === "all" ? "inside" : "all")}
            aria-label="Toggle filter summary"
          >
            {String(titleCount).padStart(2, "0")}
          </button>
        </div>
      </header>

      <button
        type="button"
        className="vm-pending-cta"
        onClick={() => setFilter("pending")}
      >
        <span className="vm-pending-cta-icon" aria-hidden>
          <IconApprovals size={18} />
        </span>
        <span className="vm-pending-cta-copy">
          <strong>Pending Approvals</strong>
          <span>{pendingCount} visitor{pendingCount === 1 ? "" : "s"} waiting</span>
        </span>
        <span className="vm-pending-cta-count">{pendingCount}</span>
      </button>

      <SlidingStatusFilter options={filterOptions} value={filter} onChange={setFilter} />

      <div className="vm-visitors-search">
        <input
          className="vm-input-field vm-visitors-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search visitor or person to meet"
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

      <div className="vm-overview-card vm-visitor-list-card">
        {loading ? (
          <p className="vm-empty-hint">Loading visitors…</p>
        ) : displayList.length === 0 ? (
          <p className="vm-empty-hint">No visitors in this filter</p>
        ) : (
          displayList.map((item, idx) => {
            const badge = badgeFor(item.status);
            const host = item.person_to_meet_name || "—";
            const time = formatTime(item.check_in || item.checked_in_on || item.modified || item.creation) || "—";
            const isPending = item.status === "Pending Approval";
            return (
              <button
                key={item.name}
                type="button"
                className="vm-activity-row vm-visitor-row is-interactive"
                style={{ animationDelay: `${Math.min(idx, 12) * 35}ms` }}
                onClick={() => {
                  if (isPending) {
                    setActionVisitor(item);
                    return;
                  }
                  navigate(`/visitor/${encodeURIComponent(item.name)}`);
                }}
              >
                <div className={`vm-activity-avatar avatar-${avatarTone(item.status, idx)}`}>
                  {initials(item.full_name || item.name)}
                </div>
                <div className="vm-activity-info">
                  <span className="vm-activity-name">{item.full_name || item.name}</span>
                  <span className="vm-activity-status">{host}</span>
                </div>
                <div className="vm-activity-meta">
                  <span className="vm-activity-time">{time}</span>
                  <span className={badge.className}>{badge.text}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {actionVisitor ? (
        <PendingApprovalSheet
          visitor={actionVisitor}
          open
          onClose={() => setActionVisitor(null)}
          onDone={() => void loadVisitors()}
          onViewDetails={() => {
            const name = actionVisitor.name;
            setActionVisitor(null);
            navigate(`/visitor/${encodeURIComponent(name)}`);
          }}
        />
      ) : null}
    </div>
  );
}
