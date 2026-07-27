import type { InternalAxiosRequestConfig } from "axios";

const QUEUE_KEY = "vms_offline_queue";

export type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  data?: unknown;
  headers?: Record<string, string>;
  createdAt: number;
};

function readQueue(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueueSize(): number {
  return readQueue().length;
}

export function enqueueRequest(config: InternalAxiosRequestConfig): void {
  const queue = readQueue();
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url,
    method: (config.method ?? "get").toUpperCase(),
    data: config.data,
    headers: config.headers ? { ...config.headers as Record<string, string> } : undefined,
    createdAt: Date.now(),
  });
  writeQueue(queue);
}

export async function flushOfflineQueue(
  executor: (item: QueuedRequest) => Promise<void>,
): Promise<number> {
  const queue = readQueue();
  if (!queue.length) return 0;

  const remaining: QueuedRequest[] = [];
  let synced = 0;

  for (const item of queue) {
    try {
      await executor(item);
      synced += 1;
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  return synced;
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}
