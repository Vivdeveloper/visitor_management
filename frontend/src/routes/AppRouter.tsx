import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { MobileLayout } from "@/layouts/MobileLayout";
import { PublicPassPage } from "@/pages/pass/PassPage";
import { MobileHomePage } from "@/pages/mobile/MobileHomePage";
import { MobileLoginPage } from "@/pages/mobile/MobileLoginPage";
import { MobileApprovalsPage } from "@/pages/mobile/MobileApprovalsPage";
import { MobileGatePage } from "@/pages/mobile/MobileGatePage";
import { MobilePassPage } from "@/pages/mobile/MobilePassPage";
import { MobileProfilePage } from "@/pages/mobile/MobileProfilePage";
import { useAuth } from "@/context/AuthContext";

/** PWA: allow visitor OTP session (verified) as well as staff session. */
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

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<MobileLoginPage />} />
      <Route path="/m/login" element={<Navigate to="/login" replace />} />
      <Route path="/pass/:token" element={<PublicPassPage />} />

      <Route element={<RequirePwaAuth />}>
        <Route element={<MobileLayout />}>
          <Route path="/" element={<MobileHomePage />} />
          <Route path="/approvals" element={<MobileApprovalsPage />} />
          <Route path="/gate" element={<MobileGatePage />} />
          <Route path="/pass" element={<MobilePassPage />} />
          <Route path="/profile" element={<MobileProfilePage />} />
          {/* Legacy /m/* redirects */}
          <Route path="/m" element={<Navigate to="/" replace />} />
          <Route path="/m/approvals" element={<Navigate to="/approvals" replace />} />
          <Route path="/m/gate" element={<Navigate to="/gate" replace />} />
          <Route path="/m/pass" element={<Navigate to="/pass" replace />} />
          <Route path="/m/profile" element={<Navigate to="/profile" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
