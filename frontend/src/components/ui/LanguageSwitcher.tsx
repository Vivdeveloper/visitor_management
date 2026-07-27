import { useEffect, useId, useRef, useState } from "react";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { ut } from "@/i18n/uiChrome";

type LanguageSwitcherProps = {
  /** compact = profile popup row · settings = full settings row */
  variant?: "compact" | "settings" | "icon";
  className?: string;
};

export function LanguageSwitcher({ variant = "compact", className = "" }: LanguageSwitcherProps) {
  const { lang, requestLangChange, options, label } = useAppLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [menuOpen]);

  function requestChange(next: (typeof options)[number]["code"]) {
    setMenuOpen(false);
    requestLangChange(next);
  }

  return (
    <div
      className={`vm-lang-switch${
        variant === "settings" ? " is-settings" : ""
      }${variant === "icon" ? " is-icon" : ""} ${className}`.trim()}
      ref={rootRef}
    >
      <button
        type="button"
        className={
          variant === "settings"
            ? "vm-settings-row"
            : variant === "icon"
              ? "vm-lang-icon-btn"
              : "vm-profile-popup-action"
        }
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-haspopup="listbox"
        onClick={() => setMenuOpen((v) => !v)}
      >
        {variant === "compact" ? (
          <>
            <span className="vm-profile-popup-action-icon" aria-hidden>
              文
            </span>
            <span className="vm-profile-popup-action-copy">
              <strong>{ut(lang, "language")}</strong>
              <span>{label}</span>
            </span>
            <span className="vm-profile-popup-action-trail" aria-hidden>
              {menuOpen ? "▴" : "▾"}
            </span>
          </>
        ) : variant === "icon" ? (
          <>
            <span className="vm-lang-icon" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 0 20" />
                <path d="M12 2a15.3 15.3 0 0 0 0 20" />
              </svg>
            </span>
          </>
        ) : (
          <>
            <span className="vm-settings-row-label">{ut(lang, "language")}</span>
            <span className="vm-settings-row-trail">
              <span className="vm-settings-row-value">{label}</span>
              <span aria-hidden>{menuOpen ? "▴" : "▾"}</span>
            </span>
          </>
        )}
      </button>

      {menuOpen ? (
        <ul id={menuId} className="vm-lang-menu" role="listbox" aria-label={ut(lang, "select_language")}>
          {options.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                role="option"
                aria-selected={lang === item.code}
                className={`vm-lang-menu-item${lang === item.code ? " is-active" : ""}`}
                onClick={() => requestChange(item.code)}
              >
                <span>{item.label}</span>
                {lang === item.code ? <span aria-hidden>✓</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
