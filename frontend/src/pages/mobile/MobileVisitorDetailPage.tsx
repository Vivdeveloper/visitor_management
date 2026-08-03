import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { frappeGetList, visitorApi } from "@/api/vms";
import { PhotoPreviewModal } from "@/components/common/PhotoPreviewModal";
import { ClickablePhotoPreview } from "@/components/ui/ClickablePhotoPreview";
import { extractError } from "@/lib/format";
import { usePageChrome } from "@/context/PageChromeContext";
import { useAuth } from "@/context/AuthContext";
import { canPerformCheckout } from "@/lib/roles";
import { VisitorStageTimeline } from "@/components/visitors/VisitorStageTimeline";
type VisitorDoc = {
  name?: string;
  full_name?: string;
  mobile?: string;
  photo?: string;
  email?: string;
  status?: string;
  visitor_company?: string;
  person_to_meet?: string;
  person_to_meet_name?: string;
  visit_purpose_type?: string;
  floor?: string;
  check_in?: string;
  checked_in_on?: string;
  check_out?: string;
  checked_out_on?: string;
  approved_on?: string;
  rejected_on?: string;
  checked_in_by?: string;
  checked_out_by?: string;
  meeting_done_on?: string;
  creation?: string;
  modified?: string;
};

type UserRow = { name: string; full_name?: string };

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="vm-detail-field">
      <span className="vm-detail-label">{label}</span>
      <span className="vm-detail-value">{value || "—"}</span>
    </div>
  );
}

async function resolveUserFullName(userId?: string | null): Promise<string | undefined> {
  if (!userId) return undefined;
  try {
    const rows = await frappeGetList<UserRow>({
      doctype: "User",
      fields: ["name", "full_name"],
      filters: { name: userId },
      limit_page_length: 1,
    });
    const row = rows[0];
    return row?.full_name || row?.name || userId;
  } catch {
    return userId;
  }
}

export function MobileVisitorDetailPage() {
  const { name: routeName = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showCheckout = canPerformCheckout(user);
  const [visitor, setVisitor] = useState<VisitorDoc | null>(null);
  const [gateOperator, setGateOperator] = useState<string | undefined>();
  const [exitVerifiedBy, setExitVerifiedBy] = useState<string | undefined>();
  const [hostCompleted, setHostCompleted] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  usePageChrome({
    title: "Visitor Details",
    subtitle: routeName || "Visitor Entry",
    showBack: true,
    showNotification: false,
    showProfile: false,
  });

  useEffect(() => {
    if (!routeName) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const doc = (await visitorApi.get(routeName)) as VisitorDoc;
        if (cancelled) return;
        setVisitor(doc);

        const [inBy, outBy] = await Promise.all([
          resolveUserFullName(doc.checked_in_by),
          resolveUserFullName(doc.checked_out_by),
        ]);
        if (cancelled) return;
        setGateOperator(inBy);
        setExitVerifiedBy(outBy);

        if (doc.meeting_done_on) {
          setHostCompleted(
            doc.person_to_meet_name ||
              (await resolveUserFullName(doc.person_to_meet)) ||
              undefined,
          );
        } else {
          setHostCompleted(undefined);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(extractError(err, "Visitor not found"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [routeName]);

  const status = visitor?.status || "";
  // Gate checkout is for security after host marks Meeting Done.
  const canCheckout = showCheckout && status === "Meeting Done";
  const displayName = visitor?.full_name || visitor?.name || "";

  return (
    <div className="vm-home-page">

      {loading ? <p className="vm-empty-hint">Loading…</p> : null}
      {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}

      {!loading && visitor ? (
        <main className="vm-main-body vm-detail-stack">
          <div className="vm-overview-card vm-detail-hero">
            <p className="vm-detail-kicker">{visitor.name}</p>
            <div className="vm-detail-hero-grid">
              <div className="vm-detail-hero-photo-col">
                <ClickablePhotoPreview
                  src={visitor.photo}
                  name={displayName}
                  emptyLabel="No photo"
                  alt={`${displayName} photo`}
                  className="vm-photo-preview vm-detail-photo-frame"
                  onPreview={setPreviewSrc}
                />
              </div>
              <div className="vm-detail-hero-copy">
                <h1 className="vm-page-title">{displayName}</h1>
                <span className="vm-status-pill">{status || "—"}</span>
              </div>
            </div>
          </div>

          <div className="vm-overview-card vm-detail-card">
            <h2 className="vm-section-title">Visit</h2>
            <Field label="Mobile" value={visitor.mobile} />
            <Field label="Company" value={visitor.visitor_company} />
            <Field label="Person to meet" value={visitor.person_to_meet_name} />
            <Field label="Purpose" value={visitor.visit_purpose_type} />
            <Field label="Floor" value={visitor.floor} />
          </div>

          <div className="vm-overview-card vm-detail-card">
            <h2 className="vm-section-title">Visit Timeline</h2>
            <VisitorStageTimeline visitor={visitor} />
          </div>

          <div className="vm-overview-card vm-detail-card">
            <h2 className="vm-section-title">Operations</h2>
            <Field label="Gate Operator" value={gateOperator} />
            <Field label="Exit Verified By" value={exitVerifiedBy} />
            <Field label="Meeting Completed By" value={hostCompleted} />
          </div>

          <div className="vm-detail-actions">
            {canCheckout ? (
              <button
                type="button"
                className="vm-btn-primary"
                onClick={() => navigate(`/checkout/${encodeURIComponent(visitor.name || routeName)}`)}
              >
                Go to Check-out
              </button>
            ) : null}
            <button type="button" className="vm-btn-outline" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </main>
      ) : null}

      <PhotoPreviewModal
        src={previewSrc}
        alt={`${displayName} photo`}
        onClose={() => setPreviewSrc(null)}
      />
    </div>
  );
}
