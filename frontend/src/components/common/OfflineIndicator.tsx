import { useEffect, useRef, useState } from "react";
import { getOfflineQueueSize, pruneOfflineQueue } from "@/offline/queue";
import { syncOfflineQueue } from "@/offline/sync";
import { onNetworkChange } from "@/native/services/network";

export function OfflineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [queued, setQueued] = useState(0);
  const [busy, setBusy] = useState(false);
  const syncingRef = useRef(false);

  useEffect(() => {
    pruneOfflineQueue();

    const refreshQueue = () => setQueued(getOfflineQueueSize());
    refreshQueue();

    const runSync = async () => {
      if (syncingRef.current) return;
      if (getOfflineQueueSize() === 0) {
        refreshQueue();
        return;
      }
      syncingRef.current = true;
      setBusy(true);
      try {
        await syncOfflineQueue();
      } finally {
        syncingRef.current = false;
        setBusy(false);
        refreshQueue();
      }
    };

    void runSync();

    const removeNetwork = onNetworkChange((connected) => {
      setOnline(connected);
      refreshQueue();
      if (connected) void runSync();
    });

    const interval = window.setInterval(refreshQueue, 4000);
    return () => {
      removeNetwork();
      window.clearInterval(interval);
    };
  }, []);

  if (online && queued === 0) return null;

  return (
    <div
      className="vms-offline-indicator"
      role="status"
      aria-live="polite"
      aria-label={online ? "Syncing queued requests" : "Offline mode"}
    >
      {!online ? "You are offline" : null}
      {online && queued > 0
        ? `${busy ? "Syncing" : "Pending"} ${queued} request${queued === 1 ? "" : "s"}…`
        : null}
      {!online && queued > 0 ? ` · ${queued} queued` : null}
    </div>
  );
}
