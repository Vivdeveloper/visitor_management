import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { mobileTabsFor, resolveMode } from "@/lib/roles";
import { MobileTabIconView } from "@/components/ui/MobileIcons";
import { ut, type UiCopyKey } from "@/i18n/uiChrome";
import type { VisitorLang } from "@/i18n/visitorJourney";
import { shouldUseHashRouter } from "@/native/platform";

function dockLabel(lang: VisitorLang, to: string, fallback: string): string {
  const keyByPath: Record<string, UiCopyKey> = {
    "/": "home",
    "/approvals": "pending",
    "/check-in": "add_entry",
    "/inside": "inside",
    "/analytics": "reports",
  };
  const key = keyByPath[to];
  return key ? ut(lang, key) : fallback;
}

/** iPhone-like shrink: hysteresis + delayed commit for smooth motion. */
const COMPACT_AFTER = 64;
const EXPAND_BELOW = 20;
const DOWN_DELTA = 12;
const UP_DELTA = 10;

export function FloatingNavbar() {
  const { user } = useAuth();
  const { lang } = useAppLanguage();
  const navigate = useNavigate();
  const mode = resolveMode(user);
  const tabs = mobileTabsFor(mode);
  const location = useLocation();
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const lastYRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativeNav = shouldUseHashRouter();

  /* Hide dock on Add Entry so the + button does not cover Continue. */
  const hideDock = location.pathname === "/check-in";

  useEffect(() => {
    if (hideDock) return;

    const scroller =
      (document.getElementById("vms-scroll-root") as HTMLElement | null) ||
      (document.querySelector(".m-content") as HTMLElement | null) ||
      (document.scrollingElement as HTMLElement | null) ||
      document.documentElement;

    lastYRef.current = scroller.scrollTop || 0;
    let ticking = false;

    const commit = (next: boolean) => {
      if (compactRef.current === next) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        compactRef.current = next;
        setCompact(next);
      }, next ? 90 : 50);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scroller.scrollTop || window.scrollY || 0;
        const delta = y - lastYRef.current;
        const goingDown = delta > DOWN_DELTA;
        const goingUp = delta < -UP_DELTA;

        if (y <= EXPAND_BELOW) commit(false);
        else if (goingDown && y > COMPACT_AFTER) commit(true);
        else if (goingUp) commit(false);

        lastYRef.current = y;
        ticking = false;
      });
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname, hideDock]);

  if (hideDock) return null;

  return (
    <nav
      className={`vm-dock${compact ? " is-compact" : ""}`}
      aria-label="Visitor Management Navigation"
      data-compact={compact ? "true" : "false"}
    >
      <div className="vm-dock-inner">
        {tabs.map((tab) => {
          const isAddEntry = Boolean(tab.fab || tab.to === "/check-in");
          const label = dockLabel(lang, tab.to, tab.label);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `vm-dock-tab${isAddEntry ? " is-add" : ""}${isActive ? " is-active" : ""}`
              }
              aria-label={label}
              title={label}
              onClick={(event) => {
                // Capacitor WebView: force client navigate so tabs update without hard refresh.
                if (!nativeNav) return;
                event.preventDefault();
                if (location.pathname === tab.to) return;
                navigate(tab.to);
              }}
            >
              <span className="vm-dock-pill">
                <span className={`vm-dock-icon${isAddEntry ? " is-add" : ""}`}>
                  {isAddEntry ? (
                    <span className="vm-dock-plus" aria-hidden>
                      +
                    </span>
                  ) : (
                    <MobileTabIconView name={tab.icon} size={20} />
                  )}
                </span>
                <span className="vm-dock-label">{label}</span>
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
