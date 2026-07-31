import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authApi } from "@/api/vms";
import { useAuth } from "@/context/AuthContext";
import { extractError } from "@/lib/format";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { firstAllowedPath, hasVmsAppAccess } from "@/lib/roles";

/** PWA login — ERPNext username/email + password only. */
export function MobileLoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, setProfile, loading, user } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && (isAuthenticated || user?.verified) && hasVmsAppAccess(user)) {
    return <Navigate to={firstAllowedPath(user)} replace />;
  }

  if (!loading && isAuthenticated && user && !hasVmsAppAccess(user)) {
    return <Navigate to="/access-denied" replace />;
  }

  async function onPasswordLogin(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your ERPNext Username/Email and Password.");
      return;
    }
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await authApi.loginWithPassword(username.trim(), password);
      const profile = {
        ...res,
        verified: true,
        authenticated: true,
      };
      if (!hasVmsAppAccess(profile)) {
        try {
          await authApi.logout();
        } catch {
          /* ignore */
        }
        setProfile(null);
        setError(
          "No Visitor Management access. Ask an administrator to assign PA Security Guard User or PA GatePass Approval.",
        );
        return;
      }
      setProfile(profile);
      navigate(firstAllowedPath(profile), { replace: true });
    } catch (err: unknown) {
      setError(extractError(err, "Invalid ERPNext username or password"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vm-auth-page">
      <div className="vm-auth-mobile-frame">
        <header className="vm-auth-header">
          <span className="vm-auth-header-spacer" aria-hidden />
          <span className="vm-auth-pill">ERPNext Sign In</span>
          <span className="vm-auth-header-spacer" aria-hidden />
        </header>

        <main className="vm-auth-body">
          <div className="vm-auth-intro">
            <BrandLogo variant="full" className="welcome-wordmark" />
            <h1 className="vm-auth-title">Sign In to Precious Alloys</h1>
            <p className="vm-auth-subtitle">Use your ERPNext username or email and password</p>
          </div>

          <form className="vm-auth-form" onSubmit={onPasswordLogin}>
            <div className="vm-form-group">
              <label className="vm-form-label" htmlFor="login-username">
                ERPNext Username / Email *
              </label>
              <input
                id="login-username"
                type="text"
                className="vm-input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoCapitalize="none"
                autoComplete="username"
              />
            </div>

            <div className="vm-form-group">
              <label className="vm-form-label" htmlFor="login-password">
                Password *
              </label>
              <div className="vm-auth-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="vm-input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="vm-auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error ? <p className="login-error">{error}</p> : null}
            {message ? <p className="login-msg">{message}</p> : null}

            <button type="submit" className="vm-btn-primary vm-auth-submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign In with ERPNext"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
