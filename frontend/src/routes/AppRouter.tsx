import { useEffect, useMemo, useState } from "react";
import {
  createBrowserRouter,
  createHashRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
} from "react-router-dom";
import { MobileLayout } from "@/layouts/MobileLayout";
import { PublicPassPage } from "@/pages/pass/PassPage";
import { MobileHomePage } from "@/pages/mobile/MobileHomePage";
import { MobileLoginPage } from "@/pages/mobile/MobileLoginPage";
import { MobileApprovalsPage } from "@/pages/mobile/MobileApprovalsPage";
import { MobileCheckInPage } from "@/pages/mobile/MobileCheckInPage";
import { MobileScanPage } from "@/pages/mobile/MobileScanPage";
import { MobileInsidePage } from "@/pages/mobile/MobileInsidePage";
import { MobileHistoryPage } from "@/pages/mobile/MobileHistoryPage";
import { MobilePassPage } from "@/pages/mobile/MobilePassPage";
import { MobileProfilePage } from "@/pages/mobile/MobileProfilePage";
import { MobileCheckoutPage } from "@/pages/mobile/MobileCheckoutPage";
import { MobilePreRegisterPage } from "@/pages/mobile/MobilePreRegisterPage";
import { MobileAnalyticsPage } from "@/pages/mobile/MobileAnalyticsPage";
import { MobileMeetingsPage } from "@/pages/mobile/MobileMeetingsPage";
import { MobileNotificationsPage } from "@/pages/mobile/MobileNotificationsPage";
import { MobileVisitorDetailPage } from "@/pages/mobile/MobileVisitorDetailPage";
import { useAuth } from "@/context/AuthContext";
import { APP_BASE_PATH } from "@/config/env";
import { isLikelyNativeWebView, shouldUseHashRouter } from "@/native/platform";

function RequirePwaAuth() {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) {
    return <div className="login-page">Loading…</div>;
  }
  if (!isAuthenticated && !user?.verified) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

const routeElements = createRoutesFromElements(
  <>
    <Route path="/login" element={<MobileLoginPage />} />
    <Route path="/m/login" element={<Navigate to="/login" replace />} />
    <Route path="/welcome" element={<Navigate to="/check-in" replace />} />
    <Route path="/pass/:token" element={<PublicPassPage />} />

    <Route element={<RequirePwaAuth />}>
      <Route element={<MobileLayout />}>
        <Route path="/" element={<MobileHomePage />} />
        <Route path="/check-in" element={<MobileCheckInPage />} />
        <Route path="/scan" element={<MobileScanPage />} />
        <Route path="/inside" element={<MobileInsidePage />} />
        <Route path="/visitor/:name" element={<MobileVisitorDetailPage />} />
        <Route path="/history" element={<MobileHistoryPage />} />
        <Route path="/approvals" element={<MobileApprovalsPage />} />
        <Route path="/pre-register" element={<MobilePreRegisterPage />} />
        <Route path="/analytics" element={<MobileAnalyticsPage />} />
        <Route path="/meetings" element={<MobileMeetingsPage />} />
        <Route path="/checkout/:name" element={<MobileCheckoutPage />} />
        <Route path="/checkout" element={<MobileCheckoutPage />} />
        <Route path="/my-pass" element={<MobilePassPage />} />
        <Route path="/pass" element={<MobilePassPage />} />
        <Route path="/profile" element={<MobileProfilePage />} />
        <Route path="/notifications" element={<MobileNotificationsPage />} />
        <Route path="/m" element={<Navigate to="/" replace />} />
        <Route path="/m/*" element={<Navigate to="/" replace />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </>,
);

function createVmsRouter(useHash: boolean) {
  // Android/iOS WebView + Capacitor live URL often breaks History API updates
  // until a full reload. Hash routing keeps tab changes instant.
  if (useHash) {
    return createHashRouter(routeElements);
  }
  return createBrowserRouter(routeElements, { basename: APP_BASE_PATH });
}

/**
 * Wait briefly for Capacitor bridge on APK live URL so we don't lock into
 * BrowserRouter before the native shell injects (forces hard refresh otherwise).
 */
function useHashRouterDecision(): boolean | null {
  const [decision, setDecision] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return false;
    if (shouldUseHashRouter()) return true;
    if (isLikelyNativeWebView()) return null;
    return false;
  });

  useEffect(() => {
    if (decision !== null) return;

    const started = Date.now();
    const id = window.setInterval(() => {
      if (shouldUseHashRouter() || Date.now() - started > 450) {
        setDecision(shouldUseHashRouter() || isLikelyNativeWebView());
        window.clearInterval(id);
      }
    }, 25);

    return () => window.clearInterval(id);
  }, [decision]);

  return decision;
}

export function AppRouter() {
  const useHash = useHashRouterDecision();
  const router = useMemo(
    () => (useHash === null ? null : createVmsRouter(useHash)),
    [useHash],
  );

  if (!router) {
    return <div className="login-page">Loading…</div>;
  }

  return <RouterProvider router={router} />;
}
