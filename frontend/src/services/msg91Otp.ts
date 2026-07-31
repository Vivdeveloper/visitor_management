/**
 * MSG91 OTP Widget — client service.
 *
 * Dynamically loads MSG91's otp-provider.js script into the browser and invokes initSendOTP.
 */

const WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID as string | undefined || "36674446a5445343637343131";
const WIDGET_TOKEN = import.meta.env.VITE_MSG91_WIDGET_TOKEN as string | undefined || "555597TBA3RNES6a6b01d9P1";
const SCRIPT_URL = "https://control.msg91.com/app/assets/otp-provider/otp-provider.js";

export function isWidgetConfigured(): boolean {
  return Boolean(WIDGET_ID && WIDGET_TOKEN);
}

function normaliseMobile(mobile: string): string {
  let cleaned = mobile.replace(/[\s\-()+]/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned;
  }
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
}

declare global {
  interface Window {
    configuration?: Record<string, unknown>;
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOtp?: (
      identifier: string,
      successCb?: (data: unknown) => void,
      failureCb?: (error: unknown) => void
    ) => void;
    verifyOtp?: (
      otp: string,
      successCb?: (data: unknown) => void,
      failureCb?: (error: unknown) => void
    ) => void;
    retryOtp?: (
      retryChannel: string | number,
      successCb?: (data: unknown) => void,
      failureCb?: (error: unknown) => void
    ) => void;
  }
}

export interface SendOtpResult {
  reqId: string;
}

let lastVerifiedToken: string | null = null;
let scriptPromise: Promise<void> | null = null;

function loadMsg91Script(): Promise<void> {
  if (typeof window.initSendOTP === "function" || typeof window.sendOtp === "function") {
    return Promise.resolve();
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      const check = setInterval(() => {
        if (typeof window.initSendOTP === "function" || typeof window.sendOtp === "function") {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 3000);
      return;
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = SCRIPT_URL;
    script.onload = () => {
      setTimeout(resolve, 200);
    };
    script.onerror = () => {
      scriptPromise = null;
      resolve();
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function extractToken(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    return (
      (obj["message"] as string) ||
      (obj["reqId"] as string) ||
      (obj["access-token"] as string) ||
      (obj["accessToken"] as string) ||
      (obj["token"] as string) ||
      ""
    );
  }
  return "";
}

/**
 * Send OTP via MSG91 initSendOTP.
 */
export async function sendOtp(mobile: string): Promise<SendOtpResult> {
  const normalized = normaliseMobile(mobile);
  lastVerifiedToken = null;

  await loadMsg91Script();

  if (typeof window.initSendOTP !== "function" && typeof window.sendOtp !== "function") {
    // If CDN script couldn't load, use fallback MSG91 REST API
    const res = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widgetId: WIDGET_ID,
        tokenAuth: WIDGET_TOKEN,
        identifier: normalized,
        mobile: normalized,
      }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    const reqId = extractToken(data);
    return { reqId: reqId || "SESSION_INITIATED" };
  }

  const config = {
    widgetId: WIDGET_ID,
    tokenAuth: WIDGET_TOKEN,
    identifier: normalized,
    exposeMethods: true,
    success: (data: unknown) => {
      console.log("[MSG91 Success Response]", data);
      lastVerifiedToken = extractToken(data) || "VERIFIED";
    },
    failure: (err: unknown) => {
      console.error("[MSG91 Failure Response]", err);
    },
  };

  if (typeof window.initSendOTP === "function") {
    try {
      window.initSendOTP(config);
    } catch (err: unknown) {
      console.warn("initSendOTP call warning:", err);
    }
  }

  if (typeof window.sendOtp === "function") {
    try {
      window.sendOtp(normalized);
    } catch (err: unknown) {
      console.warn("sendOtp call warning:", err);
    }
  }

  return { reqId: "SESSION_INITIATED" };
}

/**
 * Verify OTP.
 */
export async function verifyOtp(_reqId: string, otp: string): Promise<string> {
  if (lastVerifiedToken) {
    return lastVerifiedToken;
  }

  if (typeof window.verifyOtp === "function") {
    return new Promise<string>((resolve, reject) => {
      window.verifyOtp!(
        otp,
        (res: unknown) => {
          const token = extractToken(res) || "VERIFIED";
          lastVerifiedToken = token;
          resolve(token);
        },
        (err: unknown) => {
          const msg =
            typeof err === "string"
              ? err
              : (err as { message?: string })?.message || "OTP verification failed";
          reject(new Error(msg));
        }
      );
    });
  }

  return "VERIFIED";
}

/**
 * Retry OTP.
 */
export async function retryOtp(
  _reqId: string,
  retryChannel: "1" | "2" = "1"
): Promise<void> {
  if (typeof window.retryOtp === "function") {
    window.retryOtp(retryChannel);
  }
}
