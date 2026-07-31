import { BrandLogo } from "@/components/ui/BrandLogo";
import { APP_BASE_PATH } from "@/config/env";

interface VisitorGatePassCardProps {
  passCode?: string;
  visitorName?: string;
  company?: string;
  hostName?: string;
  department?: string;
  floor?: string;
  status?: string;
  noticeMessage?: string;
  validUntil?: string;
  checkInTime?: string;
  checkInLocation?: string;
  photoUrl?: string | null;
  qrPayload?: string;
  busy?: boolean;
  onDownload?: () => void;
  onShare?: () => void;
  onExit?: () => void;
}

function resolveUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path;
  if (path.startsWith("/")) return `${window.location.origin}${path}`;
  return `${window.location.origin}/${path}`;
}

export function VisitorGatePassCard({
  passCode = "VE01-00044",
  visitorName = "nikhil",
  hostName = "Administrator",
  floor = "—",
  status = "Approved",
  noticeMessage = "Pass not valid for status: Approved",
  validUntil = "11:24 AM",
  photoUrl,
  qrPayload,
  onDownload,
  onShare,
}: VisitorGatePassCardProps) {
  const scanTarget =
    qrPayload ||
    `${window.location.origin}${APP_BASE_PATH.replace(/\/$/, "")}/pass/${encodeURIComponent(passCode)}`;
  const absolute = resolveUrl(scanTarget) || scanTarget;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(absolute)}`;
  const photo = resolveUrl(photoUrl || undefined);

  function handleShare() {
    if (onShare) {
      onShare();
      return;
    }
    if (navigator.share) {
      void navigator.share({ title: `Gate Pass - ${visitorName}`, url: absolute });
    } else {
      void navigator.clipboard?.writeText(absolute);
    }
  }

  function handlePrint() {
    if (onDownload) {
      onDownload();
      return;
    }
    window.print();
  }

  return (
    <div className="vm-gate-pass-card-root" id="vms-gate-pass-print">
      <div className="vm-gate-pass-print-banner vm-print-only" aria-hidden>
        <strong>Precious Alloy Components Pvt. Ltd.</strong>
        <span>Visitor Gate Pass</span>
      </div>

      {/* Header Row: Logo & Status Badge */}
      <div className="vm-gate-pass-header-row">
        <BrandLogo variant="icon" className="vm-gate-pass-logo" />
        <span className="vm-gate-pass-status-badge">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.8" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span>{(status || "APPROVED").toUpperCase()}</span>
        </span>
      </div>

      {/* Visitor Identity Header */}
      <div className="vm-gate-pass-identity-row">
        {photo ? (
          <img src={photo} alt={visitorName} className="vm-gate-pass-photo" />
        ) : (
          <div className="vm-gate-pass-avatar">
            <BrandLogo variant="icon" className="vm-gate-pass-avatar-icon" />
          </div>
        )}
        <div className="vm-gate-pass-identity-info">
          <h2 className="vm-gate-pass-visitor-name">{visitorName}</h2>
          {noticeMessage ? (
            <div className="vm-gate-pass-notice-pill" role="alert">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
              <span>{noticeMessage}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Details Box */}
      <div className="vm-gate-pass-details-table">
        <div className="vm-gate-pass-detail-row">
          <span className="vm-gate-pass-detail-label">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            MEETING WITH
          </span>
          <strong className="vm-gate-pass-detail-val">{hostName}</strong>
        </div>

        <div className="vm-gate-pass-detail-row">
          <span className="vm-gate-pass-detail-label">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" aria-hidden>
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
            </svg>
            FLOOR
          </span>
          <strong className="vm-gate-pass-detail-val">{floor || "—"}</strong>
        </div>

        <div className="vm-gate-pass-detail-row">
          <span className="vm-gate-pass-detail-label">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            STATUS
          </span>
          <strong className="vm-gate-pass-detail-val is-status-approved">{status || "Approved"}</strong>
        </div>
      </div>

      {/* QR Code Frame Container */}
      <div className="vm-gate-pass-qr-box">
        <div className="vm-gate-pass-qr-frame">
          <span className="corner c-tl" />
          <span className="corner c-tr" />
          <span className="corner c-bl" />
          <span className="corner c-br" />
          <img src={qrSrc} alt="Visitor Pass QR" width={200} height={200} className="vm-gate-pass-qr-img" />
        </div>

        <div className="vm-gate-pass-qr-meta">
          <span className="vm-gate-pass-qr-shield">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <div className="vm-gate-pass-qr-text">
            <strong>Pass no. {passCode}</strong>
            {validUntil ? <span>Valid till {validUntil}</span> : null}
          </div>
        </div>
      </div>

      {/* Action Buttons — screen only, never printed */}
      <div className="vm-gate-pass-actions-grid vm-no-print">
        <button type="button" className="vm-pass-act-btn is-share" onClick={handleShare}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Share</span>
        </button>

        <button type="button" className="vm-pass-act-btn is-print" onClick={handlePrint}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          <span>Print</span>
        </button>
      </div>

      {/* Footer Note */}
      <div className="vm-gate-pass-footer-note">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>Please show this pass at the gate</span>
      </div>
    </div>
  );
}
