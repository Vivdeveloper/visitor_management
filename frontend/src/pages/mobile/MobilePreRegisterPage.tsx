import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { visitorApi } from "@/api/vms";
import { extractError, splitFullName } from "@/lib/format";

export function MobilePreRegisterPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    mobile: "",
    visit_note: "",
    person_to_meet: "",
    visitor_company: "",
    floor: "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { first_name, last_name } = splitFullName(form.full_name);
    if (!first_name) {
      setError("Full name is required");
      return;
    }
    if (!form.mobile.trim()) {
      setError("Mobile number is required");
      return;
    }
    if (!form.person_to_meet.trim()) {
      setError("Person to meet is required");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const purpose = [form.visit_note.trim() ? `Pre-register: ${form.visit_note.trim()}` : "Pre-registered visit"]
        .filter(Boolean)
        .join(" · ");
      const created = (await visitorApi.create({
        mobile: form.mobile.trim(),
        first_name,
        last_name: last_name || undefined,
        person_to_meet: form.person_to_meet.trim(),
        visitor_company: form.visitor_company || undefined,
        floor: form.floor || undefined,
        visit_purpose_type: purpose,
        number_of_visitors: 1,
        status: "Pending Approval",
      })) as { name?: string; message?: string };

      setMessage(created.message || `Pre-registered ${created.name || ""}`.trim());
      if (created.name) {
        window.setTimeout(() => navigate("/inside"), 900);
      }
    } catch (err: unknown) {
      setError(extractError(err, "Pre-register failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="m-page ad-page">
      <div className="ad-dash-top">
        <h1 className="ad-title">Pre-register visitor</h1>
      </div>
      <p className="m-sub">Create a pending entry before the guest arrives at the gate.</p>

      <form className="ad-form" onSubmit={(e) => void onSubmit(e)}>
        <div className="ad-field">
          <label>Full name</label>
          <input
            className="ad-input"
            required
            value={form.full_name}
            onChange={(e) => setField("full_name", e.target.value)}
            placeholder="Ankit Sharma"
          />
        </div>
        <div className="ad-field">
          <label>Mobile number</label>
          <input
            className="ad-input"
            required
            inputMode="tel"
            value={form.mobile}
            onChange={(e) => setField("mobile", e.target.value)}
            placeholder="9123456780"
          />
        </div>
        <div className="ad-field">
          <label>Visit date / note</label>
          <input
            className="ad-input"
            value={form.visit_note}
            onChange={(e) => setField("visit_note", e.target.value)}
            placeholder="24 Jul 2026"
          />
        </div>
        <div className="ad-field">
          <label>Meet to</label>
          <input
            className="ad-input"
            required
            value={form.person_to_meet}
            onChange={(e) => setField("person_to_meet", e.target.value)}
            placeholder="host@company.com"
          />
        </div>
        <div className="ad-grid2">
          <div className="ad-field">
            <label>Company</label>
            <input
              className="ad-input"
              value={form.visitor_company}
              onChange={(e) => setField("visitor_company", e.target.value)}
              placeholder="Company"
            />
          </div>
          <div className="ad-field">
            <label>Floor</label>
            <input
              className="ad-input"
              value={form.floor}
              onChange={(e) => setField("floor", e.target.value)}
              placeholder="5th Floor"
            />
          </div>
        </div>
        {error ? <p className="login-error">{error}</p> : null}
        {message ? <p className="login-msg">{message}</p> : null}
        <button type="submit" className="ad-btn" disabled={busy}>
          {busy ? "Saving…" : "Pre-register"}
        </button>
      </form>
    </section>
  );
}
