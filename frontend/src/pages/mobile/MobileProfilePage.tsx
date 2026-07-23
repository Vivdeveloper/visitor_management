import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { resolveMode } from "@/lib/roles";

export function MobileProfilePage() {
  const { user, logout, isAuthenticated } = useAuth();
  const mode = resolveMode(user);

  return (
    <section className="m-page">
      <h1>Profile</h1>
      <div className="m-card">
        <div className="m-card-title">{user?.full_name || "Signed in"}</div>
        <div className="m-card-meta">
          {user?.mobile || user?.mobile_no || user?.user || "—"}
          <br />
          Mode: {mode}
        </div>
      </div>

      <div className="m-actions">
        {isAuthenticated || user?.verified ? (
          <button type="button" className="m-action" onClick={() => void logout()}>
            Log out
          </button>
        ) : (
          <Link className="m-action primary" to="/login">
            Sign in
          </Link>
        )}
        <Link className="m-action ghost" to="/">
          Desktop dashboard
        </Link>
        <p className="m-sub">SOS and push notifications arrive in later phases.</p>
      </div>
    </section>
  );
}
