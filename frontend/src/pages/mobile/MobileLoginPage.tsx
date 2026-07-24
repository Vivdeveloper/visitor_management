import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authApi } from "@/api/vms";
import { useAuth } from "@/context/AuthContext";
import { extractError } from "@/lib/format";
import { BrandLogo } from "@/components/ui/BrandLogo";

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

  if (!loading && (isAuthenticated || user?.verified)) {
    return <Navigate to="/" replace />;
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
      setProfile({
        ...res,
        verified: true,
        authenticated: true,
      });
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(extractError(err, "Invalid ERPNext username or password"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vm-home-page">
      <header className="vm-page-header" style={{ justifyContent: "space-between", background: "transparent", border: "none", padding: "0.5rem 0.25rem 0" }}>
        <button type="button" className="vm-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          ‹
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "var(--vms-primary-soft)", padding: "0.35rem 0.85rem", borderRadius: "20px" }}>
          <span style={{ color: "var(--vms-primary)", fontWeight: 800, fontSize: "0.85rem" }}>ERPNext Sign In</span>
        </div>
        <div style={{ width: "24px" }} />
      </header>

      <main
        className="vm-main-body"
        style={{
          background: "var(--vms-surface)",
          borderRadius: "24px",
          padding: "1.5rem 1.25rem",
          border: "1px solid var(--vms-border)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
          marginTop: "0.75rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <BrandLogo variant="full" className="welcome-wordmark" />
          <h1 className="vm-page-title" style={{ fontSize: "1.35rem", marginTop: "0.85rem" }}>
            Sign In to Precious Alloys
          </h1>
          <p style={{ color: "var(--vms-muted)", fontSize: "0.85rem", margin: "0.3rem 0 0" }}>
            Use your ERPNext username or email and password
          </p>
        </div>

        <form onSubmit={onPasswordLogin} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div className="vm-form-group">
            <label className="vm-form-label">ERPNext Username / Email *</label>
            <input
              type="text"
              className="vm-input-field"
              placeholder="Administrator or user@company.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoCapitalize="none"
              autoComplete="username"
            />
          </div>

          <div className="vm-form-group">
            <label className="vm-form-label">Password *</label>
            <div style={{ position: "relative" }}>
              <input
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
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  fontSize: "0.85rem",
                  color: "var(--vms-muted)",
                  cursor: "pointer",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error ? <p className="login-error">{error}</p> : null}
          {message ? <p className="login-msg">{message}</p> : null}

          <button type="submit" className="vm-btn-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign In with ERPNext"}
          </button>
        </form>
      </main>
    </div>
  );
}
