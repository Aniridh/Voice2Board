import { TutorResponse } from '../types';

// Get API base URL from env
// For local development: defaults to http://localhost:3000
// For production: set VITE_API_URL=https://your-backend-domain.com
// For same origin: set VITE_API_URL=''
const API_BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : '');

export async function interpretCommand(
  transcript: string,
  apiKey: string
): Promise<TutorResponse> {
  try {
    // Use relative path if API_BASE_URL is empty (same origin)
    const url = API_BASE_URL ? `${API_BASE_URL}/api/interpret` : '/api/interpret';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript, apiKey }),
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return { actions: [] };
    }

    const data = await response.json();
    
    // Validate response structure
    if (data && Array.isArray(data.actions)) {
      return data as TutorResponse;
    }

    console.error('Invalid response format:', data);
    return { actions: [] };
  } catch (error) {
    console.error('Network error calling /api/interpret:', error);
    return { actions: [] };
  }
}

