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
  icon: "home" | "checkin" | "scan" | "inside" | "history";
  fab?: boolean;
};

/** GatePass bottom nav */
export function mobileTabsFor(_mode: VmsMode): MobileTab[] {
  return [
    { to: "/", label: "Home", icon: "home" },
    { to: "/check-in", label: "Check-in", icon: "checkin" },
    { to: "/scan", label: "Scan QR", icon: "scan", fab: true },
    { to: "/inside", label: "Inside", icon: "inside" },
    { to: "/history", label: "History", icon: "history" },
  ];
}
