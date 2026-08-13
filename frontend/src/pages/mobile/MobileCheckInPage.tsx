import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useBlocker, useNavigate } from "react-router-dom";
import { uploadPublicFile } from "@/api/upload";
import * as msg91Otp from "@/services/msg91Otp";
import {
  meetingApi,
  otpApi,
  passApi,
  securityApi,
  visitorApi,
} from "@/api/vms";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { VisitorDetailsForm } from "@/components/checkin/VisitorDetailsForm";
import { JourneyLangSwitcher } from "@/components/checkin/JourneyLangSwitcher";
import { CheckInSuccessCard } from "@/components/checkin/CheckInSuccessCard";
import { MeetingInProgressCard } from "@/components/checkin/MeetingInProgressCard";
import { CheckoutConfirmationCard } from "@/components/checkin/CheckoutConfirmationCard";
import { DiscardEntryModal } from "@/components/checkin/DiscardEntryModal";
import { ResumeEntryModal } from "@/components/checkin/ResumeEntryModal";
import { AdditionalGuestsModal } from "@/components/checkin/AdditionalGuestsModal";
import { VisitorGatePassCard } from "@/components/pass/VisitorGatePassCard";
import {
  type VisitorLang,
  vt,
} from "@/i18n/visitorJourney";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePageChrome } from "@/context/PageChromeContext";
import { registerBackHandler, getSpaDepth } from "@/native/backNavigation";
import { resolveVisitPurposeType, VISIT_PURPOSE_OTHER_VALUE } from "@/lib/visitPurpose";
import { formatTime } from "@/lib/format";
import { autocorrectFormText, autocorrectPersonName } from "@/lib/nameCase";
import { canPerformCheckout } from "@/lib/roles";
import {
  clearCheckInDraft,
  dataUrlToFile,
  draftHasProgress,
  emptyCheckInForm,
  fileToDataUrl,
  loadCheckInDraft,
  saveCheckInDraft,
} from "@/lib/checkInDraft";
import {
  formatAdditionalGuestsRemarks,
  normalizeAdditionalGuests,
  validateAdditionalGuests,
  type AdditionalGuest,
} from "@/lib/additionalGuests";

type JourneyStep =
  | "mobile"
  | "otp"
  | "details"
  | "awaiting"
  | "ready"
  | "pass"
  | "meeting"
  | "checkout";

type VisitorDoc = {
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  mobile?: string;
  status?: string;
  company?: string;
  visitor_company?: string;
  person_to_meet?: string;
  person_to_meet_name?: string;
  floor?: string;
  visit_purpose_type?: string;
  pass_url?: string;
  check_in?: string;
  checked_in_on?: string;
  photo?: string;
  qr_expires_on?: string;
  email?: string;
  gender?: string;
  visitor_location?: string;
  id_proof_type?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  middle_name?: string;
};

const OTP_LEN = 6;

function normalizeMobile(raw: string): string {
  return raw.replace(/[\s\-()+]/g, "");
}

function validateMobile(raw: string, lang: VisitorLang): string {
  const mobile = normalizeMobile(raw);
  const last10 = mobile.slice(-10);
  if (!/^\d{10}$/.test(last10)) {
    throw new Error(vt(lang, "err_mobile"));
  }
  if (!/^[6-9]\d{9}$/.test(last10)) {
    throw new Error(vt(lang, "err_mobile_start"));
  }
  return last10;
}

function extractError(err: unknown, lang: VisitorLang): string {
  if (err instanceof Error) {
    if (err.message === "frappe.exceptions.PermissionError") {
      return "Permission denied. Security needs Create on Visitor Entry, and Select/Read on Visit Purpose Type, ID Proof Type, and Vehicle Type.";
    }
    return err.message;
  }
  return vt(lang, "err_generic");
}



export function MobileCheckInPage() {
  const navigate = useNavigate();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const allowLeaveRef = useRef(false);
  const [boot] = useState(() => {
    const draft = loadCheckInDraft();
    return { draft, resume: draftHasProgress(draft) };
  });
  const draftReadyRef = useRef(!boot.resume);
  const { lang, setLang } = useAppLanguage();
  const { user } = useAuth();
  const showCheckout = canPerformCheckout(user);
  const [step, setStep] = useState<JourneyStep>(() =>
    boot.resume && boot.draft ? boot.draft.step : "mobile",
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [otpVerified, setOtpVerified] = useState(() =>
    Boolean(boot.resume && boot.draft?.otpVerified),
  );
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [additionalGuests, setAdditionalGuests] = useState<AdditionalGuest[]>(() =>
    boot.resume && boot.draft ? boot.draft.additionalGuests : [],
  );
  const [additionalGuestsOpen, setAdditionalGuestsOpen] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(() => {
    if (!boot.resume || !boot.draft?.photoDataUrl) return null;
    return dataUrlToFile(boot.draft.photoDataUrl, "visitor-photo.jpg");
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(() =>
    boot.resume ? boot.draft?.photoDataUrl || null : null,
  );
  const [idProofFile, setIdProofFile] = useState<File | null>(() => {
    if (!boot.resume || !boot.draft?.idProofDataUrl) return null;
    return dataUrlToFile(boot.draft.idProofDataUrl, "id-proof.jpg");
  });
  const [idProofPreview, setIdProofPreview] = useState<string | null>(() =>
    boot.resume ? boot.draft?.idProofDataUrl || null : null,
  );
  const [visitorName, setVisitorName] = useState<string | null>(() =>
    boot.resume ? boot.draft?.visitorName || null : null,
  );
  const [visitor, setVisitor] = useState<VisitorDoc | null>(null);
  const [passUrl, setPassUrl] = useState<string | null>(() =>
    boot.resume ? boot.draft?.passUrl || null : null,
  );
  const [submittedAt, setSubmittedAt] = useState<string | null>(() =>
    boot.resume ? boot.draft?.submittedAt || null : null,
  );
  const [resumePromptOpen, setResumePromptOpen] = useState(boot.resume);

  const [form, setForm] = useState(() =>
    boot.resume && boot.draft ? { ...boot.draft.form } : emptyCheckInForm(),
  );

  const resetEntry = useCallback(() => {
    clearCheckInDraft();
    setStep("mobile");
    setBusy(false);
    setError(null);
    setOtpDigits(Array(OTP_LEN).fill(""));
    setOtpVerified(false);
    setOtpSuccess(false);
    setAdditionalGuests([]);
    setAdditionalGuestsOpen(false);
    setResendIn(0);
    setPhotoFile(null);
    setPhotoPreview(null);
    setIdProofFile(null);
    setIdProofPreview(null);
    setVisitorName(null);
    setVisitor(null);
    setPassUrl(null);
    setSubmittedAt(null);
    setForm(emptyCheckInForm());
    draftReadyRef.current = true;
  }, []);

  const leaveTo = useCallback((path: string) => {
    clearCheckInDraft();
    allowLeaveRef.current = true;
    navigate(path, { replace: true });
  }, [navigate]);

  const leaveCheckIn = useCallback(() => {
    clearCheckInDraft();
    allowLeaveRef.current = true;
    if (getSpaDepth() > 0) {
      navigate(-1);
      return;
    }
    navigate("/", { replace: true });
  }, [navigate]);

  const goBackInJourney = useCallback(() => {
    switch (step) {
      case "otp":
        setOtpDigits(Array(OTP_LEN).fill(""));
        setOtpSuccess(false);
        setOtpVerified(false);
        setError(null);
            setStep("mobile");
        return;
      case "details":
        setStep("otp");
        return;
      case "awaiting":
        setStep("details");
        return;
      case "ready":
        setStep("details");
        return;
      case "pass":
        setStep("ready");
        return;
      case "meeting":
        setStep("pass");
        return;
      case "checkout":
        setStep("meeting");
        return;
      case "mobile":
        leaveCheckIn();
        return;
      default: {
        const _exhaustive: never = step;
        return _exhaustive;
      }
    }
  }, [step, leaveCheckIn]);

  usePageChrome({
    title: "Add Entry",
    subtitle: "Visitor Entry & Desk Verification",
    showBack: step !== "otp",
    backTo: "/",
    onBack: goBackInJourney,
    showNotification: true,
    showProfile: true,
  });

  useEffect(() => {
    return registerBackHandler(() => {
      goBackInJourney();
      return true;
    });
  }, [goBackInJourney]);

  const hasEntryProgress =
    step !== "mobile" ||
    normalizeMobile(form.mobile).length > 0 ||
    Boolean(form.first_name.trim()) ||
    Boolean(form.last_name.trim()) ||
    Boolean(form.person_to_meet) ||
    Boolean(form.visitor_company.trim()) ||
    Boolean(form.visitor_location.trim()) ||
    Boolean(photoFile) ||
    Boolean(idProofFile) ||
    Boolean(visitorName);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowLeaveRef.current &&
      hasEntryProgress &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!hasEntryProgress) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasEntryProgress]);

  useEffect(() => {
    if (resumePromptOpen || !draftReadyRef.current) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        if (!hasEntryProgress && step === "mobile") {
          clearCheckInDraft();
          return;
        }

        let photoDataUrl = photoPreview?.startsWith("data:") ? photoPreview : null;
        let idProofDataUrl = idProofPreview?.startsWith("data:") ? idProofPreview : null;
        try {
          if (!photoDataUrl && photoFile) photoDataUrl = await fileToDataUrl(photoFile);
          if (!idProofDataUrl && idProofFile) idProofDataUrl = await fileToDataUrl(idProofFile);
        } catch {
          /* keep last known data urls */
        }

        saveCheckInDraft({
          step,
          form,
          otpVerified,
          additionalGuests,
          photoDataUrl,
          idProofDataUrl,
          visitorName,
          passUrl,
          submittedAt,
        });
      })();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    step,
    form,
    otpVerified,
    additionalGuests,
    photoFile,
    photoPreview,
    idProofFile,
    idProofPreview,
    visitorName,
    passUrl,
    submittedAt,
    resumePromptOpen,
    hasEntryProgress,
  ]);

function normalizePhotoToVertical(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const targetW = 600;
        const targetH = 800;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(file);
          return;
        }

        const srcAspect = img.width / img.height;
        const targetAspect = targetW / targetH;

        let drawW = img.width;
        let drawH = img.height;
        let srcX = 0;
        let srcY = 0;

        if (srcAspect > targetAspect) {
          drawW = img.height * targetAspect;
          srcX = (img.width - drawW) / 2;
        } else {
          drawH = img.width / targetAspect;
          srcY = (img.height - drawH) / 2;
        }

        ctx.drawImage(img, srcX, srcY, drawW, drawH, 0, 0, targetW, targetH);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const verticalFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_vertical.jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(verticalFile);
          },
          "image/jpeg",
          0.92,
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

  function setField(key: keyof typeof form, value: string) {
    if (key === "number_of_visitors") {
      const count = Math.max(1, parseInt(value, 10) || 1);
      setForm((prev) => ({ ...prev, [key]: value }));
      setAdditionalGuests((prev) => normalizeAdditionalGuests(prev, count));
      if (count > 1) {
        setAdditionalGuestsOpen(true);
      } else {
        setAdditionalGuests([]);
        setAdditionalGuestsOpen(false);
      }
      return;
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleAdditionalGuestsSave(guests: AdditionalGuest[]) {
    setAdditionalGuests(guests);
    setAdditionalGuestsOpen(false);
    setError(null);
  }

  async function onPhotoCapture(file: File) {
    try {
      const vertical = await normalizePhotoToVertical(file);
      setPhotoFile(vertical);
      setPhotoPreview(URL.createObjectURL(vertical));
    } catch {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  function onIdProofCapture(file: File) {
    setIdProofFile(file);
    setIdProofPreview(URL.createObjectURL(file));
  }

  const otpValue = otpDigits.join("");

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (!visitorName || (step !== "awaiting" && step !== "meeting" && step !== "ready")) return;
    let cancelled = false;

    async function poll() {
      try {
        const doc = (await visitorApi.get(visitorName!)) as VisitorDoc;
        if (cancelled) return;
        setVisitor(doc);
        if (doc.pass_url) setPassUrl(doc.pass_url);

        if (step === "awaiting" && doc.status === "Approved") {
          setStep("ready");
        } else if (step === "awaiting" && (doc.status === "Checked In" || doc.status === "Meeting Done")) {
          setStep("ready");
        } else if (step === "meeting" && doc.status === "Meeting Done" && showCheckout) {
          setStep("checkout");
        } else if (step === "meeting" && doc.status === "Checked Out") {
          allowLeaveRef.current = true;
          navigate("/history", { replace: true });
        }
      } catch {
        /* keep last known state */
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [visitorName, step, navigate, showCheckout]);





  function setOtpAt(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LEN - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function onOtpKeyDown(index: number, key: string) {
    if (key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function onOtpPaste(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, OTP_LEN).split("");
    if (!digits.length) return;
    setOtpDigits(Array(OTP_LEN).fill("").map((_, i) => digits[i] || ""));
    const focusAt = Math.min(digits.length, OTP_LEN - 1);
    otpRefs.current[focusAt]?.focus();
  }

  async function onContinueMobile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOtpVerified(false);
    setOtpSuccess(false);
    setBusy(true);
    try {
      const mobile = validateMobile(form.mobile, lang);
      setField("mobile", mobile);

      await msg91Otp.sendOtp(mobile);
      setOtpDigits(Array(OTP_LEN).fill(""));
      setResendIn(30);
      setStep("otp");
    } catch (err: unknown) {
      setError(extractError(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function onResendOtp() {
    if (resendIn > 0 || busy) return;
    setError(null);
    setBusy(true);
    try {
      validateMobile(form.mobile, lang);
      await msg91Otp.retryOtp();
      setResendIn(30);
    } catch (err: unknown) {
      setError(extractError(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (otpValue.length !== OTP_LEN) {
      setError(`Enter the ${OTP_LEN}-digit OTP`);
      return;
    }
    setBusy(true);
    try {
      // MSG91 checks the code, then the server validates the returned token —
      // only that second call actually marks the mobile verified.
      const accessToken = await msg91Otp.verifyOtp(otpValue);
      await otpApi.verify(accessToken, "visitor_registration");
      setOtpVerified(true);

      // Repeated visitor: autofill latest first / middle / last name.
      try {
        const mobile = validateMobile(form.mobile, lang);
        const profile = await visitorApi.getReturningProfile(mobile);
        if (profile?.found) {
          setForm((prev) => ({
            ...prev,
            first_name: prev.first_name.trim() || autocorrectPersonName(profile.first_name || ""),
            middle_name: prev.middle_name.trim() || autocorrectPersonName(profile.middle_name || ""),
            last_name: prev.last_name.trim() || autocorrectPersonName(profile.last_name || ""),
            // Keep optional identity fields if blank (name is the required autofill).
            email: prev.email.trim() || (profile.email || "").trim(),
            gender: prev.gender || (profile.gender || ""),
          }));
        }
      } catch {
        /* lookup is best-effort — blank form is fine for first-time visitors */
      }

      setOtpSuccess(true);
      setTimeout(() => {
        setStep("details");
      }, 750);
    } catch (err: unknown) {
      const raw = extractError(err, lang);
      if (raw.includes("500") || raw.includes("failed") || raw.includes("Invalid") || raw.includes("status code")) {
        setError("The OTP code entered is incorrect. Please enter the correct verification code.");
      } else {
        setError(raw);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitDetails(e: FormEvent) {
    e.preventDefault();
    if (!otpVerified) {
      setError(vt(lang, "err_verify_otp"));
      setStep("mobile");
      return;
    }

    if (!form.first_name.trim()) {
      setError(vt(lang, "err_first_name"));
      return;
    }
    if (!form.person_to_meet.trim()) {
      setError(vt(lang, "err_person"));
      return;
    }
    if (!photoFile && !photoPreview) {
      setError(vt(lang, "err_photo"));
      return;
    }
    const visitPurposeType = resolveVisitPurposeType(form.visit_purpose_type, form.visit_purpose_other);
    if (form.visit_purpose_type === VISIT_PURPOSE_OTHER_VALUE && !visitPurposeType) {
      setError(vt(lang, "err_purpose_other"));
      return;
    }

    const visitorCount = Math.max(1, Number(form.number_of_visitors) || 1);
    if (visitorCount > 1) {
      const slots = visitorCount - 1;
      if (additionalGuests.length !== slots) {
        setAdditionalGuests(normalizeAdditionalGuests(additionalGuests, visitorCount));
        setAdditionalGuestsOpen(true);
        setError("Please enter details for all additional visitors.");
        return;
      }
      const guestError = validateAdditionalGuests(additionalGuests);
      if (guestError) {
        setAdditionalGuestsOpen(true);
        setError(guestError);
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      const mobile = validateMobile(form.mobile, lang);
      let photo: string;
      if (photoFile) {
        photo = await uploadPublicFile(photoFile, mobile);
      } else {
        photo = (photoPreview || "").replace(/^\//, "");
      }
      let id_proof_photo: string | undefined;
      if (idProofFile) {
        id_proof_photo = await uploadPublicFile(idProofFile, mobile);
      }

      const remarks = visitorCount > 1 ? formatAdditionalGuestsRemarks(additionalGuests) : undefined;

      const created = (await visitorApi.create({
        mobile,
        photo,
        id_proof_photo,
        first_name: autocorrectPersonName(form.first_name),
        middle_name: autocorrectPersonName(form.middle_name) || undefined,
        last_name: autocorrectPersonName(form.last_name) || undefined,
        email: form.email.trim() || undefined,
        gender: form.gender || undefined,
        visitor_company: autocorrectFormText(form.visitor_company) || undefined,
        visitor_location: autocorrectFormText(form.visitor_location) || undefined,
        person_to_meet: form.person_to_meet.trim(),
        visit_purpose_type: visitPurposeType || undefined,
        id_proof_type: form.id_proof_type || undefined,
        vehicle_type: form.vehicle_type || undefined,
        vehicle_number: form.vehicle_number.trim().toUpperCase() || undefined,
        number_of_visitors: visitorCount,
        approval_remarks: remarks,
        otp_verified: 1,
      })) as { name?: string; visitor?: VisitorDoc };

      const name = created.name;
      if (!name) throw new Error("Visitor created but name missing");

      const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" ").trim();
      setVisitorName(name);
      setVisitor(
        created.visitor || {
          name,
          full_name: fullName,
          mobile,
          status: "Pending Approval",
          visitor_company: form.visitor_company,
          person_to_meet: form.person_to_meet.trim(),
          person_to_meet_name: form.person_to_meet.trim(),
          visit_purpose_type: visitPurposeType,
          photo,
        },
      );
      setSubmittedAt(new Date().toISOString());
      try {
        sessionStorage.setItem("vms_last_submitted_visitor", name);
      } catch {
        /* ignore storage errors */
      }
      leaveTo("/approvals");
    } catch (err: unknown) {
      setError(extractError(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function onProceedToGate() {
    if (!visitorName) return;
    setBusy(true);
    setError(null);
    try {
      const checked = (await securityApi.checkIn(visitorName)) as {
        pass_url?: string;
        status?: string;
      };
      if (checked.pass_url) setPassUrl(checked.pass_url);
      const doc = (await visitorApi.get(visitorName)) as VisitorDoc;
      setVisitor(doc);
      if (doc.pass_url) setPassUrl(doc.pass_url);
      setStep("ready");
    } catch (err: unknown) {
      setError(extractError(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function ensurePass() {
    if (!visitorName) return;
    if (passUrl || visitor?.pass_url) {
      setPassUrl(passUrl || visitor?.pass_url || null);
      return;
    }
    const generated = (await passApi.generate(visitorName)) as { pass_url?: string };
    if (generated.pass_url) setPassUrl(generated.pass_url);
  }

  async function onShowPass() {
    setBusy(true);
    setError(null);
    try {
      await ensurePass();
      if (visitorName) {
        const pass = (await passApi.get(visitorName)) as {
          pass_url?: string;
          company?: string;
        };
        if (pass.pass_url) setPassUrl(pass.pass_url);
        if (pass.company) {
          setVisitor((prev) => ({ ...(prev || {}), company: pass.company }));
        }
      }
      setStep("pass");
    } catch (err: unknown) {
      setError(extractError(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function onEnterMeeting() {
    setError(null);
    try {
      if (visitorName) {
        const doc = (await visitorApi.get(visitorName)) as VisitorDoc;
        setVisitor(doc);
      }
    } catch {
      /* ignore */
    }
    setStep("meeting");
  }

  async function onFinishMeeting() {
    if (!visitorName) return;
    setBusy(true);
    setError(null);
    try {
      const doc = (await visitorApi.get(visitorName)) as VisitorDoc;
      setVisitor(doc);
      if (doc.status === "Approved") {
        setError("Please complete check-in at the gate before finishing your meeting.");
        return;
      }
      if (doc.status === "Checked In") {
        await meetingApi.complete(visitorName, "Meeting completed via mobile");
      }
      const refreshed = (await visitorApi.get(visitorName)) as VisitorDoc;
      setVisitor(refreshed);
      if (showCheckout) {
        setStep("checkout");
      }
    } catch (err: unknown) {
      setError(extractError(err, lang));
    } finally {
      setBusy(false);
    }
  }

  async function onCompleteCheckout() {
    if (!visitorName) return;
    setBusy(true);
    setError(null);
    try {
      await securityApi.checkOut(visitorName, "Checked out via mobile");
      leaveTo("/history");
    } catch (err: unknown) {
      setError(extractError(err, lang));
    } finally {
      setBusy(false);
    }
  }

  const displayName =
    visitor?.full_name ||
    [visitor?.first_name, visitor?.last_name].filter(Boolean).join(" ") ||
    [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" ") ||
    "Visitor";
  const hostName = visitor?.person_to_meet_name || visitor?.person_to_meet || form.person_to_meet || "—";
  const company = visitor?.company || "—";
  const visitorCompany = visitor?.visitor_company || form.visitor_company || "—";
  const photoUrl = visitor?.photo || photoPreview;
  const checkInLabel = formatTime(visitor?.checked_in_on || visitor?.check_in || submittedAt || undefined);
  const meetingDone = visitor?.status === "Meeting Done";

  return (
    <section className="m-page vj-page">
      {step === "mobile" ? (
        <form className="vj-screen vm-verify-screen vm-mobile-minimal" onSubmit={(e) => void onContinueMobile(e)} lang={lang}>
          <div className="vm-login-logo-card">
            <BrandLogo variant="full" className="welcome-wordmark" alt="Precious Alloys" />
            <p className="vm-login-subtitle">Visitor Entry & Desk Verification</p>
          </div>

          <div className="vj-field vm-verify-field-group">
            <label className="vm-verify-label">{vt(lang, "mobile_label")}</label>
            <div className="vj-row vm-verify-row">
              <div className="vj-input vj-cc vm-verify-cc">+91</div>
              <input
                className="vj-input vm-verify-input"
                required
                inputMode="tel"
                autoComplete="tel"
                autoFocus
                placeholder="9876543210"
                value={form.mobile}
                onChange={(e) => setField("mobile", e.target.value)}
              />
            </div>
          </div>

          {error ? <p className="login-error">{error}</p> : null}

          <button
            type="submit"
            className={`vj-btn vm-verify-btn${form.mobile.length >= 10 ? " is-active" : " is-disabled"}`}
            disabled={busy || form.mobile.length < 10}
          >
            {busy ? "Please wait…" : "Continue"}
          </button>
        </form>
      ) : null}

      {step === "otp" ? (
        <form className="vj-screen vm-verify-screen vm-otp-screen" onSubmit={(e) => void onVerifyOtp(e)} lang={lang}>
          <header className="vm-page-header vm-checkin-step-header vm-otp-back-row">
            <button
              type="button"
              className="vm-back-btn"
              onClick={goBackInJourney}
              aria-label="Back to mobile number"
            >
              ‹
            </button>
            <div style={{ width: "24px" }} />
          </header>

          <div className="vm-verify-top">
            <h1 className="vj-h2 vm-code-title">{vt(lang, "code_title")}</h1>
          </div>

          <div className="vm-otp-grid-row" onPaste={(e) => onOtpPaste(e.clipboardData.getData("text"))}>
            {otpDigits.slice(0, 3).map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  otpRefs.current[i] = el;
                }}
                className={`vm-otp-box-dark${d ? " is-filled" : ""}${
                  otpDigits.findIndex((digit) => !digit) === i ? " is-focused" : ""
                }`}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={d}
                aria-label={`OTP digit ${i + 1}`}
                onChange={(e) => setOtpAt(i, e.target.value)}
                onKeyDown={(e) => onOtpKeyDown(i, e.key)}
              />
            ))}
            <span className="vm-otp-dash">—</span>
            {otpDigits.slice(3, 6).map((d, i) => {
              const idx = i + 3;
              return (
                <input
                  key={idx}
                  ref={(el) => {
                    otpRefs.current[idx] = el;
                  }}
                  className={`vm-otp-box-dark${d ? " is-filled" : ""}${
                    otpDigits.findIndex((digit) => !digit) === idx ? " is-focused" : ""
                  }`}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={1}
                  value={d}
                  aria-label={`OTP digit ${idx + 1}`}
                  onChange={(e) => setOtpAt(idx, e.target.value)}
                  onKeyDown={(e) => onOtpKeyDown(idx, e.key)}
                />
              );
            })}
          </div>

          <p className="vm-resend-timer-text">
            {resendIn > 0 ? (
              <>
                {vt(lang, "resend_in")} <strong>{`00:${String(resendIn).padStart(2, "0")}`}</strong>
              </>
            ) : (
              <button type="button" className="vj-link" onClick={() => void onResendOtp()}>
                {vt(lang, "resend_code")}
              </button>
            )}
          </p>


          {otpSuccess ? (
            <div className="vm-otp-success-badge" role="status">
              <span className="vm-otp-success-check">✓</span>
              <span>OTP verified successfully! Opening form...</span>
            </div>
          ) : null}

          {error ? <p className="login-error">{error}</p> : null}

          <button
            type="submit"
            className={`vj-btn vm-verify-submit-btn${otpValue.length === OTP_LEN ? " is-active" : " is-disabled"}`}
            disabled={busy || otpValue.length !== OTP_LEN || otpSuccess}
          >
            {busy ? vt(lang, "verifying") : otpSuccess ? "Verified ✓" : vt(lang, "verify")}
          </button>
        </form>
      ) : null}

      {step === "details" ? (
        <div className="vm-home-page" lang={lang}>
          <header className="vm-page-header vm-checkin-step-header" style={{ justifyContent: "flex-start", gap: "0.75rem" }}>
            <button
              type="button"
              className="vm-back-btn"
              onClick={() => setStep("otp")}
              aria-label="Back"
            >
              ‹
            </button>
            <h1 className="vj-h2" style={{ margin: 0, fontSize: "1.2rem" }}>Purpose</h1>
          </header>

          <main className="vm-main-body vm-form-surface">
            <VisitorDetailsForm
              lang={lang}
              values={{
                first_name: form.first_name,
                middle_name: form.middle_name,
                last_name: form.last_name,
                email: form.email,
                gender: form.gender,
                visitor_company: form.visitor_company,
                visitor_location: form.visitor_location,
                person_to_meet: form.person_to_meet,
                visit_purpose_type: form.visit_purpose_type,
                visit_purpose_other: form.visit_purpose_other,
                number_of_visitors: form.number_of_visitors,
                id_proof_type: form.id_proof_type,
                vehicle_type: form.vehicle_type,
                vehicle_number: form.vehicle_number,
              }}
              photoPreview={photoPreview}
              idProofPreview={idProofPreview}
              busy={busy}
              error={error}
              onChangeField={(field, val) => setField(field, val)}
              onPhotoCapture={onPhotoCapture}
              onIdProofCapture={onIdProofCapture}
              onSubmit={(e) => void onSubmitDetails(e)}
            />
            {Number(form.number_of_visitors) > 1 ? (
              <button
                type="button"
                className="vm-additional-guests-link"
                onClick={() => setAdditionalGuestsOpen(true)}
              >
                Edit additional visitor details ({Math.max(0, Number(form.number_of_visitors) - 1)})
              </button>
            ) : null}
          </main>
        </div>
      ) : null}

      {step === "awaiting" ? (
        <div className="vj-screen" lang={lang}>
          <div className="vj-topbar">
            <BrandLogo variant="mark" className="vj-brand-logo" />
            <div className="vj-brandtxt">
              {vt(lang, "request_status")}
              <span>{vt(lang, "live")}</span>
            </div>
            <JourneyLangSwitcher
              lang={lang}
              compact
              onChange={(next) => setLang(next)}
            />
          </div>
          <span className="vj-tag vj-tag-warn">⏳ {vt(lang, "awaiting_gate")}</span>
          <div className="vj-tl">
            <TlItem done title={vt(lang, "details_submitted")} sub={formatTime(submittedAt || undefined)} />
            <TlItem done title={vt(lang, "host_notified")} sub={hostName} />
            <TlItem active title={vt(lang, "awaiting_checkin")} sub={vt(lang, "proceed_gate_desk")} />
            <TlItem title={vt(lang, "inside")} sub={vt(lang, "pending")} muted />
          </div>
          <p className="vj-p vj-grow">{vt(lang, "security_will_checkin")}</p>
          {error ? <p className="login-error">{error}</p> : null}
          <button type="button" className="vj-btn" disabled={busy} onClick={() => void onProceedToGate()}>
            {busy ? vt(lang, "checking_in") : vt(lang, "proceed_to_gate")}
          </button>
        </div>
      ) : null}

      {step === "ready" ? (
        <div className="vm-home-page">
          {/* Header */}
          <header className="vm-page-header vm-checkin-step-header">
            <button type="button" className="vm-back-btn" onClick={() => setStep("details")} aria-label="Back">
              ‹
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#DCFCE7", padding: "0.35rem 0.85rem", borderRadius: "20px" }}>
              <span style={{ color: "#16A34A", fontWeight: 800, fontSize: "0.85rem" }}>✓ 5 {vt(lang, "check_in_step")}</span>
            </div>
            <div style={{ width: "24px" }} />
          </header>

          {/* Progress Step Line (5 steps filled) */}
          <div style={{ display: "flex", gap: "0.35rem", margin: "0.75rem 0.25rem 1.25rem" }}>
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#E2E8F0", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#E2E8F0", borderRadius: "2px" }} />
          </div>

          <main className="vm-main-body vm-form-surface">
            <CheckInSuccessCard
              hostName={hostName}
              department="Production Dept."
              checkInTime="23 Jul 2026, 09:15 AM"
              duration="06:15 Hrs"
              busy={busy}
              onGeneratePass={() => void onShowPass()}
            />
            {error ? <p className="login-error" style={{ textAlign: "center", marginTop: "0.5rem" }}>{error}</p> : null}
          </main>
        </div>
      ) : null}

      {step === "pass" ? (
        <div className="vm-home-page">
          {/* Header */}
          <header className="vm-page-header vm-checkin-step-header">
            <button type="button" className="vm-back-btn" onClick={() => setStep("ready")} aria-label="Back">
              ‹
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#EFF6FF", padding: "0.35rem 0.85rem", borderRadius: "20px" }}>
              <span style={{ color: "#2563EB", fontWeight: 800, fontSize: "0.85rem" }}>💳 6 {vt(lang, "gate_pass_step")}</span>
            </div>
            <div style={{ width: "24px" }} />
          </header>

          {/* Progress Step Line (6 steps filled) */}
          <div style={{ display: "flex", gap: "0.35rem", margin: "0.75rem 0.25rem 1.25rem" }}>
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#E2E8F0", borderRadius: "2px" }} />
          </div>

          <main className="vm-main-body">
            <VisitorGatePassCard
              passCode={visitorName ? `GP-${visitorName}` : "GP-—"}
              visitorName={displayName}
              company={company}
              visitorCompany={visitorCompany}
              hostName={hostName}
              department={visitor?.floor || "—"}
              floor={visitor?.floor || "—"}
              status={visitor?.status || "Approved"}
              validUntil={visitor?.qr_expires_on ? formatTime(visitor.qr_expires_on) : vt(lang, "end_of_day")}
              checkInTime={checkInLabel}
              checkInLocation={vt(lang, "main_gate")}
              photoUrl={photoUrl}
              qrPayload={passUrl || (visitorName ? `${window.location.origin}/vms/pass/${encodeURIComponent(visitorName)}` : undefined)}
              visitorCount={Number(form.number_of_visitors) || 1}
              additionalGuests={additionalGuests}
              busy={busy}
              onDownload={() => {
                if (passUrl) {
                  window.open(passUrl, "_blank");
                } else {
                  window.print();
                }
              }}
              onExit={() => leaveTo("/")}
            />
            <button
              type="button"
              className="vm-btn-outline"
              style={{ width: "100%", marginTop: "0.65rem", height: 48, borderRadius: 14 }}
              onClick={() => void onEnterMeeting()}
            >
              {vt(lang, "continue_meeting")}
            </button>
            {error ? <p className="login-error" style={{ textAlign: "center", marginTop: "0.5rem" }}>{error}</p> : null}
          </main>
        </div>
      ) : null}

      {step === "meeting" ? (
        <div className="vm-home-page">
          {/* Header */}
          <header className="vm-page-header vm-checkin-step-header">
            <button type="button" className="vm-back-btn" onClick={() => setStep("pass")} aria-label="Back">
              ‹
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#DCFCE7", padding: "0.35rem 0.85rem", borderRadius: "20px" }}>
              <span style={{ color: "#16A34A", fontWeight: 800, fontSize: "0.85rem" }}>👥 7 Meeting</span>
            </div>
            <div style={{ width: "24px" }} />
          </header>

          {/* Progress Step Line (7 steps filled) */}
          <div style={{ display: "flex", gap: "0.35rem", margin: "0.75rem 0.25rem 1.25rem" }}>
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
          </div>

          <main className="vm-main-body vm-form-surface">
            {meetingDone && !showCheckout ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "50%",
                    background: "#DCFCE7",
                    margin: "0.5rem auto 1rem",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "2.2rem",
                    color: "#16A34A",
                  }}
                >
                  ✓
                </div>
                <h1 className="vm-page-title" style={{ fontSize: "1.35rem", textAlign: "center", color: "#0F172A" }}>
                  Meeting Complete
                </h1>
                <p style={{ textAlign: "center", color: "#64748B", fontSize: "0.9rem", margin: "0.5rem 0 0" }}>
                  Security has been notified. Please proceed to the security desk for check-out.
                </p>
              </div>
            ) : (
              <MeetingInProgressCard
                hostName={hostName}
                department="Production Dept."
                checkInTime="23 Jul 2026, 09:15 AM"
                expectedCheckout="05:30 PM"
                expectedDuration="08:15 Hrs"
                busy={busy}
                onFinishMeeting={() => void onFinishMeeting()}
              />
            )}
            {error ? <p className="login-error" style={{ textAlign: "center", marginTop: "0.5rem" }}>{error}</p> : null}
          </main>
        </div>
      ) : null}

      {step === "checkout" && showCheckout ? (
        <div className="vm-home-page">
          {/* Header */}
          <header className="vm-page-header vm-checkin-step-header">
            <button type="button" className="vm-back-btn" onClick={() => setStep("meeting")} aria-label="Back">
              ‹
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#FFEDD5", padding: "0.35rem 0.85rem", borderRadius: "20px" }}>
              <span style={{ color: "#EA580C", fontWeight: 800, fontSize: "0.85rem" }}>🚪 8 Check-out</span>
            </div>
            <div style={{ width: "24px" }} />
          </header>

          {/* Progress Step Line (8 steps filled) */}
          <div style={{ display: "flex", gap: "0.35rem", margin: "0.75rem 0.25rem 1.25rem" }}>
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
          </div>

          <main className="vm-main-body vm-form-surface">
            <CheckoutConfirmationCard
              hostName={hostName}
              department="Production Dept."
              checkInTime="23 Jul 2026, 09:15 AM"
              expectedCheckout="05:30 PM"
              expectedDuration="08:15 Hrs"
              busy={busy}
              onConfirmCheckout={() => void onCompleteCheckout()}
              onCancel={() => setStep("meeting")}
            />
            {error ? <p className="login-error" style={{ textAlign: "center", marginTop: "0.5rem" }}>{error}</p> : null}
          </main>
        </div>
      ) : null}

      <AdditionalGuestsModal
        open={additionalGuestsOpen}
        visitorCount={Math.max(1, Number(form.number_of_visitors) || 1)}
        guests={additionalGuests}
        busy={busy}
        onClose={() => setAdditionalGuestsOpen(false)}
        onSave={handleAdditionalGuestsSave}
      />

      <ResumeEntryModal
        open={resumePromptOpen}
        onContinue={() => {
          draftReadyRef.current = true;
          setResumePromptOpen(false);
        }}
        onStartNew={() => {
          resetEntry();
          setResumePromptOpen(false);
        }}
      />

      <DiscardEntryModal
        open={blocker.state === "blocked"}
        onStay={() => {
          if (blocker.state === "blocked") blocker.reset();
        }}
        onLeave={() => {
          clearCheckInDraft();
          allowLeaveRef.current = true;
          if (blocker.state === "blocked") blocker.proceed();
        }}
      />
    </section>
  );
}

function TlItem({
  title,
  sub,
  done,
  active,
  muted,
}: {
  title: string;
  sub: string;
  done?: boolean;
  active?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`vj-tl-item${muted ? " muted" : ""}`}>
      <div className="vj-tl-rail">
        <div className={`vj-tl-dot${done ? " done" : ""}${active ? " active" : ""}`} />
        <div className="vj-tl-line" />
      </div>
      <div className="vj-tl-text">
        <b>{title}</b>
        {sub}
      </div>
    </div>
  );
}
