import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { uploadPublicFile } from "@/api/upload";
import {
  authApi,
  meetingApi,
  passApi,
  securityApi,
  visitorApi,
} from "@/api/vms";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { VisitorWelcomePanel } from "@/pages/mobile/MobileWelcomePage";
import { VisitorDetailsForm } from "@/components/checkin/VisitorDetailsForm";
import { JourneyLangSwitcher } from "@/components/checkin/JourneyLangSwitcher";
import { CheckInSuccessCard } from "@/components/checkin/CheckInSuccessCard";
import { MeetingInProgressCard } from "@/components/checkin/MeetingInProgressCard";
import { CheckoutConfirmationCard } from "@/components/checkin/CheckoutConfirmationCard";
import { VisitorGatePassCard } from "@/components/pass/VisitorGatePassCard";
import {
  getStoredVisitorLang,
  setStoredVisitorLang,
  type VisitorLang,
  vt,
} from "@/i18n/visitorJourney";

type JourneyStep =
  | "welcome"
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

function formatMobileDisplay(mobile: string): string {
  const m = mobile.slice(-10);
  if (m.length !== 10) return mobile;
  return `+91 ${m.slice(0, 5)} ${m.slice(5)}`;
}

function extractError(err: unknown, lang: VisitorLang): string {
  if (err instanceof Error) return err.message;
  return vt(lang, "err_generic");
}

function formatTime(value?: string): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}



export function MobileCheckInPage() {
  const navigate = useNavigate();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [lang, setLang] = useState<VisitorLang>(() => getStoredVisitorLang());
  const [step, setStep] = useState<JourneyStep>("welcome");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [idProofPreview, setIdProofPreview] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState<string | null>(null);
  const [visitor, setVisitor] = useState<VisitorDoc | null>(null);
  const [passUrl, setPassUrl] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const [form, setForm] = useState({
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
    number_of_visitors: "1",
    id_proof_type: "",
    floor: "",
    vehicle_type: "",
    vehicle_number: "",
  });

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
    setForm((prev) => ({ ...prev, [key]: value }));
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
        } else if (step === "meeting" && doc.status === "Meeting Done") {
          setStep("checkout");
        } else if (step === "meeting" && doc.status === "Checked Out") {
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
  }, [visitorName, step, navigate]);





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

  async function onSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevOtp(null);
    setBusy(true);
    try {
      const mobile = validateMobile(form.mobile, lang);
      setField("mobile", mobile);
      const res = await authApi.sendOtp(mobile, "visitor_registration");
      setMessage(res.message || "OTP sent");
      if (res.otp) {
        setDevOtp(res.otp);
        setOtpDigits(res.otp.split("").slice(0, OTP_LEN));
      } else {
        setOtpDigits(Array(OTP_LEN).fill(""));
      }
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
      const mobile = validateMobile(form.mobile, lang);
      const res = await authApi.sendOtp(mobile, "visitor_registration");
      setMessage(res.message || vt(lang, "otp_resent"));
      if (res.otp) {
        setDevOtp(res.otp);
        setOtpDigits(res.otp.split("").slice(0, OTP_LEN));
      }
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
      await authApi.verifyOtp(form.mobile, otpValue, "visitor_registration");
      setOtpVerified(true);
      setMessage(vt(lang, "mobile_verified"));
      setStep("details");
    } catch (err: unknown) {
      setError(extractError(err, lang));
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
    if (!photoFile) {
      setError(vt(lang, "err_photo"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const mobile = validateMobile(form.mobile, lang);
      const photo = await uploadPublicFile(photoFile);
      let id_proof_photo: string | undefined;
      if (idProofFile) {
        id_proof_photo = await uploadPublicFile(idProofFile);
      }

      const created = (await visitorApi.create({
        mobile,
        photo,
        id_proof_photo,
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        email: form.email || undefined,
        gender: form.gender || undefined,
        visitor_company: form.visitor_company || undefined,
        visitor_location: form.visitor_location || undefined,
        person_to_meet: form.person_to_meet.trim(),
        floor: form.floor || undefined,
        visit_purpose_type: form.visit_purpose_type || undefined,
        id_proof_type: form.id_proof_type || undefined,
        vehicle_type: form.vehicle_type || undefined,
        vehicle_number: form.vehicle_number || undefined,
        number_of_visitors: Number(form.number_of_visitors) || 1,
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
          floor: form.floor,
          visit_purpose_type: form.visit_purpose_type,
          photo,
        },
      );
      setSubmittedAt(new Date().toISOString());
      setStep("awaiting");
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

  async function onRequestCheckout() {
    if (!visitorName) return;
    setBusy(true);
    setError(null);
    try {
      const doc = (await visitorApi.get(visitorName)) as VisitorDoc;
      setVisitor(doc);
      if (doc.status === "Approved") {
        setError("Please complete check-in at the gate before checkout.");
        return;
      }
      if (doc.status === "Checked In") {
        await meetingApi.complete(visitorName, "Visitor requested checkout");
      }
      const refreshed = (await visitorApi.get(visitorName)) as VisitorDoc;
      setVisitor(refreshed);
      setStep("checkout");
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
      navigate("/history", { replace: true });
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
  const company = visitor?.visitor_company || form.visitor_company || "—";
  const photoUrl = visitor?.photo || photoPreview;
  const checkInLabel = formatTime(visitor?.checked_in_on || visitor?.check_in || submittedAt || undefined);

  if (step === "welcome") {
    return (
      <section className="m-page vj-page vj-welcome-host">
        <VisitorWelcomePanel
          lang={lang}
          onLangChange={(next) => {
            setStoredVisitorLang(next);
            setLang(next);
          }}
          onGetStarted={() => setStep("mobile")}
        />
      </section>
    );
  }

  return (
    <section className="m-page vj-page">
      {step === "mobile" ? (
        <form className="vj-screen vm-verify-screen" onSubmit={(e) => void onSendOtp(e)} lang={lang}>
          <div className="vm-verify-lang-row">
            <JourneyLangSwitcher
              lang={lang}
              compact
              onChange={(next) => {
                setStoredVisitorLang(next);
                setLang(next);
              }}
            />
          </div>
          <div className="vm-verify-top">
            <BrandLogo variant="full" className="vj-welcome-logo" />
            <h1 className="vj-h2">{vt(lang, "verify_title")}</h1>
            <p className="vj-p">{vt(lang, "verify_sub")}</p>
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
            {busy ? vt(lang, "sending_otp") : vt(lang, "send_otp")}
          </button>
        </form>
      ) : null}

      {step === "otp" ? (
        <form className="vj-screen vm-verify-screen" onSubmit={(e) => void onVerifyOtp(e)} lang={lang}>
          <header className="vm-verify-header">
            <button
              type="button"
              className="vm-back-btn"
              onClick={() => {
                setStep("mobile");
                setOtpDigits(Array(OTP_LEN).fill(""));
                setError(null);
                setMessage(null);
              }}
              aria-label="Back to mobile"
            >
              ‹
            </button>
            <JourneyLangSwitcher
              lang={lang}
              compact
              onChange={(next) => {
                setStoredVisitorLang(next);
                setLang(next);
              }}
            />
          </header>

          <div className="vm-verify-top">
            <h1 className="vj-h2 vm-code-title">{vt(lang, "code_title")}</h1>
            <p className="vj-p">
              {vt(lang, "code_sub")} <strong>{formatMobileDisplay(form.mobile)}</strong>.
            </p>
          </div>

          {/* 6 OTP Code Boxes */}
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

          {devOtp ? <p className="dev-otp">Dev OTP: {devOtp}</p> : null}
          {message ? <p className="login-msg">{message}</p> : null}
          {error ? <p className="login-error">{error}</p> : null}

          <button
            type="submit"
            className={`vj-btn vm-verify-submit-btn${otpValue.length === OTP_LEN ? " is-active" : " is-disabled"}`}
            disabled={busy || otpValue.length !== OTP_LEN}
          >
            {busy ? vt(lang, "verifying") : vt(lang, "verify")}
          </button>
        </form>
      ) : null}

      {step === "details" ? (
        <div className="vm-home-page" lang={lang}>
          <header className="vm-page-header" style={{ justifyContent: "space-between", background: "transparent", border: "none", padding: "max(1.2rem, calc(env(safe-area-inset-top, 0px) + 0.5rem)) 0.25rem 0" }}>
            <button type="button" className="vm-back-btn" onClick={() => setStep("otp")} aria-label="Back">
              ‹
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "#EFF6FF", padding: "0.35rem 0.85rem", borderRadius: "20px" }}>
              <span style={{ color: "#2563EB", fontWeight: 800, fontSize: "0.85rem" }}>📋 3 {vt(lang, "details_filled")}</span>
            </div>
            <JourneyLangSwitcher
              lang={lang}
              compact
              onChange={(next) => {
                setStoredVisitorLang(next);
                setLang(next);
              }}
            />
          </header>

          <div style={{ display: "flex", gap: "0.35rem", margin: "0.75rem 0.25rem 1.25rem" }}>
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#2563EB", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#E2E8F0", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#E2E8F0", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#E2E8F0", borderRadius: "2px" }} />
            <div style={{ flex: 1, height: "4px", background: "#E2E8F0", borderRadius: "2px" }} />
          </div>

          <main className="vm-main-body" style={{ background: "#FFFFFF", borderRadius: "24px", padding: "1.5rem 1.25rem", border: "1px solid #E2E8F0" }}>
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
                number_of_visitors: form.number_of_visitors,
                id_proof_type: form.id_proof_type,
                floor: form.floor,
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
              onChange={(next) => {
                setStoredVisitorLang(next);
                setLang(next);
              }}
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
          <header className="vm-page-header" style={{ justifyContent: "space-between", background: "transparent", border: "none", padding: "max(1.2rem, calc(env(safe-area-inset-top, 0px) + 0.5rem)) 0.25rem 0" }}>
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

          <main className="vm-main-body" style={{ background: "#FFFFFF", borderRadius: "24px", padding: "1.5rem 1.25rem", border: "1px solid #E2E8F0" }}>
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
          <header className="vm-page-header" style={{ justifyContent: "space-between", background: "transparent", border: "none", padding: "max(1.2rem, calc(env(safe-area-inset-top, 0px) + 0.5rem)) 0.25rem 0" }}>
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
              hostName={hostName}
              department={visitor?.floor || form.floor || "—"}
              validUntil={visitor?.qr_expires_on ? formatTime(visitor.qr_expires_on) : vt(lang, "end_of_day")}
              checkInTime={checkInLabel}
              checkInLocation={vt(lang, "main_gate")}
              photoUrl={photoUrl}
              qrPayload={passUrl || (visitorName ? `${window.location.origin}/vms/pass/${encodeURIComponent(visitorName)}` : undefined)}
              busy={busy}
              onDownload={() => {
                if (passUrl) {
                  window.open(passUrl, "_blank");
                } else {
                  window.print();
                }
              }}
              onExit={() => navigate("/", { replace: true })}
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
          <header className="vm-page-header" style={{ justifyContent: "space-between", background: "transparent", border: "none", padding: "max(1.2rem, calc(env(safe-area-inset-top, 0px) + 0.5rem)) 0.25rem 0" }}>
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

          <main className="vm-main-body" style={{ background: "#FFFFFF", borderRadius: "24px", padding: "1.5rem 1.25rem", border: "1px solid #E2E8F0" }}>
            <MeetingInProgressCard
              hostName={hostName}
              department="Production Dept."
              checkInTime="23 Jul 2026, 09:15 AM"
              expectedCheckout="05:30 PM"
              expectedDuration="08:15 Hrs"
              busy={busy}
              onFinishMeeting={() => void onRequestCheckout()}
            />
            {error ? <p className="login-error" style={{ textAlign: "center", marginTop: "0.5rem" }}>{error}</p> : null}
          </main>
        </div>
      ) : null}

      {step === "checkout" ? (
        <div className="vm-home-page">
          {/* Header */}
          <header className="vm-page-header" style={{ justifyContent: "space-between", background: "transparent", border: "none", padding: "max(1.2rem, calc(env(safe-area-inset-top, 0px) + 0.5rem)) 0.25rem 0" }}>
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

          <main className="vm-main-body" style={{ background: "#FFFFFF", borderRadius: "24px", padding: "1.5rem 1.25rem", border: "1px solid #E2E8F0" }}>
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
