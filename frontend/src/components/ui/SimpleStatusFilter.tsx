import type { StatusFilterOption } from "@/components/ui/SlidingStatusFilter";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { formatCount } from "@/lib/format";

type SimpleStatusFilterProps = {
  options: StatusFilterOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  /** When true, the "all" option is shown full-width above the grid. */
  pinAllFilter?: boolean;
};

function FilterButton({
  opt,
  active,
  onChange,
  countLabel,
  className = "",
}: {
  opt: StatusFilterOption;
  active: boolean;
  onChange: (id: string) => void;
  countLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`vm-guard-filter-btn${active ? " is-active" : ""}${opt.tone ? ` tone-${opt.tone}` : ""}${className ? ` ${className}` : ""}`}
      onClick={() => onChange(opt.id)}
    >
      <span className="vm-guard-filter-label">{opt.label}</span>
      {countLabel != null ? (
        <span className="vm-guard-filter-count">{countLabel}</span>
      ) : null}
    </button>
  );
}

export function SimpleStatusFilter({
  options,
  value,
  onChange,
  className = "",
  pinAllFilter = false,
}: SimpleStatusFilterProps) {
  const { lang } = useAppLanguage();
  const allOption = pinAllFilter ? options.find((opt) => opt.id === "all") : undefined;
  const gridOptions = pinAllFilter ? options.filter((opt) => opt.id !== "all") : options;

  return (
    <div className={`vm-guard-filter-card ${className}`.trim()} role="tablist" aria-label="Visitor status filter">
      {allOption ? (
        <FilterButton
          opt={allOption}
          active={value === allOption.id}
          onChange={onChange}
          countLabel={typeof allOption.count === "number" ? formatCount(allOption.count, lang) : undefined}
          className="is-all-row"
        />
      ) : null}

      <div className={`vm-guard-filter${pinAllFilter ? " vm-guard-filter-grid" : ""}`.trim()}>
        {gridOptions.map((opt) => (
          <FilterButton
            key={opt.id}
            opt={opt}
            active={value === opt.id}
            onChange={onChange}
            countLabel={typeof opt.count === "number" ? formatCount(opt.count, lang) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
