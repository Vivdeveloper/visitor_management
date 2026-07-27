import { useEffect } from "react";
import { createPortal } from "react-dom";

export type ErpToastData = {
  id: string;
  title: string;
  message: string;
  hostName?: string;
  time?: string;
};

type Props = {
  toast: ErpToastData | null;
  onClose: () => void;
};

export function ErpNextToast({ toast, onClose }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return createPortal(
    <div className="erp-toast-overlay" role="status" aria-live="polite">
      <div className="erp-toast-card">
        <div className="erp-toast-header">
          <div className="erp-toast-brand">
            <span className="erp-toast-logo" aria-hidden>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </span>
            <strong className="erp-toast-title">ERPNext Notification</strong>
          </div>
          <div className="erp-toast-meta">
            <span className="erp-toast-time">{toast.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <button
              type="button"
              className="erp-toast-close"
              onClick={onClose}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="erp-toast-body">
          <div className="erp-toast-icon-wrap" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div className="erp-toast-content">
            <strong className="erp-toast-msg">{toast.title}</strong>
            <p className="erp-toast-desc">{toast.message}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
