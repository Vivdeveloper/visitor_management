import { useEffect, useRef } from "react";
import { subscribeVmsEvent } from "@/services/vmsSocket";

/** Listen for Frappe `vms_visitor_update` and invoke callback (debounced). */
export function useVmsRealtime(onUpdate: () => void, enabled = true) {
  const cb = useRef(onUpdate);
  cb.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 400);
    };

    const unsubscribe = subscribeVmsEvent("vms_visitor_update", fire);

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
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

    return subscribeVmsEvent<T>(eventName, (payload) => cb.current(payload));
  }, [eventName, enabled]);
}
