import { useAuth } from "@/context/AuthContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { useHostAlerts } from "@/context/HostAlertContext";
import { useAlertPermissionStatus } from "@/hooks/useAlertPermissionStatus";
import { ut } from "@/i18n/uiChrome";
import { resolveMode } from "@/lib/roles";
import { notificationPermissionState } from "@/native/services/notifications";

type Props = {
  variant: "popup" | "settings";
  onAction?: () => void;
};

export function NotificationSetupPrompt({ variant, onAction }: Props) {
  const { user } = useAuth();
  const { lang } = useAppLanguage();
  const { openPermissionSetup } = useHostAlerts();
  const { ready, loading } = useAlertPermissionStatus();
  const mode = resolveMode(user);
  const denied = notificationPermissionState() === "denied";

  if (loading || ready || (mode !== "host" && mode !== "security") || !user?.user) {
    return null;
  }

  function onSetup() {
    onAction?.();
    openPermissionSetup();
  }

  if (variant === "popup") {
    return (
      <button type="button" className="vm-profile-popup-setup" onClick={onSetup}>
        <span className="vm-profile-popup-setup-icon" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
        <span className="vm-profile-popup-setup-copy">
          <strong>{ut(lang, "setup_alerts")}</strong>
          <span>{denied ? ut(lang, "setup_alerts_denied") : ut(lang, "setup_alerts_hint")}</span>
        </span>
      </button>
    );
  }

  return (
    <button type="button" className="vm-settings-row vm-settings-row--setup" onClick={onSetup}>
      <span className="vm-settings-row-label">{ut(lang, "setup_alerts")}</span>
      <span className="vm-settings-row-trail">
        <span className="vm-settings-row-badge">{ut(lang, "required")}</span>
        <span aria-hidden>›</span>
      </span>
    </button>
  );
}
