import { useMemo, useState } from "react";
import {
  VISITOR_LANGS,
  type VisitorLang,
  setStoredVisitorLang,
} from "@/i18n/visitorJourney";

type Props = {
  lang: VisitorLang;
  onChange: (lang: VisitorLang) => void;
  compact?: boolean;
};

export function JourneyLangSwitcher({ lang, onChange, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const langLabel = useMemo(
    () => VISITOR_LANGS.find((l) => l.code === lang)?.label || "English",
    [lang],
  );

  return (
    <div className={`welcome-lang${compact ? " is-compact" : ""}`}>
      <button
        type="button"
        className="welcome-lang-btn"
        aria-expanded={open}
        aria-label="Language"
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="welcome-lang-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.6 9h16.8M3.6 15h16.8M12 3a14.5 14.5 0 0 1 4 9 14.5 14.5 0 0 1-4 9 14.5 14.5 0 0 1-4-9 14.5 14.5 0 0 1 4-9Z" />
        </svg>
        <span>{langLabel}</span>
        <span className="welcome-lang-chevron" aria-hidden>
          ▼
        </span>
      </button>

      {open ? (
        <ul className="welcome-lang-menu" role="listbox">
          {VISITOR_LANGS.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                role="option"
                aria-selected={lang === item.code}
                onClick={() => {
                  setStoredVisitorLang(item.code);
                  onChange(item.code);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
