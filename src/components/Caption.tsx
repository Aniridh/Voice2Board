import './Caption.css';

interface CaptionProps {
  text: string | null;
  isVisible: boolean;
}

export function Caption({ text, isVisible }: CaptionProps) {
  if (!text || !isVisible) return null;

  return (
    <div className="caption" role="region" aria-live="polite" aria-label="Explanation caption">
      <div className="caption-content">
        <span className="caption-icon">💬</span>
        <span className="caption-text">{text}</span>
      </div>
    </div>
  );
}


