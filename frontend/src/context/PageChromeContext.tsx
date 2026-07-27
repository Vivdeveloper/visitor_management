import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PageChromeOptions = {
  title: string;
  subtitle: string;
  showBack: boolean;
  backTo?: string;
  showNotification: boolean;
  showProfile: boolean;
};

const DEFAULT_CHROME: PageChromeOptions = {
  title: "Precious Alloys",
  subtitle: "MAIN GATE DESK",
  showBack: false,
  showNotification: true,
  showProfile: true,
};

type PageChromeContextValue = {
  chrome: PageChromeOptions;
  setChrome: (next: Partial<PageChromeOptions>) => void;
  resetChrome: () => void;
};

const PageChromeContext = createContext<PageChromeContextValue | undefined>(undefined);

export function PageChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<PageChromeOptions>(DEFAULT_CHROME);

  const setChrome = useCallback((next: Partial<PageChromeOptions>) => {
    setChromeState((prev) => ({ ...prev, ...next }));
  }, []);

  const resetChrome = useCallback(() => {
    setChromeState(DEFAULT_CHROME);
  }, []);

  const value = useMemo(
    () => ({ chrome, setChrome, resetChrome }),
    [chrome, setChrome, resetChrome],
  );

  return <PageChromeContext.Provider value={value}>{children}</PageChromeContext.Provider>;
}

export function usePageChromeState() {
  const ctx = useContext(PageChromeContext);
  if (!ctx) throw new Error("usePageChromeState must be used within PageChromeProvider");
  return ctx.chrome;
}

export function usePageChrome(options: Partial<PageChromeOptions>) {
  const ctx = useContext(PageChromeContext);
  const setChrome = ctx?.setChrome;
  const resetChrome = ctx?.resetChrome;

  const {
    title = DEFAULT_CHROME.title,
    subtitle = DEFAULT_CHROME.subtitle,
    showBack = DEFAULT_CHROME.showBack,
    backTo,
    showNotification = DEFAULT_CHROME.showNotification,
    showProfile = DEFAULT_CHROME.showProfile,
  } = options;

  useEffect(() => {
    if (!setChrome || !resetChrome) return;
    setChrome({ title, subtitle, showBack, backTo, showNotification, showProfile });
    return () => resetChrome();
  }, [title, subtitle, showBack, backTo, showNotification, showProfile, setChrome, resetChrome]);
}
