import { ChatMessage } from '../types';
import './ChatPanel.css';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  error?: string | null;
}

export function ChatPanel({ messages, isLoading, error }: ChatPanelProps) {
  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <h3>Conversation</h3>
      </div>
      <div className="chat-panel-messages">
        {messages.length === 0 && !isLoading && !error && (
          <div className="chat-panel-empty">
            <p>Start speaking to see transcriptions and AI responses here.</p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message chat-message-${message.role}`}
          >
            <div className="chat-message-header">
              <span className="chat-message-role">
                {message.role === 'user'
                  ? 'You'
                  : message.role === 'ai'
                  ? 'Tutor'
                  : 'System'}
              </span>
              <span className="chat-message-time">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="chat-message-content">{message.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message chat-message-loading">
            <div className="chat-spinner" />
            <span>Processing command...</span>
          </div>
        )}
        {error && (
          <div className="chat-message chat-message-error">
            <div className="chat-message-header">
              <span className="chat-message-role">System</span>
            </div>
            <div className="chat-message-content">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

