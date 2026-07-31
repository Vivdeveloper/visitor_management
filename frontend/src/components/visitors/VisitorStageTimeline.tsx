import { formatStageTimestamp, getVisitStatusStages, type VisitStageTimestamps } from "@/lib/visitStages";

type VisitorStageTimelineProps = {
  visitor: VisitStageTimestamps;
  compact?: boolean;
  /** When true, only stages with a timestamp are shown (minimal card layout). */
  filledOnly?: boolean;
  className?: string;
};

function compactStageLabel(label: string) {
  return label.replace(/ Time$/, "");
}

export function VisitorStageTimeline({
  visitor,
  compact = false,
  filledOnly = compact,
  className = "",
}: VisitorStageTimelineProps) {
  const stages = getVisitStatusStages(visitor).filter((stage) => !filledOnly || Boolean(stage.at));

  if (!stages.length) return null;

  return (
    <div
      className={`vm-visit-stage-timeline${compact ? " is-compact" : ""}${filledOnly ? " is-filled-only" : ""} ${className}`.trim()}
    >
      {stages.map((stage) => (
        <div key={stage.key} className="vm-visit-stage-row is-done">
          <span className="vm-visit-stage-label">
            {compact ? compactStageLabel(stage.label) : stage.label}
          </span>
          <span className="vm-visit-stage-time">{formatStageTimestamp(stage.at, compact)}</span>
        </div>
      ))}
    </div>
  );
}
