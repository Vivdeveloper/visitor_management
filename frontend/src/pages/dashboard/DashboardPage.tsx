import { useCallback, useEffect, useMemo, useState } from "react";
import {
  dashboardApi,
  settingsApi,
  type DashboardPayload,
  type DashboardQueueItem,
  type MasterOption,
} from "@/api/vms";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";

const KPI_ORDER: { key: string; label: string }[] = [
  { key: "Pending Approval", label: "Pending" },
  { key: "Approved", label: "Approved" },
  { key: "Checked In", label: "Checked In" },
  { key: "Meeting Done", label: "Meeting Done" },
  { key: "Checked Out", label: "Checked Out" },
  { key: "Rejected", label: "Rejected" },
  { key: "On Premises", label: "On Premises" },
];

type Filters = {
  site: string;
  building: string;
  from_date: string;
  to_date: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({
    site: "",
    building: "",
    from_date: todayIso(),
    to_date: todayIso(),
  });
  const [sites, setSites] = useState<MasterOption[]>([]);
  const [buildings, setBuildings] = useState<MasterOption[]>([]);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const loadMasters = useCallback(async () => {
    try {
      const masters = await settingsApi.getMasters();
      setSites(masters.sites || []);
      setBuildings(masters.buildings || []);
    } catch {
      // masters optional for filters
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const payload = await dashboardApi.getDashboard({
        site: filters.site || undefined,
        building: filters.building || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
      });
      setData(payload);
      setLive(true);
    } catch (err: unknown) {
      setError(extractError(err));
      setLive(false);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useVmsRealtime(() => {
    void load();
  }, true);

  const filteredBuildings = useMemo(() => {
    if (!filters.site) return buildings;
    return buildings.filter((b) => !b.site || b.site === filters.site);
  }, [buildings, filters.site]);

  const maxTrend = Math.max(1, ...(data?.trend || []).map((t) => t.count));

  return (
    <section className="page dash">
      <header className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Live visitor KPIs
            {live ? <span className="dash-live"> · Live</span> : null}
          </p>
        </div>
        <button type="button" className="dash-refresh" onClick={() => void load()}>
          Refresh
        </button>
      </header>

      <div className="dash-filters">
        <label>
          Site
          <select
            value={filters.site}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                site: e.target.value,
                building: "",
              }))
            }
          >
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.name} value={s.name}>
                {s.site_name || s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Building
          <select
            value={filters.building}
            onChange={(e) => setFilters((f) => ({ ...f, building: e.target.value }))}
          >
            <option value="">All buildings</option>
            {filteredBuildings.map((b) => (
              <option key={b.name} value={b.name}>
                {b.building_name || b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={filters.from_date}
            onChange={(e) => setFilters((f) => ({ ...f, from_date: e.target.value }))}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filters.to_date}
            onChange={(e) => setFilters((f) => ({ ...f, to_date: e.target.value }))}
          />
        </label>
      </div>

      {error ? <p className="dash-error">{error}</p> : null}
      {loading && !data ? <p className="dash-muted">Loading…</p> : null}

      {data ? (
        <>
          <div className="kpi-grid">
            {KPI_ORDER.map((item) => (
              <article key={item.key} className="kpi-card">
                <div className="kpi-label">{item.label}</div>
                <div className="kpi-value">{data.kpis[item.key] ?? 0}</div>
              </article>
            ))}
          </div>

          <section className="dash-panel">
            <h2>Visitor trend</h2>
            <p className="dash-muted">Daily registrations in range / last 7 days</p>
            <div className="trend-chart" role="img" aria-label="Visitor trend chart">
              {(data.trend || []).map((point) => (
                <div key={point.date} className="trend-col">
                  <div
                    className="trend-bar"
                    style={{ height: `${Math.max(8, (point.count / maxTrend) * 120)}px` }}
                    title={`${point.date}: ${point.count}`}
                  />
                  <span className="trend-count">{point.count}</span>
                  <span className="trend-label">{point.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="queue-grid">
            <QueuePanel title="Pending approval" items={data.queues.pending} />
            <QueuePanel title="Gate exit" items={data.queues.gate_exit} />
            <QueuePanel title="Overstay" items={data.queues.overstay} accent />
            <QueuePanel title="Rejected" items={data.queues.rejected} />
          </div>
        </>
      ) : null}
    </section>
  );
}

function QueuePanel({
  title,
  items,
  accent,
}: {
  title: string;
  items: DashboardQueueItem[];
  accent?: boolean;
}) {
  return (
    <section className={`dash-panel queue-panel${accent ? " queue-accent" : ""}`}>
      <div className="queue-head">
        <h2>{title}</h2>
        <span className="queue-count">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="dash-muted">None</p>
      ) : (
        <ul className="queue-list">
          {items.slice(0, 8).map((row) => (
            <li key={row.name}>
              <div className="queue-name">{row.full_name || row.name}</div>
              <div className="queue-meta">
                {row.host_name ? `Host: ${row.host_name}` : row.status}
                {row.building ? ` · ${row.building}` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function extractError(err: unknown): string {
  if (typeof err === "object" && err && "response" in err) {
    const response = (err as { response?: { data?: { message?: string; _server_messages?: string } } })
      .response;
    const msg = response?.data?.message;
    if (typeof msg === "string") return msg;
    const server = response?.data?._server_messages;
    if (server) {
      try {
        const parsed = JSON.parse(server);
        const first = JSON.parse(parsed[0]);
        if (first?.message) return first.message;
      } catch {
        /* ignore */
      }
    }
  }
  if (err instanceof Error) return err.message;
  return "Failed to load dashboard";
}
