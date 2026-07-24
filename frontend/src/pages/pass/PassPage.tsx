import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { passApi, type PublicPassResult } from "@/api/vms";
import { formatTime, initials } from "@/lib/format";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function PublicPassPage() {
  const { token = "" } = useParams();
  const [result, setResult] = useState<PublicPassResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await passApi.getPublicPass(token);
        if (!cancelled) setResult(data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load pass");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="pass-public">
        <div className="ad-pass">Loading pass…</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="pass-public">
        <div className="ad-pass">
          <BrandLogo variant="on-dark" className="ad-pass-logo" />
          <div className="ad-pass-name">Visitor Pass</div>
          <p className="login-error" style={{ color: "#fecaca" }}>
            {error || "Pass not found"}
          </p>
        </div>
      </div>
    );
  }

  const pass = result.pass;
  const qrTarget = pass?.pass_url || `${window.location.origin}/vms/pass/${token}`;
  const absolute = qrTarget.startsWith("http") ? qrTarget : `${window.location.origin}${qrTarget}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(absolute)}`;

  return (
    <div className="pass-public">
      <div className="ad-pass ad-pass-public">
        <BrandLogo variant="on-dark" className="ad-pass-logo" />
        {pass?.photo ? (
          <img className="ad-pass-photo" src={pass.photo} alt={pass.full_name || "Visitor"} />
        ) : (
          <div className="ad-avatar lg on-dark" style={{ marginBottom: 10 }}>
            {initials(pass?.full_name || "V")}
          </div>
        )}
        <div className="ad-pass-name">{pass?.full_name || "Visitor Pass"}</div>
        <div className="ad-pass-sub">
          {[pass?.visitor_company, result.valid ? "Valid pass" : result.reason || "Invalid"].filter(Boolean).join(" · ")}
        </div>
        <div className="ad-pass-meta-row">
          <span>Meeting with</span>
          <span>{pass?.person_to_meet_name || pass?.host_name || "—"}</span>
        </div>
        <div className="ad-pass-meta-row">
          <span>Floor</span>
          <span>{pass?.floor || "—"}</span>
        </div>
        <div className="ad-pass-meta-row">
          <span>Status</span>
          <span>{pass?.status || "—"}</span>
        </div>
        <img className="ad-pass-qr" src={qrSrc} alt="Visitor QR code" width={140} height={140} />
        <p className="ad-pass-note">
          Pass no. {pass?.visitor_entry || token}
          {pass?.qr_expires_on ? ` · Valid till ${formatTime(pass.qr_expires_on)}` : ""}
        </p>
        <div className="ad-pass-foot">
          <button
            type="button"
            className="ad-pass-btn"
            onClick={() => {
              if (navigator.share) void navigator.share({ title: "Visitor Pass", url: absolute });
              else void navigator.clipboard?.writeText(absolute);
            }}
          >
            Share
          </button>
          <button type="button" className="ad-pass-btn solid" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
