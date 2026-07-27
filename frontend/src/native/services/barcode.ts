import {
  BarcodeFormat,
  BarcodeScanner,
} from "@capacitor-mlkit/barcode-scanning";
import { isNativePlatform } from "@/native/platform";

export type ScanResult = {
  rawValue: string;
  format: string;
};

/** Scan QR / barcode using ML Kit on native; returns null on web (caller keeps manual entry). */
export async function scanBarcode(): Promise<ScanResult | null> {
  if (!isNativePlatform()) return null;

  const { camera } = await BarcodeScanner.requestPermissions();
  if (camera !== "granted" && camera !== "limited") {
    throw new Error("Camera permission is required to scan codes");
  }

  const supported = await BarcodeScanner.isSupported();
  if (!supported) {
    throw new Error("Barcode scanning is not supported on this device");
  }

  document.body.classList.add("barcode-scanner-active");

  try {
    const result = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode, BarcodeFormat.Code128, BarcodeFormat.Code39],
    });

    const match = result.barcodes[0];
    if (!match?.rawValue) return null;

    return {
      rawValue: match.rawValue,
      format: match.format,
    };
  } finally {
    document.body.classList.remove("barcode-scanner-active");
  }
}
