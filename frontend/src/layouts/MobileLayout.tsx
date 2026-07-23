import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { mobileTabsFor, resolveMode, type VmsMode } from "@/lib/roles";
import { MobileTabIconView } from "@/components/ui/MobileIcons";

export function MobileLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mode = resolveMode(user);
  const tabs = mobileTabsFor(mode);

  return (
    <div className="m-shell">
      <header className="m-top">
        <button type="button" className="m-top-icon" aria-label="Menu" onClick={() => navigate("/profile")}>
          ☰
        </button>
        <div className="m-brand">GatePass</div>
        <div className="m-top-actions">
          <span className="m-mode">{modeLabel(mode)}</span>
          <button type="button" className="m-top-icon" aria-label="Profile" onClick={() => navigate("/profile")}>
            👤
          </button>
        </div>
      </header>
      <main className="m-content">
        <Outlet />
      </main>
      <nav className="m-tabs" aria-label="GatePass">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) =>
              `m-tab${tab.fab ? " m-tab-fab" : ""}${isActive ? " active" : ""}`
            }
            aria-label={tab.label}
            title={tab.label}
          >
            <span className="m-tab-glow" aria-hidden />
            <span className={`m-tab-icon${tab.fab ? " m-tab-icon-fab" : ""}`}>
              <MobileTabIconView name={tab.icon} size={tab.fab ? 26 : 22} />
            </span>
            {!tab.fab ? <span className="m-tab-label">{tab.label}</span> : null}
            {tab.fab ? <span className="m-sr-only">{tab.label}</span> : null}
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
