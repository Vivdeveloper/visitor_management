import { useEffect, useMemo, useState } from "react";
import {
  createBrowserRouter,
  createHashRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useLocation,
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
import { MobileAccessDeniedPage } from "@/pages/mobile/MobileAccessDeniedPage";
import { useAuth } from "@/context/AuthContext";
import { APP_BASE_PATH } from "@/config/env";
import { isLikelyNativeWebView, shouldUseHashRouter } from "@/native/platform";
import {
  firstAllowedPath,
  hasCapability,
  hasVmsAppAccess,
  type CapabilityKey,
} from "@/lib/roles";

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

/** Desk users without PA / VMS roles cannot use the app. */
function RequireVmsAccess() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="login-page">Loading…</div>;
  }

  const isVisitorSession =
    user?.session_type === "visitor" || (Boolean(user?.verified) && !user?.authenticated);

  if (user?.authenticated && !hasVmsAppAccess(user) && !isVisitorSession) {
    if (location.pathname !== "/access-denied") {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return <Outlet />;
}

/** Block routes the user's Role Permission Manager DocPerm does not allow. */
function RequireCapability({ capability }: { capability: CapabilityKey }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="login-page">Loading…</div>;
  }

  if (!hasCapability(user, capability)) {
    const fallback = firstAllowedPath(user);
    if (fallback === location.pathname) {
      return (
        <div className="login-page" style={{ padding: 24, textAlign: "center" }}>
          <p>You do not have permission to use Visitor Management.</p>
          <p style={{ opacity: 0.7, fontSize: 14 }}>
            Ask an administrator to assign roles in Role Permission Manager.
          </p>
        </div>
      );
    }
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}

function HomeOrRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="login-page">Loading…</div>;
  if (!hasCapability(user, "dashboard")) {
    return <Navigate to={firstAllowedPath(user)} replace />;
  }
  return <MobileHomePage />;
}

const routeElements = createRoutesFromElements(
  <>
    <Route path="/login" element={<MobileLoginPage />} />
    <Route path="/m/login" element={<Navigate to="/login" replace />} />
    <Route path="/welcome" element={<Navigate to="/check-in" replace />} />
    <Route path="/pass/:token" element={<PublicPassPage />} />

    <Route element={<RequirePwaAuth />}>
      <Route path="/access-denied" element={<MobileAccessDeniedPage />} />
      <Route element={<RequireVmsAccess />}>
        <Route element={<MobileLayout />}>
          <Route path="/" element={<HomeOrRedirect />} />

          <Route element={<RequireCapability capability="check_in" />}>
            <Route path="/check-in" element={<MobileCheckInPage />} />
            <Route path="/pre-register" element={<MobilePreRegisterPage />} />
          </Route>

          <Route element={<RequireCapability capability="scan" />}>
            <Route path="/scan" element={<MobileScanPage />} />
          </Route>

          <Route element={<RequireCapability capability="inside" />}>
            <Route path="/inside" element={<MobileInsidePage />} />
            <Route path="/visitor/:name" element={<MobileVisitorDetailPage />} />
          </Route>

          <Route element={<RequireCapability capability="history" />}>
            <Route path="/history" element={<MobileHistoryPage />} />
          </Route>

          <Route element={<RequireCapability capability="approvals" />}>
            <Route path="/approvals" element={<MobileApprovalsPage />} />
          </Route>

          <Route element={<RequireCapability capability="reports" />}>
            <Route path="/analytics" element={<MobileAnalyticsPage />} />
          </Route>

          <Route element={<RequireCapability capability="meetings" />}>
            <Route path="/meetings" element={<MobileMeetingsPage />} />
          </Route>

          <Route element={<RequireCapability capability="checkout" />}>
            <Route path="/checkout/:name" element={<MobileCheckoutPage />} />
            <Route path="/checkout" element={<MobileCheckoutPage />} />
          </Route>

          <Route element={<RequireCapability capability="profile" />}>
            <Route path="/my-pass" element={<MobilePassPage />} />
            <Route path="/pass" element={<MobilePassPage />} />
            <Route path="/profile" element={<MobileProfilePage />} />
          </Route>

          <Route element={<RequireCapability capability="notifications" />}>
            <Route path="/notifications" element={<MobileNotificationsPage />} />
          </Route>

          <Route path="/m" element={<Navigate to="/" replace />} />
          <Route path="/m/*" element={<Navigate to="/" replace />} />
        </Route>
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
