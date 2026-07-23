import { useCallback, useEffect, useState } from "react";
import { approvalApi } from "@/api/vms";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";

type ApprovalRow = {
  name: string;
  full_name?: string;
  mobile?: string;
  host_name?: string;
};

export function MobileApprovalsPage() {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = (await approvalApi.listForHost("Pending Approval")) as ApprovalRow[];
      setRows(list || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load approvals");
    }
  }, []);

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
      <p className="m-sub">Pending visitors assigned to you</p>
      {error ? <p className="login-error">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="m-sub">No pending approvals</p>
      ) : (
        <ul className="m-list">
          {rows.map((row) => (
            <li key={row.name} className="m-card">
              <div className="m-card-title">{row.full_name || row.name}</div>
              <div className="m-card-meta">
                {row.mobile || "—"}
                {row.host_name ? ` · Host ${row.host_name}` : ""}
              </div>
              <div className="m-card-actions">
                <button
                  type="button"
                  className="m-btn primary"
                  disabled={busy === row.name}
                  onClick={() => void act(row.name, "approve")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="m-btn"
                  disabled={busy === row.name}
                  onClick={() => void act(row.name, "reject")}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
