import { io, type Socket } from "socket.io-client";

declare global {
  interface Window {
    vms_boot?: {
      sitename?: string;
      socketio_port?: number | string;
      developer_mode?: boolean | number;
    };
  }
}

/** Frappe realtime namespace URL (matches desk socketio_client.get_host). */
export function resolveSocketHost(): string {
  const boot = window.vms_boot || {};
  const sitename =
    boot.sitename ||
    document.documentElement.dataset.frappeSite ||
    window.location.hostname;
  const origin = window.location.origin;
  const isDev = Boolean(boot.developer_mode);

  if (isDev && boot.socketio_port) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${boot.socketio_port}/${sitename}`;
  }
  return `${origin}/${sitename}`;
}

let socket: Socket | null = null;

export function connectVmsSocket(): Socket | null {
  const sock = getVmsSocket();
  if (sock && !sock.connected) {
    sock.connect();
  }
  return sock;
}

export function getVmsSocket(): Socket | null {
  if (socket) return socket;

  try {
    socket = io(resolveSocketHost(), {
      withCredentials: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 8000,
      transports: ["websocket", "polling"],
    });

    socket.on("connect_error", (err) => {
      console.warn("[VMS] Realtime connection error:", err.message);
    });
  } catch {
    return null;
  }

  return socket;
}

export function subscribeVmsEvent<T>(
  eventName: string,
  handler: (payload: T) => void,
): () => void {
  const sock = getVmsSocket();
  if (!sock) return () => undefined;

  const wrapped = (payload: T) => handler(payload);
  sock.on(eventName, wrapped);

  return () => {
    sock.off(eventName, wrapped);
  };
}
