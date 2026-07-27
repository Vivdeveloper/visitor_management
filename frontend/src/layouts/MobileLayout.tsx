import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { FloatingNavbar } from "@/components/navigation/FloatingNavbar";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { HeaderBar } from "@/components/common/HeaderBar";
import { PageChromeProvider, usePageChromeState } from "@/context/PageChromeContext";
import { HostAlertProvider } from "@/context/HostAlertContext";

function AppTopBar() {
  const chrome = usePageChromeState();
  const navigate = useNavigate();

  return (
    <HeaderBar
      title={chrome.title}
      subtitle={chrome.subtitle}
      showBack={chrome.showBack}
      onBack={chrome.backTo ? () => navigate(chrome.backTo!) : undefined}
      showNotification={chrome.showNotification}
      showProfile={chrome.showProfile}
    />
  );
}

export function MobileLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const lastDeltaRef = useRef(0);

  const [pullProgress, setPullProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const hideDock = location.pathname === "/check-in";

  const doRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    // Full reload ensures every page re-fetches its data.
    window.location.reload();
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const scrollEl = el;

    const THRESHOLD_PX = 115;

    function resetPull() {
      startYRef.current = null;
      lastDeltaRef.current = 0;
      setPullProgress(0);
    }

    function onTouchStart(ev: TouchEvent) {
      if (refreshingRef.current) return;
      if (ev.touches.length !== 1) return;
      if (scrollEl.scrollTop > 0) return;
      startYRef.current = ev.touches[0].clientY;
      lastDeltaRef.current = 0;
      setPullProgress(0);
    }

    function onTouchMove(ev: TouchEvent) {
      if (refreshingRef.current) return;
      if (startYRef.current == null) return;
      if (ev.touches.length !== 1) return;
      if (scrollEl.scrollTop > 0) {
        resetPull();
        return;
      }

      const currentY = ev.touches[0].clientY;
      const delta = currentY - startYRef.current;
      lastDeltaRef.current = Math.max(0, delta);

      if (delta <= 0) {
        setPullProgress(0);
        return;
      }

      // Only prevent default while the user is actively pulling down at the top.
      ev.preventDefault();
      const progress = Math.min(1, delta / THRESHOLD_PX);
      setPullProgress(progress);
    }

    function onTouchEnd() {
      if (refreshingRef.current) {
        resetPull();
        return;
      }

      const delta = lastDeltaRef.current;
      const progress = delta / THRESHOLD_PX;
      if (progress >= 0.65) doRefresh();
      resetPull();
      // If reload doesn't happen (e.g. offline), clear the spinner.
      window.setTimeout(() => {
        refreshingRef.current = false;
        setRefreshing(false);
      }, 2500);
    }

    scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove", onTouchMove, { passive: false });
    scrollEl.addEventListener("touchend", onTouchEnd, { passive: true });
    scrollEl.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove", onTouchMove);
      scrollEl.removeEventListener("touchend", onTouchEnd);
      scrollEl.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [doRefresh]);

  return (
    <PageChromeProvider>
      <HostAlertProvider>
      <div className={`m-shell m-shell--chrome${hideDock ? " m-shell--no-dock" : ""}`}>
        <OfflineIndicator />
        <div className="m-app-topbar">
          <AppTopBar />
        </div>
        <main className="m-content" id="vms-scroll-root" ref={mainRef}>
          <div
            className="vm-pull-refresh-indicator"
            aria-hidden="true"
            style={{
              opacity: refreshing ? 1 : pullProgress > 0 ? 1 : 0,
              transform: `translateY(${pullProgress * 28}px)`,
            }}
          >
            {refreshing ? (
              <span className="vm-pull-refresh-text">Refreshing…</span>
            ) : (
              <span className="vm-pull-refresh-text">{pullProgress >= 0.65 ? "Release to refresh" : "Pull to refresh"}</span>
            )}
          </div>

          <Outlet />
        </main>
        <FloatingNavbar />
      </div>
      </HostAlertProvider>
    </PageChromeProvider>
  );
}
