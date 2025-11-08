import { logger } from './logger';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Session {
  sessionId: string;
  ts: number; // Last activity timestamp
  history: Message[];
}

// In-memory session store
const sessions = new Map<string, Session>();

// Prune sessions older than 15 minutes
const PRUNE_INTERVAL_MS = 60_000; // Check every minute
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Get or create a session
 */
export function getSession(sessionId: string): Session {
  const existing = sessions.get(sessionId);
  if (existing) {
    existing.ts = Date.now();
    return existing;
  }

  const newSession: Session = {
    sessionId,
    ts: Date.now(),
    history: [],
  };
  sessions.set(sessionId, newSession);
  logger.debug({ sessionId }, 'Created new session');
  return newSession;
}

/**
 * Add a message to session history
 */
export function addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): void {
  const session = getSession(sessionId);
  session.history.push({ role, content });
  
  // Keep only last 20 messages to prevent memory bloat
  if (session.history.length > 20) {
    session.history = session.history.slice(-20);
  }
  
  logger.debug({ sessionId, role, contentLength: content.length }, 'Added message to session');
}

/**
 * Get session history
 */
export function getHistory(sessionId: string): Message[] {
  const session = getSession(sessionId);
  return session.history;
}

/**
 * Clear a session
 */
export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
  logger.debug({ sessionId }, 'Cleared session');
}

/**
 * Prune idle sessions (older than 15 minutes)
 */
function pruneSessions(): void {
  const now = Date.now();
  let pruned = 0;

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.ts > SESSION_TIMEOUT_MS) {
      sessions.delete(sessionId);
      pruned++;
    }
  }

  if (pruned > 0) {
    logger.info({ pruned, totalSessions: sessions.size }, 'Pruned idle sessions');
  }
}

// Start pruning interval
setInterval(pruneSessions, PRUNE_INTERVAL_MS);

// Prune on startup
pruneSessions();

