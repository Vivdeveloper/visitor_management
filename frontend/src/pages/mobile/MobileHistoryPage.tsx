import { useEffect, useState } from "react";
import { visitorApi } from "@/api/vms";
import { initials } from "@/lib/format";

type Row = {
  name: string;
  full_name?: string;
  status?: string;
  person_to_meet_name?: string;
  modified?: string;
};

type Tab = "all" | "in" | "out";

export function MobileHistoryPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let filters: string;
        if (tab === "out") {
          filters = JSON.stringify({ status: "Checked Out" });
        } else if (tab === "in") {
          filters = JSON.stringify({
            status: ["in", ["Checked In", "Meeting Done"]],
          });
        } else {
          filters = JSON.stringify({
            status: ["in", ["Checked Out", "Rejected", "Meeting Done", "Approved", "Checked In"]],
          });
        }
        const list = (await visitorApi.list(filters, 50)) as Row[];
        if (!cancelled) setRows(list || []);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load history");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <section className="m-page ad-page">
      <div className="ad-dash-top">
        <h1 className="ad-title">History</h1>
      </div>

      <div className="ad-tabs">
        {(
          [
            ["all", "All"],
            ["in", "Check-in"],
            ["out", "Check-out"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={tab === value ? "on" : ""}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="login-error">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="m-sub">No history yet.</p>
      ) : (
        <div className="ad-panel-list">
          {rows.map((row) => (
            <div key={row.name} className="ad-list-row">
              <div className="ad-avatar">{initials(row.full_name || row.name)}</div>
              <div className="ad-list-meta">
                <b>{row.full_name || row.name}</b>
                <span>{row.name}</span>
              </div>
              <span
                className={`ad-tag ${
                  row.status === "Checked Out" || row.status === "Approved"
                    ? "ad-tag-ok"
                    : row.status === "Rejected"
                      ? "ad-tag-bad"
                      : "ad-tag-warn"
                }`}
              >
                {row.status === "Checked Out" ? "Done" : row.status || "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
