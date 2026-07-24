import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type StatusFilterOption = {
  id: string;
  label: string;
  count?: number;
  tone?: "amber" | "green" | "blue" | "indigo" | "slate" | "red";
};

type SlidingStatusFilterProps = {
  options: StatusFilterOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export function SlidingStatusFilter({
  options,
  value,
  onChange,
  className = "",
}: SlidingStatusFilterProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const measure = () => {
    const el = btnRefs.current[value];
    const track = trackRef.current;
    if (!el || !track) return;
    setIndicator({
      left: el.offsetLeft,
      width: el.offsetWidth,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    measure();
  }, [value, options]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [value, options]);

  return (
    <div className={`vm-slide-filter ${className}`.trim()} role="tablist" aria-label="Status filter">
      <div className="vm-slide-filter-track" ref={trackRef}>
        <div
          className="vm-slide-filter-thumb"
          style={{
            left: indicator.left,
            width: indicator.width,
            opacity: indicator.ready ? 1 : 0,
          }}
          aria-hidden
        />
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`vm-slide-filter-chip${active ? " is-active" : ""}${opt.tone ? ` tone-${opt.tone}` : ""}`}
              ref={(node) => {
                btnRefs.current[opt.id] = node;
              }}
              onClick={() => onChange(opt.id)}
            >
              {opt.tone ? <span className="vm-slide-filter-dot" aria-hidden /> : null}
              <span>{opt.label}</span>
              {typeof opt.count === "number" ? (
                <span className="vm-slide-filter-count">{opt.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
