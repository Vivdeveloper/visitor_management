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

export async function getNetworkStatus(): Promise<ConnectionStatus> {
  if (isNativePlatform()) {
    const { Network } = await import("@capacitor/network");
    return Network.getStatus();
  }
  return {
    connected: typeof navigator !== "undefined" ? navigator.onLine : true,
    connectionType: typeof navigator !== "undefined" && navigator.onLine ? "wifi" : "none",
  };
}

export async function isOnline(): Promise<boolean> {
  const status = await getNetworkStatus();
  return status.connected;
}

export function onNetworkChange(listener: NetworkListener): () => void {
  if (isNativePlatform()) {
    let remove: (() => void) | undefined;
    void import("@capacitor/network").then(({ Network }) => {
      void Network.addListener("networkStatusChange", (status) => {
        listener(status.connected);
      }).then((handle) => {
        remove = () => handle.remove();
      });
    });
    return () => remove?.();
  }

  webListeners.add(listener);
  return () => {
    webListeners.delete(listener);
  };
}
