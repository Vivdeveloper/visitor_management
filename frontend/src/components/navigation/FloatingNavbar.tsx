import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { mobileTabsFor, resolveMode } from "@/lib/roles";
import { MobileTabIconView } from "@/components/ui/MobileIcons";

/** iPhone-like shrink: hysteresis + delayed commit for smooth motion. */
const COMPACT_AFTER = 64;
const EXPAND_BELOW = 20;
const DOWN_DELTA = 12;
const UP_DELTA = 10;

export function FloatingNavbar() {
  const { user } = useAuth();
  const mode = resolveMode(user);
  const tabs = mobileTabsFor(mode);
  const location = useLocation();
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const lastYRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
  }, [location.pathname]);

  return (
    <nav
      className={`vm-dock${compact ? " is-compact" : ""}`}
      aria-label="Visitor Management Navigation"
      data-compact={compact ? "true" : "false"}
    >
      <div className="vm-dock-inner">
        {tabs.map((tab) => {
          const isAddEntry = Boolean(tab.fab || tab.to === "/check-in");
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `vm-dock-tab${isAddEntry ? " is-add" : ""}${isActive ? " is-active" : ""}`
              }
              aria-label={tab.label}
              title={tab.label}
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
                <span className="vm-dock-label">{tab.label}</span>
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
