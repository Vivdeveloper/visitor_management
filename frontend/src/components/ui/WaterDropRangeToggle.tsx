import type { VisitorLang } from "@/i18n/visitorJourney";
import { ut } from "@/i18n/uiChrome";

export type LiveRangeMode = "overall" | "last_7_days";

type WaterDropRangeToggleProps = {
  value: LiveRangeMode;
  onChange: (next: LiveRangeMode) => void;
  lang: VisitorLang;
  className?: string;
};

const OPTIONS: Array<{ id: LiveRangeMode; labelKey: "range_overall" | "range_last_7_days" }> = [
  { id: "overall", labelKey: "range_overall" },
  { id: "last_7_days", labelKey: "range_last_7_days" },
];

/**
 * Segmented control with a liquid / water-drop sliding thumb.
 * Options: Overall · Last 7 days
 */
export function WaterDropRangeToggle({
  value,
  onChange,
  lang,
  className = "",
}: WaterDropRangeToggleProps) {
  const activeIndex = value === "last_7_days" ? 1 : 0;

  return (
    <div
      className={`vm-water-toggle ${className}`.trim()}
      role="tablist"
      aria-label={ut(lang, "range_toggle_label")}
    >
      <span
        className="vm-water-toggle-thumb"
        aria-hidden
        style={{
          transform: `translateX(${activeIndex * 100}%)`,
        }}
        data-active={value}
      />
      {OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`vm-water-toggle-btn${active ? " is-active" : ""}`}
            onClick={() => onChange(opt.id)}
          >
            {ut(lang, opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
