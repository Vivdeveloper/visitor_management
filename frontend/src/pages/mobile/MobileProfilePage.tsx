import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { resolveMode } from "@/lib/roles";

export function MobileProfilePage() {
  const { user, logout, isAuthenticated } = useAuth();
  const mode = resolveMode(user);
  const name = user?.full_name || user?.user || "Guest";

  return (
    <section className="m-page">
      <div className="gp-profile-hero">
        <div className="gp-avatar lg">{initials(name)}</div>
        <h1>{name}</h1>
        <p className="m-sub">{user?.mobile || user?.mobile_no || user?.user || "—"}</p>
        <span className="gp-badge muted">{mode}</span>
      </div>

      <ul className="gp-menu">
        <li>
          <Link to="/approvals">Approvals</Link>
        </li>
        <li>
          <Link to="/my-pass">My / lookup pass</Link>
        </li>
        <li>
          <Link to="/inside">Inside visitors</Link>
        </li>
        <li>
          <Link to="/history">History</Link>
        </li>
      </ul>

      {isAuthenticated || user?.verified ? (
        <button type="button" className="gp-submit danger" onClick={() => void logout()}>
          Logout
        </button>
      ) : (
        <Link className="gp-submit" to="/login">
          Sign in
        </Link>
      )}
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}
