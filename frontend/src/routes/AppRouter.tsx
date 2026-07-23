import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { MobileLayout } from "@/layouts/MobileLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { VisitorListPage } from "@/pages/visitor/VisitorListPage";
import { ApprovalListPage } from "@/pages/approval/ApprovalListPage";
import { SecurityGatePage } from "@/pages/security/SecurityGatePage";
import { PassPage, PublicPassPage } from "@/pages/pass/PassPage";
import { NotificationsPage } from "@/pages/notifications/NotificationsPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { MobileHomePage } from "@/pages/mobile/MobileHomePage";
import { MobileLoginPage } from "@/pages/mobile/MobileLoginPage";
import { MobileApprovalsPage } from "@/pages/mobile/MobileApprovalsPage";
import { MobileGatePage } from "@/pages/mobile/MobileGatePage";
import { MobilePassPage } from "@/pages/mobile/MobilePassPage";
import { MobileProfilePage } from "@/pages/mobile/MobileProfilePage";
import { useAuth } from "@/context/AuthContext";

function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="login-page">Loading…</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

/** Mobile: allow visitor OTP session (verified) as well as staff session. */
function RequireMobileAuth() {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) {
    return <div className="login-page">Loading…</div>;
  }
  if (!isAuthenticated && !user?.verified) {
    return <Navigate to="/m/login" replace />;
  }
  return <Outlet />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/pass/:token" element={<PublicPassPage />} />

      <Route path="/m/login" element={<MobileLoginPage />} />
      <Route element={<RequireMobileAuth />}>
        <Route path="/m" element={<MobileLayout />}>
          <Route index element={<MobileHomePage />} />
          <Route path="approvals" element={<MobileApprovalsPage />} />
          <Route path="gate" element={<MobileGatePage />} />
          <Route path="pass" element={<MobilePassPage />} />
          <Route path="profile" element={<MobileProfilePage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/visitors" element={<VisitorListPage />} />
          <Route path="/approvals" element={<ApprovalListPage />} />
          <Route path="/security" element={<SecurityGatePage />} />
          <Route path="/pass" element={<PassPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
