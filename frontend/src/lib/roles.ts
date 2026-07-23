import type { AuthProfile } from "@/api/vms";

export type VmsMode = "host" | "security" | "visitor" | "guest";

const SECURITY_ROLES = new Set(["System Manager", "Security", "Reception", "VMS Admin"]);
const HOST_ROLES = new Set([
  "System Manager",
  "Employee",
  "VMS Admin",
  "Facility Manager",
  "Building Manager",
  "HR",
]);

export function resolveMode(user: AuthProfile | null): VmsMode {
  if (!user) return "guest";

  if (user.session_type === "visitor" || (!user.authenticated && user.verified)) {
    return "visitor";
  }

  const roles = new Set([...(user.roles || []), ...(user.vms_roles || [])]);
  const isSecurity = [...roles].some((r) => SECURITY_ROLES.has(r));
  const isHost = [...roles].some((r) => HOST_ROLES.has(r));

  if (isSecurity) return "security";
  if (isHost || user.authenticated) return "host";
  if (user.verified) return "visitor";
  return "guest";
}

export type MobileTab = {
  to: string;
  label: string;
  icon: "home" | "approvals" | "gate" | "pass" | "profile";
};

export function mobileTabsFor(mode: VmsMode): MobileTab[] {
  switch (mode) {
    case "security":
      return [
        { to: "/m", label: "Home", icon: "home" },
        { to: "/m/approvals", label: "Approvals", icon: "approvals" },
        { to: "/m/gate", label: "Gate", icon: "gate" },
        { to: "/m/pass", label: "Pass", icon: "pass" },
        { to: "/m/profile", label: "Profile", icon: "profile" },
      ];
    case "host":
      return [
        { to: "/m", label: "Home", icon: "home" },
        { to: "/m/approvals", label: "Approvals", icon: "approvals" },
        { to: "/m/pass", label: "Pass", icon: "pass" },
        { to: "/m/profile", label: "Profile", icon: "profile" },
      ];
    case "visitor":
      return [
        { to: "/m", label: "Home", icon: "home" },
        { to: "/m/pass", label: "Pass", icon: "pass" },
        { to: "/m/profile", label: "Profile", icon: "profile" },
      ];
    case "guest":
      return [
        { to: "/m", label: "Home", icon: "home" },
        { to: "/m/profile", label: "Profile", icon: "profile" },
      ];
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
