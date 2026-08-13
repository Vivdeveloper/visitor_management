import { useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { formatNowTime } from "@/lib/format";

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
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const timeLabel = toast.time || formatNowTime();

  return createPortal(
    <div className="vm-toast-overlay" role="status" aria-live="polite">
      <button
        type="button"
        className="vm-toast-glass"
        onClick={onClose}
        aria-label={`${toast.title}. ${toast.message}. Tap to dismiss.`}
      >
        <span className="vm-toast-glass-shine" aria-hidden />

        <span className="vm-toast-app-icon" aria-hidden>
          <BrandLogo variant="icon" className="vm-toast-app-icon-img" />
        </span>

        <span className="vm-toast-copy">
          <span className="vm-toast-copy-head">
            <span className="vm-toast-app-name">Precious Alloys</span>
            <span className="vm-toast-time">{timeLabel}</span>
          </span>
          <strong className="vm-toast-title">{toast.title}</strong>
          <span className="vm-toast-message">{toast.message}</span>
        </span>
      </button>
    </div>,
    document.body,
  );
}
