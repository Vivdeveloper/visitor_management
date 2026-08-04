import type { AuthProfile, DocPermFlags, VmsCapabilities } from "@/api/vms";

export type VmsMode = "host" | "security" | "visitor" | "guest";

export type CapabilityKey = keyof VmsCapabilities;

function visitorEntryPerms(user: AuthProfile | null): DocPermFlags {
  return user?.permissions?.["Visitor Entry"] || {};
}

/** Desk user may open the VMS PWA when Visitor Entry DocPerm grants any access. */
export function hasVmsAppAccess(user: AuthProfile | null): boolean {
  if (!user) return false;
  if (user.session_type === "visitor" || (!user.authenticated && user.verified)) return true;
  if (!user.authenticated) return false;
  const ve = visitorEntryPerms(user);
  return Boolean(ve.read || ve.write || ve.create || ve.report);
}

/**
 * Overall visitor queues (all hosts).
 * Gate desk = Visitor Entry create in Role Permission Manager; hosts are scoped.
 */
export function canViewAllVisitorQueues(user: AuthProfile | null): boolean {
  if (!user?.authenticated) return false;
  return Boolean(visitorEntryPerms(user).create);
}

/** Frappe get_list filters so hosts only see person_to_meet = self. */
export function visitorScopeFilters(user: AuthProfile | null): Array<[string, string, string]> | undefined {
  if (!user?.authenticated || canViewAllVisitorQueues(user)) return undefined;
  const uid = (user.user || user.email || "").trim();
  if (!uid) return undefined;
  return [["person_to_meet", "=", uid]];
}

/** Accept / Reject — server `can_approve` from Role Permission Manager (write, not gate create). */
export function canApproveReject(user: AuthProfile | null): boolean {
  if (!user?.authenticated) return false;
  if (typeof user.can_approve === "boolean") return user.can_approve;
  const ve = visitorEntryPerms(user);
  return Boolean(ve.write && !ve.create);
}

/**
 * Meeting Done — same DocPerm rule as Accept/Reject (write, not gate create).
 */
export function canMarkMeetingDone(user: AuthProfile | null): boolean {
  return canApproveReject(user);
}

/**
 * Call Host + Notify (bell) — gate desk only (Visitor Entry create).
 * Host mode (read/write without create) must never see these.
 */
export function canCallNotifyHost(user: AuthProfile | null): boolean {
  if (!user?.authenticated) return false;
  if (resolveMode(user) === "host") return false;
  return Boolean(visitorEntryPerms(user).create);
}

/**
 * Gate Check In on Approved cards — Visitor Entry create DocPerm only.
 * Approver (write without create / PA GatePass Approval) sees View Gate Pass only.
 */
export function canGateCheckIn(user: AuthProfile | null): boolean {
  if (!user?.authenticated) return false;
  return Boolean(visitorEntryPerms(user).create);
}

/**
 * UI access from Frappe Role Permission Manager (Visitor Entry DocPerm) only.
 */
export function hasCapability(user: AuthProfile | null, key: CapabilityKey): boolean {
  if (!user) return false;

  if (user.session_type === "visitor" || (!user.authenticated && user.verified)) {
    return key === "check_in" || key === "profile";
  }

  if (user.authenticated && !hasVmsAppAccess(user)) {
    return false;
  }

  const ve = visitorEntryPerms(user);
  switch (key) {
    case "dashboard":
    case "inside":
    case "meetings":
    case "history":
    case "notifications":
      return Boolean(ve.read);
    case "approvals":
      return Boolean(ve.read || ve.write);
    case "check_in":
      return Boolean(ve.create);
    case "reports":
      return Boolean(ve.report || ve.read);
    case "checkout":
      // Gate desk: create + write in Role Permission Manager
      return Boolean(ve.create && ve.write);
    case "scan":
      return Boolean(ve.write || ve.create);
    case "approve":
      return canApproveReject(user);
    case "profile":
      return hasVmsAppAccess(user);
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

/** Mode from DocPerm flags — create = gate desk; read/write = host/approver. */
export function resolveMode(user: AuthProfile | null): VmsMode {
  if (!user) return "guest";

  if (user.session_type === "visitor" || (!user.authenticated && user.verified)) {
    return "visitor";
  }

  const ve = visitorEntryPerms(user);
  if (ve.create) return "security";
  if (ve.write || ve.read) return "host";
  if (user.verified) return "visitor";
  return "guest";
}

/**
 * Check Out — Visitor Entry create+write DocPerm only (no hardcoded role names).
 * Host / write-without-create never sees Check Out.
 */
export function canPerformCheckout(user: AuthProfile | null): boolean {
  if (!user?.authenticated) return false;
  if (resolveMode(user) !== "security") return false;
  return hasCapability(user, "checkout");
}
/** Transfer — gate create or host/approver on the Pending queue. */
export function canTransferVisitor(user: AuthProfile | null): boolean {
  if (!user?.authenticated) return false;
  return canApproveReject(user) || canCallNotifyHost(user) || hasCapability(user, "approvals");
}

export type MobileTab = {
  to: string;
  label: string;
  icon: "home" | "checkin" | "scan" | "inside" | "history" | "pass" | "reports" | "more" | "approvals";
  fab?: boolean;
  capability: CapabilityKey;
};

const ALL_MOBILE_TABS: MobileTab[] = [
  { to: "/", label: "Home", icon: "home", capability: "dashboard" },
  { to: "/approvals", label: "Pending", icon: "approvals", capability: "approvals" },
  { to: "/check-in", label: "Add Entry", icon: "checkin", fab: true, capability: "check_in" },
  { to: "/inside", label: "Inside", icon: "inside", capability: "inside" },
  { to: "/analytics", label: "Reports", icon: "reports", capability: "reports" },
];

/** Tabs allowed by Role Permission Manager metadata for this user. */
export function mobileTabsFor(user: AuthProfile | null): MobileTab[] {
  const mode = resolveMode(user);
  if (mode === "visitor") {
    return ALL_MOBILE_TABS.filter((t) => t.capability === "check_in");
  }
  return ALL_MOBILE_TABS.filter((tab) => hasCapability(user, tab.capability));
}

export function firstAllowedPath(user: AuthProfile | null): string {
  if (user?.authenticated && !hasVmsAppAccess(user)) return "/access-denied";
  const tabs = mobileTabsFor(user);
  if (tabs.length) return tabs[0].to;
  if (hasCapability(user, "profile")) return "/profile";
  return "/login";
}

export function capabilityForPath(pathname: string): CapabilityKey | null {
  if (pathname === "/" || pathname === "") return "dashboard";
  if (pathname.startsWith("/approvals")) return "approvals";
  if (pathname.startsWith("/check-in") || pathname.startsWith("/welcome")) return "check_in";
  if (pathname.startsWith("/inside") || pathname.startsWith("/visitor/")) return "inside";
  if (pathname.startsWith("/analytics")) return "reports";
  if (pathname.startsWith("/checkout")) return "checkout";
  if (pathname.startsWith("/scan")) return "scan";
  if (pathname.startsWith("/meetings")) return "meetings";
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/profile") || pathname.startsWith("/my-pass") || pathname.startsWith("/pass")) {
    return "profile";
  }
  if (pathname.startsWith("/pre-register")) return "check_in";
  return null;
}
