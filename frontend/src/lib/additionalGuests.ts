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
