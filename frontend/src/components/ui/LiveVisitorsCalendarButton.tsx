import { useEffect, useMemo, useState } from "react";
import type { VisitorLang } from "@/i18n/visitorJourney";
import { intlLocale, localizeDigits } from "@/lib/localize";
import { toFlowInputDate } from "@/lib/visitorFlow";
import { ut } from "@/i18n/uiChrome";

type LiveVisitorsCalendarButtonProps = {
  /** ISO date `YYYY-MM-DD` or empty for none. */
  value: string;
  onChange: (next: string) => void;
  lang: VisitorLang;
  max?: string;
  className?: string;
};

function parseIsoDay(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthTitle(year: number, monthIndex: number, lang: VisitorLang): string {
  const d = new Date(year, monthIndex, 1);
  return localizeDigits(
    d.toLocaleDateString(intlLocale(lang), { month: "long", year: "numeric" }),
    lang,
  );
}

function weekdayLabels(lang: VisitorLang): string[] {
  const base = new Date(2024, 0, 7); // Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d.toLocaleDateString(intlLocale(lang), { weekday: "narrow" });
  });
}

function formatSelectedLabel(value: string, lang: VisitorLang): string {
  const d = parseIsoDay(value);
  if (!d) return value;
  return localizeDigits(
    d.toLocaleDateString(intlLocale(lang), { day: "numeric", month: "short", year: "numeric" }),
    lang,
  );
}

function buildMonthCells(year: number, monthIndex: number): Array<Date | null> {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay(); // 0 Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Compact in-app date calendar (no time) — sheet stays inside the mobile viewport.
 */
export function LiveVisitorsCalendarButton({
  value,
  onChange,
  lang,
  max,
  className = "",
}: LiveVisitorsCalendarButtonProps) {
  const todayIso = toFlowInputDate(new Date());
  const maxIso = max && /^\d{4}-\d{2}-\d{2}$/.test(max) ? max : todayIso;
  const hasValue = Boolean(value);
  const label = hasValue ? formatSelectedLabel(value, lang) : ut(lang, "select_date");

  const [open, setOpen] = useState(false);
  const initial = parseIsoDay(value) || new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  useEffect(() => {
    if (!open) return;
    const d = parseIsoDay(value) || new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const weeks = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekdays = useMemo(() => weekdayLabels(lang), [lang]);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function pickDay(d: Date) {
    const iso = toFlowInputDate(d);
    if (iso > maxIso) return;
    onChange(iso);
    setOpen(false);
  }

  function canGoNextMonth() {
    const next = new Date(viewYear, viewMonth + 1, 1);
    const maxD = parseIsoDay(maxIso) || new Date();
    return next.getFullYear() < maxD.getFullYear()
      || (next.getFullYear() === maxD.getFullYear() && next.getMonth() <= maxD.getMonth());
  }

  return (
    <div className={`vm-live-cal ${className}`.trim()}>
      <button
        type="button"
        className={`vm-live-cal-btn${hasValue ? " has-value" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={ut(lang, "select_date")}
        title={hasValue ? label : ut(lang, "select_date")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
        {hasValue ? <span className="vm-live-cal-label">{label}</span> : null}
      </button>

      {hasValue ? (
        <button
          type="button"
          className="vm-live-cal-clear"
          onClick={() => onChange("")}
          aria-label={ut(lang, "filter_clear")}
          title={ut(lang, "filter_clear")}
        >
          ×
        </button>
      ) : null}

      {open ? (
        <div
          className="vm-live-cal-overlay"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="vm-live-cal-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={ut(lang, "select_date")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vm-live-cal-sheet-head">
              <button
                type="button"
                className="vm-live-cal-nav"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
              >
                ‹
              </button>
              <strong className="vm-live-cal-month">{monthTitle(viewYear, viewMonth, lang)}</strong>
              <button
                type="button"
                className="vm-live-cal-nav"
                onClick={() => shiftMonth(1)}
                disabled={!canGoNextMonth()}
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="vm-live-cal-weekdays" aria-hidden>
              {weekdays.map((w, i) => (
                <span key={`${w}-${i}`}>{w}</span>
              ))}
            </div>

            <div className="vm-live-cal-grid">
              {weeks.map((cell, idx) => {
                if (!cell) {
                  return <span key={`e-${idx}`} className="vm-live-cal-day is-empty" />;
                }
                const iso = toFlowInputDate(cell);
                const disabled = iso > maxIso;
                const selected = iso === value;
                const isToday = iso === todayIso;
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`vm-live-cal-day${selected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                    disabled={disabled}
                    onClick={() => pickDay(cell)}
                  >
                    {localizeDigits(cell.getDate(), lang)}
                  </button>
                );
              })}
            </div>

            <div className="vm-live-cal-sheet-foot">
              <button
                type="button"
                className="vm-live-cal-today-btn"
                onClick={() => pickDay(new Date())}
              >
                {ut(lang, "filter_today")}
              </button>
              <button
                type="button"
                className="vm-live-cal-done-btn"
                onClick={() => setOpen(false)}
              >
                {ut(lang, "done")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
