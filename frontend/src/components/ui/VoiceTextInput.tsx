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
  /** Shown in the listening hint and mic aria-label. */
  fieldLabel?: string;
  /** Optional spoken-text cleanup (e.g. email: "at" → @). */
  formatSpoken?: (raw: string, finalize: boolean) => string;
};

export function VoiceTextInput({
  value,
  lang = "en",
  onChangeValue,
  className,
  disabled,
  autocorrectName = true,
  fieldLabel,
  formatSpoken,
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
    const spoken = formatSpoken ? formatSpoken(raw, finalize) : raw;
    const next = finalize && autocorrectName ? autocorrectPersonName(spoken) : spoken;
    onChangeValue(next);
  }

  const startLabel = fieldLabel
    ? vt(lang, "voice_speak_field", { field: fieldLabel })
    : vt(lang, "voice_start");
  const liveHint = fieldLabel
    ? vt(lang, "voice_listening_for", { field: fieldLabel })
    : vt(lang, "voice_listening");

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
          aria-label={listening ? vt(lang, "voice_stop") : startLabel}
          title={listening ? vt(lang, "voice_stop") : startLabel}
        >
          <IconMic size={18} />
        </button>
      </div>
      {listening ? <p className="vm-voice-hint is-live">{liveHint}</p> : null}
      {!listening && hint ? <p className="vm-voice-hint">{hint}</p> : null}
    </div>
  );
}
