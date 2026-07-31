/**
 * MSG91 OTP widget, driven from our own UI.
 *
 * The widget is initialised with `exposeMethods: true`, which suppresses
 * MSG91's popup and puts `sendOtp` / `retryOtp` / `verifyOtp` on `window`.
 * That lets the existing check-in screens keep their own OTP digit boxes and
 * resend link while MSG91 owns sending, retrying and verifying.
 *
 * Verification is NOT complete when `verifyOtp` resolves — it returns a JWT
 * access token that the server must validate via `react_api.otp.verify`.
 * Only that server-side call marks the mobile verified.
 */

import { otpApi } from "@/api/vms";

/** Primary, then mirror — the second is tried if the first fails to load. */
const SCRIPT_URLS = [
  "https://verify.msg91.com/otp-provider.js",
  "https://verify.phone91.com/otp-provider.js",
];

/** MSG91 channel codes: SMS 11, Voice 4, Email 3, WhatsApp 12. This widget is
 *  configured as Custom, so the channel must be passed explicitly — null is
 *  only valid for default-configuration widgets. */
export const RETRY_CHANNEL_TEXT = "11";

/**
 * MSG91 requires the identifier with country code and no "+", e.g.
 * 919876543210. Callers pass a bare 10-digit number, so add it here.
 * Mirrors normalize_mobile() on the server.
 */
function toIdentifier(value: string): string {
  const raw = String(value ?? "").trim();
  // Email-process widgets take the address as-is; stripping non-digits would
  // destroy it.
  if (widgetInfo.isEmail) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

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

export type WidgetInfo = { otpLength: number; channel: string | null; isEmail: boolean };

const DEFAULTS: WidgetInfo = { otpLength: 6, channel: RETRY_CHANNEL_TEXT, isEmail: false };

let widgetInfo: WidgetInfo = { ...DEFAULTS };

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
    channel: isDefaultWidget ? null : String(data.globalDefaultChannel ?? RETRY_CHANNEL_TEXT),
    isEmail: String(processType?.name ?? "").toUpperCase() === "EMAIL",
  };
}

/** Widget config, valid once ensureWidgetReady() has resolved. */
export function getWidgetInfo(): WidgetInfo {
  return { ...widgetInfo };
}

let readyPromise: Promise<void> | null = null;
let lastWidgetError: unknown = null;

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

/**
 * initSendOTP registers window.sendOtp/retryOtp/verifyOtp asynchronously — it
 * fetches the widget's own config from MSG91 first — so they are not available
 * the moment it returns. Poll until they appear.
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

async function initWidget(): Promise<void> {
  lastWidgetError = null;
  const config = await otpApi.getWidgetConfig();
  if (!config.enabled || !config.widget_id || !config.token_auth) {
    throw new Error("OTP verification is not configured. Please contact your administrator.");
  }

  await loadScript();
  if (!window.initSendOTP) {
    throw new Error("Could not load the OTP provider.");
  }

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

function messageFrom(data: unknown, fallback: string): string {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of ["message", "msg", "error", "type"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
  }
  return fallback;
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
 * The token still has to go to `react_api.otp.verify` — this resolving only
 * means MSG91 accepted the code, not that the mobile is verified server-side.
 */
export async function verifyOtp(otp: string): Promise<string> {
  await ensureWidgetReady();
  const data = await callWidget(
    (success, failure) => window.verifyOtp!(otp, success, failure),
    "The OTP code entered is incorrect. Please enter the correct verification code.",
  );

  const token = messageFrom(data, "");
  if (!token) {
    throw new Error("OTP verification did not return a token. Please try again.");
  }
  return token;
}
