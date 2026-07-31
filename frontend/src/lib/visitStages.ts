import { formatDateTime } from "@/lib/format";

export type VisitStageTimestamps = {
  status?: string;
  creation?: string | null;
  modified?: string | null;
  approved_on?: string | null;
  rejected_on?: string | null;
  checked_in_on?: string | null;
  check_in?: string | null;
  meeting_done_on?: string | null;
  checked_out_on?: string | null;
  check_out?: string | null;
};

export type VisitStageRow = {
  key: string;
  label: string;
  at?: string | null;
};

/** All lifecycle timestamps shown in cards and detail views. */
export function getVisitStatusStages(item: VisitStageTimestamps): VisitStageRow[] {
  const stages: VisitStageRow[] = [
    { key: "visitor_entry", label: "Visitor Entry", at: item.creation },
    { key: "approved", label: "Approved Time", at: item.approved_on },
    {
      key: "checked_in",
      label: "Checked In Time",
      at: item.checked_in_on || item.check_in,
    },
    { key: "meeting_done", label: "Meeting Done Time", at: item.meeting_done_on },
    {
      key: "checked_out",
      label: "Checked Out Time",
      at: item.checked_out_on || item.check_out,
    },
  ];

  if (item.status === "Rejected" || item.rejected_on) {
    stages.push({ key: "rejected", label: "Rejected Time", at: item.rejected_on });
  }

  return stages;
}

export function formatStageTimestamp(value?: string | null, compact = false) {
  if (!value) return "—";
  return formatDateTime(value, compact) || "—";
}

/** Best timestamp for the visitor's current status (list rows, card header). */
export function getCurrentStageTimestamp(item: VisitStageTimestamps): string | undefined {
  switch (item.status) {
    case "Checked Out":
      return item.checked_out_on || item.check_out || undefined;
    case "Meeting Done":
      return item.meeting_done_on || undefined;
    case "Checked In":
      return item.checked_in_on || item.check_in || undefined;
    case "Approved":
      return item.approved_on || undefined;
    case "Rejected":
      return item.rejected_on || undefined;
    case "Pending Approval":
    case "Pending":
      return item.creation || item.modified || undefined;
    default:
      return (
        item.checked_out_on ||
        item.meeting_done_on ||
        item.checked_in_on ||
        item.check_in ||
        item.approved_on ||
        item.creation ||
        item.modified ||
        undefined
      );
  }
}
