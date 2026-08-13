import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi, notificationApi, visitorApi } from "@/api/vms";
import { useAuth } from "@/context/AuthContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { PwaAppUpdateButton } from "@/components/ui/PwaAppUpdateButton";
import { NotificationSetupPrompt } from "@/components/alerts/NotificationSetupPrompt";
import { IconBell, IconMenuMore } from "@/components/ui/MobileIcons";
import { initials } from "@/lib/format";
import { ut } from "@/i18n/uiChrome";
import { hasCapability, userHostScopeFilters } from "@/lib/roles";

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotification?: boolean;
  showProfile?: boolean;
}

type PopupKind = "none" | "profile";

function resolveUserImage(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("blob:")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export function HeaderBar({
  title = "Precious Alloys",
  subtitle = "MAIN GATE DESK",
  showBack = false,
  onBack,
  showNotification = true,
  showProfile = true,
}: HeaderBarProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { lang } = useAppLanguage();
  const [popup, setPopup] = useState<PopupKind>("none");
  const [pendingCount, setPendingCount] = useState(0);
  const rootRef = useRef<HTMLElement>(null);

  const photo = resolveUserImage(user?.user_image);
  const displayName = user?.full_name || user?.user || "User";
  const canSeeNotifications = hasCapability(user, "notifications");

  const loadPendingCount = useCallback(async () => {
    // Skip while signed out — Frappe answers guest calls with a server error.
    if (authLoading || !isAuthenticated || !canSeeNotifications) {
      setPendingCount(0);
      return;
    }
    try {
      // Same source as Pending tab / Notifications page — avoid empty dashboard queue misses.
      const [list, alerts] = await Promise.all([
        visitorApi.listDetailed(200, userHostScopeFilters(user)),
        notificationApi.list(40).catch(() => []),
      ]);
      const pending = (list || []).filter(
        (row) => row.status === "Pending Approval" || row.status === "Pending",
      ).length;
      const unreadAlerts = (alerts || []).filter((row) => !row.read).length;
      setPendingCount(pending + unreadAlerts);
    } catch {
      try {
        const list = await dashboardApi.getPendingApprovals();
        setPendingCount(list?.length || 0);
      } catch {
        setPendingCount(0);
      }
    }
  }, [authLoading, isAuthenticated, canSeeNotifications, user]);

  useEffect(() => {
    void loadPendingCount();
  }, [loadPendingCount]);

  useVmsRealtime(() => {
    void loadPendingCount();
  }, isAuthenticated);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!rootRef.current || !target) return;
      if (target instanceof Element && target.closest(".vm-lang-confirm-root")) return;
      if (!rootRef.current.contains(target)) setPopup("none");
    }
    if (popup !== "none") {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [popup]);

  return (
    <header className="vm-topbar" ref={rootRef}>
      <div className="vm-topbar-inner">
        <div className="vm-topbar-brand">
          {showBack ? (
            <button
              type="button"
              className="vm-back-btn"
              onClick={onBack || (() => navigate(-1))}
              aria-label="Go back"
            >
              ‹
            </button>
          ) : (
            <>
              <button
                type="button"
                className="vm-topbar-menu-btn"
                onClick={() => navigate("/profile")}
                aria-label="More options"
                title="More options"
              >
                <IconMenuMore size={20} />
              </button>
              <BrandLogo variant="icon" className="vm-topbar-logo" />
            </>
          )}
          <div className="vm-topbar-titles">
            <h1 className="vm-topbar-title">{title}</h1>
            <span className="vm-topbar-subtitle">{subtitle}</span>
          </div>
        </div>

        <div className="vm-topbar-actions">
          {showNotification && canSeeNotifications ? (
            <button
              type="button"
              className="vm-bell-btn"
              onClick={() => navigate("/notifications")}
              aria-label="Notifications"
            >
              <IconBell size={18} />
              {pendingCount > 0 ? <span className="vm-bell-dot" aria-hidden /> : null}
            </button>
          ) : null}

          <LanguageSwitcher variant="icon" />

          {showProfile ? (
            <div className="vm-topbar-popwrap">
              <button
                type="button"
                className={`vm-avatar-btn${popup === "profile" ? " is-open" : ""}`}
                onClick={() => setPopup((p) => (p === "profile" ? "none" : "profile"))}
                aria-label="Profile menu"
                aria-expanded={popup === "profile"}
              >
                {photo ? (
                  <img src={photo} alt="" className="vm-avatar-img" />
                ) : (
                  <span className="vm-avatar-fallback">{initials(displayName)}</span>
                )}
              </button>

              {popup === "profile" ? (
                <>
                  <button
                    type="button"
                    className="vm-topbar-popup-scrim"
                    aria-label="Close profile menu"
                    onClick={() => setPopup("none")}
                  />
                  <div className="vm-topbar-popup vm-profile-popup" role="dialog" aria-label="Profile">
                    <div className="vm-profile-popup-user">
                      <div className="vm-avatar-btn is-static">
                        {photo ? (
                          <img src={photo} alt="" className="vm-avatar-img" />
                        ) : (
                          <span className="vm-avatar-fallback">{initials(displayName)}</span>
                        )}
                      </div>
                      <div className="vm-profile-popup-user-copy">
                        <strong>{displayName}</strong>
                        <span>{user?.email || user?.user || "Signed in"}</span>
                      </div>
                    </div>

                    <NotificationSetupPrompt variant="popup" onAction={() => setPopup("none")} />

                    <PwaAppUpdateButton variant="popup" onStarted={() => setPopup("none")} />

                    <button
                      type="button"
                      className="vm-profile-popup-action"
                      onClick={() => {
                        setPopup("none");
                        navigate("/meetings");
                      }}
                      aria-label={ut(lang, "calendar_view")}
                    >
                      <span className="vm-profile-popup-action-icon" aria-hidden>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <path d="M16 3v4M8 3v4M3 11h18" />
                        </svg>
                      </span>
                      <span className="vm-profile-popup-action-copy">
                        <strong>{ut(lang, "calendar_view")}</strong>
                        <span>{ut(lang, "todays_schedule")}</span>
                      </span>
                      <span className="vm-profile-popup-action-trail" aria-hidden>›</span>
                    </button>

                    <button
                      type="button"
                      className="vm-profile-popup-settings"
                      onClick={() => {
                        setPopup("none");
                        navigate("/profile");
                      }}
                    >
                      {ut(lang, "settings")}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
