import { Outlet } from "react-router-dom";
import { FloatingNavbar } from "@/components/navigation/FloatingNavbar";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";

export function MobileLayout() {
  return (
    <div className="m-shell">
      <OfflineIndicator />
      <main className="m-content" id="vms-scroll-root">
        <Outlet />
      </main>
      <FloatingNavbar />
    </div>
  );
}
