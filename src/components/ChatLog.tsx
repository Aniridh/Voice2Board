import { ChatMessage } from '../types';
import './ChatLog.css';

interface ChatLogProps {
  messages: ChatMessage[];
}

export function ChatLog({ messages }: ChatLogProps) {
  return (
    <div className="chat-log">
      <div className="chat-log-header">
        <h3>Conversation</h3>
      </div>
      <div className="chat-log-messages">
        {messages.length === 0 ? (
          <div className="chat-log-empty">
            <p>Start speaking to see transcriptions and AI responses here.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message chat-message-${message.role}`}
            >
              <div className="chat-message-header">
                <span className="chat-message-role">
                  {message.role === 'user'
                    ? 'You'
                    : message.role === 'ai'
                    ? 'AI'
                    : 'Error'}
                </span>
                <span className="chat-message-time">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="chat-message-content">{message.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

