import { Share } from "@capacitor/share";
import { isNativePlatform } from "@/native/platform";

export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> {
  if (isNativePlatform()) {
    await Share.share(options);
    return true;
  }
  if (navigator.share) {
    await navigator.share({
      title: options.title,
      text: options.text,
      url: options.url,
    });
    return true;
  }
  if (options.url) {
    await navigator.clipboard?.writeText(options.url);
    return true;
  }
  return false;
}
