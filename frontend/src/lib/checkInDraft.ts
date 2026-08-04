import type { AdditionalGuest } from "@/lib/additionalGuests";

const DRAFT_KEY = "vms_checkin_draft";
const DRAFT_VERSION = 1 as const;

export type CheckInDraftStep =
  | "mobile"
  | "otp"
  | "details"
  | "awaiting"
  | "ready"
  | "pass"
  | "meeting"
  | "checkout";

export type CheckInDraftForm = {
  first_name: string;
  middle_name: string;
  last_name: string;
  mobile: string;
  email: string;
  gender: string;
  visitor_company: string;
  visitor_location: string;
  person_to_meet: string;
  visit_purpose_type: string;
  visit_purpose_other: string;
  number_of_visitors: string;
  id_proof_type: string;
  vehicle_type: string;
  vehicle_number: string;
};

export type CheckInDraft = {
  version: typeof DRAFT_VERSION;
  step: CheckInDraftStep;
  form: CheckInDraftForm;
  otpVerified: boolean;
  additionalGuests: AdditionalGuest[];
  photoDataUrl: string | null;
  idProofDataUrl: string | null;
  visitorName: string | null;
  passUrl: string | null;
  submittedAt: string | null;
  savedAt: number;
};

export function emptyCheckInForm(): CheckInDraftForm {
  return {
    first_name: "",
    middle_name: "",
    last_name: "",
    mobile: "",
    email: "",
    gender: "",
    visitor_company: "",
    visitor_location: "",
    person_to_meet: "",
    visit_purpose_type: "",
    visit_purpose_other: "",
    number_of_visitors: "1",
    id_proof_type: "",
    vehicle_type: "",
    vehicle_number: "",
  };
}

export function loadCheckInDraft(): CheckInDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckInDraft;
    if (parsed?.version !== DRAFT_VERSION || !parsed.form || !parsed.step) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCheckInDraft(draft: Omit<CheckInDraft, "version" | "savedAt">): void {
  try {
    const payload: CheckInDraft = {
      ...draft,
      version: DRAFT_VERSION,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearCheckInDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function dataUrlToFile(dataUrl: string, fileName: string): File | null {
  try {
    const [header, base64] = dataUrl.split(",");
    if (!base64) return null;
    const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mime });
  } catch {
    return null;
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/** True when draft has something worth restoring after refresh. */
export function draftHasProgress(draft: CheckInDraft | null): boolean {
  if (!draft) return false;
  if (draft.step !== "mobile") return true;
  if (draft.otpVerified) return true;
  if (draft.visitorName) return true;
  if (draft.photoDataUrl || draft.idProofDataUrl) return true;
  if (draft.additionalGuests.length > 0) return true;
  const f = draft.form;
  return Boolean(
    f.mobile.trim() ||
      f.first_name.trim() ||
      f.last_name.trim() ||
      f.person_to_meet.trim() ||
      f.visitor_company.trim() ||
      f.email.trim(),
  );
}
