import { Preferences } from "@capacitor/preferences";
import { isNativePlatform } from "@/native/platform";

export async function secureSet(key: string, value: string): Promise<void> {
  if (isNativePlatform()) {
    await Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}

export async function secureGet(key: string): Promise<string | null> {
  if (isNativePlatform()) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

export async function secureRemove(key: string): Promise<void> {
  if (isNativePlatform()) {
    await Preferences.remove({ key });
    return;
  }
  localStorage.removeItem(key);
}

export async function secureClear(): Promise<void> {
  if (isNativePlatform()) {
    await Preferences.clear();
    return;
  }
  /* web: only clear vms-prefixed keys to avoid wiping unrelated data */
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("vms_")) localStorage.removeItem(key);
  }
}
