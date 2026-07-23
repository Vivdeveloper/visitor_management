export type VisitorStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Checked In"
  | "Checked Out"
  | "Expired";

export type VisitorEntry = {
  name: string;
  visitor_name?: string;
  mobile?: string;
  status?: VisitorStatus;
  host?: string;
};
