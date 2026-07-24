import { useState } from "react";
import { initials } from "@/lib/format";

interface ProfileHeroCardProps {
  name?: string;
  role?: string;
  email?: string;
  mobile?: string;
  status?: string;
  imageUrl?: string;
  erpnextUser?: string;
  rolesList?: string[];
}

export function ProfileHeroCard({
  name = "Administrator",
  role = "Employee",
  email = "admin@example.com",
  mobile,
  status = "Active",
  imageUrl,
  erpnextUser = "Administrator",
  rolesList = ["System Manager", "Security", "Employee"],
}: ProfileHeroCardProps) {
  const [expanded, setExpanded] = useState(false);
  const avatarInitials = initials(name);

  const displayRoles = expanded ? rolesList : rolesList.slice(0, 3);
  const hiddenCount = rolesList.length - 3;

  return (
    <div className="vm-visiting-card">
      <div className="vm-visiting-card-top">
        <div className="vm-visiting-avatar-wrap">
          {imageUrl ? (
            <img
              src={imageUrl.startsWith("http") || imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}
              alt={name}
              className="vm-visiting-avatar-img"
            />
          ) : (
            <div className="vm-visiting-avatar-fallback">
              <span>{avatarInitials || "AD"}</span>
            </div>
          )}
          <span className="vm-visiting-status-dot" title={status} />
        </div>

        <div className="vm-visiting-info">
          <div className="vm-visiting-name-row">
            <h2 className="vm-visiting-name">{name}</h2>
            <span className="vm-visiting-status-badge">{status}</span>
          </div>

          <span className="vm-visiting-title">{role}</span>

          <div className="vm-visiting-contacts">
            {email && email !== "—" && (
              <span className="vm-visiting-contact-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {email}
              </span>
            )}
            {mobile && mobile !== "—" && (
              <span className="vm-visiting-contact-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {mobile}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="vm-visiting-footer">
        <div className="vm-visiting-erp-row">
          <span className="vm-visiting-label">ERPNext Account</span>
          <strong className="vm-visiting-username">{erpnextUser || name}</strong>
        </div>

        {rolesList && rolesList.length > 0 && (
          <div className="vm-visiting-roles-row">
            <span className="vm-visiting-label">Roles</span>
            <div className="vm-visiting-chips">
              {displayRoles.map((roleName) => (
                <span key={roleName} className="vm-visiting-chip">
                  {roleName}
                </span>
              ))}
              {hiddenCount > 0 && !expanded && (
                <button
                  type="button"
                  className="vm-visiting-chip-more"
                  onClick={() => setExpanded(true)}
                  aria-label={`Show ${hiddenCount} more roles`}
                >
                  +{hiddenCount} more
                </button>
              )}
              {expanded && rolesList.length > 3 && (
                <button
                  type="button"
                  className="vm-visiting-chip-more"
                  onClick={() => setExpanded(false)}
                  aria-label="Collapse roles"
                >
                  Show less
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
