import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ThemeMode } from "@/context/ThemeContext";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ut } from "@/i18n/uiChrome";

type SettingsGroupsProps = {
  theme?: ThemeMode;
  onToggleTheme?: () => void;
};

type GroupId = "account" | "appearance" | "tools";

function SettingsGroup({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: GroupId;
  title: string;
  open: boolean;
  onToggle: (id: GroupId) => void;
  children: ReactNode;
}) {
  return (
    <section className={`vm-settings-group vm-settings-group--interactive${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="vm-settings-group-head"
        aria-expanded={open}
        onClick={() => onToggle(id)}
      >
        <span>{title}</span>
        <span className="vm-settings-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? <div className="vm-settings-group-body">{children}</div> : null}
    </section>
  );
}

function SettingsRow({
  label,
  value,
  to,
  onClick,
}: {
  label: string;
  value?: string;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="vm-settings-row-label">{label}</span>
      <span className="vm-settings-row-trail">
        {value ? <span className="vm-settings-row-value">{value}</span> : null}
        <span aria-hidden>›</span>
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="vm-settings-row">
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className="vm-settings-row" onClick={onClick}>
      {inner}
    </button>
  );
}

export function SettingsGroups({ theme = "light", onToggleTheme }: SettingsGroupsProps) {
  const { lang } = useAppLanguage();
  const [openGroups, setOpenGroups] = useState<Record<GroupId, boolean>>({
    account: true,
    appearance: true,
    tools: true,
  });

  function toggle(id: GroupId) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="vm-settings-stack">
      <SettingsGroup id="account" title={ut(lang, "account")} open={openGroups.account} onToggle={toggle}>
        <SettingsRow label={ut(lang, "profile")} />
      </SettingsGroup>

      <SettingsGroup id="appearance" title={ut(lang, "appearance")} open={openGroups.appearance} onToggle={toggle}>
        <SettingsRow
          label={ut(lang, "theme")}
          value={theme === "dark" ? ut(lang, "dark") : ut(lang, "light")}
          onClick={onToggleTheme}
        />
        <LanguageSwitcher variant="settings" />
      </SettingsGroup>

      <SettingsGroup id="tools" title={ut(lang, "tools")} open={openGroups.tools} onToggle={toggle}>
        <SettingsRow label={ut(lang, "calendar_view")} to="/meetings" />
      </SettingsGroup>
    </div>
  );
}
