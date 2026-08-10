import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { FloatingNavbar } from "@/components/navigation/FloatingNavbar";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { HeaderBar } from "@/components/common/HeaderBar";
import { AndroidBrowserHint } from "@/components/ui/AndroidBrowserHint";
import { PwaInstallNudge } from "@/components/ui/PwaInstallNudge";
import { PageChromeProvider, usePageChromeState } from "@/context/PageChromeContext";
import { HostAlertProvider } from "@/context/HostAlertContext";
import { VMS_PAGE_REFRESH_EVENT } from "@/hooks/usePageRefresh";
import { setSpaNavigators, syncSpaDepth } from "@/native/backNavigation";

function AppTopBar() {
  const chrome = usePageChromeState();
  const navigate = useNavigate();

  const handleBack = () => {
    if (chrome.onBack) {
      chrome.onBack();
      return;
    }
    if (chrome.backTo) {
      navigate(chrome.backTo);
      return;
    }
    navigate(-1);
  };

  return (
    <HeaderBar
      title={chrome.title}
      subtitle={chrome.subtitle}
      showBack={chrome.showBack}
      onBack={handleBack}
      showNotification={chrome.showNotification}
      showProfile={chrome.showProfile}
    />
  );
}

export function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const mainRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const lastDeltaRef = useRef(0);

  const [pullProgress, setPullProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const hideDock = location.pathname === "/check-in";

  useEffect(() => {
    return setSpaNavigators(
      () => navigate(-1),
      () => navigate("/", { replace: false }),
    );
  }, [navigate]);

  useEffect(() => {
    syncSpaDepth(navType);
  }, [location.key, navType]);

  /* New route → scroll to top + soft-reload page data (no window.reload). */
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const reset = () => {
      el.scrollTop = 0;
      el.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
      window.scrollTo?.(0, 0);
    };
    reset();
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(reset);
    });
    // Tell pages hooked with usePageRefresh to re-fetch immediately on tab change.
    window.dispatchEvent(new Event(VMS_PAGE_REFRESH_EVENT));
    return () => window.cancelAnimationFrame(id);
  }, [location.pathname, location.key]);

  const doRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);

    const el = mainRef.current;
    if (el) el.scrollTop = 0;

    // Soft refresh: notify page loaders (no full remount / window.reload).
    window.dispatchEvent(new Event(VMS_PAGE_REFRESH_EVENT));

    window.setTimeout(() => {
      refreshingRef.current = false;
      setRefreshing(false);
    }, 450);
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
          <AndroidBrowserHint />
          <PwaInstallNudge />
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
                <span className="vm-pull-refresh-text">
                  {pullProgress >= 0.65 ? "Release to refresh" : "Pull to refresh"}
                </span>
              )}
            </div>

            {/* Remount on pathname so each tab mounts cleanly in Android WebView */}
            <Outlet key={location.pathname} />
          </main>
          <FloatingNavbar />
        </div>
      </HostAlertProvider>
    </PageChromeProvider>
  );
}
