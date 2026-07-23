import { useEffect, useState } from "react";
import { visitorApi } from "@/api/vms";

type Row = {
  name: string;
  full_name?: string;
  status?: string;
  person_to_meet_name?: string;
  modified?: string;
};

export function MobileHistoryPage() {
  const [tab, setTab] = useState<"all" | "out">("all");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const filters =
          tab === "out"
            ? JSON.stringify({ status: "Checked Out" })
            : JSON.stringify({
                status: ["in", ["Checked Out", "Completed", "Rejected", "Meeting Done", "Approved"]],
              });
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
    <section className="m-page">
      <h1>History</h1>
      <p className="m-sub">Past and completed visits</p>

      <div className="gp-tabs">
        <button type="button" className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>
          All
        </button>
        <button type="button" className={tab === "out" ? "active" : ""} onClick={() => setTab("out")}>
          Check-out
        </button>
      </div>

      {error ? <p className="login-error">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="m-sub">No history yet.</p>
      ) : (
        <ul className="m-list">
          {rows.map((row) => (
            <li key={row.name} className="m-card">
              <div className="m-card-title">{row.full_name || row.name}</div>
              <div className="m-card-meta">
                {row.status}
                {row.person_to_meet_name ? ` · ${row.person_to_meet_name}` : ""}
                {row.modified ? ` · ${new Date(row.modified).toLocaleString()}` : ""}
              </div>
              <span className={`gp-badge ${row.status === "Checked Out" ? "success" : "muted"}`}>
                {row.status === "Checked Out" ? "Completed" : row.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
