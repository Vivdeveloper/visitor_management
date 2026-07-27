import { apiClient } from "@/api/client";

const FILLABLE_FIELD_TYPES = new Set(["Data", "Link", "Select", "Int", "Float"]);
const VISIT_CONTEXT_START_FIELD = "visit_purpose_type";
const EXCLUDED_PROFILE_FIELDS = new Set(["mobile", "otp", "otp_verified", "full_name", "status", "naming_series"]);

const FALLBACK_PROFILE_FIELDS = ["first_name", "middle_name", "last_name", "email", "gender"] as const;

let cachedProfileFields: string[] | null = null;

type DocTypeFieldMeta = {
  fieldname: string;
  fieldtype: string;
  read_only?: number;
};

type DocTypeMeta = {
  fields?: DocTypeFieldMeta[];
  field_order?: string[];
};

/** Identity fields from Visitor Entry metadata (editable fields before visit context). */
export async function getReturningVisitorProfileFields(): Promise<string[]> {
  if (cachedProfileFields) return cachedProfileFields;

  try {
    const { data } = await apiClient.get<{ data: DocTypeMeta }>("/api/resource/DocType/Visitor%20Entry", {
      params: { fields: JSON.stringify(["fields", "field_order"]) },
    });

    const doc = data.data;
    const fieldOrder = doc.field_order || [];
    const fieldMeta = new Map((doc.fields || []).map((field) => [field.fieldname, field]));

    const profileFields: string[] = [];
    for (const fieldname of fieldOrder) {
      if (fieldname === VISIT_CONTEXT_START_FIELD) break;

      const meta = fieldMeta.get(fieldname);
      if (!meta || meta.read_only) continue;
      if (!FILLABLE_FIELD_TYPES.has(meta.fieldtype)) continue;
      if (EXCLUDED_PROFILE_FIELDS.has(fieldname)) continue;

      profileFields.push(fieldname);
    }

    cachedProfileFields = profileFields.length ? profileFields : [...FALLBACK_PROFILE_FIELDS];
    return cachedProfileFields;
  } catch {
    cachedProfileFields = [...FALLBACK_PROFILE_FIELDS];
    return cachedProfileFields;
  }
}

export function applyReturningProfileFields<T extends Record<string, string>>(
  form: T,
  row: Record<string, unknown>,
  profileFields: string[],
): T {
  const next = { ...form };

  for (const field of profileFields) {
    const value = row[field];
    if (value != null && String(value).trim() !== "") {
      (next as Record<string, string>)[field] = String(value);
    }
  }

  if (!(next as Record<string, string>).first_name && row.full_name) {
    const parts = String(row.full_name).trim().split(/\s+/);
    if (parts[0]) (next as Record<string, string>).first_name = parts[0];
    if (parts.length > 1) (next as Record<string, string>).last_name = parts.slice(1).join(" ");
  }

  return next;
}

export const VISIT_FIELDS_TO_CLEAR = [
  "visitor_company",
  "visitor_location",
  "person_to_meet",
  "visit_purpose_type",
  "number_of_visitors",
  "id_proof_type",
  "vehicle_type",
  "vehicle_number",
] as const;
