import type { InternalAxiosRequestConfig } from "axios";

const QUEUE_KEY = "vms_offline_queue";
const MAX_QUEUE = 25;

export type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  data?: unknown;
  headers?: Record<string, string>;
  createdAt: number;
};

/** Auth / session calls must never be queued for offline replay. */
const NON_QUEUEABLE = [
  "auth.login_with_password",
  "auth.send_otp",
  "auth.verify_otp",
  "auth.logout",
  "auth.me",
  "auth.get_csrf_token",
  "/api/method/login",
  "/api/method/logout",
];

function readQueue(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]) {
  if (!queue.length) {
    localStorage.removeItem(QUEUE_KEY);
    return;
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function isNonQueueableUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return NON_QUEUEABLE.some((part) => lower.includes(part.toLowerCase()));
}

/** Drop auth calls and requests aimed at a different origin than this page. */
export function pruneOfflineQueue(): number {
  const before = readQueue();
  if (!before.length) return 0;

  const pageOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const kept = before.filter((item) => {
    if (isNonQueueableUrl(item.url)) return false;
    try {
      if (item.url.startsWith("http://") || item.url.startsWith("https://")) {
        const itemOrigin = new URL(item.url).origin;
        if (pageOrigin && itemOrigin !== pageOrigin) return false;
      }
    } catch {
      return false;
    }
    return true;
  });

  writeQueue(kept.slice(-MAX_QUEUE));
  return before.length - kept.length;
}

export function getOfflineQueueSize(): number {
  return readQueue().length;
}

export function shouldEnqueueRequest(config: InternalAxiosRequestConfig): boolean {
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
  if (isNonQueueableUrl(url)) return false;
  return true;
}

export function enqueueRequest(config: InternalAxiosRequestConfig): void {
  if (!shouldEnqueueRequest(config)) return;

  const queue = readQueue();
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url,
    method: (config.method ?? "get").toUpperCase(),
    data: config.data,
    headers: config.headers
      ? { ...(config.headers as Record<string, string>) }
      : undefined,
    createdAt: Date.now(),
  });
  writeQueue(queue.slice(-MAX_QUEUE));
}

export async function flushOfflineQueue(
  executor: (item: QueuedRequest) => Promise<void>,
): Promise<number> {
  const queue = readQueue();
  if (!queue.length) return 0;

  const remaining: QueuedRequest[] = [];
  let synced = 0;

  for (const item of queue) {
    if (isNonQueueableUrl(item.url)) {
      synced += 1;
      continue;
    }
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
