import type { DashboardKpis, VisitorListRow } from "@/api/vms";

export type VisitorStatusKey =
  | "Pending Approval"
  | "Approved"
  | "Checked In"
  | "Meeting Done"
  | "Checked Out"
  | "Checkout Pending"
  | "Rejected"
  | "Transferred";

export type StatusDashboardTile = {
  key: VisitorStatusKey;
  label: string;
  badge: "badge-amber" | "badge-green" | "badge-blue" | "badge-indigo" | "badge-slate" | "badge-orange" | "badge-red";
  foot?: string;
  to: string;
};

export const STATUS_DASHBOARD_TILES: StatusDashboardTile[] = [
  {
    key: "Pending Approval",
    label: "Pending Approval",
    badge: "badge-amber",
    foot: "Needs action",
    to: "/approvals?tab=pending",
  },
  {
    key: "Approved",
    label: "Approved",
    badge: "badge-green",
    to: "/approvals?tab=approved",
  },
  {
    key: "Checked In",
    label: "Checked In",
    badge: "badge-blue",
    to: "/approvals?tab=inside",
  },
  {
    key: "Meeting Done",
    label: "Meeting Done",
    badge: "badge-indigo",
    to: "/approvals?tab=inside",
  },
  {
    key: "Checked Out",
    label: "Checked Out",
    badge: "badge-slate",
    to: "/inside?status=checked_out",
  },
  {
    key: "Checkout Pending",
    label: "Checkout Pending",
    badge: "badge-orange",
    foot: "Awaiting gate",
    to: "/inside?status=checkout_pending",
  },
  {
    key: "Rejected",
    label: "Rejected",
    badge: "badge-red",
    to: "/inside?status=rejected",
  },
  {
    key: "Transferred",
    label: "Transferred",
    badge: "badge-slate",
    to: "/inside?status=transferred",
  },
];

export function resolveStatusCounts(
  kpis: DashboardKpis,
  rows: VisitorListRow[] = [],
): Record<VisitorStatusKey, number> {
  const pending = Number(kpis["Pending Approval"] ?? kpis.pending ?? 0);
  const meetingDone = Number(kpis["Meeting Done"] ?? 0);
  const checkoutPending = Number(kpis["Checkout Pending"] ?? meetingDone);
  let transferred = Number(kpis.Transferred ?? 0);

  if (!transferred && rows.length) {
    transferred = rows.filter((row) => Boolean(row.transfer_to_user)).length;
  }

  return {
    "Pending Approval": pending,
    Approved: Number(kpis.Approved ?? 0),
    "Checked In": Number(kpis["Checked In"] ?? 0),
    "Meeting Done": meetingDone,
    "Checked Out": Number(kpis["Checked Out"] ?? 0),
    "Checkout Pending": checkoutPending,
    Rejected: Number(kpis.Rejected ?? 0),
    Transferred: transferred,
  };
}
