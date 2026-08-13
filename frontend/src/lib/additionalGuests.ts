export type AdditionalGuest = {
  name: string;
  mobile: string;
};

export function additionalGuestSlots(count: number): number {
  return Math.max(0, Math.max(1, count) - 1);
}

export function normalizeAdditionalGuests(
  guests: AdditionalGuest[],
  visitorCount: number,
): AdditionalGuest[] {
  const slots = additionalGuestSlots(visitorCount);
  if (slots === 0) return [];
  if (guests.length === slots) return guests;
  if (guests.length < slots) {
    return [
      ...guests,
      ...Array.from({ length: slots - guests.length }, () => ({ name: "", mobile: "" })),
    ];
  }
  return guests.slice(0, slots);
}

export function formatAdditionalGuestsRemarks(guests: AdditionalGuest[]): string {
  const lines = guests
    .map((guest, index) => {
      const name = guest.name.trim();
      const mobile = guest.mobile.trim();
      if (!name && !mobile) return "";
      return `${index + 2}. ${name || "—"} — ${mobile || "—"}`;
    })
    .filter(Boolean);

  if (!lines.length) return "";
  return `Additional guests:\n${lines.join("\n")}`;
}

/** Parse guest lines stored in Visitor Entry `approval_remarks`. */
export function parseAdditionalGuestsFromRemarks(remarks?: string | null): AdditionalGuest[] {
  if (!remarks?.trim()) return [];

  const lines = remarks
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const guests: AdditionalGuest[] = [];
  let inBlock = false;

  for (const line of lines) {
    if (/^Additional guests:?$/i.test(line)) {
      inBlock = true;
      continue;
    }

    if (
      inBlock &&
      /^(Approved|Rejected|Cancelled|Transferred|Meeting|Checkout)\b/i.test(line)
    ) {
      break;
    }

    if (!inBlock) continue;

    const matched = /^(\d+)\.\s*(.+?)(?:\s+[—–-]\s*(.+))?$/.exec(line);
    if (!matched) {
      if (guests.length) break;
      continue;
    }

    const name = (matched[2] || "").trim();
    const mobile = (matched[3] || "").trim();
    if (!name && !mobile) continue;
    guests.push({ name: name === "—" ? "" : name, mobile: mobile === "—" ? "" : mobile });
  }

  return guests;
}

export function validateAdditionalGuests(guests: AdditionalGuest[]): string | null {
  for (let i = 0; i < guests.length; i += 1) {
    const guest = guests[i];
    if (!guest.name.trim()) {
      return `Guest ${i + 2}: name is required`;
    }
    const mobile = guest.mobile.replace(/[\s\-()+]/g, "");
    const last10 = mobile.slice(-10);
    if (!/^\d{10}$/.test(last10)) {
      return `Guest ${i + 2}: enter a valid 10-digit mobile number`;
    }
    if (!/^[6-9]\d{9}$/.test(last10)) {
      return `Guest ${i + 2}: mobile must start with 6, 7, 8, or 9`;
    }
  }
  return null;
}
