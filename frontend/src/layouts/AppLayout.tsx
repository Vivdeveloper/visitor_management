import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/visitors", label: "Visitors" },
  { to: "/approvals", label: "Approvals" },
  { to: "/security", label: "Security" },
  { to: "/pass", label: "Pass" },
  { to: "/notifications", label: "Notifications" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const label = user?.full_name || user?.user || user?.mobile || "Signed in";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Visitor Management</div>
        <div className="user-chip">{label}</div>
        <nav>
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
		<button type="button" className="logout-btn" onClick={() => void logout()}>
          Logout
        </button>
        <a className="logout-btn" href="/vms/m" style={{ marginTop: "0.5rem", textAlign: "center" }}>
          Mobile app
        </a>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
