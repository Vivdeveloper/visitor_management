/** Proper-case a person name: vivEk → Vivek. Matches Python `name_case`. */
export function autocorrectPersonName(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (/[\u0900-\u097F]/.test(raw)) return raw;

  return raw.replace(/[A-Za-z]+(?:'[A-Za-z]+)?|[^\s]+/g, (token) => {
    if (token.includes("-")) {
      return token
        .split("-")
        .map((part) => caseLatinToken(part))
        .join("-");
    }
    if (/^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(token)) {
      return caseLatinToken(token);
    }
    return token;
  });
}

function caseLatinToken(token: string): string {
  if (!token) return token;
  if (token.includes("'")) {
    return token
      .split("'")
      .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
      .join("'");
  }
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}
