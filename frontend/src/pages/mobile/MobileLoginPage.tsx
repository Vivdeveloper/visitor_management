import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { authApi } from "@/api/vms";
import { useAuth } from "@/context/AuthContext";

/** Mobile OTP login — lands on /m after verify. */
export function MobileLoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, setProfile, loading, user } = useAuth();
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && (isAuthenticated || user?.verified)) {
    return <Navigate to="/m" replace />;
  }

  async function onSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevOtp(null);
    setBusy(true);
    try {
      const res = await authApi.sendOtp(mobile, "login");
      setMessage(res.message || "OTP sent");
      if (res.otp) {
        setDevOtp(res.otp);
        setOtp(res.otp);
      }
      setStep("otp");
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.verifyOtp(mobile, otp, "login");
      setProfile({
        ...res,
        verified: true,
        mobile: res.mobile || mobile,
      });
      navigate("/m", { replace: true });
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page m-login">
      <div className="login-card">
        <h1>VMS Mobile</h1>
        <p className="login-sub">Sign in with mobile OTP</p>

        {step === "mobile" ? (
          <form onSubmit={onSendOtp} className="login-form">
            <label htmlFor="mobile">Mobile number</label>
            <input
              id="mobile"
              name="mobile"
              inputMode="tel"
              autoComplete="tel"
              placeholder="10-digit mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
            <button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={onVerifyOtp} className="login-form">
            <label htmlFor="otp">OTP sent to {mobile}</label>
            <input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            {devOtp ? <p className="dev-otp">Dev OTP: {devOtp}</p> : null}
            <button type="submit" disabled={busy}>
              {busy ? "Verifying…" : "Verify & Continue"}
            </button>
            <button
              type="button"
              className="linkish"
              disabled={busy}
              onClick={() => {
                setStep("mobile");
                setOtp("");
                setDevOtp(null);
              }}
            >
              Change mobile
            </button>
          </form>
        )}

        {message ? <p className="login-msg">{message}</p> : null}
        {error ? <p className="login-error">{error}</p> : null}
      </div>
    </div>
  );
}

function extractError(err: unknown): string {
  if (typeof err === "object" && err && "response" in err) {
    const response = (err as { response?: { data?: { message?: string; _server_messages?: string } } })
      .response;
    const data = response?.data;
    if (data?._server_messages) {
      try {
        const parsed = JSON.parse(data._server_messages);
        const first = typeof parsed[0] === "string" ? JSON.parse(parsed[0]) : parsed[0];
        if (first?.message) return String(first.message);
      } catch {
        /* fall through */
      }
    }
    if (data?.message) return String(data.message);
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
