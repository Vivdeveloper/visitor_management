import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { IS_CAPACITOR_BUILD } from "./config/env";
import { patchDomNodeSafety } from "@/lib/domSafety";
import { isLikelyNativeWebView, isNativePlatform } from "@/native/platform";
import "./styles/index.css";

function isCapacitorNativeRuntime(): boolean {
  return isNativePlatform() || isLikelyNativeWebView();
}

/* Soften WebView / service-worker DOM races that crash React removeChild. */
patchDomNodeSafety();

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

const rootEl = document.getElementById("root");
if (rootEl) {
  /* Drop server-rendered boot markup so React owns a clean container. */
  rootEl.replaceChildren();
  const app = <App />;
  createRoot(rootEl).render(
    isCapacitorNativeRuntime() ? app : <StrictMode>{app}</StrictMode>,
  );
}

/**
 * Production PWA: register root SW at /vms_sw.js with scope /vms/
 * Register ASAP so Web Push can subscribe for background alerts.
 * Skipped for Capacitor native (bundled or live /vms/ in WebView) — SW reloads
 * race React DOM updates and surface removeChild errors.
 */
if (isCapacitorNativeRuntime() && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister();
  });
} else if (import.meta.env.PROD && !IS_CAPACITOR_BUILD && "serviceWorker" in navigator) {
  const registerSw = () => {
    void navigator.serviceWorker
      .register("/vms_sw.js", { scope: "/vms/" })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const nextWorker = registration.installing;
          if (!nextWorker) return;
          nextWorker.addEventListener("statechange", () => {
            if (nextWorker.state !== "installed") return;
            if (!navigator.serviceWorker.controller) return;
            nextWorker.postMessage({ type: "SKIP_WAITING" });
          });
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        void registration.update();
      })
      .catch(() => {
        /* until first successful build + copy-pwa */
      });
  };

  if (document.readyState === "complete") {
    registerSw();
  } else {
    window.addEventListener("load", registerSw);
  }
}
