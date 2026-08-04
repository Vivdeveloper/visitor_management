import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import type { VisitorLang } from "@/i18n/visitorJourney";
import { isAndroid } from "@/native/platform";

type SpeechRecognitionCtor = new () => WebSpeechRecognition;

type WebSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type WebSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

export type SpeechListenHandle = {
  stop: () => void;
};

export type SpeechListenOptions = {
  lang?: VisitorLang;
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
};

function speechLocale(lang: VisitorLang = "en"): string {
  switch (lang) {
    case "hi":
      return "hi-IN";
    case "mr":
      return "mr-IN";
    case "en":
      return "en-IN";
    default: {
      const _exhaustive: never = lang;
      return _exhaustive;
    }
  }
}

function getWebSpeechCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Title-case a spoken name fragment and strip trailing punctuation. */
export function normalizeSpokenName(raw: string): string {
  return raw
    .trim()
    .replace(/[.,!?;:]+$/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      if (/[\u0900-\u097F]/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

export function isSpeechRecognitionSupported(): boolean {
  if (isAndroid()) return true;
  return Boolean(getWebSpeechCtor());
}

async function ensureNativePermission(): Promise<boolean> {
  const status = await SpeechRecognition.checkPermissions();
  if (status.speechRecognition === "granted") return true;
  const next = await SpeechRecognition.requestPermissions();
  return next.speechRecognition === "granted";
}

async function startNativeListen(options: SpeechListenOptions): Promise<SpeechListenHandle> {
  const language = speechLocale(options.lang);
  const permitted = await ensureNativePermission();
  if (!permitted) {
    options.onError?.("Microphone permission is required for voice input");
    options.onEnd?.();
    return { stop: () => undefined };
  }

  const { available } = await SpeechRecognition.available();
  if (!available) {
    options.onError?.("Speech recognition is not available on this device");
    options.onEnd?.();
    return { stop: () => undefined };
  }

  let stopped = false;
  let lastText = "";

  const finish = async () => {
    if (stopped) return;
    stopped = true;
    try {
      const cached = await SpeechRecognition.getLastPartialResult();
      const text = normalizeSpokenName(cached.text || lastText);
      if (text) options.onFinal?.(text);
    } catch {
      if (lastText) options.onFinal?.(normalizeSpokenName(lastText));
    } finally {
      await SpeechRecognition.removeAllListeners();
      options.onEnd?.();
    }
  };

  await SpeechRecognition.addListener("partialResults", (event) => {
    const text = event.matches?.[0] || event.accumulatedText || "";
    if (!text.trim()) return;
    lastText = text;
    options.onPartial?.(normalizeSpokenName(text));
  });

  await SpeechRecognition.addListener("listeningState", (event) => {
    if (event.status === "stopped" || event.state === "stopped") {
      void finish();
    }
  });

  await SpeechRecognition.addListener("error", (event) => {
    if (!stopped) {
      options.onError?.(event.message || "Could not capture voice input");
      void finish();
    }
  });

  try {
    await SpeechRecognition.start({
      language,
      maxResults: 1,
      partialResults: true,
      popup: false,
    });
  } catch (err) {
    await SpeechRecognition.removeAllListeners();
    options.onError?.(err instanceof Error ? err.message : "Could not start voice input");
    options.onEnd?.();
    return { stop: () => undefined };
  }

  const autoStop = window.setTimeout(() => {
    void SpeechRecognition.stop().then(() => finish());
  }, 6000);

  return {
    stop: () => {
      window.clearTimeout(autoStop);
      void SpeechRecognition.stop().then(() => finish());
    },
  };
}

function startWebListen(options: SpeechListenOptions): SpeechListenHandle {
  const Ctor = getWebSpeechCtor();
  if (!Ctor) {
    options.onError?.("Voice input is not supported in this browser");
    options.onEnd?.();
    return { stop: () => undefined };
  }

  const recognition = new Ctor();
  recognition.lang = speechLocale(options.lang);
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalText = "";
  let stopped = false;

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0]?.transcript || "";
      if (result.isFinal) {
        finalText = `${finalText} ${transcript}`.trim();
      } else {
        interim = `${interim} ${transcript}`.trim();
      }
    }
    const live = normalizeSpokenName(finalText || interim);
    if (live) options.onPartial?.(live);
    if (finalText) options.onFinal?.(normalizeSpokenName(finalText));
  };

  recognition.onerror = (event) => {
    const code = event.error || "unknown";
    if (code === "aborted" || code === "no-speech") {
      options.onEnd?.();
      return;
    }
    if (code === "not-allowed") {
      options.onError?.("Microphone permission is required for voice input");
    } else {
      options.onError?.("Could not capture voice input. Try again.");
    }
    options.onEnd?.();
  };

  recognition.onend = () => {
    if (!stopped && finalText) {
      options.onFinal?.(normalizeSpokenName(finalText));
    }
    options.onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    options.onError?.("Could not start voice input");
    options.onEnd?.();
  }

  return {
    stop: () => {
      stopped = true;
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
      }
    },
  };
}

/** Start speech-to-text. Returns a handle to stop listening early. */
export async function startSpeechListen(options: SpeechListenOptions = {}): Promise<SpeechListenHandle> {
  // Native Capgo plugin is Android-only for this app (no iOS speech setup).
  if (isAndroid()) {
    return startNativeListen(options);
  }
  return startWebListen(options);
}
