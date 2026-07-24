import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { HeaderBar } from "@/components/common/HeaderBar";
import { ProfileHeroCard } from "@/components/profile/ProfileHeroCard";
import { ActivityOverviewBanner } from "@/components/profile/ActivityOverviewBanner";
import { AccountPreferencesList } from "@/components/profile/AccountPreferencesList";
import { SupportAboutList } from "@/components/profile/SupportAboutList";
import { PwaInstallButton } from "@/components/ui/PwaInstallButton";

export function MobileProfilePage() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();

  const name = user?.full_name || user?.user || "Administrator";
  const mobile = user?.mobile_no || user?.mobile || undefined;
  const email = user?.email || user?.user || "admin@example.com";
  const role = user?.vms_roles?.[0] || user?.roles?.find((r) => r !== "All" && r !== "Guest") || "Employee";
  const status = user?.authenticated ? "Active" : "Active";
  const image = user?.user_image || undefined;
  const erpnextUser = user?.user || "Administrator";
  const rolesList = (user?.roles || ["Supplier", "Customer", "Analytics", "Agriculture Manager"]).filter(
    (r) => !["All", "Guest", "Desk User"].includes(r)
  );

  return (
    <div className="vm-home-page">
      <HeaderBar title="Precious Alloys" showNotification showProfile />

      <div style={{ padding: "0.25rem 0.25rem 0.65rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--vms-navy)", margin: 0 }}>More</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--vms-muted)", margin: "0.2rem 0 0" }}>
          Manage your profile, preferences and system tools
        </p>
      </div>

      <main className="vm-main-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <ProfileHeroCard
          name={name}
          mobile={mobile}
          email={email}
          role={role}
          status={status}
          imageUrl={image}
          erpnextUser={erpnextUser}
          rolesList={rolesList.length ? rolesList : ["System Manager", "Security"]}
        />

        <ActivityOverviewBanner onViewStats={() => navigate("/analytics")} />

        <AccountPreferencesList
          theme={theme}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        />

        <PwaInstallButton variant="full" />

        <SupportAboutList />

        {isAuthenticated || user?.verified ? (
          <button
            type="button"
            className="vm-btn-outline"
            style={{ color: "#DC2626", borderColor: "#FCA5A5", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
            onClick={() => void logout()}
          >
            Logout
          </button>
        ) : (
          <Link to="/login" className="vm-btn-primary">
            Sign In
          </Link>
        )}
      </main>
    </div>
  );
}
