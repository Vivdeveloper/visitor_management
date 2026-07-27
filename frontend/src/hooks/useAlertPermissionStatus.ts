import { useCallback, useEffect, useState } from "react";
import { notificationPermissionState } from "@/native/services/notifications";
import { isNativePlatform } from "@/native/platform";
import { getWebPushStatus } from "@/services/webPush";

export function useAlertPermissionStatus() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const perm = notificationPermissionState();
      if (perm !== "granted") {
        setReady(false);
        return;
      }
      if (isNativePlatform()) {
        setReady(true);
        return;
      }
      const webPush = await getWebPushStatus();
      setReady(webPush.subscribed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onSetup = () => {
      void refresh();
    };
    window.addEventListener("vms-alerts-setup", onSetup);
    return () => window.removeEventListener("vms-alerts-setup", onSetup);
  }, [refresh]);

  return { ready, loading, refresh };
}
