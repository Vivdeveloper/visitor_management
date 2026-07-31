import { apiClient } from "@/api/client";
import { isNativePlatform, nativePlatform } from "@/native/platform";

const METHOD = "visitor_management.react_api.push_notification";
const TOKEN_KEY = "vms_fcm_device_token";

export function cacheFcmToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function readCachedFcmToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveFcmTokenToServer(token?: string | null): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const value = (token || readCachedFcmToken() || "").trim();
  if (!value) return false;

  try {
    await apiClient.post(`/api/method/${METHOD}.save_fcm_token`, {
      token: value,
      platform: nativePlatform(),
    });
    cacheFcmToken(value);
    return true;
  } catch {
    return false;
  }
}

export async function deleteFcmTokenFromServer(token?: string | null): Promise<void> {
  const value = (token || readCachedFcmToken() || "").trim();
  if (!value) return;
  try {
    await apiClient.post(`/api/method/${METHOD}.delete_fcm_token`, { token: value });
  } catch {
    /* ignore */
  }
}
