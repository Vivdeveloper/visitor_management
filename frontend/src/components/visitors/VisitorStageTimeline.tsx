import { formatStageTimestamp, getVisitStatusStages, type VisitStageTimestamps } from "@/lib/visitStages";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { translateVisitStage } from "@/i18n/uiChrome";

type VisitorStageTimelineProps = {
  visitor: VisitStageTimestamps;
  compact?: boolean;
  /** When true, only stages with a timestamp are shown (minimal card layout). */
  filledOnly?: boolean;
  className?: string;
};

export function VisitorStageTimeline({
  visitor,
  compact = false,
  filledOnly = compact,
  className = "",
}: VisitorStageTimelineProps) {
  const { lang } = useAppLanguage();
  const stages = getVisitStatusStages(visitor).filter((stage) => !filledOnly || Boolean(stage.at));

  if (!stages.length) return null;

  return (
    <div
      className={`vm-visit-stage-timeline${compact ? " is-compact" : ""}${filledOnly ? " is-filled-only" : ""} ${className}`.trim()}
    >
      {stages.map((stage) => (
        <div key={stage.key} className="vm-visit-stage-row is-done">
          <span className="vm-visit-stage-label">
            {translateVisitStage(lang, stage.key, stage.label)}
          </span>
          <span className="vm-visit-stage-time">{formatStageTimestamp(stage.at, compact, lang)}</span>
        </div>
      ))}
    </div>
  );
}
