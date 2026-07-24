import { Link } from "react-router-dom";
import type { ThemeMode } from "@/context/ThemeContext";

type AccountPreferencesListProps = {
  theme?: ThemeMode;
  onToggleTheme?: () => void;
};

export function AccountPreferencesList({ theme = "light", onToggleTheme }: AccountPreferencesListProps) {
  return (
    <div>
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--vms-muted)", display: "block", marginBottom: "0.5rem", paddingLeft: "0.25rem" }}>
        Account & Preferences
      </span>
      <div className="vm-menu-card" style={{ padding: "0.25rem 0.85rem" }}>
        <Link to="/analytics" className="vm-menu-item" style={{ padding: "0.85rem 0" }}>
          <div className="vm-menu-item-left">
            <span className="vm-menu-icon-bg" style={{ background: "#EFF6FF", color: "#2563EB" }}>📊</span>
            <div>
              <span className="vm-menu-title" style={{ fontSize: "0.9rem" }}>Analytics & Reports</span>
              <span style={{ fontSize: "0.75rem", color: "var(--vms-muted)", display: "block" }}>View detailed visitor trends and stats</span>
            </div>
          </div>
          <span style={{ color: "var(--vms-placeholder)" }}>❯</span>
        </Link>

        <div className="vm-menu-item" style={{ padding: "0.85rem 0" }}>
          <div className="vm-menu-item-left">
            <span className="vm-menu-icon-bg" style={{ background: "var(--vms-primary-soft)" }}>👤</span>
            <div>
              <span className="vm-menu-title" style={{ fontSize: "0.9rem" }}>My Profile</span>
              <span style={{ fontSize: "0.75rem", color: "var(--vms-muted)", display: "block" }}>ERPNext user details shown above</span>
            </div>
          </div>
          <span style={{ color: "var(--vms-placeholder)" }}>❯</span>
        </div>

        <Link to="/notifications" className="vm-menu-item" style={{ padding: "0.85rem 0" }}>
          <div className="vm-menu-item-left">
            <span className="vm-menu-icon-bg" style={{ background: "#FFEDD5" }}>🔔</span>
            <div>
              <span className="vm-menu-title" style={{ fontSize: "0.9rem" }}>Notifications</span>
              <span style={{ fontSize: "0.75rem", color: "var(--vms-muted)", display: "block" }}>Manage your notification preferences</span>
            </div>
          </div>
          <span style={{ color: "var(--vms-placeholder)" }}>❯</span>
        </Link>

        <button type="button" className="vm-menu-item" style={{ padding: "0.85rem 0", width: "100%", border: 0, background: "transparent", cursor: "pointer" }} onClick={onToggleTheme}>
          <div className="vm-menu-item-left">
            <span className="vm-menu-icon-bg" style={{ background: theme === "dark" ? "#1a1a1a" : "#EFF6FF" }}>🎨</span>
            <div style={{ textAlign: "left" }}>
              <span className="vm-menu-title" style={{ fontSize: "0.9rem" }}>Theme</span>
              <span style={{ fontSize: "0.75rem", color: "var(--vms-muted)", display: "block" }}>Light & dark mode supported</span>
            </div>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--vms-muted)", fontWeight: 600 }}>
            {theme === "dark" ? "Dark" : "Light"} ❯
          </span>
        </button>
      </div>
    </div>
  );
}
