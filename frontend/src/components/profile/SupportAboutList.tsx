export function SupportAboutList() {
  return (
    <div>
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748B", display: "block", marginBottom: "0.5rem", paddingLeft: "0.25rem" }}>
        Support & About
      </span>
      <div className="vm-menu-card" style={{ padding: "0.25rem 0.85rem" }}>
        <div className="vm-menu-item" style={{ padding: "0.85rem 0" }}>
          <div className="vm-menu-item-left">
            <span className="vm-menu-icon-bg" style={{ background: "#DCFCE7" }}>❓</span>
            <div>
              <span className="vm-menu-title" style={{ fontSize: "0.9rem" }}>Help & Support</span>
              <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>Get help and view FAQs</span>
            </div>
          </div>
          <span style={{ color: "#94A3B8" }}>❯</span>
        </div>

        <div className="vm-menu-item" style={{ padding: "0.85rem 0" }}>
          <div className="vm-menu-item-left">
            <span className="vm-menu-icon-bg" style={{ background: "#FEF3C7" }}>📄</span>
            <div>
              <span className="vm-menu-title" style={{ fontSize: "0.9rem" }}>Terms & Conditions</span>
              <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>Read our terms and conditions</span>
            </div>
          </div>
          <span style={{ color: "#94A3B8" }}>❯</span>
        </div>

        <div className="vm-menu-item" style={{ padding: "0.85rem 0" }}>
          <div className="vm-menu-item-left">
            <span className="vm-menu-icon-bg" style={{ background: "#FEE2E2" }}>🔒</span>
            <div>
              <span className="vm-menu-title" style={{ fontSize: "0.9rem" }}>Privacy Policy</span>
              <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>Read our privacy policy</span>
            </div>
          </div>
          <span style={{ color: "#94A3B8" }}>❯</span>
        </div>

        <div className="vm-menu-item" style={{ padding: "0.85rem 0" }}>
          <div className="vm-menu-item-left">
            <span className="vm-menu-icon-bg" style={{ background: "#EFF6FF" }}>ℹ️</span>
            <div>
              <span className="vm-menu-title" style={{ fontSize: "0.9rem" }}>About Precious Alloys</span>
              <span style={{ fontSize: "0.75rem", color: "#64748B", display: "block" }}>App version and information</span>
            </div>
          </div>
          <span style={{ fontSize: "0.8rem", color: "#64748B", fontWeight: 600 }}>v1.0.0 ❯</span>
        </div>
      </div>
    </div>
  );
}
