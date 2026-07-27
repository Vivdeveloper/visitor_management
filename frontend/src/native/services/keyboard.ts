import { Keyboard, KeyboardInfo } from "@capacitor/keyboard";
import { isNativePlatform } from "@/native/platform";

export type KeyboardListener = (info: { visible: boolean; height: number }) => void;

export async function hideKeyboard(): Promise<void> {
  if (!isNativePlatform()) {
    (document.activeElement as HTMLElement | null)?.blur();
    return;
  }
  await Keyboard.hide();
}

export function onKeyboardChange(listener: KeyboardListener): () => void {
  if (!isNativePlatform()) return () => undefined;

  const showHandle = Keyboard.addListener("keyboardWillShow", (info: KeyboardInfo) => {
    listener({ visible: true, height: info.keyboardHeight });
    document.documentElement.style.setProperty("--keyboard-height", `${info.keyboardHeight}px`);
  });

  const hideHandle = Keyboard.addListener("keyboardWillHide", () => {
    listener({ visible: false, height: 0 });
    document.documentElement.style.setProperty("--keyboard-height", "0px");
  });

  return () => {
    void showHandle.then((h) => h.remove());
    void hideHandle.then((h) => h.remove());
  };
}

export async function setKeyboardAccessoryVisible(visible: boolean): Promise<void> {
  if (!isNativePlatform()) return;
  await Keyboard.setAccessoryBarVisible({ isVisible: visible });
}
