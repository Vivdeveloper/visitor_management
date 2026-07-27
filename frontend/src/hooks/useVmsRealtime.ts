import { useEffect, useRef } from "react";
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

function socketHost(): string {
  const boot = window.vms_boot || {};
  const sitename = boot.sitename || window.location.hostname;
  const origin = window.location.origin;
  const isDev = Boolean(boot.developer_mode);

  if (isDev && boot.socketio_port) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${boot.socketio_port}/${sitename}`;
  }
  return `${origin}/${sitename}`;
}

/** Listen for Frappe `vms_visitor_update` and invoke callback (debounced). */
export function useVmsRealtime(onUpdate: () => void, enabled = true) {
  const cb = useRef(onUpdate);
  cb.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    let socket: Socket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 400);
    };

    try {
      socket = io(socketHost(), {
        withCredentials: true,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      });
      socket.on("vms_visitor_update", fire);
    } catch {
      // Socket optional — dashboard still works via manual refresh
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (socket) {
        socket.off("vms_visitor_update", fire);
        socket.disconnect();
      }
      void cancelled;
    };
  }, [enabled]);
}

/** Listen for a specific VMS realtime event with payload. */
export function useVmsRealtimeEvent<T = unknown>(
  eventName: string,
  onEvent: (payload: T) => void,
  enabled = true,
) {
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    let socket: Socket | null = null;
    const handler = (payload: T) => cb.current(payload);

    try {
      socket = io(socketHost(), {
        withCredentials: true,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      });
      socket.on(eventName, handler);
    } catch {
      // Realtime optional
    }

    return () => {
      if (socket) {
        socket.off(eventName, handler);
        socket.disconnect();
      }
    };
  }, [eventName, enabled]);
}
