import { useEffect, useRef, useState } from "react";
import type { VisitorLang } from "@/i18n/visitorJourney";
import { vt } from "@/i18n/visitorJourney";
import { IconMic } from "@/components/ui/MobileIcons";
import { autocorrectPersonName } from "@/lib/nameCase";
import { splitFullName } from "@/lib/format";
import {
  isSpeechRecognitionSupported,
  startSpeechListen,
  type SpeechListenHandle,
} from "@/native/services/speech";

type VoiceDictationButtonProps = {
  lang?: VisitorLang;
  onNames: (names: { first_name: string; last_name: string }) => void;
  disabled?: boolean;
};

/** Speak full name once — auto-splits into first_name + last_name. */
export function VoiceDictationButton({
  lang = "en",
  onNames,
  disabled,
}: VoiceDictationButtonProps) {
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const handleRef = useRef<SpeechListenHandle | null>(null);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  function applySpokenName(raw: string, finalize: boolean) {
    const cleaned = finalize ? autocorrectPersonName(raw) : raw.trim();
    if (!cleaned) return;
    const parts = splitFullName(cleaned);
    onNames({
      first_name: finalize ? autocorrectPersonName(parts.first_name) : parts.first_name,
      last_name: finalize ? autocorrectPersonName(parts.last_name) : parts.last_name,
    });
  }

  async function toggleListen() {
    if (disabled) return;

    if (listening) {
      handleRef.current?.stop();
      handleRef.current = null;
      setListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setHint(vt(lang, "voice_unsupported"));
      return;
    }

    setHint(null);
    setListening(true);

    const handle = await startSpeechListen({
      lang,
      onPartial: (text) => applySpokenName(text, false),
      onFinal: (text) => applySpokenName(text, true),
      onError: (message) => {
        setHint(message);
        window.setTimeout(() => setHint(null), 3500);
      },
      onEnd: () => {
        setListening(false);
        handleRef.current = null;
      },
    });
    handleRef.current = handle;
  }

  return (
    <div className="vm-voice-dictation">
      <button
        type="button"
        className={`vm-voice-dictation-btn${listening ? " is-active" : ""}`}
        onClick={() => void toggleListen()}
        disabled={disabled}
        aria-pressed={listening}
        aria-label={listening ? vt(lang, "voice_stop") : vt(lang, "voice_to_text")}
      >
        <IconMic size={16} />
        <span>{listening ? vt(lang, "voice_listening_short") : vt(lang, "voice_to_text")}</span>
      </button>

      {listening ? <p className="vm-voice-hint is-live">{vt(lang, "voice_listening_full_name")}</p> : null}
      {!listening && hint ? <p className="vm-voice-hint">{hint}</p> : null}
    </div>
  );
}
