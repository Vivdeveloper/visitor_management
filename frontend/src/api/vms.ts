import { apiClient } from "@/api/client";

const METHOD = "visitor_management.react_api";

export type AuthProfile = {
  success?: boolean;
  verified?: boolean;
  authenticated?: boolean;
  session_type?: "user" | "visitor" | "guest";
  user?: string | null;
  full_name?: string;
  mobile?: string;
  mobile_no?: string;
  roles?: string[];
  vms_roles?: string[];
  csrf_token?: string;
  message?: string;
  otp?: string;
  expires_in?: number;
};

async function callMethod<T>(path: string, args?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.post(`/api/method/${METHOD}.${path}`, args ?? {});
  return data.message as T;
}

export const authApi = {
  sendOtp: (mobile: string, purpose = "login") =>
    callMethod<AuthProfile>("auth.send_otp", { mobile, purpose }),
  verifyOtp: (mobile: string, otp: string, purpose = "login") =>
    callMethod<AuthProfile>("auth.verify_otp", { mobile, otp, purpose }),
  me: () => callMethod<AuthProfile>("auth.me"),
  logout: () => callMethod<AuthProfile>("auth.logout"),
  getCsrf: () => callMethod<string>("auth.get_csrf_token"),
};

export type DashboardKpis = Record<string, number>;

export type DashboardTrendPoint = { date: string; count: number };

export type DashboardQueueItem = {
  name: string;
  full_name?: string;
  mobile?: string;
  person_to_meet_name?: string;
  host_name?: string;
  status?: string;
  floor?: string;
  check_in?: string;
};

export type DashboardPayload = {
  filters: {
    site: string;
    building: string;
    from_date: string;
    to_date: string;
  };
  kpis: DashboardKpis;
  trend: DashboardTrendPoint[];
  queues: {
    pending: DashboardQueueItem[];
    gate_exit: DashboardQueueItem[];
    overstay: DashboardQueueItem[];
    rejected: DashboardQueueItem[];
  };
  generated_at?: string;
};

export type MasterOption = {
  name: string;
  site_name?: string;
  building_name?: string;
  site?: string;
  organization?: string;
};

export type MastersPayload = {
  sites?: MasterOption[];
  buildings?: MasterOption[];
};

export const dashboardApi = {
  getDashboard: (args?: {
    site?: string;
    building?: string;
    from_date?: string;
    to_date?: string;
    trend_days?: number;
  }) => callMethod<DashboardPayload>("dashboard.get_dashboard", args),
  getKpis: (args?: Record<string, unknown>) =>
    callMethod<DashboardKpis>("dashboard.get_kpis", args),
  getLiveVisitors: (args?: Record<string, unknown>) =>
    callMethod<DashboardQueueItem[]>("dashboard.get_live_visitors", args),
  getPendingApprovals: (args?: Record<string, unknown>) =>
    callMethod<DashboardQueueItem[]>("dashboard.get_pending_approvals", args),
  getQueues: (args?: Record<string, unknown>) => callMethod("dashboard.get_queues", args),
  getVisitorTrends: (args?: Record<string, unknown>) =>
    callMethod("dashboard.get_visitor_trends", args),
};

export const settingsApi = {
  getMasters: () => callMethod<MastersPayload>("settings.get_masters"),
  getSettings: () => callMethod("settings.get_settings"),
};

export const visitorApi = {
  list: (filters?: string, limit = 20) => callMethod("visitor.list_visitors", { filters, limit }),
  get: (name: string) => callMethod("visitor.get_visitor", { name }),
  create: (payload: Record<string, unknown>) => callMethod("visitor.create_visitor", payload),
};

export const approvalApi = {
  listForHost: (status?: string) => callMethod("approval.list_for_host", { status }),
  approve: (visitor_entry: string, remarks?: string) =>
    callMethod("approval.approve", { visitor_entry, remarks }),
  reject: (visitor_entry: string, remarks?: string) =>
    callMethod("approval.reject", { visitor_entry, remarks }),
  transfer: (visitor_entry: string, transfer_to_user: string, remarks?: string) =>
    callMethod("approval.transfer", { visitor_entry, transfer_to_user, remarks }),
};

export type PublicPassInfo = {
  visitor_entry?: string;
  full_name?: string;
  photo?: string;
  visitor_company?: string;
  person_to_meet_name?: string;
  host_name?: string;
  floor?: string;
  status?: string;
  qr_expires_on?: string;
  pass_url?: string;
};

export type PublicPassResult = {
  valid: boolean;
  reason?: string;
  pass: PublicPassInfo | null;
};

export type MyPassRow = {
  name: string;
  full_name?: string;
  status?: string;
  pass_url?: string;
  qr_expires_on?: string;
  person_to_meet_name?: string;
  host_name?: string;
};

export const passApi = {
  generate: (visitor_entry: string, force = false) =>
    callMethod("visitor_pass.generate_pass", { visitor_entry, force: force ? 1 : 0 }),
  get: (name: string) => callMethod("visitor_pass.get_pass", { name }),
  validate: (token: string) => callMethod<PublicPassResult>("visitor_pass.validate_pass", { token }),
  getPublicPass: (token: string) =>
    callMethod<PublicPassResult>("visitor_pass.get_public_pass", { token }),
  listMyPasses: (mobile: string) =>
    callMethod<MyPassRow[]>("visitor_pass.list_my_passes", { mobile }),
};

export const securityApi = {
  scanQr: (token: string) => callMethod("security.scan_qr", { token }),
  verifyVisitor: (visitor_entry: string) =>
    callMethod("security.verify_visitor", { visitor_entry }),
  gateQueue: () => callMethod("security.gate_queue"),
  exitQueue: () => callMethod("security.exit_queue"),
  checkInByToken: (token: string, live_image?: string) =>
    callMethod("security.check_in_by_token", { token, live_image }),
  checkOutByToken: (token: string, remarks?: string) =>
    callMethod("security.check_out_by_token", { token, remarks }),
  checkIn: (visitor_entry: string, live_image?: string) =>
    callMethod("checkin.check_in", { visitor_entry, live_image }),
  checkOut: (visitor_entry: string, remarks?: string) =>
    callMethod("checkout.check_out", { visitor_entry, remarks }),
};

export const meetingApi = {
  start: (visitor_entry: string, remarks?: string) =>
    callMethod("meeting.start_meeting", { visitor_entry, remarks }),
  complete: (visitor_entry: string, remarks?: string) =>
    callMethod("meeting.complete_meeting", { visitor_entry, remarks }),
};
