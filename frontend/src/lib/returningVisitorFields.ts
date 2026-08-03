const FALLBACK_PROFILE_FIELDS = ["first_name", "middle_name", "last_name", "email", "gender"] as const;

let cachedProfileFields: string[] | null = null;

/**
 * Identity fields used when pre-filling a returning visitor.
 *
 * Do not call `/api/resource/DocType/...` here — gate/security roles usually
 * cannot Read the DocType document (403 in console). Fallback fields match
 * the Visitor Entry profile section before visit-context fields.
 */
export async function getReturningVisitorProfileFields(): Promise<string[]> {
  if (cachedProfileFields) return cachedProfileFields;
  cachedProfileFields = [...FALLBACK_PROFILE_FIELDS];
  return cachedProfileFields;
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
  "visit_purpose_other",
  "number_of_visitors",
  "id_proof_type",
  "vehicle_type",
  "vehicle_number",
] as const;
