/** Frappe serves the SPA at /vms (see hooks.website_route_rules). */
export const APP_BASE_PATH = import.meta.env.DEV ? "/" : "/vms";

export const API_BASE = import.meta.env.VITE_API_BASE || "";

export const APP_NAME = "Precious Alloys";
export const APP_TAGLINE = "Visitor Management";
export const COMPANY_NAME = "Precious Alloy Components Pvt. Ltd.";
