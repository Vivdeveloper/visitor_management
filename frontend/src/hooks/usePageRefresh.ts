import { useEffect } from "react";

/** Dispatched by MobileLayout pull-to-refresh (soft reload, no full page refresh). */
export const VMS_PAGE_REFRESH_EVENT = "vms:page-refresh";

/** Re-run a page loader when the user pulls to refresh. */
export function usePageRefresh(load: () => void | Promise<void>) {
  useEffect(() => {
    const onRefresh = () => {
      void load();
    };
    window.addEventListener(VMS_PAGE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(VMS_PAGE_REFRESH_EVENT, onRefresh);
  }, [load]);
}
