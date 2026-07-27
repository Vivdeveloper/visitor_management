import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { visitorApi, type VisitorListRow } from "@/api/vms";
import { extractError, formatTime, initials } from "@/lib/format";

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

function monthLabel(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString([], { month: "short", year: "numeric" });
}

function weekday(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString([], { weekday: "short" });
}

function dayNum(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).getDate();
}

function rowStamp(r: VisitorListRow) {
  return r.checked_in_on || r.creation || r.modified || "";
}

function rowDay(r: VisitorListRow) {
  return rowStamp(r).slice(0, 10);
}

export function MobileMeetingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramDate = searchParams.get("date");
  const today = toInputDate(new Date());

  const [selectedDate, setSelectedDate] = useState(() => paramDate || today);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<VisitorListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paramDate) setSelectedDate(paramDate);
  }, [paramDate]);

  const week = useMemo(() => {
    const start = addDays(selectedDate, -3);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await visitorApi.listDetailed(200);
      setRows(list || []);
    } catch (err: unknown) {
      setError(extractError(err, "Could not load schedule"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dayMeetings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => rowDay(r) === selectedDate)
      .filter((r) => {
        if (!q) return true;
        const hay = `${r.full_name || ""} ${r.person_to_meet_name || ""} ${r.visit_purpose_type || ""} ${r.status || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => rowStamp(a).localeCompare(rowStamp(b)));
  }, [rows, selectedDate, query]);

  return (
    <div className="vm-home-page vm-meetings-page vm-schedule-page">
      <div className="vm-schedule-sticky">
        <header className="vm-meetings-top">
          <button type="button" className="vm-meetings-back" onClick={() => navigate(-1)} aria-label="Back">
            ‹
          </button>
          <h1 className="vm-schedule-title">Today&apos;s Schedule</h1>
          <div className="vm-meetings-month-pill">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>{monthLabel(selectedDate)}</span>
          </div>
        </header>

        <div className="vm-meetings-search">
          <span className="vm-search-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            className="vm-input-field vm-meetings-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search schedule..."
            aria-label="Search schedule"
          />
        </div>

        <div className="vm-date-strip" role="listbox" aria-label="Select day">
          {week.map((date) => {
            const active = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                role="option"
                aria-selected={active}
                className={`vm-date-chip${active ? " is-active" : ""}`}
                onClick={() => setSelectedDate(date)}
              >
                <span className="vm-date-chip-day">{weekday(date)}</span>
                <span className="vm-date-chip-num">{dayNum(date)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="vm-meetings-section vm-schedule-timeline-wrap">
        <div className="vm-meetings-section-head">
          <span className="vm-meetings-count" aria-label={`${dayMeetings.length} entries`}>
            {String(dayMeetings.length).padStart(2, "0")}
          </span>
        </div>

        {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}
        {loading ? <p className="vm-empty-hint">Loading…</p> : null}
        {!loading && dayMeetings.length === 0 ? (
          <div className="vm-overview-card" style={{ padding: "2rem", textAlign: "center" }}>
            <strong style={{ fontSize: "1rem", color: "#0F172A", display: "block" }}>No entries</strong>
            <p style={{ fontSize: "0.82rem", color: "#64748B", margin: "0.2rem 0 0" }}>{selectedDate}</p>
          </div>
        ) : null}

        <div className="vm-meetings-timeline">
          {dayMeetings.map((item, idx) => {
            const time = formatTime(rowStamp(item)) || "09:00 AM";
            const visitorName = item.full_name || item.name;
            const hostName = item.person_to_meet_name || "Host Team";
            const isFeatured = idx === 0;

            return (
              <div key={item.name} className="vm-meeting-row">
                <span className="vm-meeting-time">{time}</span>
                <article
                  className={`vm-meeting-card${isFeatured ? " is-teal" : " is-white"}`}
                  onClick={() => navigate(`/visitor/${encodeURIComponent(item.name)}`)}
                >
                  <div className="vm-meeting-card-top">
                    <h3>{visitorName}</h3>
                    <span className="vm-meeting-time-tag">{time}</span>
                  </div>

                  <p className="vm-meeting-desc">
                    Host: {hostName} · {(item.visit_purpose_type || "Visit").trim()}
                  </p>

                  <div className="vm-meeting-meta">
                    <div className="vm-meeting-avatars" aria-hidden>
                      <span className="vm-meeting-avatar">{initials(visitorName)}</span>
                      <span className="vm-meeting-avatar is-meet">{initials(hostName)}</span>
                    </div>
                    <span className="vm-meeting-status">{item.status || "Check-in"}</span>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
