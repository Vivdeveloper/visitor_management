import { BrandLogo } from "@/components/ui/BrandLogo";
import { APP_BASE_PATH } from "@/config/env";

interface VisitorGatePassCardProps {
  passCode?: string;
  visitorName?: string;
  company?: string;
  hostName?: string;
  department?: string;
  validUntil?: string;
  checkInTime?: string;
  checkInLocation?: string;
  photoUrl?: string | null;
  qrPayload?: string;
  busy?: boolean;
  onDownload?: () => void;
  onExit?: () => void;
}

function resolveUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path;
  if (path.startsWith("/")) return `${window.location.origin}${path}`;
  return `${window.location.origin}/${path}`;
}

export function VisitorGatePassCard({
  passCode = "GP-—",
  visitorName = "Visitor",
  company = "—",
  hostName = "—",
  department = "—",
  validUntil = "—",
  checkInTime = "—",
  checkInLocation = "Main Gate",
  photoUrl,
  qrPayload,
  busy = false,
  onDownload,
  onExit,
}: VisitorGatePassCardProps) {
  const scanTarget =
    qrPayload ||
    `${window.location.origin}${APP_BASE_PATH.replace(/\/$/, "")}/pass/${encodeURIComponent(passCode)}`;
  const absolute = resolveUrl(scanTarget) || scanTarget;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(absolute)}`;
  const photo = resolveUrl(photoUrl || undefined);

  return (
    <div style={{ textAlign: "center" }} id="vms-gate-pass-print">
      <div
        className="vm-overview-card"
        style={{
          background: "var(--vms-surface)",
          borderRadius: "24px",
          padding: "1.25rem 1rem",
          border: "1px solid var(--vms-border)",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          marginBottom: "1rem",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <BrandLogo variant="full" className="welcome-wordmark vj-pass-wordmark" />
        </div>

        <div style={{ borderTop: "1px solid var(--vms-divider)", paddingTop: "0.65rem", marginBottom: "0.85rem" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--vms-muted)", letterSpacing: "0.12em", display: "block" }}>
            VISITOR GATE PASS
          </span>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--vms-navy)", letterSpacing: "0.05em" }}>
            {passCode}
          </span>
        </div>

        <div style={{ margin: "0.5rem auto" }}>
          {photo ? (
            <img
              src={photo}
              alt={visitorName}
              style={{
                width: 90,
                height: 118,
                borderRadius: "14px",
                objectFit: "cover",
                objectPosition: "center top",
                border: "2px solid var(--vms-primary)",
                boxShadow: "0 6px 16px rgba(10, 61, 145, 0.2)",
                margin: "0 auto",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: 90,
                height: 118,
                borderRadius: "14px",
                background: "var(--vms-surface-2)",
                margin: "0 auto",
                display: "grid",
                placeItems: "center",
                fontSize: "2.2rem",
                border: "2px solid var(--vms-primary)",
              }}
            >
              👤
            </div>
          )}
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--vms-navy)", margin: "0.45rem 0 0" }}>{visitorName}</h2>
          <span style={{ fontSize: "0.78rem", color: "var(--vms-muted)" }}>{company}</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            background: "var(--vms-surface-2)",
            borderRadius: "12px",
            padding: "0.75rem",
            margin: "0.85rem 0",
            textAlign: "left",
            fontSize: "0.78rem",
          }}
        >
          <div>
            <span style={{ color: "var(--vms-muted)", fontSize: "0.68rem", display: "block" }}>To Meet</span>
            <span style={{ fontWeight: 800, color: "var(--vms-navy)", display: "block" }}>{hostName}</span>
            <span style={{ fontSize: "0.68rem", color: "var(--vms-muted)" }}>{department}</span>
          </div>
          <div>
            <span style={{ color: "var(--vms-muted)", fontSize: "0.68rem", display: "block" }}>Valid Until</span>
            <span style={{ fontWeight: 800, color: "var(--vms-navy)", display: "block" }}>{validUntil}</span>
          </div>
          <div>
            <span style={{ color: "var(--vms-muted)", fontSize: "0.68rem", display: "block" }}>Check-in Time</span>
            <span style={{ fontWeight: 700, color: "var(--vms-navy)" }}>{checkInTime}</span>
          </div>
          <div>
            <span style={{ color: "var(--vms-muted)", fontSize: "0.68rem", display: "block" }}>Check-in At</span>
            <span style={{ fontWeight: 700, color: "var(--vms-navy)" }}>{checkInLocation}</span>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed var(--vms-border)", paddingTop: "0.85rem", marginBottom: "0.65rem" }}>
          <img src={qrSrc} alt="Visitor QR code for ERPNext scan" width={160} height={160} style={{ margin: "0 auto", display: "block", background: "#fff", borderRadius: 12, padding: 8 }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--vms-muted)", display: "block", marginTop: "0.45rem" }}>
            Scan to open ERPNext visitor pass
          </span>
        </div>

        <div
          style={{
            background: "var(--vms-primary-soft)",
            border: "1px solid var(--vms-border)",
            borderRadius: "10px",
            padding: "0.5rem 0.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            fontSize: "0.72rem",
            color: "var(--vms-primary)",
          }}
        >
          <span>Show this QR at the security gate</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        <button
          type="button"
          className="vm-btn-primary"
          disabled={busy}
          onClick={onDownload}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
        >
          {busy ? "Preparing…" : "Download Pass"}
        </button>
        <button
          type="button"
          className="vm-btn-outline"
          disabled={busy}
          onClick={onExit}
          style={{ height: 48, borderRadius: 14 }}
        >
          Exit
        </button>
      </div>
    </div>
  );
}
