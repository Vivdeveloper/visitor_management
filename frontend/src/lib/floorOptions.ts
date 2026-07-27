import type { MastersPayload } from "@/api/vms";

export type FloorOption = { value: string; display: string; floorNo: number };

function extractFloorNo(raw?: string): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
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

export function buildFloorOptions(masters: MastersPayload): FloorOption[] {
  const map = new Map<string, FloorOption>();

  for (const f of masters.floors || []) {
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

  return Array.from(map.values()).sort((a, b) => {
    if (a.floorNo !== b.floorNo) return a.floorNo - b.floorNo;
    return a.display.localeCompare(b.display);
  });
}
