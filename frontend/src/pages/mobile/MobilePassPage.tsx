import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { passApi, type MyPassRow } from "@/api/vms";
import { useAuth } from "@/context/AuthContext";
import { formatTime } from "@/lib/format";
import { resolveMode } from "@/lib/roles";
import { usePageChrome } from "@/context/PageChromeContext";
import { VisitorGatePassCard } from "@/components/pass/VisitorGatePassCard";

export function MobilePassPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mode = resolveMode(user);
  const mobile = user?.mobile || user?.mobile_no || "";
  const [rows, setRows] = useState<MyPassRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  usePageChrome({
    title: "Visitor Gate Pass",
    subtitle: "Digital pass",
    showBack: true,
    backTo: "/",
  });

  const loadMine = useCallback(async () => {
    if (!mobile) return;
    setLoading(true);
    setError(null);
    try {
      const list = await passApi.listMyPasses(mobile);
      setRows(list || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load passes");
    } finally {
      setLoading(false);
    }
  }, [mobile]);

  useEffect(() => {
    if (mode === "visitor" || mode === "host" || mode === "security") {
      void loadMine();
    }
  }, [mode, loadMine]);

  const featured = rows[0];

  return (
    <div className="vm-home-page">

      <main className="vm-main-body" style={{ marginTop: "0.5rem" }}>
        {loading ? <p className="vm-empty-hint">Loading pass…</p> : null}
        {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}

        {!loading && !featured ? (
          <p className="vm-empty-hint">No gate pass found for this account</p>
        ) : null}

        {featured ? (
          <VisitorGatePassCard
            passCode={featured.name}
            visitorName={featured.full_name || "Visitor"}
            company={featured.company || "—"}
            hostName={featured.person_to_meet_name || featured.host_name || "—"}
            floor={featured.floor || "—"}
            status={featured.status || "Approved"}
            validUntil={featured.qr_expires_on ? formatTime(featured.qr_expires_on) : "—"}
            checkInTime="—"
            checkInLocation="Main Gate"
            photoUrl={undefined}
            qrPayload={featured.pass_url || undefined}
            onDownload={() => {
              if (featured.pass_url) window.open(featured.pass_url, "_blank");
              else window.print();
            }}
            onExit={() => navigate("/", { replace: true })}
          />
        ) : null}
      </main>
    </div>
  );
}
