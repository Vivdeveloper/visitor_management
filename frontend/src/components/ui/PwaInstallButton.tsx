import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallSheet } from "@/components/ui/PwaInstallSheet";

type PwaInstallButtonProps = {
  /** full = profile card · compact = pill · welcome = dark splash */
  variant?: "full" | "compact" | "welcome";
  className?: string;
};

export function PwaInstallButton({
  variant = "full",
  className = "",
}: PwaInstallButtonProps) {
  const { showButton, installed, install, ios, canPrompt, hintOpen, setHintOpen } =
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
        ) : (
          <span className="pwa-install-copy">
            <strong>Download App</strong>
          </span>
        )}
      </button>

      <PwaInstallSheet
        open={hintOpen}
        ios={ios}
        canPrompt={canPrompt}
        onClose={() => setHintOpen(false)}
        onInstall={() => void install()}
      />
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
