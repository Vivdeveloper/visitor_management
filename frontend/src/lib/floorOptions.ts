import type { MastersPayload } from "@/api/vms";

/** Floor Link option — `value` must be Floor DocType name (autoname = floor_name). */
export type FloorOption = {
  value: string;
  display: string;
  floorNo: number;
  building?: string;
  tower?: string;
};

/**
 * Build Floor dropdown from Floor master records only.
 * No hardcoded fallbacks — Link field requires a real Floor document name.
 */
export function buildFloorOptions(masters: MastersPayload): FloorOption[] {
  const map = new Map<string, FloorOption>();

  for (const f of masters.floors || []) {
    const value = String(f.name || "").trim();
    if (!value) continue;

    const display = String(f.floor_name || f.name || "").trim() || value;
    const floorNo =
      typeof f.floor_number === "number" && !Number.isNaN(f.floor_number)
        ? f.floor_number
        : Number.MAX_SAFE_INTEGER;

    if (!map.has(value)) {
      map.set(value, {
        value,
        display,
        floorNo,
        building: f.building,
        tower: f.tower,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.floorNo !== b.floorNo) return a.floorNo - b.floorNo;
    return a.display.localeCompare(b.display);
  });
}
