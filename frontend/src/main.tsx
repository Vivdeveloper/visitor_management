import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/assets/visitor_management/frontend/sw.js", {
        scope: "/assets/visitor_management/frontend/",
      })
      .catch(() => {
        /* optional until first build */
      });
  });
}
