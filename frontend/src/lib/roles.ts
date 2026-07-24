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
  icon: "home" | "checkin" | "scan" | "inside" | "history" | "pass" | "reports" | "more" | "approvals";
  fab?: boolean;
};

export function mobileTabsFor(_mode: VmsMode): MobileTab[] {
  return [
    { to: "/", label: "Home", icon: "home" },
    { to: "/inside", label: "Visitors", icon: "inside" },
    { to: "/check-in", label: "Add Entry", icon: "checkin", fab: true },
    { to: "/approvals", label: "Pending", icon: "approvals" },
    { to: "/analytics", label: "Reports", icon: "reports" },
  ];
}
