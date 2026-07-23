import axios from "axios";
import { API_BASE } from "@/config/env";

declare global {
  interface Window {
    csrf_token?: string;
    vms_csrf_token?: string;
  }
}

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
  (error) => Promise.reject(error)
);
