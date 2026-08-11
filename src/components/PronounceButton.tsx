import React, { useCallback, useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';

interface PronounceButtonProps {
  char: string;
  pinyin: string;
}

const pickMandarinVoice = () =>
  window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith('zh'));

/* Speaks the headword with the browser's Mandarin voice. Hidden entirely when
   the device has no zh voice — an English voice reading 建 is worse than none. */
const PronounceButton: React.FC<PronounceButtonProps> = ({ char, pinyin }) => {
  const [voice, setVoice] = useState<SpeechSynthesisVoice>();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;

    /* Voice list is populated asynchronously in most browsers. */
    const sync = () => setVoice(pickMandarinVoice());
    sync();
    window.speechSynthesis.addEventListener('voiceschanged', sync);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', sync);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(() => {
    if (!voice) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(char);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.85;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [char, voice]);

  if (!voice) return null;

  return (
    <button
      type="button"
      className={`pronounce${speaking ? ' is-speaking' : ''}`}
      onClick={speak}
      aria-label={`Hear ${char} pronounced — ${pinyin}`}
    >
      <Volume2 size={15} strokeWidth={1.6} aria-hidden="true" />
    </button>
  );
};

export default PronounceButton;
