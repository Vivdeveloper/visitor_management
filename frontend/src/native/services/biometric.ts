import { NativeBiometric, BiometryType } from "@capgo/capacitor-native-biometric";
import { isNativePlatform } from "@/native/platform";

const SERVER_KEY = "com.preciousalloys.gatepass";

export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function getBiometryLabel(): Promise<string> {
  if (!isNativePlatform()) return "Biometrics";
  try {
    const { biometryType } = await NativeBiometric.isAvailable();
    switch (biometryType) {
      case BiometryType.FACE_ID:
        return "Face ID";
      case BiometryType.TOUCH_ID:
        return "Touch ID";
      case BiometryType.FINGERPRINT:
        return "Fingerprint";
      case BiometryType.FACE_AUTHENTICATION:
        return "Face Authentication";
      case BiometryType.IRIS_AUTHENTICATION:
        return "Iris Authentication";
      default:
        return "Biometrics";
    }
  } catch {
    return "Biometrics";
  }
}

export async function verifyBiometric(reason: string): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title: "GatePass",
      subtitle: reason,
      description: "",
      useFallback: true,
      maxAttempts: 3,
    });
    return true;
  } catch {
    return false;
  }
}

export async function setSecureCredentials(username: string, password: string): Promise<void> {
  if (!isNativePlatform()) return;
  await NativeBiometric.setCredentials({
    username,
    password,
    server: SERVER_KEY,
  });
}

export async function getSecureCredentials(): Promise<{ username: string; password: string } | null> {
  if (!isNativePlatform()) return null;
  try {
    const creds = await NativeBiometric.getCredentials({ server: SERVER_KEY });
    return creds;
  } catch {
    return null;
  }
}

export async function deleteSecureCredentials(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await NativeBiometric.deleteCredentials({ server: SERVER_KEY });
  } catch {
    /* ignore */
  }
}
