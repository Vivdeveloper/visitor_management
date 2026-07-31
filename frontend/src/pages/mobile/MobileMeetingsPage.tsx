import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { visitorApi, type VisitorListRow } from "@/api/vms";
import { extractError, formatTime, initials } from "@/lib/format";
import { getCurrentStageTimestamp } from "@/lib/visitStages";
import { VisitorStageTimeline } from "@/components/visitors/VisitorStageTimeline";
import { usePageChrome } from "@/context/PageChromeContext";
import { useAuth } from "@/context/AuthContext";
import { visitorScopeFilters } from "@/lib/roles";

function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: string, delta: number) {
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return toInputDate(d);
}

function monthYearLabel(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString([], { month: "short", year: "numeric" });
}

function fullDateLabel(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function headerDateSub(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function weekdayShort(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString([], { weekday: "short" });
}

function dayNum(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).getDate();
}

function rowStamp(r: VisitorListRow) {
  return getCurrentStageTimestamp(r) || "";
}

function rowDay(r: VisitorListRow) {
  return rowStamp(r).slice(0, 10);
}

function cardTheme(status?: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("check") || s.includes("in")) {
    return {
      type: "green",
      dot: "#16a34a",
      bg: "#f0fdf4",
      border: "#dcfce7",
      pillBg: "#dcfce7",
      pillText: "#16a34a",
      avatarBg: "#dcfce7",
      avatarText: "#16a34a",
      label: "✓ CHECKED IN",
    };
  }
  if (s.includes("pending") || s.includes("await")) {
    return {
      type: "orange",
      dot: "#f97316",
      bg: "#fff7ed",
      border: "#ffedd5",
      pillBg: "#ffedd5",
      pillText: "#ea580c",
      avatarBg: "#ffedd5",
      avatarText: "#ea580c",
      label: "🕒 PENDING APPROVAL",
    };
  }
  return {
    type: "blue",
    dot: "#2563eb",
    bg: "#eff6ff",
    border: "#dbeafe",
    pillBg: "#dbeafe",
    pillText: "#2563eb",
    avatarBg: "#dbeafe",
    avatarText: "#2563eb",
    label: "✓ APPROVED",
  };
}

export function MobileMeetingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  usePageChrome({
    title: "Meetings",
    subtitle: "Scheduled visits",
    showBack: true,
    backTo: "/",
    showNotification: false,
    showProfile: false,
  });

  const paramDate = searchParams.get("date");
  const today = toInputDate(new Date());

  const [selectedDate, setSelectedDate] = useState(() => paramDate || today);
  const [query, setQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paramDate) setSelectedDate(paramDate);
  }, [paramDate]);

  // 7-day strip around selectedDate
  const week = useMemo(() => {
    const start = addDays(selectedDate, -3);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await visitorApi.listDetailed(200, visitorScopeFilters(user));
      setRows(list || []);
    } catch (err: unknown) {
      setError(extractError(err, "Could not load schedule"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const dayMeetings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => rowDay(r) === selectedDate || (!r.creation && selectedDate === today))
      .filter((r) => {
        if (filterStatus === "all") return true;
        const s = (r.status || "").toLowerCase();
        if (filterStatus === "pending") return s.includes("pending");
        if (filterStatus === "approved") return s.includes("approved");
        if (filterStatus === "checked_in") return s.includes("check");
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const hay = `${r.full_name || ""} ${r.person_to_meet_name || ""} ${r.visit_purpose_type || ""} ${r.status || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => rowStamp(a).localeCompare(rowStamp(b)));
  }, [rows, selectedDate, query, filterStatus, today]);

  return (
    <div className="vm-home-page vm-schedule-redesign-page">
      {/* Sticky Header Section */}
      <div className="vm-sched-header-wrap">
        <header className="vm-sched-top-nav">
          <button
            type="button"
            className="vm-sched-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div className="vm-sched-title-block">
            <h1 className="vm-sched-main-title">Today&apos;s Schedule</h1>
            <span className="vm-sched-sub-date">{headerDateSub(selectedDate)}</span>
          </div>

          <label className="vm-sched-month-pill">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>{monthYearLabel(selectedDate)}</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
            <input
              type="month"
              className="vm-sched-month-picker"
              value={selectedDate.slice(0, 7)}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(`${e.target.value}-01`);
                }
              }}
            />
          </label>
        </header>

        {/* Search & Filter Bar */}
        <div className="vm-sched-search-row">
          <div className="vm-sched-search-box">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#94a3b8" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              className="vm-sched-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search schedule..."
              aria-label="Search schedule"
            />
            {query ? (
              <button type="button" className="vm-sched-clear-btn" onClick={() => setQuery("")}>
                ✕
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className={`vm-sched-filter-btn${filterStatus !== "all" ? " is-active" : ""}`}
            onClick={() => setShowFilter((v) => !v)}
            aria-label="Filter schedule"
            title="Filter by status"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
        </div>

        {/* Filter Popup Menu */}
        {showFilter ? (
          <div className="vm-sched-filter-dropdown">
            <span className="label">Filter by Status:</span>
            <div className="chips">
              {[
                { code: "all", label: "All" },
                { code: "pending", label: "Pending" },
                { code: "approved", label: "Approved" },
                { code: "checked_in", label: "Checked In" },
              ].map((st) => (
                <button
                  key={st.code}
                  type="button"
                  className={`chip${filterStatus === st.code ? " is-active" : ""}`}
                  onClick={() => {
                    setFilterStatus(st.code);
                    setShowFilter(false);
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Horizontal Date Ribbon Strip */}
        <div className="vm-sched-date-ribbon" role="listbox" aria-label="Select day">
          {week.map((date) => {
            const active = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                role="option"
                aria-selected={active}
                className={`vm-sched-date-chip${active ? " is-active" : ""}`}
                onClick={() => setSelectedDate(date)}
              >
                <span className="day-name">{weekdayShort(date)}</span>
                <span className="day-num-circle">{dayNum(date)}</span>
                {active ? <span className="active-indicator" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Schedule Content Section */}
      <main className="vm-sched-body">
        {/* Schedule Summary Banner */}
        <div className="vm-sched-summary-banner">
          <h2 className="vm-sched-summary-title">
            Schedule for <span>{fullDateLabel(selectedDate)}</span>
          </h2>
          <div className="vm-sched-count-pill">
            <span className="count">{String(dayMeetings.length).padStart(2, "0")}</span>
            <span className="label">Total Entries</span>
          </div>
        </div>

        {error ? <p className="login-error" style={{ textAlign: "center", marginTop: "1rem" }}>{error}</p> : null}
        {loading ? <p className="vm-empty-hint" style={{ marginTop: "1.5rem" }}>Loading schedule…</p> : null}

        {!loading && dayMeetings.length === 0 ? (
          <div className="vm-sched-empty-card">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <strong>No Schedule Found</strong>
            <p>No visitor entries recorded for {selectedDate}</p>
          </div>
        ) : null}

        {/* Timeline Schedule Cards List */}
        <div className="vm-sched-timeline-list">
          {dayMeetings.map((item) => {
            const time = formatTime(rowStamp(item)) || "10:30 AM";
            const visitorName = item.full_name || item.name;
            const hostName = item.person_to_meet_name || "Administrator";
            const purpose = item.visit_purpose_type || "Visit";
            const theme = cardTheme(item.status);

            return (
              <div key={item.name} className="vm-sched-timeline-item">
                {/* Left Timeline Bar with Colored Dot */}
                <div className="vm-sched-time-col">
                  <span className="time-text">{time}</span>
                  <span className="dot-node" style={{ backgroundColor: theme.dot }} />
                  <span className="timeline-line" />
                </div>

                {/* Timeline Card */}
                <article
                  className={`vm-sched-card theme-${theme.type}`}
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                  }}
                  onClick={() => navigate(`/visitor/${encodeURIComponent(item.name)}`)}
                >
                  {/* Top Row: Visitor Info + Time Pill */}
                  <div className="vm-sched-card-top">
                    <div className="visitor-identity">
                      <div
                        className="avatar-circle"
                        style={{ backgroundColor: theme.avatarBg, color: theme.avatarText }}
                      >
                        {initials(visitorName)}
                      </div>
                      <strong className="visitor-name">{visitorName}</strong>
                    </div>

                    <span
                      className="time-badge-pill"
                      style={{ backgroundColor: theme.pillBg, color: theme.pillText }}
                    >
                      {time}
                    </span>
                  </div>

                  {/* Metadata Rows */}
                  <div className="vm-sched-card-meta">
                    <div className="meta-line">
                      <span className="lbl">Host:</span>
                      <span className="val">{hostName}</span>
                    </div>
                    <div className="meta-line">
                      <span className="lbl">Purpose:</span>
                      <span className="val">{purpose}</span>
                    </div>
                  </div>

                  <VisitorStageTimeline visitor={item} compact className="vm-sched-stage-timeline" />

                  {/* Bottom Row: Overlapped Avatars + Status Pill */}
                  <div className="vm-sched-card-foot">
                    <div className="avatar-stack">
                      <span className="av-circle visitor-av" style={{ backgroundColor: theme.avatarBg, color: theme.avatarText }}>
                        {initials(visitorName)}
                      </span>
                      <span className="av-circle host-av">
                        {initials(hostName)}
                      </span>
                    </div>

                    <span
                      className="status-pill-badge"
                      style={{ backgroundColor: theme.pillBg, color: theme.pillText }}
                    >
                      {theme.label}
                    </span>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
