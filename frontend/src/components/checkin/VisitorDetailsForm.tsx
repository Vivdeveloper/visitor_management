import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { settingsApi, type HostOption, type MastersPayload } from "@/api/vms";
import { PhotoPreviewModal } from "@/components/common/PhotoPreviewModal";
import { SearchSelect } from "@/components/ui/SearchSelect";
import { ClickablePhotoPreview } from "@/components/ui/ClickablePhotoPreview";
import { VoiceDictationButton } from "@/components/ui/VoiceDictationButton";
import { type VisitorLang, vt } from "@/i18n/visitorJourney";
import { autocorrectFormText, autocorrectPersonName } from "@/lib/nameCase";
import {
  VISIT_PURPOSE_OTHER_VALUE,
  visitPurposeOtherText,
  visitPurposeSelectValue,
} from "@/lib/visitPurpose";

export type VisitorFormValues = {
  first_name: string;
  middle_name: string;
  last_name: string;
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

interface VisitorDetailsFormProps {
  lang?: VisitorLang;
  values: VisitorFormValues;
  photoPreview?: string | null;
  busy?: boolean;
  error?: string | null;
  onChangeField: (field: keyof VisitorFormValues, value: string) => void;
  onPhotoCapture: (file: File) => void;
  onIdProofCapture: (file: File) => void;
  idProofPreview?: string | null;
  onSubmit: (e: FormEvent) => void;
}

export function VisitorDetailsForm({
  lang = "en",
  values,
  photoPreview,
  idProofPreview,
  busy = false,
  error,
  onChangeField,
  onPhotoCapture,
  onIdProofCapture,
  onSubmit,
}: VisitorDetailsFormProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const idProofInputRef = useRef<HTMLInputElement>(null);

  const [hosts, setHosts] = useState<HostOption[]>([]);
  const [masters, setMasters] = useState<MastersPayload>({});
  const [loading, setLoading] = useState(true);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState("Photo preview");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Hosts = RPM approvers; masters = DocType link options (Gender, purpose, vehicle, ID).
        const [hostList, masterData] = await Promise.all([
          settingsApi.getHosts(),
          settingsApi.getMasters(),
        ]);
        if (cancelled) return;
        setHosts(Array.isArray(hostList) ? hostList : []);
        setMasters(masterData || {});
      } catch {
        /* keep empty masters */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function onFile(kind: "photo" | "id", fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (kind === "photo") onPhotoCapture(file);
    else onIdProofCapture(file);
  }

  const purposes = masters.visit_purpose_types || [];
  const idTypes = masters.id_proof_types || [];
  const vehicles = masters.vehicle_types || [];
  const genders = masters.genders || [];

  const genderOptions = useMemo(
    () => genders.map((g) => ({ value: g.name, label: g.name })),
    [genders],
  );

  const hostOptions = useMemo(
    () =>
      hosts.map((h) => ({
        value: h.value,
        label: h.label,
        sublabel: h.email && h.email !== h.label ? h.email : h.email || h.value,
      })),
    [hosts],
  );

  // If draft/stored Host id is a hash User, remap to email User.name from masters list.
  useEffect(() => {
    const current = (values.person_to_meet || "").trim();
    if (!current || !hosts.length) return;
    if (hosts.some((h) => h.value === current)) return;
    const byEmail = hosts.find((h) => (h.email || "") === current);
    if (byEmail) onChangeField("person_to_meet", byEmail.value);
  }, [hosts, values.person_to_meet, onChangeField]);

  const knownPurposeValues = useMemo(
    () => purposes.map((p) => p.name),
    [purposes],
  );

  const purposeOptions = useMemo(
    () => [
      ...purposes.map((p) => ({
        value: p.name,
        label: p.visit_purpose_type_name || p.name,
      })),
      { value: VISIT_PURPOSE_OTHER_VALUE, label: vt(lang, "visit_purpose_other_option") },
    ],
    [purposes, lang],
  );

  const purposeSelectValue = visitPurposeSelectValue(values.visit_purpose_type, knownPurposeValues);
  const purposeOtherValue = visitPurposeOtherText(
    values.visit_purpose_type,
    values.visit_purpose_other,
    knownPurposeValues,
  );
  const showPurposeOther = purposeSelectValue === VISIT_PURPOSE_OTHER_VALUE;

  const idProofOptions = useMemo(
    () =>
      idTypes.map((t) => ({
        value: t.name,
        label: t.id_proof_type_name || t.name,
      })),
    [idTypes],
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.name,
        label: v.vehicle_type_name || v.name,
      })),
    [vehicles],
  );

  const visitorDisplayName = [values.first_name, values.middle_name, values.last_name].filter(Boolean).join(" ") || "Visitor";

  function openPreview(src: string, alt: string) {
    setPreviewSrc(src);
    setPreviewAlt(alt);
  }

  const identityFields = (
    <div className="vm-form-section vm-form-section--identity">
      <div className="vm-form-section-head">
        <p className="vm-form-section-label">{vt(lang, "your_details")}</p>
        <VoiceDictationButton
          lang={lang}
          onNames={({ first_name, last_name }) => {
            onChangeField("first_name", first_name);
            onChangeField("last_name", last_name);
          }}
        />
      </div>
      <div className="vm-form-grid">
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "first_name")}</label>
          <input
            className="vm-input-field"
            required
            value={values.first_name}
            onChange={(e) => onChangeField("first_name", e.target.value)}
            onBlur={(e) => onChangeField("first_name", autocorrectPersonName(e.target.value))}
            autoComplete="given-name"
            autoCapitalize="words"
            aria-label={vt(lang, "first_name")}
          />
        </div>
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "middle_name")}</label>
          <input
            className="vm-input-field"
            value={values.middle_name}
            onChange={(e) => onChangeField("middle_name", e.target.value)}
            onBlur={(e) => onChangeField("middle_name", autocorrectPersonName(e.target.value))}
            autoCapitalize="words"
          />
        </div>
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "last_name")}</label>
          <input
            className="vm-input-field"
            value={values.last_name}
            onChange={(e) => onChangeField("last_name", e.target.value)}
            onBlur={(e) => onChangeField("last_name", autocorrectPersonName(e.target.value))}
            autoComplete="family-name"
            autoCapitalize="words"
            aria-label={vt(lang, "last_name")}
          />
        </div>
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "gender")}</label>
          <SearchSelect
            value={values.gender}
            options={genderOptions}
            onChange={(val) => onChangeField("gender", val)}
            placeholder={vt(lang, "select")}
            searchPlaceholder="Search gender"
            loading={loading}
            loadingText={vt(lang, "loading_hosts")}
            allowEmpty
            aria-label={vt(lang, "gender")}
          />
        </div>
      </div>

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "email")}</label>
        <input
          className="vm-input-field"
          type="email"
          value={values.email}
          onChange={(e) => onChangeField("email", e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </div>
    </div>
  );

  const visitFields = (
    <>
      <div className="vm-photo-capture">
        <ClickablePhotoPreview
          src={photoPreview}
          name={visitorDisplayName}
          emptyLabel={vt(lang, "no_photo")}
          alt="Visitor photo"
          onPreview={(src) => openPreview(src, "Visitor photo")}
        />
        <div className="vm-photo-actions">
          <p className="vm-form-label" style={{ margin: 0 }}>{vt(lang, "photo")}</p>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--vms-muted)" }}>
            {vt(lang, "photo_hint")}
          </p>
          <button type="button" className="vm-btn-outline" style={{ height: 44 }} onClick={() => photoInputRef.current?.click()}>
            {vt(lang, "open_camera")}
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={(e) => onFile("photo", e.target.files)}
          />
        </div>
      </div>

      {identityFields}

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "company")}</label>
        <input
          className="vm-input-field"
          value={values.visitor_company}
          onChange={(e) => onChangeField("visitor_company", e.target.value)}
          onBlur={(e) => onChangeField("visitor_company", autocorrectFormText(e.target.value))}
          autoCapitalize="words"
        />
      </div>

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "location")}</label>
        <input
          className="vm-input-field"
          value={values.visitor_location}
          onChange={(e) => onChangeField("visitor_location", e.target.value)}
          onBlur={(e) => onChangeField("visitor_location", autocorrectFormText(e.target.value))}
          autoCapitalize="words"
        />
      </div>

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "person_to_meet")}</label>
        <SearchSelect
          value={values.person_to_meet}
          options={hostOptions}
          onChange={(val) => onChangeField("person_to_meet", val)}
          placeholder={vt(lang, "select")}
          searchPlaceholder={vt(lang, "search_host")}
          loading={loading}
          loadingText={vt(lang, "loading_hosts")}
          emptyText={vt(lang, "no_hosts")}
          required
          allowEmpty
          aria-label={vt(lang, "person_to_meet")}
        />
      </div>

      <div className="vm-form-grid">
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "visit_purpose")}</label>
          <SearchSelect
            value={purposeSelectValue}
            options={purposeOptions}
            onChange={(val) => {
              onChangeField("visit_purpose_type", val);
              if (val !== VISIT_PURPOSE_OTHER_VALUE) {
                onChangeField("visit_purpose_other", "");
              }
            }}
            placeholder={vt(lang, "select")}
            searchPlaceholder="Search visit purpose"
            loading={loading}
            allowEmpty
            aria-label={vt(lang, "visit_purpose")}
          />
        </div>
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "num_visitors")}</label>
          <input
            className="vm-input-field"
            type="number"
            min={1}
            value={values.number_of_visitors}
            onChange={(e) => onChangeField("number_of_visitors", e.target.value)}
          />
        </div>
      </div>

      {showPurposeOther ? (
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "visit_purpose_other_label")}</label>
          <input
            className="vm-input-field"
            value={purposeOtherValue}
            onChange={(e) => {
              onChangeField("visit_purpose_type", VISIT_PURPOSE_OTHER_VALUE);
              onChangeField("visit_purpose_other", e.target.value);
            }}
            onBlur={(e) => {
              onChangeField("visit_purpose_type", VISIT_PURPOSE_OTHER_VALUE);
              onChangeField("visit_purpose_other", autocorrectFormText(e.target.value));
            }}
            placeholder={vt(lang, "visit_purpose_other_placeholder")}
            autoCapitalize="words"
            aria-label={vt(lang, "visit_purpose_other_label")}
          />
        </div>
      ) : null}

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "id_proof_type")}</label>
        <SearchSelect
          value={values.id_proof_type}
          options={idProofOptions}
          onChange={(val) => onChangeField("id_proof_type", val)}
          placeholder={vt(lang, "select")}
          searchPlaceholder="Search ID proof type"
          loading={loading}
          allowEmpty
          aria-label={vt(lang, "id_proof_type")}
        />
      </div>

      <div className="vm-photo-capture compact">
        <ClickablePhotoPreview
          src={idProofPreview}
          emptyLabel={vt(lang, "id_photo")}
          alt="ID proof photo"
          onPreview={(src) => openPreview(src, "ID proof photo")}
        />
        <div className="vm-photo-actions">
          <p className="vm-form-label" style={{ margin: 0 }}>{vt(lang, "id_proof_photo")}</p>
          <button type="button" className="vm-btn-outline" style={{ height: 40 }} onClick={() => idProofInputRef.current?.click()}>
            {vt(lang, "capture_id")}
          </button>
          <input
            ref={idProofInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => onFile("id", e.target.files)}
          />
        </div>
      </div>

      <div className="vm-form-grid">
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "vehicle_type")}</label>
          <SearchSelect
            value={values.vehicle_type}
            options={vehicleOptions}
            onChange={(val) => onChangeField("vehicle_type", val)}
            placeholder={vt(lang, "select")}
            searchPlaceholder="Search vehicle type"
            emptyLabel={vt(lang, "none")}
            loading={loading}
            allowEmpty
            aria-label={vt(lang, "vehicle_type")}
          />
        </div>
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "vehicle_number")}</label>
          <input
            className="vm-input-field"
            value={values.vehicle_number}
            onChange={(e) => onChangeField("vehicle_number", e.target.value)}
            onBlur={(e) => onChangeField("vehicle_number", e.target.value.trim().toUpperCase())}
            autoCapitalize="characters"
          />
        </div>
      </div>
    </>
  );

  return (
    <form onSubmit={onSubmit} className="vm-visitor-form" lang={lang}>
      <h1 className="vm-page-title" style={{ fontSize: "1.35rem", textAlign: "center" }}>
        {vt(lang, "details_title")}
      </h1>
      <p style={{ textAlign: "center", color: "var(--vms-muted)", fontSize: "0.85rem", margin: "0.3rem 0 1.1rem" }}>
        {vt(lang, "details_sub")}
      </p>

      {visitFields}

      {error ? <p className="login-error" style={{ textAlign: "center", marginTop: "0.5rem" }}>{error}</p> : null}

      <button type="submit" className="vm-btn-primary" disabled={busy} style={{ marginTop: "1.1rem" }}>
        {busy ? vt(lang, "submitting") : vt(lang, "continue")}
      </button>

      <PhotoPreviewModal src={previewSrc} alt={previewAlt} onClose={() => setPreviewSrc(null)} />
    </form>
  );
}
