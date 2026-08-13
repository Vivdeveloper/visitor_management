import { createPortal } from "react-dom";
import { BrandLogo } from "@/components/ui/BrandLogo";

type PwaInstallSheetProps = {
  open: boolean;
  ios: boolean;
  canPrompt: boolean;
  /** False on http://site-name — Chrome will not show address-bar Install (unlike HTTPS HRMS). */
  secure?: boolean;
  localhostUrl?: string;
  onClose: () => void;
  onInstall: () => void;
};

/** HRMS-style install sheet for Visitor Gate PWA (`/vms`). */
export function PwaInstallSheet({
  open,
  ios,
  canPrompt,
  secure = true,
  localhostUrl = "http://localhost:8001/vms/",
  onClose,
  onInstall,
}: PwaInstallSheetProps) {
  if (!open || typeof document === "undefined") return null;

  const needsSecureHost = !secure && !ios;

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
            <strong>Visitor Gate</strong>
            <span>Precious Alloy Components</span>
          </div>
        </div>

        <h3 id="pwa-install-title" className="pwa-install-sheet-title">
          {needsSecureHost
            ? "Enable Chrome Install"
            : ios
              ? "Add Visitor Gate to Home Screen"
              : canPrompt
                ? "Install Visitor Gate"
                : "Add to Home Screen"}
        </h3>

        {needsSecureHost ? (
          <>
            <p className="pwa-install-sheet-sub">
              Chrome shows the address-bar <strong>Install</strong> button only on{" "}
              <strong>HTTPS</strong> (like Frappe HR) or <strong>localhost</strong>. This page is
              marked Not Secure, so Install is hidden.
            </p>
            <ol className="pwa-install-sheet-steps">
              <li>
                <span className="pwa-install-step-num">1</span>
                <span>
                  Open this URL (secure for Chrome):
                  <br />
                  <a className="pwa-install-link" href={localhostUrl}>
                    {localhostUrl}
                  </a>
                </span>
              </li>
              <li>
                <span className="pwa-install-step-num">2</span>
                <span>
                  Look for <strong>Install</strong> in the address bar (same as Frappe HR)
                </span>
              </li>
              <li>
                <span className="pwa-install-step-num">3</span>
                <span>On production, use HTTPS — Install appears automatically</span>
              </li>
            </ol>
            <a className="pwa-install-sheet-primary" href={localhostUrl}>
              Open localhost Install link
            </a>
          </>
        ) : (
          <>
            <p className="pwa-install-sheet-sub">
              {canPrompt
                ? "Get Visitor Gate on your device for faster gate check-in, host alerts, and a full-screen app experience."
                : ios
                  ? "Add Visitor Gate to your Home Screen for easy access and a better experience."
                  : "Install from your browser menu so Visitor Gate opens like a native app."}
            </p>

            {canPrompt ? (
              <button type="button" className="pwa-install-sheet-primary" onClick={onInstall}>
                Install
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
                      <span>Confirm to add Visitor Gate</span>
                    </li>
                  </>
                )}
              </ol>
            )}
          </>
        )}

        <button type="button" className="pwa-install-sheet-secondary" onClick={onClose}>
          {canPrompt || needsSecureHost ? "Not now" : "Got it"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
