import { BrandLogo } from "@/components/ui/BrandLogo";
import { APP_BASE_PATH } from "@/config/env";
import type { AdditionalGuest } from "@/lib/additionalGuests";

interface VisitorGatePassCardProps {
  passCode?: string;
  visitorName?: string;
  /** Host / site company — shown beside the brand logo. */
  company?: string;
  /** Visitor's own company — shown in the details table. */
  visitorCompany?: string;
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
  visitorCount?: number;
  additionalGuests?: AdditionalGuest[];
  /** Hide built-in Print row when the parent modal supplies its own footer. */
  hideActions?: boolean;
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
  passCode = "VE01-00044",
  visitorName = "Visitor",
  company = "—",
  visitorCompany = "—",
  hostName = "Administrator",
  floor = "—",
  status = "Approved",
  noticeMessage,
  validUntil = "11:24 AM",
  photoUrl,
  qrPayload,
  visitorCount = 1,
  additionalGuests = [],
  hideActions = false,
  onDownload,
  onExit,
}: VisitorGatePassCardProps) {
  const scanTarget =
    qrPayload ||
    `${window.location.origin}${APP_BASE_PATH.replace(/\/$/, "")}/pass/${encodeURIComponent(passCode)}`;
  const absolute = resolveUrl(scanTarget) || scanTarget;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(absolute)}`;
  const photo = resolveUrl(photoUrl || undefined);
  const companyLabel = (company || "").trim() || "Precious Alloys";
  const visitorCompanyLabel = (visitorCompany || "").trim() || "—";
  const count = Math.max(1, Number(visitorCount) || 1);
  const showGuestNames = count > 1;
  const guestNames = [
    visitorName,
    ...additionalGuests.map((g) => g.name.trim()).filter(Boolean),
  ].filter(Boolean);
  const guestNamesLine = guestNames.map((name, index) => `${index + 1}. ${name}`).join(", ");

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
        <span className="vm-gate-pass-om">ॐ</span>
        <strong>{companyLabel}</strong>
        <span>Visitor Gate Pass</span>
      </div>

      {/* Header: logo + company name · status */}
      <div className="vm-gate-pass-header-row">
        <div className="vm-gate-pass-brand-lockup">
          <BrandLogo variant="icon" className="vm-gate-pass-logo" />
          <strong className="vm-gate-pass-company-name">{companyLabel}</strong>
        </div>
        <span className="vm-gate-pass-status-badge">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.8" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span>{(status || "APPROVED").toUpperCase()}</span>
        </span>
      </div>

      {/* Visitor Identity */}
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
            <div className="vm-gate-pass-notice-pill" role="status">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>{noticeMessage}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Details */}
      <div className="vm-gate-pass-details-table">
        <div className="vm-gate-pass-detail-row">
          <span className="vm-gate-pass-detail-label">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0a3d91" strokeWidth="2" aria-hidden>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            VISITOR&apos;S COMPANY
          </span>
          <strong className="vm-gate-pass-detail-val">{visitorCompanyLabel}</strong>
        </div>

        <div className="vm-gate-pass-detail-row">
          <span className="vm-gate-pass-detail-label">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0a3d91" strokeWidth="2" aria-hidden>
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
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0a3d91" strokeWidth="2" aria-hidden>
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
            </svg>
            FLOOR
          </span>
          <strong className="vm-gate-pass-detail-val">{floor || "—"}</strong>
        </div>

        <div className="vm-gate-pass-detail-row">
          <span className="vm-gate-pass-detail-label">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0a3d91" strokeWidth="2" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            STATUS
          </span>
          <strong className="vm-gate-pass-detail-val is-status-approved">{status || "Approved"}</strong>
        </div>

        <div className="vm-gate-pass-detail-row">
          <span className="vm-gate-pass-detail-label">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0a3d91" strokeWidth="2" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            VISITORS
          </span>
          <strong className="vm-gate-pass-detail-val">{count}</strong>
        </div>

        {showGuestNames ? (
          <div className="vm-gate-pass-detail-row is-guests">
            <span className="vm-gate-pass-detail-label">NAMES</span>
            <strong className="vm-gate-pass-detail-val vm-gate-pass-guest-names">
              {guestNamesLine || "—"}
            </strong>
          </div>
        ) : null}
      </div>

      {/* QR */}
      <div className="vm-gate-pass-qr-box">
        <div className="vm-gate-pass-qr-frame">
          <span className="corner c-tl" />
          <span className="corner c-tr" />
          <span className="corner c-bl" />
          <span className="corner c-br" />
          <img src={qrSrc} alt="Visitor Pass QR" width={120} height={120} className="vm-gate-pass-qr-img" />
        </div>

        <div className="vm-gate-pass-qr-meta">
          <span className="vm-gate-pass-qr-shield">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0a3d91" strokeWidth="2" aria-hidden>
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

      {!hideActions ? (
        <div className={`vm-gate-pass-actions-grid vm-no-print${onExit ? " has-pair" : ""}`}>
          <button type="button" className="vm-pass-act-btn is-print" onClick={handlePrint}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print</span>
          </button>
          {onExit ? (
            <button type="button" className="vm-pass-act-btn is-close" onClick={onExit}>
              <span>Close</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="vm-gate-pass-footer-note">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>Please show this pass at the gate</span>
      </div>
    </div>
  );
}
