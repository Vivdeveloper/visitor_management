import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import type { VisitorLang } from "@/i18n/visitorJourney";
import { vt } from "@/i18n/visitorJourney";
import { IconMic } from "@/components/ui/MobileIcons";
import { autocorrectPersonName } from "@/lib/nameCase";
import {
  isSpeechRecognitionSupported,
  startSpeechListen,
  type SpeechListenHandle,
} from "@/native/services/speech";

type VoiceTextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  lang?: VisitorLang;
  onChangeValue: (value: string) => void;
  /** Auto-fix casing (vivEk → Vivek). Default true. */
  autocorrectName?: boolean;
};

export function VoiceTextInput({
  value,
  lang = "en",
  onChangeValue,
  className,
  disabled,
  autocorrectName = true,
  onBlur,
  ...inputProps
}: VoiceTextInputProps) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => isSpeechRecognitionSupported());
  const [hint, setHint] = useState<string | null>(null);
  const handleRef = useRef<SpeechListenHandle | null>(null);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  function applyValue(raw: string, finalize = false) {
    const next = finalize && autocorrectName ? autocorrectPersonName(raw) : raw;
    onChangeValue(next);
  }

  async function toggleListen() {
    if (disabled) return;

    if (listening) {
      handleRef.current?.stop();
      handleRef.current = null;
      setListening(false);
      return;
    }

    if (!supported) {
      setHint(vt(lang, "voice_unsupported"));
      return;
    }

    setHint(null);
    setListening(true);

    const handle = await startSpeechListen({
      lang,
      onPartial: (text) => applyValue(text, false),
      onFinal: (text) => applyValue(text, true),
      onError: (message) => setHint(message),
      onEnd: () => {
        setListening(false);
        handleRef.current = null;
      },
    });
    handleRef.current = handle;
  }

  return (
    <div className="vm-voice-field">
      <div className={`vm-voice-input-wrap${listening ? " is-listening" : ""}`}>
        <input
          {...inputProps}
          className={["vm-input-field", "vm-voice-input", className].filter(Boolean).join(" ")}
          value={value}
          disabled={disabled}
          onChange={(e) => applyValue(e.target.value, false)}
          onBlur={(e) => {
            if (autocorrectName) applyValue(e.target.value, true);
            onBlur?.(e);
          }}
        />
        <button
          type="button"
          className={`vm-voice-mic${listening ? " is-active" : ""}`}
          onClick={() => void toggleListen()}
          disabled={disabled}
          aria-pressed={listening}
          aria-label={listening ? vt(lang, "voice_stop") : vt(lang, "voice_start")}
          title={listening ? vt(lang, "voice_stop") : vt(lang, "voice_start")}
        >
          <IconMic size={18} />
        </button>
      </div>
      {listening ? <p className="vm-voice-hint is-live">{vt(lang, "voice_listening")}</p> : null}
      {!listening && hint ? <p className="vm-voice-hint">{hint}</p> : null}
    </div>
  );
}
