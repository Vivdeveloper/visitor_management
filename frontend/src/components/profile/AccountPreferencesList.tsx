import { Link } from "react-router-dom";

export function AccountPreferencesList() {
  return (
    <div>
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--vms-muted)", display: "block", marginBottom: "0.5rem", paddingLeft: "0.25rem" }}>
        Account & Preferences
      </span>
      <div className="vm-menu-card" style={{ padding: "0.25rem 0.85rem" }}>
        <div className="vm-menu-item" style={{ padding: "0.85rem 0" }}>
          <div className="vm-menu-item-left">
            <span className="vm-menu-icon-bg" style={{ background: "var(--vms-primary-soft)" }}>👤</span>
            <div>
              <span className="vm-menu-title" style={{ fontSize: "0.9rem" }}>My Profile</span>
            </div>
          </div>
          <span style={{ color: "var(--vms-placeholder)" }}>❯</span>
        </div>

        <Link to="/notifications" className="vm-menu-item" style={{ padding: "0.85rem 0" }}>
          <div className="vm-menu-item-left">
            <span className="vm-menu-icon-bg" style={{ background: "#FFEDD5" }}>🔔</span>
            <div>
              <span className="vm-menu-title" style={{ fontSize: "0.9rem" }}>Notifications</span>
            </div>
          </div>
          <span style={{ color: "var(--vms-placeholder)" }}>❯</span>
        </Link>
      </div>
    </div>
  );
}
