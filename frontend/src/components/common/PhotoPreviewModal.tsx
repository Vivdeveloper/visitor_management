import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type PhotoPreviewModalProps = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

export function PhotoPreviewModal({ src, alt = "Photo preview", onClose }: PhotoPreviewModalProps) {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (!src) return;
    setIsLandscape(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [src, onClose]);

  if (!src) return null;

  return createPortal(
    <div className="vm-confirm-modal-root" role="dialog" aria-modal="true" aria-label="Photo preview">
      <button
        type="button"
        className="vm-confirm-modal-backdrop"
        onClick={onClose}
        aria-label="Close photo preview"
      />
      <div
        className={`vm-confirm-modal-card vm-photo-preview-modal${isLandscape ? " is-landscape" : ""}`}
      >
        <button type="button" className="vm-confirm-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div className="vm-photo-preview-frame">
          <div className="vm-photo-preview-viewport">
            <img
              src={src}
              alt={alt}
              className="vm-photo-preview-modal-img"
              decoding="async"
              onLoad={(event) => {
                const img = event.currentTarget;
                setIsLandscape(img.naturalWidth > img.naturalHeight * 1.1);
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
