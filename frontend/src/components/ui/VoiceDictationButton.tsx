import { useEffect, useRef, useState } from "react";
import type { VisitorLang } from "@/i18n/visitorJourney";
import { vt } from "@/i18n/visitorJourney";
import { IconMic } from "@/components/ui/MobileIcons";
import { autocorrectPersonName } from "@/lib/nameCase";
import {
  isSpeechRecognitionSupported,
  startSpeechListen,
  type SpeechListenHandle,
} from "@/native/services/speech";

export type VoiceTargetField = "first_name" | "last_name";

type VoiceDictationButtonProps = {
  lang?: VisitorLang;
  target: VoiceTargetField;
  onTargetChange: (target: VoiceTargetField) => void;
  onTranscript: (field: VoiceTargetField, text: string) => void;
  disabled?: boolean;
};

/** Section-level voice control: pick First/Last name, then speak. */
export function VoiceDictationButton({
  lang = "en",
  target,
  onTargetChange,
  onTranscript,
  disabled,
}: VoiceDictationButtonProps) {
  const [listening, setListening] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const handleRef = useRef<SpeechListenHandle | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  async function startFor(field: VoiceTargetField) {
    if (disabled) return;
    setMenuOpen(false);
    onTargetChange(field);

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
      onPartial: (text) => onTranscript(field, text),
      onFinal: (text) => onTranscript(field, autocorrectPersonName(text)),
      onError: (message) => setHint(message),
      onEnd: () => {
        setListening(false);
        handleRef.current = null;
      },
    });
    handleRef.current = handle;
  }

  function onMainClick() {
    if (listening) {
      handleRef.current?.stop();
      handleRef.current = null;
      setListening(false);
      return;
    }
    setMenuOpen((open) => !open);
  }

  const targetLabel = target === "first_name" ? vt(lang, "first_name") : vt(lang, "last_name");

  return (
    <div className="vm-voice-dictation" ref={rootRef}>
      <button
        type="button"
        className={`vm-voice-dictation-btn${listening ? " is-active" : ""}`}
        onClick={onMainClick}
        disabled={disabled}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={listening ? vt(lang, "voice_stop") : vt(lang, "voice_to_text")}
      >
        <IconMic size={16} />
        <span>{listening ? vt(lang, "voice_listening_short") : vt(lang, "voice_to_text")}</span>
      </button>

      {menuOpen ? (
        <div className="vm-voice-dictation-menu" role="menu">
          <p className="vm-voice-dictation-menu-label">{vt(lang, "voice_choose_field")}</p>
          <button
            type="button"
            role="menuitem"
            className={`vm-voice-dictation-option${target === "first_name" ? " is-selected" : ""}`}
            onClick={() => void startFor("first_name")}
          >
            {vt(lang, "first_name")}
          </button>
          <button
            type="button"
            role="menuitem"
            className={`vm-voice-dictation-option${target === "last_name" ? " is-selected" : ""}`}
            onClick={() => void startFor("last_name")}
          >
            {vt(lang, "last_name")}
          </button>
        </div>
      ) : null}

      {listening ? (
        <p className="vm-voice-hint is-live">
          {vt(lang, "voice_listening_for", { field: targetLabel.replace(/\s*\*$/, "") })}
        </p>
      ) : null}
      {!listening && hint ? <p className="vm-voice-hint">{hint}</p> : null}
    </div>
  );
}
