import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { isNativePlatform } from "@/native/platform";

export type CapturedPhoto = {
  file: File;
  dataUrl: string;
};

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
}

/** Capture a photo via native camera or browser file picker fallback. */
export async function capturePhoto(source: CameraSource = CameraSource.Camera): Promise<CapturedPhoto | null> {
  if (isNativePlatform()) {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source,
      saveToGallery: false,
      correctOrientation: true,
    });
    if (!photo.dataUrl) return null;
    const file = dataUrlToFile(photo.dataUrl, `visitor-${Date.now()}.jpg`);
    return { file, dataUrl: photo.dataUrl };
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "user";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({ file, dataUrl: String(reader.result) });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}
