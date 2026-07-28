import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { passApi, type PublicPassResult } from "@/api/vms";
import { formatTime } from "@/lib/format";
import { VisitorGatePassCard } from "@/components/pass/VisitorGatePassCard";

export function PublicPassPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
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
        <div className="vm-empty-hint" style={{ color: "#64748b" }}>Loading gate pass…</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="pass-public">
        <div className="vm-overview-card" style={{ maxWidth: 420, textAlign: "center", background: "#ffffff", padding: "1.5rem" }}>
          <p className="login-error">{error || "Pass not found"}</p>
          <button type="button" className="vm-btn-outline" onClick={() => navigate("/")}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const pass = result.pass;
  const qrTarget = pass?.pass_url || `${window.location.origin}/vms/pass/${token}`;
  const noticeMsg = result.valid
    ? undefined
    : result.reason || `Pass not valid for status: ${pass?.status || "Unknown"}`;

  return (
    <div className="pass-public">
      <VisitorGatePassCard
        passCode={pass?.visitor_entry || token}
        visitorName={pass?.full_name || "Visitor"}
        company={pass?.visitor_company || "—"}
        hostName={pass?.person_to_meet_name || pass?.host_name || "Administrator"}
        floor={pass?.floor || "—"}
        status={pass?.status || (result.valid ? "Approved" : "Invalid")}
        noticeMessage={noticeMsg}
        validUntil={pass?.qr_expires_on ? formatTime(pass.qr_expires_on) : "11:30 AM"}
        photoUrl={pass?.photo}
        qrPayload={qrTarget}
        onDownload={() => window.print()}
        onShare={() => {
          if (navigator.share) {
            void navigator.share({ title: `Gate Pass - ${pass?.full_name || "Visitor"}`, url: qrTarget });
          } else {
            void navigator.clipboard?.writeText(qrTarget);
          }
        }}
      />
    </div>
  );
}
