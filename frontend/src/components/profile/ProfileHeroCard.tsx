import { initials } from "@/lib/format";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { ut } from "@/i18n/uiChrome";

interface ProfileHeroCardProps {
  name?: string;
  role?: string;
  email?: string;
  employeeId?: string;
  department?: string;
  imageUrl?: string;
}

export function ProfileHeroCard({
  name = "Administrator",
  role = "Employee",
  email = "—",
  employeeId = "—",
  department = "—",
  imageUrl,
}: ProfileHeroCardProps) {
  const { lang } = useAppLanguage();
  const avatarInitials = initials(name);

  return (
    <div className="vm-profile-card">
      <div className="vm-profile-card-top">
        <div className="vm-profile-avatar-wrap">
          {imageUrl ? (
            <img
              src={imageUrl.startsWith("http") || imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}
              alt={name}
              className="vm-profile-avatar-img"
            />
          ) : (
            <div className="vm-profile-avatar-fallback">
              <span>{avatarInitials || "AD"}</span>
            </div>
          )}
        </div>
        <div className="vm-profile-card-copy">
          <h2 className="vm-profile-name">{name}</h2>
          <span className="vm-profile-role">{role}</span>
        </div>
      </div>

      <dl className="vm-profile-fields">
        <div className="vm-profile-field">
          <dt>{ut(lang, "employee_id")}</dt>
          <dd>{employeeId || "—"}</dd>
        </div>
        <div className="vm-profile-field">
          <dt>{ut(lang, "email")}</dt>
          <dd>{email || "—"}</dd>
        </div>
        <div className="vm-profile-field">
          <dt>{ut(lang, "department")}</dt>
          <dd>{department || "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
