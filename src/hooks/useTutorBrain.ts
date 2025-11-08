import { useState, useCallback, useRef } from 'react';
import { getApiKey } from '../utils/storage';
import { TutorResponse } from '../types';
import { interpretCommand as apiInterpret } from '../api/interpret';

export function useTutorBrain() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const lastTimestampRef = useRef<number>(0);
  const DEBOUNCE_MS = 1500;

  const interpretCommand = useCallback(
    async (transcript: string): Promise<TutorResponse> => {
      const apiKey = getApiKey();
      if (!apiKey) {
        const error = 'OpenAI API key is not set';
        setLastError(error);
        return { actions: [] };
      }

      // Debounce duplicate transcripts
      const now = Date.now();
      if (
        transcript === lastTranscriptRef.current &&
        now - lastTimestampRef.current < DEBOUNCE_MS
      ) {
        console.log('Debounced duplicate transcript');
        return { actions: [] };
      }

      lastTranscriptRef.current = transcript;
      lastTimestampRef.current = now;

      setIsLoading(true);
      setLastError(null);

      // Log payload in dev
      if (import.meta.env.DEV) {
        console.log('Calling /api/interpret with:', { transcript, apiKey: '***' });
      }

      try {
        const response = await apiInterpret(transcript, apiKey);
        
        if (response.actions.length === 0) {
          setLastError('No actions returned from API');
        }

        return response;
      } catch (err: any) {
        const errorMessage =
          err.message || 'Failed to interpret command. Please try again.';
        setLastError(errorMessage);
        return { actions: [] };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    interpretCommand,
    loading: isLoading,
    lastError,
  };
}
