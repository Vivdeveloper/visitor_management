import { Clipboard } from "@capacitor/clipboard";
import { isNativePlatform } from "@/native/platform";

export async function writeClipboard(text: string): Promise<void> {
  if (isNativePlatform()) {
    await Clipboard.write({ string: text });
    return;
  }
  await navigator.clipboard?.writeText(text);
}

export async function readClipboard(): Promise<string> {
  if (isNativePlatform()) {
    const { value } = await Clipboard.read();
    return value ?? "";
  }
  return navigator.clipboard?.readText() ?? "";
}
