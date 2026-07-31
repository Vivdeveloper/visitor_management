/**
 * MSG91 OTP widget — client service.
 *
 * The widget is initialised with `exposeMethods: true`, which suppresses
 * MSG91's popup and puts `sendOtp` / `retryOtp` / `verifyOtp` on `window`, so
 * the check-in screens keep their own OTP digit boxes and resend link while
 * MSG91 owns sending, retrying and verifying.
 *
 * Credentials come from the server (`otp.get_widget_config`), never from a
 * build-time constant — the account Auth Key stays server-side entirely.
 *
 * `verifyOtp` resolving only means MSG91 accepted the code. It returns a JWT
 * that must go to `otp.verify`; only that server call marks a mobile verified.
 */

import { otpApi } from "@/api/vms";

/** Primary, then mirror — the second is tried if the first fails to load. */
const SCRIPT_URLS = [
  "https://verify.msg91.com/otp-provider.js",
  "https://verify.phone91.com/otp-provider.js",
];

/** MSG91 channel codes: SMS 11, Voice 4, Email 3, WhatsApp 12. */
const CHANNEL_SMS = "11";

export type WidgetInfo = { otpLength: number; channel: string | null; isEmail: boolean };

const DEFAULTS: WidgetInfo = { otpLength: 6, channel: CHANNEL_SMS, isEmail: false };

type WidgetCallback = (data: unknown) => void;

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOtp?: (identifier: string, success?: WidgetCallback, failure?: WidgetCallback) => void;
    retryOtp?: (
      channel: string | null,
      success?: WidgetCallback,
      failure?: WidgetCallback,
      reqId?: string,
    ) => void;
    verifyOtp?: (otp: string, success?: WidgetCallback, failure?: WidgetCallback) => void;
    getWidgetData?: () => Record<string, unknown> | null;
  }
}

let readyPromise: Promise<void> | null = null;
let lastWidgetError: unknown = null;
let widgetInfo: WidgetInfo = { ...DEFAULTS };

function loadScript(index = 0): Promise<void> {
  if (window.initSendOTP) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (index >= SCRIPT_URLS.length) {
      reject(new Error("Could not load the OTP provider."));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URLS[index];
    script.async = true;
    script.onload = () => resolve();
    // Fall through to the next mirror rather than failing outright.
    script.onerror = () => loadScript(index + 1).then(resolve, reject);
    document.head.appendChild(script);
  });
}

function messageFrom(data: unknown, fallback: string): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["message", "msg", "error"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
  }
  return fallback;
}

/**
 * initSendOTP registers the window methods asynchronously — it bootstraps an
 * Angular app that fetches the widget's own config first — so they are not
 * available the moment it returns. Poll until they appear.
 */
function waitForMethods(timeoutMs = 10000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (typeof window.sendOtp === "function" && typeof window.verifyOtp === "function") {
        resolve();
      } else if (Date.now() > deadline) {
        reject(
          new Error(
            messageFrom(lastWidgetError, "The OTP service did not start. Please try again in a moment."),
          ),
        );
      } else {
        setTimeout(poll, 50);
      }
    };
    poll();
  });
}

/**
 * Read the widget's real configuration from MSG91 instead of assuming it, so
 * swapping to a widget with a different channel, identifier type or OTP length
 * needs no code change.
 */
function readWidgetInfo(): WidgetInfo {
  let data: Record<string, unknown> | null = null;
  try {
    data = typeof window.getWidgetData === "function" ? window.getWidgetData() : null;
  } catch {
    data = null;
  }
  if (!data) return { ...DEFAULTS };

  const widgetType = data.widgetType as { name?: string } | undefined;
  const processType = data.processType as { name?: string } | undefined;
  // Default-configuration widgets require a null channel; Custom ones require
  // the channel code passed explicitly.
  const isDefaultWidget = String(widgetType?.name ?? "").toLowerCase() === "default";

  return {
    otpLength: Number(data.otpLength) || DEFAULTS.otpLength,
    channel: isDefaultWidget ? null : String(data.globalDefaultChannel ?? CHANNEL_SMS),
    isEmail: String(processType?.name ?? "").toUpperCase() === "EMAIL",
  };
}

async function initWidget(): Promise<void> {
  lastWidgetError = null;

  const config = await otpApi.getWidgetConfig();
  if (!config.enabled || !config.widget_id || !config.token_auth) {
    throw new Error("OTP verification is not configured. Please contact your administrator.");
  }

  await loadScript();
  if (!window.initSendOTP) throw new Error("Could not load the OTP provider.");

  window.initSendOTP({
    widgetId: config.widget_id,
    tokenAuth: config.token_auth,
    exposeMethods: true,
    // success/failure are MANDATORY: initSendOTP throws "success callback
    // function missing !" without them, and bails before creating the widget
    // element — so the exposed methods never appear. Per-call results come
    // from the callbacks passed to sendOtp/verifyOtp instead.
    success: () => {},
    failure: (err: unknown) => {
      lastWidgetError = err;
    },
  });

  await waitForMethods();
  widgetInfo = readWidgetInfo();
}

/** Load + initialise once; subsequent calls reuse the same promise. */
export function ensureWidgetReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = initWidget().catch((err) => {
      // Let the next attempt retry rather than caching the failure forever.
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

/** Widget config, valid once ensureWidgetReady() has resolved. */
export function getWidgetInfo(): WidgetInfo {
  return { ...widgetInfo };
}

/**
 * MSG91 requires a mobile identifier with country code and no "+", e.g.
 * 919876543210 (mirrors normalize_mobile on the server). Email-process widgets
 * take the address as-is; stripping non-digits would destroy it.
 */
function toIdentifier(value: string): string {
  const raw = String(value ?? "").trim();
  if (widgetInfo.isEmail) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

/** Wrap a callback-style widget method as a promise. */
function callWidget(
  fn: (success: WidgetCallback, failure: WidgetCallback) => void,
  fallbackError: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    fn(
      (data) => resolve(data),
      (error) => reject(new Error(messageFrom(error, fallbackError))),
    );
  });
}

export async function sendOtp(mobile: string): Promise<void> {
  await ensureWidgetReady();
  await callWidget(
    (success, failure) => window.sendOtp!(toIdentifier(mobile), success, failure),
    "Could not send the OTP. Please try again.",
  );
}

export async function retryOtp(channel?: string | null): Promise<void> {
  await ensureWidgetReady();
  const resolved = channel === undefined ? widgetInfo.channel : channel;
  await callWidget(
    (success, failure) => window.retryOtp!(resolved, success, failure),
    "Could not resend the OTP. Please try again.",
  );
}

/**
 * Verify the OTP with MSG91 and return the access token.
 *
 * The token still has to go to `otp.verify` — this resolving only means MSG91
 * accepted the code, not that the mobile is verified server-side.
 */
export async function verifyOtp(otp: string): Promise<string> {
  await ensureWidgetReady();
  const data = await callWidget(
    (success, failure) => window.verifyOtp!(otp, success, failure),
    "The OTP code entered is incorrect. Please enter the correct verification code.",
  );

  const token = messageFrom(data, "");
  if (!token) throw new Error("OTP verification did not return a token. Please try again.");
  return token;
}
