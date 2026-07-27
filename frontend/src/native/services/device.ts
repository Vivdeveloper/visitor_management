import { Device } from "@capacitor/device";
import { isNativePlatform } from "@/native/platform";

export type DeviceInfo = {
  platform: string;
  model: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
  webViewVersion: string;
};

export async function getDeviceInfo(): Promise<DeviceInfo> {
  if (!isNativePlatform()) {
    return {
      platform: "web",
      model: navigator.userAgent,
      osVersion: "",
      manufacturer: "",
      isVirtual: false,
      webViewVersion: "",
    };
  }

  const info = await Device.getInfo();
  return {
    platform: info.platform,
    model: info.model,
    osVersion: info.osVersion,
    manufacturer: info.manufacturer,
    isVirtual: info.isVirtual,
    webViewVersion: info.webViewVersion,
  };
}

export async function getDeviceId(): Promise<string> {
  if (!isNativePlatform()) return "web";
  const { identifier } = await Device.getId();
  return identifier;
}
