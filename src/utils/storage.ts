const API_KEY_STORAGE_KEY = 'voiceboard_openai_api_key';

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

const ANIMATION_SPEED_STORAGE_KEY = 'voiceboard_animation_speed';

export function getAnimationSpeed(): number {
  const stored = localStorage.getItem(ANIMATION_SPEED_STORAGE_KEY);
  return stored ? parseFloat(stored) : 1.0; // Default: 1.0x (1500ms)
}

export function setAnimationSpeed(speed: number): void {
  localStorage.setItem(ANIMATION_SPEED_STORAGE_KEY, speed.toString());
}

const CHAT_HISTORY_STORAGE_KEY = 'voiceboard_chat_history';
const MAX_HISTORY_SESSIONS = 10;

export interface ChatHistoryEntry {
  id: string;
  messages: Array<{
    id: string;
    role: 'user' | 'ai' | 'error';
    content: string;
    timestamp: Date;
  }>;
  timestamp: Date;
}

export function saveChatHistory(
  messages: Array<{
    id: string;
    role: 'user' | 'ai' | 'error';
    content: string;
    timestamp: Date;
  }>
): void {
  if (messages.length === 0) return;

  try {
    const history = getChatHistory();
    const newEntry: ChatHistoryEntry = {
      id: Date.now().toString(),
      messages: messages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
      })),
      timestamp: new Date(),
    };

    // Add new entry and keep only last N sessions
    const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY_SESSIONS);
    localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
}

export function getChatHistory(): ChatHistoryEntry[] {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (!stored) return [];

    const history = JSON.parse(stored) as ChatHistoryEntry[];
    return history.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
      messages: entry.messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
}

export function clearChatHistory(): void {
  localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
}

