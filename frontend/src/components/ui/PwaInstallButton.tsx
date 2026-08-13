import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallSheet } from "@/components/ui/PwaInstallSheet";
import { isNativePlatform } from "@/native/platform";

type PwaInstallButtonProps = {
  /** full = profile · compact = pill · welcome = splash · chrome = address-bar style Install */
  variant?: "full" | "compact" | "welcome" | "chrome";
  className?: string;
};

/** Chrome-like Install control (matches Frappe HR address-bar Install). */
export function PwaInstallButton({
  variant = "full",
  className = "",
}: PwaInstallButtonProps) {
  const {
    showButton,
    installed,
    install,
    ios,
    canPrompt,
    secure,
    localhostUrl,
    hintOpen,
    setHintOpen,
  } = usePwaInstall();

  if (isNativePlatform()) return null;

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
        </div>
      </div>
    );
  }

  const label =
    variant === "chrome" ? "Install" : variant === "compact" ? "Install" : "Install app";

  return (
    <>
      <button
        type="button"
        className={`pwa-install pwa-install--${variant} ${className}`.trim()}
        onClick={() => void install()}
        aria-label="Install Visitor Gate"
        title={
          secure
            ? "Install Visitor Gate"
            : "Open localhost or use HTTPS to show Chrome Install (like Frappe HR)"
        }
      >
        <span className="pwa-install-icon" aria-hidden>
          <InstallMonitorIcon />
        </span>
        {variant === "full" ? (
          <span className="pwa-install-copy">
            <strong>{label}</strong>
          </span>
        ) : (
          <span>{label}</span>
        )}
      </button>

      <PwaInstallSheet
        open={hintOpen}
        ios={ios}
        canPrompt={canPrompt}
        secure={secure}
        localhostUrl={localhostUrl}
        onClose={() => setHintOpen(false)}
        onInstall={() => void install()}
      />
    </>
  );
}

function InstallMonitorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M12 7v5" />
      <path d="m9 10 3 3 3-3" />
    </svg>
  );
}
