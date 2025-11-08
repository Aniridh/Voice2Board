import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface UseSpeechToTextOptions {
  lang?: string;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const { lang = 'en-US' } = options;
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [final, setFinal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const getSpeechRecognition = useCallback((): SpeechRecognition | null => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return null;
    }

    return new SpeechRecognition();
  }, []);

  useEffect(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update interim text (shown above mic button)
      setInterim(interimTranscript);

      // Accumulate final text (sent to chat when recognition stops)
      if (finalTranscript) {
        setFinal((prev) => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [getSpeechRecognition]);

  const start = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not available');
      return;
    }

    try {
      setInterim('');
      setFinal('');
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      if (err.name === 'NotAllowedError' || err.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else {
        setError('Failed to start speech recognition');
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const reset = useCallback(() => {
    setInterim('');
    setFinal('');
    setError(null);
  }, []);

  return {
    start,
    stop,
    isListening,
    interim,
    final,
    reset,
    error,
    isSupported: recognitionRef.current !== null,
  };
}

