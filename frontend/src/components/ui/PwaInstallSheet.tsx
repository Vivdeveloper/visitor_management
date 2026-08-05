import { createPortal } from "react-dom";
import { BrandLogo } from "@/components/ui/BrandLogo";

type PwaInstallSheetProps = {
  open: boolean;
  ios: boolean;
  canPrompt: boolean;
  onClose: () => void;
  onInstall: () => void;
};

export function PwaInstallSheet({
  open,
  ios,
  canPrompt,
  onClose,
  onInstall,
}: PwaInstallSheetProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pwa-install-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <button type="button" className="pwa-install-sheet-backdrop" onClick={onClose} aria-label="Close" />

      <div className="pwa-install-sheet-card">
        <div className="pwa-install-sheet-handle" aria-hidden />

        <div className="pwa-install-sheet-brand">
          <BrandLogo variant="icon" className="pwa-install-sheet-logo" />
          <div className="pwa-install-sheet-brand-copy">
            <strong>Precious Alloys</strong>
            <span>Visitor Management</span>
          </div>
        </div>

        <h3 id="pwa-install-title" className="pwa-install-sheet-title">
          {ios ? "Add to Home Screen" : canPrompt ? "Install this app" : "Add to Home Screen"}
        </h3>
        <p className="pwa-install-sheet-sub">
          {canPrompt
            ? "Install Precious Alloys VMS for faster access and desktop-style alerts."
            : ios
              ? "Add this app to your Home Screen for a full-screen experience."
              : "Install from your browser menu so the app opens like a native app."}
        </p>

        {canPrompt ? (
          <button type="button" className="pwa-install-sheet-primary" onClick={onInstall}>
            Install app
          </button>
        ) : (
          <ol className="pwa-install-sheet-steps">
            {ios ? (
              <>
                <li>
                  <span className="pwa-install-step-num">1</span>
                  <span>
                    Tap <strong>Share</strong>{" "}
                    <span aria-hidden className="pwa-ios-share">
                      ⎋
                    </span>{" "}
                    in Safari
                  </span>
                </li>
                <li>
                  <span className="pwa-install-step-num">2</span>
                  <span>
                    Tap <strong>Add to Home Screen</strong>
                  </span>
                </li>
                <li>
                  <span className="pwa-install-step-num">3</span>
                  <span>
                    Tap <strong>Add</strong> to finish
                  </span>
                </li>
              </>
            ) : (
              <>
                <li>
                  <span className="pwa-install-step-num">1</span>
                  <span>
                    Open the browser menu (<strong>⋮</strong> or <strong>⋯</strong>)
                  </span>
                </li>
                <li>
                  <span className="pwa-install-step-num">2</span>
                  <span>
                    Tap <strong>Install app</strong> / <strong>Add to Home screen</strong>
                  </span>
                </li>
                <li>
                  <span className="pwa-install-step-num">3</span>
                  <span>Confirm to add Precious Alloys VMS</span>
                </li>
              </>
            )}
          </ol>
        )}

        <button type="button" className="pwa-install-sheet-secondary" onClick={onClose}>
          {canPrompt ? "Not now" : "Got it"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
