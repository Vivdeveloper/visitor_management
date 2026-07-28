/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FRAPPE_URL?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_CAPACITOR?: string;
  /** Set true only when google-services.json / FCM is configured. */
  readonly VITE_NATIVE_PUSH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
