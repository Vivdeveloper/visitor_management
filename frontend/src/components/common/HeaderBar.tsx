import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  dashboardApi,
  type DashboardQueueItem,
  type VisitorListRow,
} from "@/api/vms";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { IconBell, IconMenuMore } from "@/components/ui/MobileIcons";
import { PendingApprovalSheet } from "@/components/visitors/PendingApprovalSheet";
import { formatTime, initials } from "@/lib/format";

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotification?: boolean;
  showProfile?: boolean;
}

type PopupKind = "none" | "profile" | "notifications";

function resolveUserImage(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("blob:")) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

function toVisitorRow(item: DashboardQueueItem): VisitorListRow {
  return {
    name: item.name,
    full_name: item.full_name,
    mobile: item.mobile,
    status: item.status || "Pending Approval",
    person_to_meet_name: item.person_to_meet_name || item.host_name,
    floor: item.floor,
    check_in: item.check_in,
    checked_in_on: item.checked_in_on,
  };
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
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [popup, setPopup] = useState<PopupKind>("none");
  const [pending, setPending] = useState<DashboardQueueItem[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [actionVisitor, setActionVisitor] = useState<VisitorListRow | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  const photo = resolveUserImage(user?.user_image);
  const displayName = user?.full_name || user?.user || "User";

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const list = await dashboardApi.getPendingApprovals();
      setPending(list || []);
    } catch {
      setPending([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  useEffect(() => {
    if (popup === "notifications") void loadPending();
  }, [popup, loadPending]);

  useVmsRealtime(() => {
    void loadPending();
  }, true);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setPopup("none");
    }
    if (popup !== "none") {
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }
  }, [popup]);

  const pendingCount = pending.length;

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
          {showNotification ? (
            <div className="vm-topbar-popwrap">
              <button
                type="button"
                className={`vm-bell-btn${popup === "notifications" ? " is-open" : ""}`}
                onClick={() => setPopup((p) => (p === "notifications" ? "none" : "notifications"))}
                aria-label="Notifications"
                aria-expanded={popup === "notifications"}
              >
                <IconBell size={18} />
                {pendingCount > 0 ? <span className="vm-bell-dot" aria-hidden /> : null}
              </button>

              {popup === "notifications" ? (
                <div className="vm-topbar-popup vm-notif-popup" role="dialog" aria-label="Notifications">
                  <div className="vm-topbar-popup-head">
                    <strong>Pending Approvals</strong>
                    <span className="vm-topbar-popup-count">{pendingLoading ? "…" : pendingCount}</span>
                  </div>
                  <div className="vm-notif-list">
                    {pendingLoading ? (
                      <p className="vm-empty-hint">Loading live queue…</p>
                    ) : pending.length === 0 ? (
                      <p className="vm-empty-hint">No pending approvals</p>
                    ) : (
                      pending.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          className="vm-notif-row"
                          onClick={() => {
                            setActionVisitor(toVisitorRow(item));
                            setPopup("none");
                          }}
                        >
                          <div className="vm-activity-avatar avatar-orange" style={{ width: 34, height: 34, fontSize: "0.72rem" }}>
                            {initials(item.full_name || item.name)}
                          </div>
                          <div className="vm-notif-copy">
                            <strong>{item.full_name || item.name}</strong>
                            <span>{item.person_to_meet_name || item.host_name || "Awaiting assignment"}</span>
                          </div>
                          <span className="vm-notif-time">
                            {formatTime(item.check_in || item.checked_in_on || item.modified) || "—"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    className="vm-topbar-popup-link"
                    onClick={() => {
                      setPopup("none");
                      navigate("/inside?status=pending");
                    }}
                  >
                    Open visitors queue ›
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

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
                <div className="vm-topbar-popup vm-profile-popup" role="dialog" aria-label="Profile">
                  <div className="vm-profile-popup-user">
                    <div className="vm-avatar-btn is-static">
                      {photo ? (
                        <img src={photo} alt="" className="vm-avatar-img" />
                      ) : (
                        <span className="vm-avatar-fallback">{initials(displayName)}</span>
                      )}
                    </div>
                    <div>
                      <strong>{displayName}</strong>
                      <span>{user?.email || user?.user || "Signed in"}</span>
                    </div>
                  </div>

                  <div className="vm-profile-popup-row">
                    <span>Theme</span>
                    <button
                      type="button"
                      className={`vm-theme-toggle${theme === "dark" ? " is-dark" : ""}`}
                      onClick={toggleTheme}
                      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                    >
                      <span className="vm-theme-toggle-knob" />
                      <span className="vm-theme-toggle-label">{theme === "dark" ? "Dark" : "Light"}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="vm-profile-popup-settings"
                    onClick={() => {
                      setPopup("none");
                      navigate("/profile");
                    }}
                  >
                    Settings
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {actionVisitor ? (
        <PendingApprovalSheet
          visitor={actionVisitor}
          open
          onClose={() => setActionVisitor(null)}
          onDone={() => void loadPending()}
          onViewDetails={() => {
            const name = actionVisitor.name;
            setActionVisitor(null);
            navigate(`/visitor/${encodeURIComponent(name)}`);
          }}
        />
      ) : null}
    </header>
  );
}
