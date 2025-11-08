import './StatusOverlay.css';

interface StatusOverlayProps {
  status: 'listening' | 'drawing' | 'explaining' | null;
}

export function StatusOverlay({ status }: StatusOverlayProps) {
  if (!status) return null;

  const statusText = {
    listening: 'Listening...',
    drawing: 'Drawing...',
    explaining: 'Explaining...',
  }[status];

  return (
    <div className="status-overlay">
      <div className="status-overlay-content">
        <div className="status-overlay-dot"></div>
        <span className="status-overlay-text">{statusText}</span>
      </div>
    </div>
  );
}

