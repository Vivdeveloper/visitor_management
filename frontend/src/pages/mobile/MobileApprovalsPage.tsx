import { useCallback, useEffect, useState } from "react";
import { approvalApi } from "@/api/vms";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";

type ApprovalRow = {
  name: string;
  full_name?: string;
  mobile?: string;
  person_to_meet_name?: string;
  host_name?: string;
  status?: string;
  visitor_company?: string;
};

type Tab = "Checked In" | "Approved" | "Rejected";

export function MobileApprovalsPage() {
  const [tab, setTab] = useState<Tab>("Checked In");
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = (await approvalApi.listForHost(tab)) as ApprovalRow[];
      setRows(list || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load approvals");
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  useVmsRealtime(() => {
    void load();
  });

  async function act(name: string, action: "approve" | "reject") {
    setBusy(name);
    setError(null);
    try {
      if (action === "approve") {
        await approvalApi.approve(name);
      } else {
        await approvalApi.reject(name, "Rejected from mobile");
      }
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="m-page">
      <h1>Approvals</h1>
      <p className="m-sub">Host review after gate check-in</p>

      <div className="gp-tabs">
        {(
          [
            ["Checked In", "Pending"],
            ["Approved", "Approved"],
            ["Rejected", "Rejected"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="login-error">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="m-sub">No visitors in this list</p>
      ) : (
        <ul className="m-list">
          {rows.map((row) => (
            <li key={row.name} className="m-card">
              <div className="m-card-title">{row.full_name || row.name}</div>
              <div className="m-card-meta">
                {row.mobile || "—"}
                {row.visitor_company ? ` · ${row.visitor_company}` : ""}
              </div>
              {tab === "Checked In" ? (
                <div className="m-card-actions">
                  <button
                    type="button"
                    className="m-btn success"
                    disabled={busy === row.name}
                    onClick={() => void act(row.name, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="m-btn danger"
                    disabled={busy === row.name}
                    onClick={() => void act(row.name, "reject")}
                  >
                    Reject
                  </button>
                  {row.mobile ? (
                    <a className="m-btn" href={`tel:${row.mobile}`}>
                      Call
                    </a>
                  ) : null}
                </div>
              ) : (
                <span className={`gp-badge ${tab === "Approved" ? "success" : "danger"}`}>{tab}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
