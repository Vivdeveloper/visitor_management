import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { IS_CAPACITOR_BUILD } from "./config/env";
import "./styles/index.css";

/* Light-only app — clear any leftover dark theme from older builds */
document.documentElement.removeAttribute("data-theme");
document.documentElement.classList.remove("dark");
document.documentElement.style.colorScheme = "light";
try {
  localStorage.removeItem("vms_theme");
  localStorage.removeItem("vms-theme");
} catch {
  /* ignore */
}

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
 * Production PWA: register root SW at /vms_sw.js with scope /vms/
 * Skipped for Capacitor native builds (bundled assets).
 */
if (import.meta.env.PROD && !IS_CAPACITOR_BUILD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/vms_sw.js", { scope: "/vms/" })
      .catch(() => {
        /* until first successful build + copy-pwa */
      });
  });
}
