import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type SearchSelectProps = {
  id?: string;
  value: string;
  options: SearchSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  maxVisible?: number;
  "aria-label"?: string;
};

function ChevronIcon() {
  return (
    <svg className="vm-search-select-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SearchSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Select",
  searchPlaceholder = "Search…",
  emptyText = "No options found",
  loading = false,
  loadingText = "Loading…",
  disabled = false,
  required = false,
  allowEmpty = true,
  emptyLabel,
  className = "",
  maxVisible = 8,
  "aria-label": ariaLabel,
}: SearchSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.sublabel || ""} ${option.value}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  function pick(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  const triggerText = loading
    ? loadingText
    : selected
      ? selected.label
      : value && !selected
        ? value
        : allowEmpty && !value && emptyLabel
          ? emptyLabel
          : placeholder;

  const showPlaceholderStyle = !loading && !selected && (!value || (allowEmpty && !value));

  return (
    <div className={`vm-search-select${className ? ` ${className}` : ""}`} ref={rootRef}>
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          value={value}
          required
          onChange={() => undefined}
          style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
        />
      ) : null}

      <button
        id={id}
        type="button"
        className={`vm-search-select-trigger${open ? " is-open" : ""}${selected ? " has-value" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled || loading}
        onClick={() => {
          if (disabled || loading) return;
          setOpen((current) => !current);
        }}
      >
        {selected?.sublabel ? (
          <span className="vm-search-select-trigger-copy">
            <strong>{selected.label}</strong>
            <span>{selected.sublabel}</span>
          </span>
        ) : (
          <span className={`vm-search-select-trigger-text${showPlaceholderStyle ? " is-placeholder" : ""}`}>
            {triggerText}
          </span>
        )}
        <ChevronIcon />
      </button>

      {open ? (
        <div className="vm-search-select-menu" role="listbox" id={listId} aria-label={ariaLabel || placeholder}>
          <input
            className="vm-input-field vm-search-select-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            autoFocus
          />
          <div className="vm-search-select-list">
            {allowEmpty && emptyLabel ? (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                className={`vm-search-select-row${!value ? " is-selected" : ""}`}
                onClick={() => pick("")}
              >
                <span className="vm-search-select-row-copy">
                  <strong>{emptyLabel}</strong>
                </span>
              </button>
            ) : null}

            {filtered.length === 0 ? (
              <p className="vm-search-select-empty">{emptyText}</p>
            ) : (
              filtered.slice(0, maxVisible).map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`vm-search-select-row${isSelected ? " is-selected" : ""}`}
                    onClick={() => pick(option.value)}
                  >
                    <span className="vm-search-select-row-copy">
                      <strong>{option.label}</strong>
                      {option.sublabel ? <span>{option.sublabel}</span> : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
