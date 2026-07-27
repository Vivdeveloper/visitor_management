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
  live_gate_desk: "लाइव्ह गेट डेस्क",
  refresh: "रिफ्रेश",
  refreshing: "रिफ्रेश होत आहे…",
  current_shift: "सध्याची शिफ्ट",
  current_time: "सध्याची वेळ",
  todays_visitors: "आजचे अभ्यागत",
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
