import { useCallback, useEffect, useMemo, useState } from "react";
import { approvalApi, dashboardApi, type DashboardQueueItem } from "@/api/vms";
import { HeaderBar } from "@/components/common/HeaderBar";
import { PendingDecisionCard } from "@/components/approvals/PendingDecisionCard";
import { useVmsRealtime } from "@/hooks/useVmsRealtime";

type TabStatus = "Pending" | "Approved" | "Checked In" | "Rejected";

export function MobileApprovalsPage() {
  const [tab, setTab] = useState<TabStatus>("Pending");
  const [query, setQuery] = useState("");
  const [pendingItems, setPendingItems] = useState<DashboardQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let list: DashboardQueueItem[] = [];
      if (tab === "Pending") {
        list = await dashboardApi.getPendingApprovals();
      } else {
        const apiTab = tab === "Approved" ? "Approved" : tab === "Checked In" ? "Checked In" : "Rejected";
        const res = (await approvalApi.listForHost(apiTab)) as Array<Record<string, string>>;
        list = (res || []).map((r) => ({
          name: r.name,
          full_name: r.full_name || r.name,
          mobile: r.mobile,
          person_to_meet_name: r.person_to_meet_name || r.host_name,
          floor: r.floor,
          modified: r.modified,
          status: r.status,
        }));
      }
      setPendingItems(list || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load approvals");
      setPendingItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  useVmsRealtime(() => {
    void load();
  });

  async function handleApprove(name: string) {
    setBusy(name);
    setError(null);
    try {
      await approvalApi.approve(name);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(name: string) {
    setBusy(name);
    setError(null);
    try {
      await approvalApi.reject(name, "Rejected from mobile app");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  function handleCall(mobile?: string) {
    if (mobile && mobile !== "—") {
      window.location.href = `tel:${mobile.replace(/\s+/g, "")}`;
    } else {
      alert("No mobile number provided for this visitor.");
    }
  }

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pendingItems.filter((item) => {
      if (!q) return true;
      const haystack = `${item.full_name || ""} ${item.name || ""} ${item.person_to_meet_name || ""} ${item.mobile || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [pendingItems, query]);

  return (
    <div className="vm-home-page vm-approvals-page">
      <HeaderBar title="Precious Alloys" showNotification showProfile />

      <header className="vm-reports-head" style={{ padding: "0.25rem 0.25rem 0.65rem" }}>
        <div>
          <p className="vm-reports-eyebrow">Visitor Approvals</p>
          <h1 className="vm-reports-title" style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--vms-navy)", margin: 0 }}>
            {tab} Approvals
          </h1>
        </div>
        <span className="vm-live-pill is-live">{filteredItems.length} Items</span>
      </header>

      <main className="vm-main-body vm-approvals-stack">
        <div className="vm-meetings-search" style={{ margin: 0 }}>
          <span className="vm-search-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            className="vm-input-field vm-meetings-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search visitor by name, phone or host..."
            aria-label="Search approvals"
          />
        </div>

        <div className="vm-reports-tabs" role="tablist" aria-label="Approval Status">
          {(["Pending", "Approved", "Checked In", "Rejected"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`vm-reports-tab${tab === t ? " is-active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {error ? <p className="login-error" style={{ textAlign: "center" }}>{error}</p> : null}
        {loading ? <p className="vm-empty-hint">Loading approvals queue…</p> : null}

        {!loading && filteredItems.length === 0 ? (
          <div className="vm-overview-card vm-approvals-empty">
            <strong>No {tab} Approvals</strong>
            <p>No visitor check-in requests found in {tab.toLowerCase()} status.</p>
          </div>
        ) : null}

        <div className="vm-decide-list">
          {filteredItems.map((item) => (
            <PendingDecisionCard
              key={item.name}
              item={item}
              busy={busy === item.name}
              interactive={tab === "Pending"}
              filterStatus={tab === "Pending" ? "Pending Approval" : tab}
              onAccept={() => void handleApprove(item.name)}
              onReject={() => void handleReject(item.name)}
              onCall={() => handleCall(item.mobile)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
