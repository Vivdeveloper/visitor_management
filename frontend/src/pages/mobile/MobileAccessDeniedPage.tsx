import { useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useAuth } from "@/context/AuthContext";

/** Shown when an ERPNext user signs in without Visitor Entry DocPerm access. */
export function MobileAccessDeniedPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  async function handleSignOut() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="vm-auth-page">
      <div className="vm-auth-mobile-frame">
        <main className="vm-auth-body" style={{ justifyContent: "center", gap: "1.25rem" }}>
          <BrandLogo variant="full" className="welcome-wordmark" />
          <h1 className="vm-auth-title">Access restricted</h1>
          <p className="vm-auth-subtitle" style={{ maxWidth: 320, margin: "0 auto" }}>
            {user?.full_name || user?.user || "This account"} does not have Visitor Management access.
            Ask an administrator to grant Visitor Entry permissions in Role Permission Manager.
          </p>
          <button type="button" className="vm-btn-primary vm-auth-submit" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </main>
      </div>
    </div>
  );
}
