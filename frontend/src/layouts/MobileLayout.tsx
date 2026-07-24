import { Outlet } from "react-router-dom";
import { FloatingNavbar } from "@/components/navigation/FloatingNavbar";

export function MobileLayout() {
  return (
    <div className="m-shell">
      <main className="m-content" id="vms-scroll-root">
        <Outlet />
      </main>
      <FloatingNavbar />
    </div>
  );
}
