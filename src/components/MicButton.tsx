import { useSpeechToText } from '../hooks/useSpeechToText';
import { forwardRef, useImperativeHandle, useEffect } from 'react';
import { logMicStart, logMicStop } from '../utils/analytics';
import './MicButton.css';

interface MicButtonProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
  requiresApiKey?: boolean; // Block if API key is required but not set
  onListeningChange?: (isListening: boolean) => void;
}

export interface MicButtonHandle {
  toggle: () => void;
  isListening: boolean;
}

export const MicButton = forwardRef<MicButtonHandle, MicButtonProps>(
  ({ onTranscript, disabled, requiresApiKey, onListeningChange }, ref) => {
  const {
    isListening,
    interim,
    final,
    error,
    start,
    stop,
    reset,
    isSupported,
  } = useSpeechToText();

  const handleToggle = () => {
    if (requiresApiKey) {
      return; // Blocked - no API key
    }
    
    if (isListening) {
      stop();
      logMicStop();
      // Send final text when stopping
      if (final.trim()) {
        onTranscript(final.trim());
        reset(); // Clear after sending
      }
    } else {
      start();
      logMicStart();
    }
  };

  useImperativeHandle(ref, () => ({
    toggle: handleToggle,
    isListening,
  }));

  // Notify parent of listening state changes
  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  if (!isSupported) {
    return (
      <div className="mic-button-container">
        <div className="mic-button-error">
          Speech recognition is not supported in this browser. Please use Chrome
          or Edge.
        </div>
      </div>
    );
  }

  return (
    <div className="mic-button-container">
      {error && <div className="mic-button-error">{error}</div>}
      {/* Show interim transcription above the button */}
      {interim && (
        <div className="mic-button-interim">{interim}</div>
      )}
      <button
        className={`mic-button ${isListening ? 'mic-button-active' : ''} ${requiresApiKey ? 'mic-button-blocked' : ''}`}
        onClick={handleToggle}
        disabled={disabled || requiresApiKey}
        aria-label={requiresApiKey ? 'API key required' : isListening ? 'Stop recording' : 'Start recording'}
        title={requiresApiKey ? 'Please enter your API key to use voice commands' : undefined}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
            fill="currentColor"
          />
          <path
            d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H3V12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12V10H19Z"
            fill="currentColor"
          />
        </svg>
        {isListening ? 'Stop' : 'Start'}
      </button>
      {isListening && !interim && (
        <div className="mic-button-status">Listening... Speak now</div>
      )}
    </div>
  );
});

