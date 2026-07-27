import { ScreenOrientation, OrientationLockOptions } from "@capacitor/screen-orientation";
import { isNativePlatform } from "@/native/platform";

export async function lockPortrait(): Promise<void> {
  if (!isNativePlatform()) return;
  await ScreenOrientation.lock({ orientation: "portrait" } as OrientationLockOptions);
}

export async function unlockOrientation(): Promise<void> {
  if (!isNativePlatform()) return;
  await ScreenOrientation.unlock();
}

export async function getCurrentOrientation(): Promise<string> {
  if (!isNativePlatform()) return "portrait";
  const { type } = await ScreenOrientation.orientation();
  return type;
}
