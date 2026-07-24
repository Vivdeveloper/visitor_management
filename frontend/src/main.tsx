import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/index.css";

// Disable pinch-to-zoom gestures
document.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  },
  { passive: false },
);

// Disable double-tap zoom
let lastTouchEnd = 0;
document.addEventListener(
  "touchend",
  (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  },
  false,
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Production: register root SW at /vms_sw.js with scope /vms/
 * so the app is installable (Chrome requires SW control of start_url).
 * Dev: Vite serves from / — optional SW skipped.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/vms_sw.js", { scope: "/vms/" })
      .catch(() => {
        /* until first successful build + copy-pwa */
      });
  });
}
