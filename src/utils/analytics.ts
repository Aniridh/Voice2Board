// Light analytics logger for pitch metrics
// Logs to window._vbLog array for easy inspection

interface AnalyticsEvent {
  event: string;
  timestamp: number;
  data?: any;
}

// Initialize logger on window if it doesn't exist
if (typeof window !== 'undefined' && !(window as any)._vbLog) {
  (window as any)._vbLog = [] as AnalyticsEvent[];
}

export function logEvent(event: string, data?: any): void {
  if (typeof window === 'undefined') return;

  const logEntry: AnalyticsEvent = {
    event,
    timestamp: Date.now(),
    data,
  };

  (window as any)._vbLog.push(logEntry);

  // Keep only last 100 events to prevent memory bloat
  const log = (window as any)._vbLog as AnalyticsEvent[];
  if (log.length > 100) {
    log.shift();
  }

  // Also log to console in dev mode
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${event}`, data || '');
  }
}

// Helper functions for specific events
export function logMicStart(): void {
  logEvent('mic_start');
}

export function logMicStop(): void {
  logEvent('mic_stop');
}

export function logLLMLatency(latencyMs: number): void {
  logEvent('llm_latency_ms', { latencyMs });
}

export function logDrawDuration(durationMs: number): void {
  logEvent('draw_duration_ms', { durationMs });
}

// Get all logs (for debugging/inspection)
export function getLogs(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  return (window as any)._vbLog || [];
}

// Clear logs
export function clearLogs(): void {
  if (typeof window === 'undefined') return;
  (window as any)._vbLog = [];
}

