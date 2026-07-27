import axios from "axios";
import { API_BASE } from "@/config/env";
import { enqueueRequest } from "@/offline/queue";
import { isOnline } from "@/native/services/network";

declare global {
  interface Window {
    csrf_token?: string;
    vms_csrf_token?: string;
  }
}

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

/** Shared Axios client for Frappe /api/method calls (session cookie + CSRF). */
export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = window.csrf_token || window.vms_csrf_token;
  if (token) {
    config.headers["X-Frappe-CSRF-Token"] = token;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const method = String(config?.method ?? "").toLowerCase();

    if (config && MUTATING_METHODS.has(method) && !config.headers?.["X-VMS-Offline-Retry"]) {
      const online = await isOnline();
      if (!online || error.code === "ERR_NETWORK") {
        enqueueRequest(config);
      }
    }

    return Promise.reject(error);
  },
);
