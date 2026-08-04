import type { VisitorLang } from "@/i18n/visitorJourney";
import { localizeDigits } from "@/lib/localize";

export function formatVisitorCardTitle(fullName?: string | null, company?: string | null): string {
  const name = (fullName || "").trim() || "—";
  const org = (company || "").trim();
  if (!org) return name;
  return `${name} from ${org}`;
}

export function formatVisitorCardSubtitle(
  host?: string | null,
  floor?: string | null,
  hostPrefix = "Host:",
  floorSuffix = "Floor",
): string {
  const hostLabel = (host || "").trim() || "—";
  const floorLabel = (floor || "").trim();
  if (!floorLabel) return `${hostPrefix} ${hostLabel}`;
  return `${hostPrefix} ${hostLabel} · ${formatFloorLabel(floorLabel, floorSuffix)}`;
}

export function formatFloorLabel(floor?: string | null, floorSuffix = "Floor"): string {
  const floorLabel = (floor || "").trim();
  if (!floorLabel) return "";
  return /floor|मंजिल|मजला/i.test(floorLabel) ? floorLabel : `${floorLabel} ${floorSuffix}`;
}

export function formatVisitorHostLine(
  host?: string | null,
  floor?: string | null,
  lang: VisitorLang = "en",
): string {
  const hostLabel = (host || "").trim() || "—";
  const floorSuffix = lang === "hi" ? "मंजिल" : lang === "mr" ? "मजला" : "Floor";
  const floorLabel = formatFloorLabel(floor, floorSuffix);
  if (!floorLabel) return hostLabel;
  return `${hostLabel} · ${localizeDigits(floorLabel, lang)}`;
}
