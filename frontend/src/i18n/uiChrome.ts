import {
  VISITOR_LANGS,
  type VisitorLang,
} from "@/i18n/visitorJourney";

type UiDict = Record<string, string>;

const en: UiDict = {
  language: "Language",
  calendar_view: "Calendar view",
  todays_schedule: "Today's schedule",
  settings: "Settings",
  setup_alerts: "Setup gate alerts",
  setup_alerts_hint: "Enable notifications & sound for visitor approvals",
  setup_alerts_denied: "Notifications blocked — tap to open setup",
  alerts: "Alerts",
  required: "Setup",
  account: "Account",
  appearance: "Appearance",
  tools: "Tools",
  profile: "Profile",
  logout: "Logout",
  sign_in: "Sign In",
  home: "Home",
  visitors: "Visitors",
  history: "History",
  inside: "Inside",
  add_entry: "Add Entry",
  pending: "Pending",
  reports: "Reports",
  lang_confirm_title: "Change language?",
  lang_confirm_body: "Change app language from {from} to {to}?",
  yes: "Yes",
  no: "No",
  select_language: "Select language",
  employee_id: "Employee ID",
  email: "Email",
  department: "Department",
  live_gate_desk: "Live Gate Desk",
  refresh: "Refresh",
  refreshing: "Refreshing…",
  current_shift: "Current Shift",
  current_time: "Current Time",
  todays_visitors: "Today's Visitors",

  // Brand / chrome
  brand_title: "Precious Alloys",
  main_gate_desk: "MAIN GATE DESK",

  // Home dashboard
  status_overview: "Status overview",
  status_overview_sub: "Today's visitor counts by stage",
  today: "Today",
  needs_action: "Needs action",
  awaiting_gate: "Awaiting gate",
  recent_visitors: "Recent Visitors",
  view_all: "View All ›",
  loading_visitors: "Loading visitors…",
  view_visitor_history: "View Visitor History",
  loading: "Loading…",

  // Shared status labels
  status_pending_approval: "Pending Approval",
  status_pending: "Pending",
  status_approved: "Approved",
  status_checked_in: "Checked In",
  status_checked_in_short: "Checked-in",
  status_meeting_done: "Meeting Done",
  status_checked_out: "Checked Out",
  status_checked_out_short: "Checked-out",
  status_checkout_pending: "Checkout Pending",
  status_rejected: "Rejected",
  status_transferred: "Transferred",
  status_checkout: "Checkout",

  // Approvals page
  approvals_queue: "Approvals queue",
  search_visitor_host_company: "Search visitor, host or company...",
  tab_all: "All",
  tab_pending: "Pending",
  tab_approved: "Approved",
  tab_inside: "Inside",
  filter_today: "Today",
  filter_yesterday: "Yesterday",
  filter_this_week: "This Week",
  filter_clear: "Clear",
  no_tab_items: "No {label} items",
  host_prefix: "Host:",
  label_visitors: "VISITORS",
  label_purpose: "PURPOSE",
  label_floor: "FLOOR",
  floor_n: "Floor {n}",
  floor_suffix: "Floor",
  action_reject: "Reject",
  action_accept: "Accept",
  action_transfer: "Transfer",
  action_call_host: "Call Host",
  action_notify: "Notify",
  action_view_gate_pass: "View Gate Pass",
  action_check_in: "Check In",
  action_meeting_done: "Meeting Done",
  action_check_out: "Check Out",
  reason_prefix: "Reason:",

  // Live visitors / inside
  live_visitors: "Live Visitors",
  on_premises: "On premises",
  search_visitor_or_host: "Search visitor or host",
  badge_in: "IN",
  badge_checkout: "CHECKOUT",
  badge_pending: "PENDING",
  badge_approved: "APPROVED",
  badge_rejected: "REJECTED",
  badge_transferred: "TRANSFERRED",
  range_toggle_label: "Visitor range",
  range_overall: "Overall",
  range_last_7_days: "Last 7 days",
  select_date: "Date",
  select_date_time: "Select date",
  done: "Done",

  // Visit stage timeline
  stage_visitor_entry: "Visitor Entry",
  stage_approved: "Approved",
  stage_checked_in: "Checked In",
  stage_meeting_done: "Meeting Done",
  stage_checked_out: "Checked Out",
  stage_rejected: "Rejected",

  // Reports / analytics
  reports_title: "Reports",
  visitor_analytics: "Visitor analytics",
  analytics_eyebrow: "Analytics",
  live_pill: "Live",
  historic_pill: "Historic",
  tab_overview: "Overview",
  checkout_pending_report: "Checkout Pending Report",
  checkout_pending_visitors: "{n} visitors awaiting gate checkout",
  checkout_pending_visitor_one: "{n} visitor awaiting gate checkout",
  meetings_by_day: "Meetings by day",
  meetings_by_day_sub: "Timeline cards with time · person to meet",
  stage_counts: "Stage counts",
  stage_counts_today_sub: "Today's visitor counts by stage",
  stage_counts_for: "Counts for {date}",
  stage_counts_sub: "Visitor counts by stage",
  total_visitors: "Total visitors",
  active_inside: "Active inside",
  hint_pending_approval: "Waiting for approval",
  hint_approved: "Approved, not yet checked in",
  hint_checked_in: "Currently inside premises",
  hint_meeting_done: "Meeting completed",
  hint_checkout_pending: "Awaiting gate checkout",
  hint_checked_out: "Visit completed and exited",
  hint_rejected: "Visit not allowed",
  hint_transferred: "Host reassigned",
  live_queue: "Live queue",
  checkout_pending_queue_sub:
    "Visitors who completed their meeting and are still on premises awaiting gate checkout.",
  pending_count_label: "pending",
  loading_checkout_queue: "Loading checkout queue…",
  no_checkout_pending: "No checkout pending",
  no_checkout_pending_sub: "All visitors who finished meetings have been checked out.",
  waiting_label: "Waiting",
  awaiting_checkout: "Awaiting checkout",
  view: "View",
  checking_out: "Checking out…",
};

const hi: UiDict = {
  language: "भाषा",
  calendar_view: "कैलेंडर दृश्य",
  todays_schedule: "आज का शेड्यूल",
  settings: "सेटिंग्स",
  setup_alerts: "गेट अलर्ट सेटअप करें",
  setup_alerts_hint: "विज़िटर अप्रूवल के लिए नोटिफिकेशन और साउंड चालू करें",
  setup_alerts_denied: "नोटिफिकेशन ब्लॉक — सेटअप खोलने के लिए टैप करें",
  alerts: "अलर्ट",
  required: "सेटअप",
  account: "खाता",
  appearance: "दिखावट",
  tools: "टूल्स",
  profile: "प्रोफ़ाइल",
  logout: "लॉग आउट",
  sign_in: "साइन इन",
  home: "होम",
  visitors: "विज़िटर",
  history: "इतिहास",
  inside: "अंदर",
  add_entry: "एंट्री जोड़ें",
  pending: "पेंडिंग",
  reports: "रिपोर्ट्स",
  lang_confirm_title: "भाषा बदलें?",
  lang_confirm_body: "ऐप की भाषा {from} से {to} में बदलें?",
  yes: "हाँ",
  no: "नहीं",
  select_language: "भाषा चुनें",
  employee_id: "कर्मचारी आईडी",
  email: "ईमेल",
  department: "विभाग",
  live_gate_desk: "लाइव गेट डेस्क",
  refresh: "रीफ्रेश",
  refreshing: "रीफ्रेश हो रहा…",
  current_shift: "वर्तमान शिफ्ट",
  current_time: "वर्तमान समय",
  todays_visitors: "आज के विज़िटर",

  brand_title: "Precious Alloys",
  main_gate_desk: "मुख्य गेट डेस्क",

  status_overview: "स्थिति अवलोकन",
  status_overview_sub: "आज की विज़िटर संख्या चरण अनुसार",
  today: "आज",
  needs_action: "कार्रवाई आवश्यक",
  awaiting_gate: "गेट की प्रतीक्षा",
  recent_visitors: "हाल के विज़िटर",
  view_all: "सभी देखें ›",
  loading_visitors: "विज़िटर लोड हो रहे…",
  view_visitor_history: "विज़िटर इतिहास देखें",
  loading: "लोड हो रहा…",

  status_pending_approval: "अप्रूवल बाकी",
  status_pending: "पेंडिंग",
  status_approved: "अप्रूव्ड",
  status_checked_in: "चेक-इन",
  status_checked_in_short: "चेक-इन",
  status_meeting_done: "मीटिंग पूर्ण",
  status_checked_out: "चेक-आउट",
  status_checked_out_short: "चेक-आउट",
  status_checkout_pending: "चेकआउट बाकी",
  status_rejected: "अस्वीकृत",
  status_transferred: "ट्रांसफर",
  status_checkout: "चेकआउट",

  approvals_queue: "अप्रूवल कतार",
  search_visitor_host_company: "विज़िटर, होस्ट या कंपनी खोजें...",
  tab_all: "सभी",
  tab_pending: "पेंडिंग",
  tab_approved: "अप्रूव्ड",
  tab_inside: "अंदर",
  filter_today: "आज",
  filter_yesterday: "कल",
  filter_this_week: "इस सप्ताह",
  filter_clear: "साफ़ करें",
  no_tab_items: "कोई {label} आइटम नहीं",
  host_prefix: "होस्ट:",
  label_visitors: "विज़िटर",
  label_purpose: "उद्देश्य",
  label_floor: "मंजिल",
  floor_n: "मंजिल {n}",
  floor_suffix: "मंजिल",
  action_reject: "अस्वीकार",
  action_accept: "स्वीकार",
  action_transfer: "ट्रांसफर",
  action_call_host: "होस्ट को कॉल",
  action_notify: "सूचित करें",
  action_view_gate_pass: "गेट पास देखें",
  action_check_in: "चेक-इन",
  action_meeting_done: "मीटिंग पूर्ण",
  action_check_out: "चेक-आउट",
  reason_prefix: "कारण:",

  live_visitors: "लाइव विज़िटर",
  on_premises: "परिसर में",
  search_visitor_or_host: "विज़िटर या होस्ट खोजें",
  badge_in: "अंदर",
  badge_checkout: "चेकआउट",
  badge_pending: "पेंडिंग",
  badge_approved: "अप्रूव्ड",
  badge_rejected: "अस्वीकृत",
  badge_transferred: "ट्रांसफर",
  range_toggle_label: "विज़िटर अवधि",
  range_overall: "समग्र",
  range_last_7_days: "पिछले ७ दिन",
  select_date: "तारीख",
  select_date_time: "तारीख चुनें",
  done: "हो गया",

  stage_visitor_entry: "विज़िटर एंट्री",
  stage_approved: "अप्रूव्ड",
  stage_checked_in: "चेक-इन",
  stage_meeting_done: "मीटिंग पूर्ण",
  stage_checked_out: "चेक-आउट",
  stage_rejected: "अस्वीकृत",

  reports_title: "रिपोर्ट्स",
  visitor_analytics: "विज़िटर एनालिटिक्स",
  analytics_eyebrow: "एनालिटिक्स",
  live_pill: "लाइव",
  historic_pill: "पुराना",
  tab_overview: "अवलोकन",
  checkout_pending_report: "चेकआउट पेंडिंग रिपोर्ट",
  checkout_pending_visitors: "{n} विज़िटर गेट चेकआउट की प्रतीक्षा में",
  checkout_pending_visitor_one: "{n} विज़िटर गेट चेकआउट की प्रतीक्षा में",
  meetings_by_day: "दिन के अनुसार मीटिंग",
  meetings_by_day_sub: "समय · मिलने वाले व्यक्ति के साथ टाइमलाइन कार्ड",
  stage_counts: "चरण गणना",
  stage_counts_today_sub: "आज की विज़िटर संख्या चरण अनुसार",
  stage_counts_for: "{date} की गणना",
  stage_counts_sub: "चरण अनुसार विज़िटर संख्या",
  total_visitors: "कुल विज़िटर",
  active_inside: "अंदर सक्रिय",
  hint_pending_approval: "अप्रूवल की प्रतीक्षा",
  hint_approved: "अप्रूव्ड, अभी चेक-इन नहीं",
  hint_checked_in: "वर्तमान में परिसर में",
  hint_meeting_done: "मीटिंग पूर्ण",
  hint_checkout_pending: "गेट चेकआउट की प्रतीक्षा",
  hint_checked_out: "विज़िट पूर्ण और बाहर",
  hint_rejected: "विज़िट की अनुमति नहीं",
  hint_transferred: "होस्ट बदला गया",
  live_queue: "लाइव कतार",
  checkout_pending_queue_sub:
    "जिन विज़िटर की मीटिंग पूर्ण हो चुकी है और वे अभी भी परिसर में गेट चेकआउट की प्रतीक्षा कर रहे हैं।",
  pending_count_label: "पेंडिंग",
  loading_checkout_queue: "चेकआउट कतार लोड हो रही…",
  no_checkout_pending: "कोई चेकआउट पेंडिंग नहीं",
  no_checkout_pending_sub: "मीटिंग पूर्ण करने वाले सभी विज़िटर चेक-आउट हो चुके हैं।",
  waiting_label: "प्रतीक्षा",
  awaiting_checkout: "चेकआउट की प्रतीक्षा",
  view: "देखें",
  checking_out: "चेक-आउट हो रहा…",
};

const mr: UiDict = {
  language: "भाषा",
  calendar_view: "कॅलेंडर दृश्य",
  todays_schedule: "आजचे वेळापत्रक",
  settings: "सेटिंग्ज",
  setup_alerts: "गेट अलर्ट सेटअप करा",
  setup_alerts_hint: "विजिटर मंजुरीसाठी नोटिफिकेशन आणि आवाज सुरू करा",
  setup_alerts_denied: "नोटिफिकेशन ब्लॉक — सेटअपसाठी टॅप करा",
  alerts: "अलर्ट",
  required: "सेटअप",
  account: "खाते",
  appearance: "दिसणे",
  tools: "साधने",
  profile: "प्रोफाइल",
  logout: "लॉग आउट",
  sign_in: "साइन इन",
  home: "होम",
  visitors: "अभ्यागत",
  history: "इतिहास",
  inside: "आत",
  add_entry: "नोंद जोडा",
  pending: "प्रलंबित",
  reports: "अहवाल",
  lang_confirm_title: "भाषा बदलायची?",
  lang_confirm_body: "अॅपची भाषा {from} वरून {to} मध्ये बदलायची?",
  yes: "होय",
  no: "नाही",
  select_language: "भाषा निवडा",
  employee_id: "कर्मचारी आयडी",
  email: "ईमेल",
  department: "विभाग",
  live_gate_desk: "लाईव्ह गेट डेस्क",
  refresh: "रिफ्रेश",
  refreshing: "रिफ्रेश होत आहे…",
  current_shift: "सध्याची शिफ्ट",
  current_time: "सध्याची वेळ",
  todays_visitors: "आजचे अभ्यागत",

  brand_title: "Precious Alloys",
  main_gate_desk: "मुख्य गेट डेस्क",

  status_overview: "स्थिती आढावा",
  status_overview_sub: "टप्प्यानुसार आजचे अभ्यागत",
  today: "आज",
  needs_action: "कृती आवश्यक",
  awaiting_gate: "गेटची प्रतीक्षा",
  recent_visitors: "अलीकडील अभ्यागत",
  view_all: "सर्व पहा ›",
  loading_visitors: "अभ्यागत लोड होत आहेत…",
  view_visitor_history: "अभ्यागत इतिहास पहा",
  loading: "लोड होत आहे…",

  status_pending_approval: "मंजुरी बाकी",
  status_pending: "प्रलंबित",
  status_approved: "मंजूर",
  status_checked_in: "चेक-इन",
  status_checked_in_short: "चेक-इन",
  status_meeting_done: "मीटिंग पूर्ण",
  status_checked_out: "चेक-आउट",
  status_checked_out_short: "चेक-आउट",
  status_checkout_pending: "चेकआउट बाकी",
  status_rejected: "नाकारले",
  status_transferred: "हस्तांतरित",
  status_checkout: "चेकआउट",

  approvals_queue: "मंजुरी रांग",
  search_visitor_host_company: "अभ्यागत, यजमान किंवा कंपनी शोधा...",
  tab_all: "सर्व",
  tab_pending: "प्रलंबित",
  tab_approved: "मंजूर",
  tab_inside: "आत",
  filter_today: "आज",
  filter_yesterday: "काल",
  filter_this_week: "या आठवड्यात",
  filter_clear: "साफ करा",
  no_tab_items: "{label} आयटम नाहीत",
  host_prefix: "यजमान:",
  label_visitors: "अभ्यागत",
  label_purpose: "उद्देश",
  label_floor: "मजला",
  floor_n: "मजला {n}",
  floor_suffix: "मजला",
  action_reject: "नाकारा",
  action_accept: "स्वीकारा",
  action_transfer: "हस्तांतरण",
  action_call_host: "यजमानाला कॉल",
  action_notify: "सूचित करा",
  action_view_gate_pass: "गेट पास पहा",
  action_check_in: "चेक-इन",
  action_meeting_done: "मीटिंग पूर्ण",
  action_check_out: "चेक-आउट",
  reason_prefix: "कारण:",

  live_visitors: "लाईव्ह अभ्यागत",
  on_premises: "परिसरात",
  search_visitor_or_host: "अभ्यागत किंवा यजमान शोधा",
  badge_in: "आत",
  badge_checkout: "चेकआउट",
  badge_pending: "प्रलंबित",
  badge_approved: "मंजूर",
  badge_rejected: "नाकारले",
  badge_transferred: "हस्तांतरित",
  range_toggle_label: "अभ्यागत कालावधी",
  range_overall: "एकूण",
  range_last_7_days: "गेल्या ७ दिवस",
  select_date: "तारीख",
  select_date_time: "तारीख निवडा",
  done: "झाले",

  stage_visitor_entry: "अभ्यागत नोंद",
  stage_approved: "मंजूर",
  stage_checked_in: "चेक-इन",
  stage_meeting_done: "मीटिंग पूर्ण",
  stage_checked_out: "चेक-आउट",
  stage_rejected: "नाकारले",

  reports_title: "अहवाल",
  visitor_analytics: "अभ्यागत विश्लेषण",
  analytics_eyebrow: "विश्लेषण",
  live_pill: "लाईव्ह",
  historic_pill: "जुने",
  tab_overview: "आढावा",
  checkout_pending_report: "चेकआउट प्रलंबित अहवाल",
  checkout_pending_visitors: "{n} अभ्यागत गेट चेकआउटची वाट पाहत आहेत",
  checkout_pending_visitor_one: "{n} अभ्यागत गेट चेकआउटची वाट पाहत आहे",
  meetings_by_day: "दिवसानुसार मीटिंग",
  meetings_by_day_sub: "वेळ · भेटायच्या व्यक्तीसह टाइमलाइन कार्ड",
  stage_counts: "टप्पा संख्या",
  stage_counts_today_sub: "टप्प्यानुसार आजचे अभ्यागत",
  stage_counts_for: "{date} ची संख्या",
  stage_counts_sub: "टप्प्यानुसार अभ्यागत संख्या",
  total_visitors: "एकूण अभ्यागत",
  active_inside: "आत सक्रिय",
  hint_pending_approval: "मंजुरीची प्रतीक्षा",
  hint_approved: "मंजूर, अजून चेक-इन नाही",
  hint_checked_in: "सध्या परिसरात",
  hint_meeting_done: "मीटिंग पूर्ण",
  hint_checkout_pending: "गेट चेकआउटची प्रतीक्षा",
  hint_checked_out: "भेट पूर्ण आणि बाहेर",
  hint_rejected: "भेटला परवानगी नाही",
  hint_transferred: "यजमान बदलला",
  live_queue: "लाईव्ह रांग",
  checkout_pending_queue_sub:
    "ज्या अभ्यागतांची मीटिंग पूर्ण झाली आहे आणि ते अजूनही परिसरात गेट चेकआउटची वाट पाहत आहेत.",
  pending_count_label: "प्रलंबित",
  loading_checkout_queue: "चेकआउट रांग लोड होत आहे…",
  no_checkout_pending: "चेकआउट प्रलंबित नाही",
  no_checkout_pending_sub: "मीटिंग पूर्ण झालेल्या सर्व अभ्यागतांचे चेक-आउट झाले आहे.",
  waiting_label: "प्रतीक्षा",
  awaiting_checkout: "चेकआउटची प्रतीक्षा",
  view: "पहा",
  checking_out: "चेक-आउट होत आहे…",
};

const TABLES: Record<VisitorLang, UiDict> = { en, hi, mr };

export type UiCopyKey = keyof typeof en;

export function langLabel(code: VisitorLang): string {
  return VISITOR_LANGS.find((l) => l.code === code)?.label || code;
}

export function ut(lang: VisitorLang, key: UiCopyKey, vars?: Record<string, string>): string {
  let raw = TABLES[lang]?.[key] || TABLES.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      raw = raw.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
  }
  return raw;
}

/** Map ERPNext visitor status (or short display label) to localized UI copy. */
export function translateVisitorStatus(
  lang: VisitorLang,
  status?: string | null,
  opts?: { short?: boolean },
): string {
  if (!status) return "—";
  const short = opts?.short === true;
  switch (status) {
    case "Pending Approval":
      return ut(lang, short ? "status_pending" : "status_pending_approval");
    case "Pending":
      return ut(lang, "status_pending");
    case "Approved":
      return ut(lang, "status_approved");
    case "Checked In":
      return ut(lang, short ? "status_checked_in_short" : "status_checked_in");
    case "Checked-in":
      return ut(lang, "status_checked_in_short");
    case "Meeting Done":
      return ut(lang, "status_meeting_done");
    case "Checked Out":
      return ut(lang, short ? "status_checked_out_short" : "status_checked_out");
    case "Checked-out":
      return ut(lang, "status_checked_out_short");
    case "Checkout Pending":
      return ut(lang, "status_checkout_pending");
    case "Rejected":
      return ut(lang, "status_rejected");
    case "Transferred":
      return ut(lang, "status_transferred");
    case "Checkout":
      return ut(lang, "status_checkout");
    default:
      return status;
  }
}

/** Short badge labels for live visitor list cards. */
export function translateListBadge(
  lang: VisitorLang,
  status?: string | null,
  transferred?: boolean,
): string {
  if (transferred) return ut(lang, "badge_transferred");
  switch (status) {
    case "Pending Approval":
    case "Pending":
      return ut(lang, "badge_pending");
    case "Approved":
      return ut(lang, "badge_approved");
    case "Checked Out":
    case "Meeting Done":
      return ut(lang, "badge_checkout");
    case "Checked In":
      return ut(lang, "badge_in");
    case "Rejected":
      return ut(lang, "badge_rejected");
    default:
      return status ? status.toUpperCase() : "—";
  }
}

const STAGE_KEY_MAP: Record<string, UiCopyKey> = {
  visitor_entry: "stage_visitor_entry",
  approved: "stage_approved",
  checked_in: "stage_checked_in",
  meeting_done: "stage_meeting_done",
  checked_out: "stage_checked_out",
  rejected: "stage_rejected",
};

export function translateVisitStage(lang: VisitorLang, stageKey: string, fallback: string): string {
  const copyKey = STAGE_KEY_MAP[stageKey];
  if (!copyKey) return fallback;
  return ut(lang, copyKey);
}
