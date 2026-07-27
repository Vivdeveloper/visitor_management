import { useEffect, useRef, useState, type FormEvent } from "react";
import { settingsApi, frappeGetList, type HostOption, type MastersPayload } from "@/api/vms";
import { type VisitorLang, vt } from "@/i18n/visitorJourney";

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
  number_of_visitors: string;
  id_proof_type: string;
  floor: string;
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
  const [genders, setGenders] = useState<Array<{ name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [hostList, masterData, genderList] = await Promise.all([
          settingsApi.getHosts(),
          settingsApi.getMasters(),
          frappeGetList<{ name: string }>({
            doctype: "Gender",
            fields: ["name"],
            limit_page_length: 20,
            order_by: "name asc",
          }).catch(() => []),
        ]);
        if (cancelled) return;
        setHosts(Array.isArray(hostList) ? hostList : []);
        setMasters(masterData || {});
        setGenders(genderList || []);

        if (hostList?.length && !values.person_to_meet) {
          onChangeField("person_to_meet", hostList[0].value);
        }
        const purposes = masterData?.visit_purpose_types || [];
        if (purposes.length && !values.visit_purpose_type) {
          onChangeField("visit_purpose_type", purposes[0].name);
        }
        const ids = masterData?.id_proof_types || [];
        if (ids.length && !values.id_proof_type) {
          onChangeField("id_proof_type", ids[0].name);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  function onFile(kind: "photo" | "id", fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (kind === "photo") onPhotoCapture(file);
    else onIdProofCapture(file);
  }

  const purposes = masters.visit_purpose_types || [];
  const idTypes = masters.id_proof_types || [];

  function extractFloorNo(raw?: string): string | null {
    const s = String(raw ?? "").trim();
    if (!s) return null;
    // Accept: "5", "5th Floor", "5th", "5 Floor", "Floor 5" (best-effort)
    const m1 = s.match(/^(\d+)\b/i);
    if (m1?.[1]) return m1[1];
    const m2 = s.match(/\b(\d+)\b/);
    if (m2?.[1]) return m2[1];
    return null;
  }

  function ordinal(n: number) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
    if (mod10 === 1) return `${n}st`;
    if (mod10 === 2) return `${n}nd`;
    if (mod10 === 3) return `${n}rd`;
    return `${n}th`;
  }

  const floorsFromMasters = masters.floors || [];
  const floors = (() => {
    type FloorOpt = { value: string; display: string; floorNo: number };
    const map = new Map<string, FloorOpt>();

    // 1. Process master floors from backend DB
    for (const f of floorsFromMasters) {
      const raw = (f.floor_name || f.name || "").trim();
      if (!raw) continue;
      const numStr = extractFloorNo(raw);
      const floorNo = numStr ? Number(numStr) : Number.MAX_SAFE_INTEGER;
      const display = f.floor_name || (numStr ? `${ordinal(Number(numStr))} Floor` : f.name);
      const key = display.toLowerCase().trim();

      if (!map.has(key)) {
        map.set(key, {
          value: f.name || display,
          display,
          floorNo,
        });
      }
    }

    // 2. Ensure 1..5 floors are available if missing
    for (let i = 1; i <= 5; i += 1) {
      const display = `${ordinal(i)} Floor`;
      const key = display.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          value: display,
          display,
          floorNo: i,
        });
      }
    }

    // 3. Sort by numeric floor number ascending
    return Array.from(map.values()).sort((a, b) => {
      if (a.floorNo !== b.floorNo) return a.floorNo - b.floorNo;
      return a.display.localeCompare(b.display);
    });
  })();
  const vehicles = masters.vehicle_types || [];

  return (
    <form onSubmit={onSubmit} className="vm-visitor-form" lang={lang}>
      <h1 className="vm-page-title" style={{ fontSize: "1.35rem", textAlign: "center" }}>
        {vt(lang, "details_title")}
      </h1>
      <p style={{ textAlign: "center", color: "var(--vms-muted)", fontSize: "0.85rem", margin: "0.3rem 0 1.1rem" }}>
        {vt(lang, "details_sub")}
      </p>

      <div className="vm-photo-capture">
        <div className="vm-photo-preview">
          {photoPreview ? (
            <img src={photoPreview} alt="Visitor photo" />
          ) : (
            <span>{vt(lang, "no_photo")}</span>
          )}
        </div>
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

      <div className="vm-form-grid">
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "first_name")}</label>
          <input className="vm-input-field" required value={values.first_name} onChange={(e) => onChangeField("first_name", e.target.value)} />
        </div>
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "middle_name")}</label>
          <input className="vm-input-field" value={values.middle_name} onChange={(e) => onChangeField("middle_name", e.target.value)} />
        </div>
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "last_name")}</label>
          <input className="vm-input-field" value={values.last_name} onChange={(e) => onChangeField("last_name", e.target.value)} />
        </div>
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "gender")}</label>
          <select className="vm-input-field" value={values.gender} onChange={(e) => onChangeField("gender", e.target.value)}>
            <option value="">{vt(lang, "select")}</option>
            {genders.map((g) => (
              <option key={g.name} value={g.name}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "email")}</label>
        <input className="vm-input-field" type="email" value={values.email} onChange={(e) => onChangeField("email", e.target.value)} />
      </div>

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "company")}</label>
        <input className="vm-input-field" value={values.visitor_company} onChange={(e) => onChangeField("visitor_company", e.target.value)} />
      </div>

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "location")}</label>
        <input className="vm-input-field" value={values.visitor_location} onChange={(e) => onChangeField("visitor_location", e.target.value)} />
      </div>

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "person_to_meet")}</label>
        <select className="vm-input-field" required value={values.person_to_meet} onChange={(e) => onChangeField("person_to_meet", e.target.value)}>
          {loading ? <option value="">{vt(lang, "loading_hosts")}</option> : null}
          {!loading && hosts.length === 0 ? <option value="Administrator">Administrator</option> : null}
          {hosts.map((h) => (
            <option key={h.value} value={h.value}>{h.label} ({h.value})</option>
          ))}
        </select>
      </div>

      <div className="vm-form-grid">
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "visit_purpose")}</label>
          <select className="vm-input-field" value={values.visit_purpose_type} onChange={(e) => onChangeField("visit_purpose_type", e.target.value)}>
            <option value="">{vt(lang, "select")}</option>
            {purposes.map((p) => (
              <option key={p.name} value={p.name}>{p.visit_purpose_type_name || p.name}</option>
            ))}
          </select>
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

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "floor")}</label>
        <select className="vm-input-field" value={values.floor} onChange={(e) => onChangeField("floor", e.target.value)}>
          <option value="">{vt(lang, "select")}</option>
          {floors.map((f) => (
            <option key={f.value} value={f.value}>
              {f.display}
            </option>
          ))}
        </select>
      </div>

      <div className="vm-form-group">
        <label className="vm-form-label">{vt(lang, "id_proof_type")}</label>
        <select className="vm-input-field" value={values.id_proof_type} onChange={(e) => onChangeField("id_proof_type", e.target.value)}>
          <option value="">{vt(lang, "select")}</option>
          {idTypes.map((t) => (
            <option key={t.name} value={t.name}>{t.id_proof_type_name || t.name}</option>
          ))}
        </select>
      </div>

      <div className="vm-photo-capture compact">
        <div className="vm-photo-preview">
          {idProofPreview ? <img src={idProofPreview} alt="ID proof" /> : <span>{vt(lang, "id_photo")}</span>}
        </div>
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
          <select className="vm-input-field" value={values.vehicle_type} onChange={(e) => onChangeField("vehicle_type", e.target.value)}>
            <option value="">{vt(lang, "none")}</option>
            {vehicles.map((v) => (
              <option key={v.name} value={v.name}>{v.vehicle_type_name || v.name}</option>
            ))}
          </select>
        </div>
        <div className="vm-form-group">
          <label className="vm-form-label">{vt(lang, "vehicle_number")}</label>
          <input className="vm-input-field" value={values.vehicle_number} onChange={(e) => onChangeField("vehicle_number", e.target.value)} />
        </div>
      </div>

      {error ? <p className="login-error" style={{ textAlign: "center", marginTop: "0.5rem" }}>{error}</p> : null}

      <button type="submit" className="vm-btn-primary" disabled={busy} style={{ marginTop: "1.1rem" }}>
        {busy ? vt(lang, "submitting") : vt(lang, "continue")}
      </button>
    </form>
  );
}
