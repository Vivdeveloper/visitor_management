import { useEffect, useState } from "react";
import { getOfflineQueueSize } from "@/offline/queue";
import { onNetworkChange } from "@/native/services/network";

export function OfflineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [queued, setQueued] = useState(0);

  useEffect(() => {
    const refreshQueue = () => setQueued(getOfflineQueueSize());
    refreshQueue();

    const removeNetwork = onNetworkChange((connected) => {
      setOnline(connected);
      refreshQueue();
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
      {online && queued > 0 ? `Syncing ${queued} pending request${queued === 1 ? "" : "s"}…` : null}
      {!online && queued > 0 ? ` · ${queued} queued` : null}
    </div>
  );
}
