import { isNativePlatform } from "@/native/platform";

export type ConnectionStatus = {
  connected: boolean;
  connectionType: string;
};

export type NetworkListener = (online: boolean) => void;

const webListeners = new Set<NetworkListener>();

function notifyWebListeners(online: boolean) {
  for (const listener of webListeners) listener(online);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => notifyWebListeners(true));
  window.addEventListener("offline", () => notifyWebListeners(false));
}

function webNetworkStatus(): ConnectionStatus {
  const connected = typeof navigator !== "undefined" ? navigator.onLine : true;
  return {
    connected,
    connectionType: connected ? "unknown" : "none",
  };
}

function isCapacitorNetworkAvailable(): boolean {
  const cap = (
    window as Window & { Capacitor?: { isPluginAvailable?: (name: string) => boolean } }
  ).Capacitor;
  if (!cap?.isPluginAvailable) return true;
  return cap.isPluginAvailable("Network");
}

/** Prefer Capacitor Network on native; fall back to navigator.onLine if plugin missing. */
async function tryNativeNetworkStatus(): Promise<ConnectionStatus | null> {
  if (!isNativePlatform()) return null;
  if (!isCapacitorNetworkAvailable()) return null;

  try {
    const { Network } = await import("@capacitor/network");
    return await Network.getStatus();
  } catch {
    return null;
  }
}

export async function getNetworkStatus(): Promise<ConnectionStatus> {
  const native = await tryNativeNetworkStatus();
  return native ?? webNetworkStatus();
}

export async function isOnline(): Promise<boolean> {
  const status = await getNetworkStatus();
  return status.connected;
}

export function onNetworkChange(listener: NetworkListener): () => void {
  if (isNativePlatform() && isCapacitorNetworkAvailable()) {
    let remove: (() => void) | undefined;
    let cancelled = false;

    void import("@capacitor/network")
      .then(({ Network }) =>
        Network.addListener("networkStatusChange", (status) => {
          listener(status.connected);
        }),
      )
      .then((handle) => {
        if (cancelled) {
          void handle.remove();
          return;
        }
        remove = () => void handle.remove();
      })
      .catch(() => {
        webListeners.add(listener);
      });

    return () => {
      cancelled = true;
      remove?.();
      webListeners.delete(listener);
    };
  }

  webListeners.add(listener);
  return () => {
    webListeners.delete(listener);
  };
}
