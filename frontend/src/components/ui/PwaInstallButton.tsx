import { usePwaInstall } from "@/hooks/usePwaInstall";

type PwaInstallButtonProps = {
  /** full = profile card · compact = pill · welcome = dark splash */
  variant?: "full" | "compact" | "welcome";
  className?: string;
};

export function PwaInstallButton({
  variant = "full",
  className = "",
}: PwaInstallButtonProps) {
  const { showButton, installed, install, ios, hintOpen, setHintOpen } =
    usePwaInstall();

  if (installed && variant !== "full") {
    return null;
  }

  if (!showButton && !installed) {
    return null;
  }

  if (installed && variant === "full") {
    return (
      <div className={`pwa-install pwa-install--full pwa-install--done ${className}`.trim()}>
        <span className="pwa-install-icon" aria-hidden>
          ✓
        </span>
        <div className="pwa-install-copy">
          <strong>App installed</strong>
          <span>Precious Alloys VMS is on your home screen</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`pwa-install pwa-install--${variant} ${className}`.trim()}
        onClick={() => void install()}
      >
        <span className="pwa-install-icon" aria-hidden>
          <DownloadIcon />
        </span>
        {variant === "compact" ? (
          <span>Download App</span>
        ) : variant === "welcome" ? (
          <span className="pwa-install-copy">
            <strong>Download App</strong>
          </span>
        ) : (
          <span className="pwa-install-copy">
            <strong>Download App</strong>
            <span>
              {ios
                ? "Add Precious Alloys VMS to your Home Screen"
                : "Install for offline access & faster launch"}
            </span>
          </span>
        )}
      </button>

      {hintOpen ? (
        <div
          className="pwa-ios-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          onClick={() => setHintOpen(false)}
        >
          <div
            className="pwa-ios-sheet-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="pwa-install-title">
              {ios ? "Install on iPhone" : "Install this app"}
            </h3>
            {ios ? (
              <ol>
                <li>
                  Tap the <strong>Share</strong> button{" "}
                  <span aria-hidden className="pwa-ios-share">
                    ⎋
                  </span>
                </li>
                <li>
                  Scroll and tap <strong>Add to Home Screen</strong>
                </li>
                <li>
                  Tap <strong>Add</strong> to install Precious Alloys VMS
                </li>
              </ol>
            ) : (
              <ol>
                <li>
                  Open the browser menu (<strong>⋮</strong> or <strong>⋯</strong>)
                </li>
                <li>
                  Tap <strong>Install app</strong> / <strong>Add to Home screen</strong>
                </li>
                <li>Confirm to add Precious Alloys VMS</li>
              </ol>
            )}
            <button
              type="button"
              className="pwa-ios-sheet-close"
              onClick={() => setHintOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
