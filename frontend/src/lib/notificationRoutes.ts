import type { ActiveHostAlert } from "@/services/hostAlertManager";

/** Pending page tabs — `/approvals?tab=…` */
export type ApprovalsTab = "pending" | "approved" | "inside";

export type NotificationRouteInput = {
  event?: string | null;
  lifecycleEvent?: string | null;
  status?: string | null;
  title?: string | null;
  subject?: string | null;
  body?: string | null;
  variant?: ActiveHostAlert["variant"];
};

function norm(raw?: string | null): string {
  return (raw || "").trim().toLowerCase();
}

function textBlob(input: NotificationRouteInput): string {
  return [input.event, input.lifecycleEvent, input.status, input.title, input.subject, input.body]
    .map(norm)
    .filter(Boolean)
    .join(" ");
}

export function approvalsPath(tab: ApprovalsTab): string {
  if (tab === "pending") return "/approvals";
  return `/approvals?tab=${tab}`;
}

/** Route for urgent in-app host / creator / security rings. */
export function routeForHostAlert(alert: ActiveHostAlert): string {
  return routeForNotification({
    variant: alert.variant,
    title: alert.title,
    body: alert.message,
  });
}

/** Route from lifecycle event, notification log row, or push payload hints. */
export function routeForNotification(input: NotificationRouteInput): string {
  const event = norm(input.event || input.lifecycleEvent);
  const status = norm(input.status);
  const blob = textBlob(input);

  if (input.variant === "security" || event === "security_checkout_required") {
    return approvalsPath("inside");
  }

  if (
    event === "host_notified" ||
    event === "created" ||
    event === "visitor_registered" ||
    status === "pending approval" ||
    status === "pending" ||
    /pending approval|waiting for your approval|waiting at gate|allow \/ review/.test(blob)
  ) {
    return approvalsPath("pending");
  }

  if (
    event === "approved" ||
    event === "rejected" ||
    status === "approved" ||
    status === "rejected" ||
    /visitor approved|has been approved|visitor rejected|has been rejected/.test(blob)
  ) {
    return approvalsPath("approved");
  }

  if (
    event === "checked_in" ||
    event === "meeting_done" ||
    status === "checked in" ||
    status === "meeting done" ||
    /checked in|check-in confirmed|check in confirmed|meeting completed|meeting done|ready for checkout|gate checkout/.test(
      blob,
    )
  ) {
    return approvalsPath("inside");
  }

  if (event === "checked_out" || status === "checked out") {
    return "/inside?status=checked_out";
  }

  if (input.variant === "creator") {
    return approvalsPath("approved");
  }

  if (input.variant === "host") {
    return approvalsPath("pending");
  }

  return approvalsPath("pending");
}

/** Full path for service worker / web push (`/vms/…`). */
export function vmsPushUrl(input: NotificationRouteInput): string {
  const appPath = routeForNotification(input);
  return `/vms${appPath === "/" ? "" : appPath}`;
}
