import type { VisitorListRow } from "@/api/vms";
import { formatTime } from "@/lib/format";
import { extractRejectionReason } from "@/lib/rejectionReason";
import { getCurrentStageTimestamp } from "@/lib/visitStages";
import { localizeHostDisplay, localizePersonName } from "@/lib/transliterate";
import { VisitorAvatar } from "@/components/ui/VisitorAvatar";
import { VisitorStageTimeline } from "@/components/visitors/VisitorStageTimeline";
import { useAppLanguage } from "@/context/AppLanguageContext";
import { translateListBadge, ut } from "@/i18n/uiChrome";

type VisitorListRowCardProps = {
  item: VisitorListRow;
  index?: number;
  onOpen: (item: VisitorListRow) => void;
};

type ListBadgeIcon = "in" | "checkout" | "pending" | "approved" | "out" | "transferred" | "rejected" | "default";

type ListBadge = {
  text: string;
  className: string;
  icon: ListBadgeIcon;
};

function avatarTone(status?: string, idx = 0) {
  if (status === "Pending Approval") return "orange";
  if (status === "Approved") return "blue";
  if (status === "Checked Out") return "purple";
  if (status === "Rejected") return "orange";
  return (["green", "blue", "purple", "orange"] as const)[idx % 4];
}

function resolveListBadgeStyle(status?: string, transferred?: boolean): Omit<ListBadge, "text"> {
  if (transferred) {
    return { className: "vm-visitor-list-badge is-transferred", icon: "transferred" };
  }
  if (status === "Pending Approval") {
    return { className: "vm-visitor-list-badge is-pending", icon: "pending" };
  }
  if (status === "Approved") {
    return { className: "vm-visitor-list-badge is-approved", icon: "approved" };
  }
  if (status === "Checked Out") {
    return { className: "vm-visitor-list-badge is-out", icon: "out" };
  }
  if (status === "Meeting Done") {
    return { className: "vm-visitor-list-badge is-checkout", icon: "checkout" };
  }
  if (status === "Checked In") {
    return { className: "vm-visitor-list-badge is-in", icon: "in" };
  }
  if (status === "Rejected") {
    return { className: "vm-visitor-list-badge is-rejected", icon: "rejected" };
  }
  return {
    className: "vm-visitor-list-badge is-default",
    icon: "default",
  };
}

function BadgeIcon({ kind }: { kind: ListBadgeIcon }) {
  if (kind === "in") {
    return (
      <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden>
        <circle cx="12" cy="12" r="5" />
      </svg>
    );
  }
  if (kind === "checkout" || kind === "pending") {
    return (
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.5 1.5" />
      </svg>
    );
  }
  return null;
}

export function VisitorListRowCard({
  item,
  index = 0,
  onOpen,
}: VisitorListRowCardProps) {
  const { lang } = useAppLanguage();
  const style = resolveListBadgeStyle(item.status, Boolean(item.transfer_to_user));
  const badge: ListBadge = {
    ...style,
    text: translateListBadge(lang, item.status, Boolean(item.transfer_to_user)),
  };
  const time = formatTime(getCurrentStageTimestamp(item), lang) || "—";
  const name = localizePersonName((item.full_name || item.name || "—").trim(), lang);
  const company = (item.visitor_company || "").trim();
  const hostLine = localizeHostDisplay(item.person_to_meet_name, item.floor, lang);
  const rejectionReason =
    item.status === "Rejected" ? extractRejectionReason(item.approval_remarks) : null;

  return (
    <div className="vm-visitor-list-item">
      <button
        type="button"
        className="vm-visitor-list-row is-interactive"
        style={{ animationDelay: `${Math.min(index, 12) * 20}ms` }}
        onClick={() => onOpen(item)}
      >
        <VisitorAvatar
          name={name}
          photo={item.photo}
          className={`vm-visitor-list-avatar avatar-${avatarTone(item.status, index)}`}
        />

        <div className="vm-visitor-list-body">
          <div className="vm-visitor-list-title-row">
            <span className="vm-visitor-list-name">{name}</span>
            {company ? (
              <span className="vm-visitor-list-company">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="7" width="18" height="14" rx="2" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>{company}</span>
              </span>
            ) : null}
          </div>
          <p className="vm-visitor-list-host">
            {ut(lang, "host_prefix")} <span>{hostLine}</span>
          </p>
          {rejectionReason ? (
            <p className="vm-visitor-list-reject-reason" title={rejectionReason}>
              {ut(lang, "reason_prefix")} <span>{rejectionReason}</span>
            </p>
          ) : null}
        </div>

        <div className="vm-visitor-list-side">
          <span className="vm-visitor-list-time">{time}</span>
          <span className={badge.className}>
            <BadgeIcon kind={badge.icon} />
            {badge.text}
          </span>
        </div>

      </button>

      <div className="vm-visitor-list-timestamps">
        <VisitorStageTimeline visitor={item} compact filledOnly={false} />
      </div>
    </div>
  );
}
