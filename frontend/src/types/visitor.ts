export type VisitorStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Checked In"
  | "Meeting Done"
  | "Checked Out"
  | "Rejected"
  | "Cancelled"
  | "Expired";

export type VisitorEntry = {
  name: string;
  visitor_name?: string;
  mobile?: string;
  status?: VisitorStatus;
  host?: string;
};
