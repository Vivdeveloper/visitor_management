import { apiClient } from "@/api/client";

/**
 * Module-level map to store pending MSG91 Widget reqIds per mobile number.
 */

const METHOD = "visitor_management.react_api";

/** DocPerm flags from Frappe Role Permission Manager for one DocType. */
export type DocPermFlags = {
  read?: boolean;
  write?: boolean;
  create?: boolean;
  delete?: boolean;
  report?: boolean;
  export?: boolean;
  print?: boolean;
};

/** UI screens/actions derived from DocPerm (see auth.session.get_capabilities). */
export type VmsCapabilities = {
  dashboard?: boolean;
  approvals?: boolean;
  check_in?: boolean;
  inside?: boolean;
  reports?: boolean;
  checkout?: boolean;
  scan?: boolean;
  meetings?: boolean;
  history?: boolean;
  profile?: boolean;
  notifications?: boolean;
  /** Accept / Reject — PA GatePass Approval or System Manager only. */
  approve?: boolean;
};

export type AuthProfile = {
  success?: boolean;
  verified?: boolean;
  authenticated?: boolean;
  session_type?: "user" | "visitor" | "guest";
  user?: string | null;
  full_name?: string;
  email?: string;
  mobile?: string;
  mobile_no?: string;
  user_image?: string;
  roles?: string[];
  vms_roles?: string[];
  /** Role Permission Manager metadata keyed by DocType name. */
  permissions?: Record<string, DocPermFlags>;
  capabilities?: VmsCapabilities;
  csrf_token?: string;
  message?: string;
  otp?: string;
  expires_in?: number;
};

async function callMethod<T>(path: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const { data } = await apiClient.post(`/api/method/${METHOD}.${path}`, args ?? {});
    return data.message as T;
  } catch (err: unknown) {
    throw new Error(extractApiError(err));
  }
}

function extractApiError(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const ax = err as {
      response?: {
        status?: number;
        data?: {
          message?: string | { message?: string };
          exc_type?: string;
          _server_messages?: string;
          exception?: string;
        };
      };
      message?: string;
    };
    const data = ax.response?.data;
    if (data?._server_messages) {
      try {
        const msgs = JSON.parse(data._server_messages) as string[];
        const parsed = msgs
          .map((m) => {
            try {
              const obj = JSON.parse(m) as { message?: string };
              return obj.message || "";
            } catch {
              return m;
            }
          })
          .filter(Boolean);
        if (parsed.length) return parsed.join(" ");
      } catch {
        /* fall through */
      }
    }
    if (typeof data?.message === "string" && data.message) return data.message;
    if (data?.message && typeof data.message === "object" && data.message.message) {
      return String(data.message.message);
    }
    if (data?.exception) {
      const line = String(data.exception).split("\n").pop() || data.exception;
      return line.replace(/^.*Error:\s*/i, "").trim() || line;
    }
    if (ax.response?.status === 417) {
      return "Server rejected the request (invalid field or value). Refresh and try again.";
    }
    if (ax.response?.status === 401) {
      return "Invalid ERPNext username or password";
    }
    if (ax.response?.status === 502 || ax.response?.status === 503 || ax.response?.status === 530) {
      return "Server is unreachable. Check your network connection and that Frappe / socket.io are running, then try again.";
    }
    if (ax.response?.status && ax.response.status >= 500) {
      return "Server error during sign-in. Check that bench is running, then try again.";
    }
    if (ax.message === "Network Error" || (ax as { code?: string }).code === "ERR_NETWORK") {
      return "Cannot reach the server. Check your connection, then refresh and try again.";
    }
    if (ax.message) return ax.message;
  }
  if (err instanceof Error) {
    if (err.message === "Network Error") {
      return "Cannot reach the server. Check your connection, then refresh and try again.";
    }
    return err.message;
  }
  return "Something went wrong";
}

export type OtpWidgetConfig = {
  enabled: boolean;
  widget_id?: string;
  token_auth?: string;
};

export const otpApi = {
  getWidgetConfig: () => callMethod<OtpWidgetConfig>("otp.get_widget_config"),
  /** Validates an MSG91 widget access token server-side. The verified mobile
   *  comes from MSG91, so none is sent from here. Does not change the session. */
  verify: (accessToken: string, purpose = "visitor_registration") =>
    callMethod<{ verified: boolean; mobile: string; purpose: string }>("otp.verify", {
      access_token: accessToken,
      purpose,
    }),
};

export const authApi = {
  loginWithPassword: async (usr: string, pwd: string) => {
    const res = await callMethod<AuthProfile>("auth.login_with_password", { usr, pwd });
    if (res && res.success === false) {
      throw new Error(res.message || "Invalid ERPNext username or password");
    }
    return res;
  },
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
  photo?: string;
  person_to_meet_name?: string;
  host_name?: string;
  status?: string;
  floor?: string;
  check_in?: string;
  checked_in_on?: string;
  modified?: string;
  creation?: string;
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
  floors?: Array<{
    name: string;
    floor_name?: string;
    floor_number?: number;
    building?: string;
    tower?: string;
  }>;
  visit_purpose_types?: Array<{ name: string; visit_purpose_type_name?: string }>;
  vehicle_types?: Array<{ name: string; vehicle_type_name?: string }>;
  id_proof_types?: Array<{ name: string; id_proof_type_name?: string }>;
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
    callMethod<{ period?: string; series: DashboardTrendPoint[] }>("dashboard.get_visitor_trends", args),
};

export type HostOption = { value: string; label: string; email?: string };

export const settingsApi = {
  getMasters: () => callMethod<MastersPayload>("settings.get_masters"),
  getSettings: () => callMethod("settings.get_settings"),
  getHosts: () => callMethod<HostOption[]>("settings.get_hosts"),
};

export type VisitorListRow = {
  name: string;
  full_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  mobile?: string;
  email?: string;
  gender?: string;
  status?: string;
  person_to_meet?: string;
  person_to_meet_name?: string;
  floor?: string;
  modified?: string;
  visit_purpose_type?: string;
  check_in?: string;
  checked_in_on?: string;
  checked_out_on?: string;
  meeting_done_on?: string;
  approved_on?: string;
  rejected_on?: string;
  transfer_to_user?: string;
  creation?: string;
  visitor_company?: string;
  visitor_location?: string;
  id_proof_type?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  number_of_visitors?: number | string;
  photo?: string;
  pass_url?: string;
  qr_expires_on?: string;
};

/** Standard Frappe list API — no custom methods / fields. */
export async function frappeGetList<T extends Record<string, unknown> = Record<string, unknown>>(args: {
  doctype: string;
  fields?: string[];
  filters?: Record<string, unknown> | unknown[];
  order_by?: string;
  limit_page_length?: number;
}): Promise<T[]> {
  try {
    const { data } = await apiClient.post(`/api/method/frappe.client.get_list`, {
      doctype: args.doctype,
      fields: JSON.stringify(args.fields ?? ["name"]),
      filters: JSON.stringify(args.filters ?? {}),
      order_by: args.order_by ?? "modified desc",
      limit_page_length: args.limit_page_length ?? 50,
    });
    return (data.message as T[]) || [];
  } catch (err: unknown) {
    throw new Error(extractApiError(err));
  }
}

export const visitorApi = {
  list: (filters?: string | Record<string, unknown>, limit = 20) =>
    callMethod<VisitorListRow[]>("visitor.list_visitors", {
      filters: typeof filters === "string" ? filters : filters ? JSON.stringify(filters) : undefined,
      limit,
    }),
  get: (name: string) => callMethod("visitor.get_visitor", { name }),
  update: (name: string, payload: Record<string, unknown>) =>
    callMethod("visitor.update_visitor", { name, ...payload }),
  create: (payload: Record<string, unknown>) => callMethod("visitor.create_visitor", payload),
  /** Extended list via core Frappe client (fields must exist on Visitor Entry DocType). */
  listDetailed: (limit = 100) =>
    frappeGetList<VisitorListRow>({
      doctype: "Visitor Entry",
      fields: [
        "name",
        "full_name",
        "mobile",
        "status",
        "person_to_meet",
        "person_to_meet_name",
        "floor",
        "modified",
        "visit_purpose_type",
        "checked_in_on",
        "checked_out_on",
        "meeting_done_on",
        "approved_on",
        "rejected_on",
        "transfer_to_user",
        "creation",
        "visitor_company",
        "number_of_visitors",
        "photo",
        "pass_url",
        "qr_expires_on",
      ],
      order_by: "modified desc",
      limit_page_length: limit,
    }),
};

export const approvalApi = {
  listForHost: (status?: string) => callMethod("approval.list_for_host", { status }),
  approve: (visitor_entry: string, remarks?: string, floor?: string) =>
    callMethod("approval.approve", { visitor_entry, remarks, floor }),
  reject: (visitor_entry: string, remarks?: string) =>
    callMethod("approval.reject", { visitor_entry, remarks }),
  transfer: (visitor_entry: string, transfer_to_user: string, remarks?: string) =>
    callMethod("approval.transfer", { visitor_entry, transfer_to_user, remarks }),
  notifyHost: (visitor_entry: string, message?: string) =>
    callMethod<{ success?: boolean; host_name?: string; host_user?: string; realtime_sent?: boolean }>(
      "approval.notify_host",
      {
      visitor_entry,
      message,
    }),
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
    callMethod<{ success: boolean; pass_url?: string }>("visitor_pass.generate_pass", { visitor_entry, force: force ? 1 : 0 }),
  sendPassToMobile: (visitor_entry: string, mobile?: string) =>
    callMethod<{ success: boolean; message?: string; pass_url?: string }>("visitor_pass.send_pass_to_mobile", { visitor_entry, mobile }),
  get: (name: string) => callMethod<PublicPassResult["pass"] & { name?: string; mobile?: string }>("visitor_pass.get_pass", { name }),
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
  checkIn: (visitor_entry: string, live_image?: string, floor?: string) =>
    callMethod("checkin.check_in", { visitor_entry, live_image, floor }),
  checkOut: (visitor_entry: string, remarks?: string) =>
    callMethod("checkout.check_out", { visitor_entry, remarks }),
};

export const meetingApi = {
  start: (visitor_entry: string, remarks?: string) =>
    callMethod("meeting.start_meeting", { visitor_entry, remarks }),
  complete: (visitor_entry: string, remarks?: string) =>
    callMethod("meeting.complete_meeting", { visitor_entry, remarks }),
};

export type InAppNotification = {
  name: string;
  subject?: string;
  email_content?: string;
  document_type?: string;
  document_name?: string;
  type?: string;
  read?: number | boolean;
  creation?: string;
  from_user?: string;
};

export const notificationApi = {
  list: (limit = 50) => callMethod<InAppNotification[]>("notification.list_notifications", { limit }),
  markRead: (name: string) => callMethod("notification.mark_read", { name }),
  markAllRead: () => callMethod("notification.mark_all_read"),
};
