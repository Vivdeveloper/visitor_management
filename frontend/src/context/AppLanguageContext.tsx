import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  VISITOR_LANGS,
  getStoredVisitorLang,
  setStoredVisitorLang,
  type VisitorLang,
} from "@/i18n/visitorJourney";
import { langLabel, ut } from "@/i18n/uiChrome";

type AppLanguageContextValue = {
  lang: VisitorLang;
  label: string;
  setLang: (lang: VisitorLang) => void;
  /** Opens confirm dialog; applies only after user confirms */
  requestLangChange: (lang: VisitorLang) => void;
  options: typeof VISITOR_LANGS;
};

const AppLanguageContext = createContext<AppLanguageContextValue | undefined>(undefined);
const STORAGE_KEY = "vms_app_lang";

function readStoredLang(): VisitorLang {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local === "en" || local === "hi" || local === "mr") return local;
  } catch {
    /* ignore */
  }
  return getStoredVisitorLang();
}

function applyDocumentLang(lang: VisitorLang) {
  document.documentElement.lang = lang;
  setStoredVisitorLang(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

function LanguageConfirmDialog({
  current,
  pending,
  onYes,
  onNo,
}: {
  current: VisitorLang;
  pending: VisitorLang;
  onYes: () => void;
  onNo: () => void;
}) {
  return createPortal(
    <div
      className="vm-lang-confirm-root"
      role="presentation"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="vm-lang-confirm-backdrop"
        aria-label={ut(current, "no")}
        onClick={onNo}
      />
      <div
        className="vm-lang-confirm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vm-lang-confirm-title"
      >
        <h3 id="vm-lang-confirm-title">{ut(current, "lang_confirm_title")}</h3>
        <p>
          {ut(current, "lang_confirm_body", {
            from: langLabel(current),
            to: langLabel(pending),
          })}
        </p>
        <div className="vm-lang-confirm-actions">
          <button type="button" className="vm-btn-outline vm-lang-confirm-no" onClick={onNo}>
            {ut(current, "no")}
          </button>
          <button type="button" className="vm-btn-primary vm-lang-confirm-yes" onClick={onYes}>
            {ut(current, "yes")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<VisitorLang>(() => readStoredLang());
  const [pendingLang, setPendingLang] = useState<VisitorLang | null>(null);

  useEffect(() => {
    applyDocumentLang(lang);
  }, [lang]);

  const setLang = useCallback((next: VisitorLang) => {
    setLangState(next);
    applyDocumentLang(next);
  }, []);

  const requestLangChange = useCallback(
    (next: VisitorLang) => {
      if (next === lang) return;
      setPendingLang(next);
    },
    [lang],
  );

  const confirmYes = useCallback(() => {
    if (!pendingLang) return;
    const next = pendingLang;
    setPendingLang(null);
    setLang(next);
  }, [pendingLang, setLang]);

  const confirmNo = useCallback(() => {
    setPendingLang(null);
  }, []);

  const label = useMemo(
    () => VISITOR_LANGS.find((l) => l.code === lang)?.label || "English",
    [lang],
  );

  const value = useMemo(
    () => ({ lang, label, setLang, requestLangChange, options: VISITOR_LANGS }),
    [lang, label, setLang, requestLangChange],
  );

  return (
    <AppLanguageContext.Provider value={value}>
      {children}
      {pendingLang ? (
        <LanguageConfirmDialog
          current={lang}
          pending={pendingLang}
          onYes={confirmYes}
          onNo={confirmNo}
        />
      ) : null}
    </AppLanguageContext.Provider>
  );
}

export function useAppLanguage() {
  const ctx = useContext(AppLanguageContext);
  if (!ctx) throw new Error("useAppLanguage must be used within AppLanguageProvider");
  return ctx;
}
