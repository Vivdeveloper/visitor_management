import { Directory, Filesystem, Encoding } from "@capacitor/filesystem";
import { isNativePlatform } from "@/native/platform";

export async function writeTextFile(path: string, data: string): Promise<void> {
  if (!isNativePlatform()) {
    localStorage.setItem(`fs:${path}`, data);
    return;
  }
  await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
}

export async function readTextFile(path: string): Promise<string | null> {
  if (!isNativePlatform()) {
    return localStorage.getItem(`fs:${path}`);
  }
  try {
    const result = await Filesystem.readFile({
      path,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return typeof result.data === "string" ? result.data : null;
  } catch {
    return null;
  }
}

export async function deleteFile(path: string): Promise<void> {
  if (!isNativePlatform()) {
    localStorage.removeItem(`fs:${path}`);
    return;
  }
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  } catch {
    /* already gone */
  }
}
