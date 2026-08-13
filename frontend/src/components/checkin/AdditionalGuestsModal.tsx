import { useEffect, useState } from "react";
import type { AdditionalGuest } from "@/lib/additionalGuests";
import { normalizeAdditionalGuests } from "@/lib/additionalGuests";
import { autocorrectPersonName } from "@/lib/nameCase";

type Props = {
  open: boolean;
  visitorCount: number;
  guests: AdditionalGuest[];
  busy?: boolean;
  onClose: () => void;
  onSave: (guests: AdditionalGuest[]) => void;
};

export function AdditionalGuestsModal({
  open,
  visitorCount,
  guests,
  busy = false,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<AdditionalGuest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(normalizeAdditionalGuests(guests, visitorCount));
    setError(null);
  }, [open, guests, visitorCount]);

  if (!open) return null;

  const slots = Math.max(0, visitorCount - 1);

  function updateGuest(index: number, field: keyof AdditionalGuest, value: string) {
    setDraft((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleSave() {
    setError(null);
    for (let i = 0; i < draft.length; i += 1) {
      if (!draft[i].name.trim()) {
        setError(`Guest ${i + 2}: name is required`);
        return;
      }
      const mobile = draft[i].mobile.replace(/[\s\-()+]/g, "").slice(-10);
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        setError(`Guest ${i + 2}: enter a valid 10-digit mobile number`);
        return;
      }
    }
    onSave(
      draft.map((guest) => ({
        name: autocorrectPersonName(guest.name),
        mobile: guest.mobile.replace(/[\s\-()+]/g, "").slice(-10),
      })),
    );
  }

  return (
    <div
      className="vm-confirm-modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vm-additional-guests-title"
    >
      <button type="button" className="vm-confirm-modal-backdrop" onClick={onClose} aria-label="Close" />

      <div className="vm-confirm-modal-card vm-additional-guests-card">
        <div className="vm-confirm-modal-top">
          <h2 id="vm-additional-guests-title" className="vm-confirm-modal-title">
            Additional visitors
          </h2>
          <p className="vm-confirm-modal-sub">
            {visitorCount} visitors total. Enter name and mobile for guest{slots === 1 ? "" : "s"}{" "}
            2{slots > 1 ? `–${visitorCount}` : ""} (primary contact is guest 1).
          </p>
        </div>

        <div className="vm-additional-guests-list">
          {draft.map((guest, index) => (
            <div key={index} className="vm-additional-guest-row">
              <p className="vm-additional-guest-kicker">Guest {index + 2}</p>
              <label className="vm-form-label" htmlFor={`guest-name-${index}`}>
                Name
              </label>
              <input
                id={`guest-name-${index}`}
                className="vm-input-field"
                value={guest.name}
                onChange={(e) => updateGuest(index, "name", e.target.value)}
                onBlur={(e) => updateGuest(index, "name", autocorrectPersonName(e.target.value))}
                placeholder="Full name"
                autoComplete="name"
                autoCapitalize="words"
              />
              <label className="vm-form-label" htmlFor={`guest-mobile-${index}`}>
                Mobile
              </label>
              <input
                id={`guest-mobile-${index}`}
                className="vm-input-field"
                value={guest.mobile}
                onChange={(e) => updateGuest(index, "mobile", e.target.value)}
                placeholder="10-digit mobile"
                inputMode="numeric"
                autoComplete="tel"
                autoCapitalize="none"
              />
            </div>
          ))}
        </div>

        {error ? <p className="login-error vm-additional-guests-error">{error}</p> : null}

        <div className="vm-confirm-modal-actions">
          <button type="button" className="vm-confirm-act-btn is-primary" disabled={busy} onClick={handleSave}>
            {busy ? "Saving…" : "Save guests"}
          </button>
          <button type="button" className="vm-confirm-act-btn is-secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
