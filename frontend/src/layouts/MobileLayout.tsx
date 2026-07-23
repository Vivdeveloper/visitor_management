import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { mobileTabsFor, resolveMode, type VmsMode } from "@/lib/roles";
import { MobileTabIconView } from "@/components/ui/MobileIcons";

export function MobileLayout() {
  const { user } = useAuth();
  const mode = resolveMode(user);
  const tabs = mobileTabsFor(mode);

  return (
    <div className="m-shell">
      <header className="m-top">
        <div className="m-brand">
          <span className="m-brand-mark" aria-hidden />
          VMS
        </div>
        <div className="m-mode">{modeLabel(mode)}</div>
      </header>
      <main className="m-content">
        <Outlet />
      </main>
      <nav className="m-tabs" aria-label="Mobile">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) => `m-tab${isActive ? " active" : ""}`}
            aria-label={tab.label}
            title={tab.label}
          >
            <span className="m-tab-glow" aria-hidden />
            <span className="m-tab-icon">
              <MobileTabIconView name={tab.icon} />
            </span>
            <span className="m-sr-only">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function modeLabel(mode: VmsMode): string {
  switch (mode) {
    case "security":
      return "Security";
    case "host":
      return "Host";
    case "visitor":
      return "Visitor";
    case "guest":
      return "Guest";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
