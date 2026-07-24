import { useRef, useState, type PointerEvent } from "react";
import type { DashboardQueueItem } from "@/api/vms";
import { formatTime, initials } from "@/lib/format";

type DecideState = "idle" | "accepting" | "rejecting" | "accepted" | "rejected";

type Props = {
  item: DashboardQueueItem;
  busy: boolean;
  /** When false, show status + call only (no accept/decline). */
  interactive?: boolean;
  filterStatus?: string;
  onAccept: () => void;
  onReject: () => void;
  onCall: () => void;
};

const SWIPE_COMMIT = 88;

function statusTone(status?: string) {
  if (status === "Pending Approval" || status === "Pending") return "is-awaiting";
  if (status === "Approved") return "is-approved";
  if (status === "Checked In") return "is-in";
  if (status === "Rejected") return "is-rejected";
  if (status === "Checked Out") return "is-out";
  if (status === "Meeting Done") return "is-meet";
  return "is-awaiting";
}

function statusLabel(status?: string, filterStatus?: string) {
  const s = status || filterStatus || "Pending";
  if (s === "Pending Approval") return "Awaiting";
  return s;
}

export function PendingDecisionCard({
  item,
  busy,
  interactive = true,
  filterStatus,
  onAccept,
  onReject,
  onCall,
}: Props) {
  const visitorName = item.full_name || item.name;
  const hostName = item.person_to_meet_name || item.host_name || "Host Pending";
  const timeLabel = formatTime(item.check_in || item.checked_in_on || item.modified) || "Just now";
  const displayStatus = statusLabel(item.status, filterStatus);
  const tone = statusTone(item.status || filterStatus);
  const [state, setState] = useState<DecideState>("idle");
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  const locked = busy || state === "accepting" || state === "rejecting" || state === "accepted" || state === "rejected";

  function finish(next: "accepted" | "rejected", action: () => void) {
    setState(next === "accepted" ? "accepting" : "rejecting");
    window.setTimeout(() => {
      setState(next);
      action();
    }, 420);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!interactive || locked) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    dragging.current = true;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!interactive || !dragging.current || locked) return;
    const dx = Math.max(-140, Math.min(140, e.clientX - startX.current));
    setDragX(dx);
  }

  function onPointerUp() {
    if (!interactive || !dragging.current) return;
    dragging.current = false;
    if (dragX >= SWIPE_COMMIT) {
      setDragX(0);
      finish("accepted", onAccept);
      return;
    }
    if (dragX <= -SWIPE_COMMIT) {
      setDragX(0);
      finish("rejected", onReject);
      return;
    }
    setDragX(0);
  }

  const revealAccept = Math.max(0, dragX) / SWIPE_COMMIT;
  const revealReject = Math.max(0, -dragX) / SWIPE_COMMIT;

  return (
    <article
      className={`vm-decide-card${interactive ? "" : " is-status-only"}${state !== "idle" ? ` is-${state}` : ""}${dragX !== 0 ? " is-dragging" : ""}`}
      aria-busy={locked}
    >
      {interactive ? (
        <div className="vm-decide-underlay" aria-hidden>
          <span className="vm-decide-underlay-accept" style={{ opacity: Math.min(1, 0.25 + revealAccept) }}>
            Accept
          </span>
          <span className="vm-decide-underlay-reject" style={{ opacity: Math.min(1, 0.25 + revealReject) }}>
            Decline
          </span>
        </div>
      ) : null}

      <div
        className="vm-decide-surface"
        style={interactive ? { transform: `translateX(${dragX}px)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="vm-decide-head">
          <div className="vm-decide-identity">
            <div className={`vm-decide-avatar ${tone}`} aria-hidden>
              <span>{initials(visitorName)}</span>
              {interactive ? <i className="vm-decide-pulse" /> : null}
            </div>
            <div className="vm-decide-copy">
              <strong>{visitorName}</strong>
              <span>{item.mobile || "No mobile on file"}</span>
            </div>
          </div>
          <div className="vm-decide-meta">
            <span className="vm-decide-time">{timeLabel}</span>
            <span className={`vm-decide-chip ${tone}`}>{displayStatus}</span>
          </div>
        </div>

        <div className="vm-decide-host">
          <div>
            <span className="vm-decide-host-label">To meet</span>
            <strong>{hostName}</strong>
          </div>
          {item.floor ? <span className="vm-decide-floor">{item.floor}</span> : null}
        </div>

        {interactive ? (
          <>
            <p className="vm-decide-hint">Swipe right to accept · left to decline</p>
            <div className="vm-decide-rail" role="group" aria-label="Approval actions">
              <button
                type="button"
                className="vm-decide-btn is-reject"
                disabled={locked}
                onClick={() => finish("rejected", onReject)}
              >
                <span className="vm-decide-btn-orb" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </span>
                <span className="vm-decide-btn-label">
                  {state === "rejecting" || state === "rejected" ? "Declining…" : "Decline"}
                </span>
              </button>

              <button
                type="button"
                className="vm-decide-btn is-call"
                disabled={locked}
                onClick={onCall}
                aria-label="Call visitor"
              >
                <span className="vm-decide-btn-orb" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
                  </svg>
                </span>
              </button>

              <button
                type="button"
                className="vm-decide-btn is-accept"
                disabled={locked}
                onClick={() => finish("accepted", onAccept)}
              >
                <span className="vm-decide-btn-orb" aria-hidden>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <span className="vm-decide-btn-label">
                  {state === "accepting" || state === "accepted" ? "Accepting…" : "Accept"}
                </span>
              </button>
            </div>
          </>
        ) : (
          <div className="vm-decide-status-bar">
            <div className={`vm-decide-status-pill ${tone}`}>
              <span className="vm-decide-status-dot" aria-hidden />
              {displayStatus}
            </div>
            <button
              type="button"
              className="vm-decide-btn is-call is-wide"
              onClick={onCall}
              aria-label="Call visitor"
            >
              <span className="vm-decide-btn-orb" aria-hidden>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
                </svg>
              </span>
              <span className="vm-decide-btn-label">Call</span>
            </button>
          </div>
        )}

        {(state === "accepting" || state === "accepted" || state === "rejecting" || state === "rejected") && (
          <div className="vm-decide-result" aria-live="polite">
            <span>{state === "accepting" || state === "accepted" ? "Approved" : "Declined"}</span>
          </div>
        )}
      </div>
    </article>
  );
}
