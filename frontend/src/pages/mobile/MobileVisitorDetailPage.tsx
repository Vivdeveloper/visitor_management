import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { visitorApi } from "@/api/vms";
import { extractError, formatDate, formatTime } from "@/lib/format";
import { HeaderBar } from "@/components/common/HeaderBar";

type VisitorDoc = {
  name?: string;
  full_name?: string;
  mobile?: string;
  email?: string;
  status?: string;
  visitor_company?: string;
  person_to_meet_name?: string;
  visit_purpose_type?: string;
  floor?: string;
  check_in?: string;
  checked_in_on?: string;
  check_out?: string;
  creation?: string;
  modified?: string;
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="vm-detail-field">
      <span className="vm-detail-label">{label}</span>
      <span className="vm-detail-value">{value || "—"}</span>
    </div>
  );
}

export function MobileVisitorDetailPage() {
  const { name: routeName = "" } = useParams();
  const navigate = useNavigate();
  const [visitor, setVisitor] = useState<VisitorDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!routeName) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const doc = (await visitorApi.get(routeName)) as VisitorDoc;
        if (!cancelled) setVisitor(doc);
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
  const canCheckout = status === "Meeting Done";

  return (
    <div className="vm-home-page">
      <HeaderBar title="Visitor Details" showBack showNotification={false} showProfile={false} />

      {loading ? <p className="vm-empty-hint">Loading…</p> : null}
      {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}

      {!loading && visitor ? (
        <main className="vm-main-body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div className="vm-overview-card" style={{ padding: "1.15rem" }}>
            <p className="vm-detail-kicker">{visitor.name}</p>
            <h1 className="vm-page-title" style={{ fontSize: "1.35rem", margin: "0.15rem 0 0.35rem" }}>
              {visitor.full_name || visitor.name}
            </h1>
            <span className="vm-status-pill">{status || "—"}</span>
          </div>

          <div className="vm-overview-card" style={{ padding: "1rem" }}>
            <Field label="Mobile" value={visitor.mobile} />
            <Field label="Company" value={visitor.visitor_company} />
            <Field label="Person to meet" value={visitor.person_to_meet_name} />
            <Field label="Purpose" value={visitor.visit_purpose_type} />
            <Field label="Floor" value={visitor.floor} />
            <Field
              label="Check-in"
              value={
                visitor.check_in || visitor.checked_in_on
                  ? `${formatDate(visitor.check_in || visitor.checked_in_on)} · ${formatTime(visitor.check_in || visitor.checked_in_on)}`
                  : undefined
              }
            />
            <Field label="Created" value={visitor.creation ? `${formatDate(visitor.creation)} · ${formatTime(visitor.creation)}` : undefined} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {canCheckout ? (
              <button
                type="button"
                className="vm-btn-primary"
                style={{ width: "100%", height: 52, borderRadius: 14 }}
                onClick={() => navigate(`/checkout/${encodeURIComponent(visitor.name || routeName)}`)}
              >
                Go to Check-out
              </button>
            ) : null}
            <button
              type="button"
              className="vm-btn-outline"
              style={{ width: "100%", height: 48, borderRadius: 14 }}
              onClick={() => navigate(-1)}
            >
              Back
            </button>
          </div>
        </main>
      ) : null}
    </div>
  );
}
