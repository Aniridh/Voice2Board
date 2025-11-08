import './QuickActions.css';

interface QuickActionsProps {
  onExplain: () => void;
  onSampleProblems: () => void;
  onNewChat: () => void;
  onViewHistory: () => void;
  disabled?: boolean;
}

export function QuickActions({
  onExplain,
  onSampleProblems,
  onNewChat,
  onViewHistory,
  disabled,
}: QuickActionsProps) {
  return (
    <div className="quick-actions">
      <button
        className="quick-action-button"
        onClick={onExplain}
        disabled={disabled}
        title="Get further explanation of current content"
        aria-label="Get further explanation of current content"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="currentColor"/>
        </svg>
        Further explain it
      </button>
      <button
        className="quick-action-button"
        onClick={onSampleProblems}
        disabled={disabled}
        title="Get sample practice problems"
        aria-label="Get sample practice problems"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/>
        </svg>
        Sample problems
      </button>
      <button
        className="quick-action-button"
        onClick={onNewChat}
        disabled={disabled}
        title="Clear chat and board"
        aria-label="Clear chat and board"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
        </svg>
        New Chat/Board
      </button>
      <button
        className="quick-action-button"
        onClick={onViewHistory}
        disabled={disabled}
        title="View past chat sessions"
        aria-label="View past chat sessions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" fill="currentColor"/>
        </svg>
        View past chats
      </button>
    </div>
  );
}

