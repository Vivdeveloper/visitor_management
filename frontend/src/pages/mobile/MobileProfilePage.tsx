import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { frappeGetList } from "@/api/vms";
import { HeaderBar } from "@/components/common/HeaderBar";
import { ProfileHeroCard } from "@/components/profile/ProfileHeroCard";
import { SettingsGroups } from "@/components/profile/SettingsGroups";
import { ut } from "@/i18n/uiChrome";

type EmployeeRow = {
  name?: string;
  employee?: string;
  department?: string;
  designation?: string;
};

export function MobileProfilePage() {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lang } = useAppLanguage();
  const [department, setDepartment] = useState("—");
  const [employeeId, setEmployeeId] = useState(user?.user || "—");
  const [showProfileCard, setShowProfileCard] = useState(true);

  const name = user?.full_name || user?.user || "Administrator";
  const email = user?.email || user?.user || "—";
  const role = user?.vms_roles?.[0] || user?.roles?.find((r) => r !== "All" && r !== "Guest") || "Employee";
  const image = user?.user_image || undefined;

  useEffect(() => {
    setEmployeeId(user?.user || "—");
    if (!user?.user || user.user === "Guest") return;

    let cancelled = false;
    void frappeGetList<EmployeeRow>({
      doctype: "Employee",
      fields: ["name", "employee", "department", "designation"],
      filters: { user_id: user.user },
      limit_page_length: 1,
    })
      .then((rows) => {
        if (cancelled) return;
        const row = rows[0];
        if (!row) return;
        if (row.employee || row.name) setEmployeeId(row.employee || row.name || user.user || "—");
        if (row.department) setDepartment(row.department);
        else if (row.designation) setDepartment(row.designation);
      })
      .catch(() => {
        /* Employee DocType may be unavailable */
      });

    return () => {
      cancelled = true;
    };
  }, [user?.user]);

  return (
    <div className="vm-home-page">
      <HeaderBar title="Precious Alloys" showNotification showProfile />

      <main className="vm-main-body vm-page-content-start vm-profile-page">
        {showProfileCard ? (
          <ProfileHeroCard
            name={name}
            email={email}
            role={role}
            imageUrl={image}
            employeeId={employeeId}
            department={department}
          />
        ) : null}

        <SettingsGroups
          theme={theme}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
          showProfileCard={showProfileCard}
          onToggleProfileCard={() => setShowProfileCard((prev) => !prev)}
        />

        {isAuthenticated || user?.verified ? (
          <button
            type="button"
            className="vm-btn-outline vm-profile-logout"
            onClick={() => void logout()}
          >
            {ut(lang, "logout")}
          </button>
        ) : (
          <Link to="/login" className="vm-btn-primary">
            {ut(lang, "sign_in")}
          </Link>
        )}
      </main>
    </div>
  );
}
