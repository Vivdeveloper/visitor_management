export function formatVisitorCardTitle(fullName?: string | null, company?: string | null): string {
  const name = (fullName || "").trim() || "—";
  const org = (company || "").trim();
  if (!org) return name;
  return `${name} from ${org}`;
}

export function formatVisitorCardSubtitle(
  host?: string | null,
  floor?: string | null,
): string {
  const hostLabel = (host || "").trim() || "—";
  const floorLabel = (floor || "").trim();
  if (!floorLabel) return `Host: ${hostLabel}`;
  return `Host: ${hostLabel} · ${formatFloorLabel(floorLabel)}`;
}

export function formatFloorLabel(floor?: string | null): string {
  const floorLabel = (floor || "").trim();
  if (!floorLabel) return "";
  return /floor/i.test(floorLabel) ? floorLabel : `${floorLabel} Floor`;
}

export function formatVisitorHostLine(host?: string | null, floor?: string | null): string {
  const hostLabel = (host || "").trim() || "—";
  const floorLabel = formatFloorLabel(floor);
  if (!floorLabel) return hostLabel;
  return `${hostLabel} · ${floorLabel}`;
}
