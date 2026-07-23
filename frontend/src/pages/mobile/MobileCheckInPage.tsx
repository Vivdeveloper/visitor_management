import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { uploadPublicFile } from "@/api/upload";
import { securityApi, visitorApi } from "@/api/vms";

/** Test OTP for check-in registration (no backend login). */
const TEST_OTP = "12345";

type Step = "mobile" | "otp" | "details";

function normalizeMobile(raw: string): string {
  return raw.replace(/[\s\-()+]/g, "");
}

function validateMobile(raw: string): string {
  const mobile = normalizeMobile(raw);
  const last10 = mobile.slice(-10);
  if (!/^\d{10}$/.test(last10)) {
    throw new Error("Enter a valid 10-digit mobile number");
  }
  if (!/^[6-9]\d{9}$/.test(last10)) {
    throw new Error("Mobile number must start with 6, 7, 8, or 9");
  }
  return last10;
}

function stepClass(current: Step, target: Step, verified: boolean): string {
  if (current === target) return "active";
  if (target === "mobile" && (verified || current === "otp" || current === "details")) return "done";
  if (target === "otp" && verified) return "done";
  return "";
}

function splitFullName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

export function MobileCheckInPage() {
  const navigate = useNavigate();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("mobile");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    mobile: "",
    email: "",
    visitor_company: "",
    id_proof_type: "",
    vehicle_number: "",
    gender: "",
    visitor_location: "",
    person_to_meet: "",
    floor: "",
    visit_purpose_type: "",
    number_of_visitors: "1",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onPhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    setError(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function onSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const mobile = validateMobile(form.mobile);
      setField("mobile", mobile);
      setOtp("");
      setStep("otp");
      setMessage(`OTP sent to ${mobile}. Use test OTP: ${TEST_OTP}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid mobile");
    }
  }

  function onVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (otp.trim() !== TEST_OTP) {
      setError(`Invalid OTP. For testing use ${TEST_OTP}`);
      return;
    }
    setOtpVerified(true);
    setMessage("Mobile verified");
    setStep("details");
  }

  async function onSubmitDetails(e: FormEvent) {
    e.preventDefault();
    if (!otpVerified) {
      setError("Verify mobile OTP before continuing");
      setStep("mobile");
      return;
    }

    const { first_name, last_name } = splitFullName(form.full_name);
    if (!first_name) {
      setError("Full name is required");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const mobile = validateMobile(form.mobile);
      let photo: string | undefined;
      if (photoFile) {
        photo = await uploadPublicFile(photoFile);
      }

      const created = (await visitorApi.create({
        mobile,
        email: form.email || undefined,
        photo,
        first_name,
        last_name: last_name || undefined,
        gender: form.gender || undefined,
        visitor_company: form.visitor_company || undefined,
        id_proof_type: form.id_proof_type || undefined,
        visitor_location: form.visitor_location || undefined,
        vehicle_number: form.vehicle_number || undefined,
        person_to_meet: form.person_to_meet || undefined,
        floor: form.floor || undefined,
        visit_purpose_type: form.visit_purpose_type || undefined,
        number_of_visitors: Number(form.number_of_visitors) || 1,
        otp_verified: 1,
        status: "Pending Approval",
      })) as { name?: string };

      const name = created.name;
      if (!name) {
        throw new Error("Visitor created but name missing");
      }

      const checked = (await securityApi.checkIn(name)) as { pass_url?: string };
      if (checked.pass_url) {
        navigate(`/pass/${encodeURIComponent(name)}`, { replace: true });
      } else {
        navigate("/inside", { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  }

  function bumpVisitors(delta: number) {
    const next = Math.max(1, (Number(form.number_of_visitors) || 1) + delta);
    setField("number_of_visitors", String(next));
  }

  return (
    <section className="m-page">
      <h1>New Check-in</h1>
      <p className="m-sub">
        {step === "details"
          ? "Complete visitor details — gate pass generates on check-in."
          : "Verify mobile with OTP before filling visitor details."}
      </p>

      <div className="gp-steps">
        <span className={stepClass(step, "mobile", otpVerified)}>1 · Mobile</span>
        <span className={stepClass(step, "otp", otpVerified)}>2 · OTP</span>
        <span className={stepClass(step, "details", otpVerified)}>3 · Details</span>
      </div>

      {step === "mobile" ? (
        <form className="gp-form" onSubmit={onSendOtp}>
          <fieldset>
            <legend>Mobile verification</legend>
            <label>
              Mobile number <span className="req">*</span>
              <input
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile"
                value={form.mobile}
                onChange={(e) => setField("mobile", e.target.value)}
              />
            </label>
            <p className="m-sub">Enter a valid Indian mobile (starts with 6–9).</p>
          </fieldset>
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" className="gp-submit">
            Send OTP
          </button>
        </form>
      ) : null}

      {step === "otp" ? (
        <form className="gp-form" onSubmit={onVerifyOtp}>
          <fieldset>
            <legend>Enter OTP</legend>
            <p className="m-sub">
              Sent to <strong>{form.mobile}</strong>
            </p>
            <label>
              OTP <span className="req">*</span>
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="5-digit OTP"
                maxLength={5}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 5))}
              />
            </label>
            <p className="dev-otp">Test OTP: {TEST_OTP}</p>
          </fieldset>
          {message ? <p className="login-msg">{message}</p> : null}
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" className="gp-submit">
            Verify OTP
          </button>
          <button
            type="button"
            className="linkish"
            onClick={() => {
              setStep("mobile");
              setOtp("");
              setError(null);
              setMessage(null);
            }}
          >
            Change mobile
          </button>
        </form>
      ) : null}

      {step === "details" ? (
        <form className="gp-form" onSubmit={onSubmitDetails}>
          <fieldset>
            <legend>Visitor details</legend>

            <div className="gp-visitor-top">
              <button
                type="button"
                className="gp-photo-pick"
                onClick={() => photoInputRef.current?.click()}
                aria-label="Capture visitor photo"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Visitor" />
                ) : (
                  <span className="gp-photo-placeholder">Photo</span>
                )}
                <span className="gp-photo-cam" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="sr-only"
                onChange={onPhotoPick}
              />

              <div className="gp-visitor-top-fields">
                <label>
                  Full name <span className="req">*</span>
                  <input
                    required
                    placeholder="Rahul Mehta"
                    value={form.full_name}
                    onChange={(e) => setField("full_name", e.target.value)}
                  />
                </label>
                <label>
                  Mobile number <span className="req">*</span>
                  <input value={form.mobile} readOnly />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    placeholder="name@email.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </label>
              </div>
            </div>

            <label>
              Company name
              <input
                placeholder="Company"
                value={form.visitor_company}
                onChange={(e) => setField("visitor_company", e.target.value)}
              />
            </label>
            <label>
              ID proof type
              <input
                placeholder="Aadhaar Card / PAN / DL"
                value={form.id_proof_type}
                onChange={(e) => setField("id_proof_type", e.target.value)}
              />
            </label>
            <label>
              Vehicle number
              <input
                placeholder="MH01AB1234"
                value={form.vehicle_number}
                onChange={(e) => setField("vehicle_number", e.target.value)}
              />
            </label>
            <label>
              Gender
              <input
                placeholder="Male / Female / Other"
                value={form.gender}
                onChange={(e) => setField("gender", e.target.value)}
              />
            </label>
            <label>
              Address
              <textarea
                className="gp-textarea"
                rows={2}
                placeholder="Visitor location / address"
                value={form.visitor_location}
                onChange={(e) => setField("visitor_location", e.target.value)}
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>Visit details</legend>
            <label>
              Meet to (employee / user) <span className="req">*</span>
              <input
                required
                placeholder="user@example.com"
                value={form.person_to_meet}
                onChange={(e) => setField("person_to_meet", e.target.value)}
              />
            </label>
            <label>
              Floor
              <input
                placeholder="Floor"
                value={form.floor}
                onChange={(e) => setField("floor", e.target.value)}
              />
            </label>
            <label>
              Purpose of visit
              <input
                placeholder="Business Meeting"
                value={form.visit_purpose_type}
                onChange={(e) => setField("visit_purpose_type", e.target.value)}
              />
            </label>
            <label>
              Number of visitors
              <div className="gp-stepper">
                <button type="button" onClick={() => bumpVisitors(-1)} aria-label="Decrease">
                  −
                </button>
                <input
                  inputMode="numeric"
                  value={form.number_of_visitors}
                  onChange={(e) => setField("number_of_visitors", e.target.value)}
                />
                <button type="button" onClick={() => bumpVisitors(1)} aria-label="Increase">
                  +
                </button>
              </div>
            </label>
          </fieldset>

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" className="gp-submit" disabled={busy}>
            {busy ? "Checking in…" : "Continue"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
