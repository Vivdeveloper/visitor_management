import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi, type DashboardQueueItem } from "@/api/vms";

export function MobileInsidePage() {
  const [rows, setRows] = useState<DashboardQueueItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await dashboardApi.getLiveVisitors();
        if (!cancelled) setRows(list || []);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="m-page">
      <h1>Inside Visitors</h1>
      <p className="m-sub">{rows.length} currently on premises</p>
      {error ? <p className="login-error">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="m-sub">Nobody inside right now.</p>
      ) : (
        <ul className="m-list">
          {rows.map((row) => (
            <li key={row.name} className="m-card gp-person">
              <div>
                <div className="m-card-title">{row.full_name || row.name}</div>
                <div className="m-card-meta">
                  Host: {row.person_to_meet_name || row.host_name || "—"}
                  {row.check_in || row.checked_in_on
                    ? ` · In ${formatTime(row.check_in || row.checked_in_on)}`
                    : ""}
                  {row.status ? ` · ${row.status}` : ""}
                </div>
              </div>
              <div className="gp-person-side">
                <span className="gp-badge success">Inside</span>
                {row.status === "Meeting Done" ? (
                  <Link className="m-btn success" to={`/checkout/${encodeURIComponent(row.name)}`}>
                    Exit
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatTime(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
}
