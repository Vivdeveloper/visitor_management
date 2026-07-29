/**
 * Frappe serves the SPA at /vms (see hooks.website_route_rules).
 * Capacitor native builds set VITE_CAPACITOR=true and use "/".
 * Do not import @capacitor/core here — that can break the browser PWA boot path.
 *
 * API_BASE must stay empty for Frappe `/vms/` builds (same-origin).
 * Never bake a cloud URL into the local bench build — that causes CORS "Network Error".
 */
export const IS_CAPACITOR_BUILD = import.meta.env.VITE_CAPACITOR === "true";

export const APP_BASE_PATH = IS_CAPACITOR_BUILD
  ? "/"
  : import.meta.env.DEV
    ? "/"
    : "/vms";

export const API_BASE = import.meta.env.VITE_API_BASE || "";

export const APP_NAME = "Precious Alloys";
export const APP_TAGLINE = "Visitor Management";
export const COMPANY_NAME = "Precious Alloy Components Pvt. Ltd.";
