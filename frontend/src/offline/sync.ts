import axios from "axios";
import { flushOfflineQueue, type QueuedRequest } from "@/offline/queue";
import { onNetworkChange } from "@/native/services/network";

let syncing = false;

async function replayRequest(item: QueuedRequest): Promise<void> {
  const token = window.csrf_token || window.vms_csrf_token;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-VMS-Offline-Retry": "1",
    ...(item.headers ?? {}),
  };
  if (token) headers["X-Frappe-CSRF-Token"] = token;

  await axios({
    url: item.url,
    method: item.method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete",
    data: item.data,
    headers,
    withCredentials: true,
  });
}

export async function syncOfflineQueue(): Promise<number> {
  if (syncing) return 0;
  syncing = true;
  try {
    return await flushOfflineQueue(replayRequest);
  } finally {
    syncing = false;
  }
}

export function startOfflineSyncListener(): () => void {
  return onNetworkChange((online) => {
    if (online) {
      void syncOfflineQueue();
    }
  });
}
