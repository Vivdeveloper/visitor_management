import type { VisitorLang } from "@/i18n/visitorJourney";

const DEVANAGARI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"] as const;

/** True when the UI language should use Devanagari digits. */
export function usesDevanagariDigits(lang: VisitorLang): boolean {
  return lang === "hi" || lang === "mr";
}

/** BCP 47 locale for Intl date/time formatting. */
export function intlLocale(lang: VisitorLang): string {
  switch (lang) {
    case "hi":
      return "hi-IN";
    case "mr":
      return "mr-IN";
    case "en":
      return "en-US";
    default: {
      const _exhaustive: never = lang;
      return _exhaustive;
    }
  }
}

/**
 * Replace Western digits (0–9) with Devanagari (०–९) for Hindi/Marathi.
 * Leaves other characters (and already-Devanagari digits) unchanged.
 */
export function localizeDigits(value: string | number, lang: VisitorLang): string {
  const raw = String(value);
  if (!usesDevanagariDigits(lang)) return raw;
  return raw.replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)]);
}

/** Format a count for display (Devanagari when hi/mr). */
export function localizeNumber(value: number | string, lang: VisitorLang): string {
  return localizeDigits(value, lang);
}

/** Localize AM/PM markers and digits in an en-US style time string. */
export function localizeTimeString(raw: string, lang: VisitorLang): string {
  let s = raw;
  if (lang === "hi") {
    s = s.replace(/\bAM\b/gi, "पूर्वाह्न").replace(/\bPM\b/gi, "अपराह्न");
  } else if (lang === "mr") {
    s = s.replace(/\bAM\b/gi, "सकाळी").replace(/\bPM\b/gi, "संध्याकाळी");
  }
  return localizeDigits(s, lang);
}
