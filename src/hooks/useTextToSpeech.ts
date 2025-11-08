import { useState, useCallback, useRef, useEffect } from 'react';

function getStoredRate(): number {
  const stored = localStorage.getItem('ttsRate');
  return stored ? parseFloat(stored) : 0.9;
}

function getStoredPitch(): number {
  const stored = localStorage.getItem('ttsPitch');
  return stored ? parseFloat(stored) : 1.0;
}

function saveRate(rate: number): void {
  localStorage.setItem('ttsRate', rate.toString());
}

function savePitch(pitch: number): void {
  localStorage.setItem('ttsPitch', pitch.toString());
}

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cancel = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      utteranceRef.current = null;
    }
  }, []);

  const speak = useCallback(
    (text: string, voiceName?: string) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis is not supported in this browser');
        return;
      }

      // Cancel before new speak
      cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = getStoredRate();
      utterance.pitch = getStoredPitch();
      utterance.volume = 1;

      // Set voice if specified
      if (voiceName) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find((v) => v.name === voiceName);
        if (voice) {
          utterance.voice = voice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [cancel]
  );

  // Load voices on mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Some browsers need this to populate voices
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        // Voices loaded
      };
    }
  }, []);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return {
    speak,
    cancel,
    isSpeaking,
    isSupported,
    setRate: saveRate,
    setPitch: savePitch,
    getRate: getStoredRate,
    getPitch: getStoredPitch,
  };
}

