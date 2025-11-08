import { useEffect, useState } from 'react';
import './Toast.css';

interface ToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`toast ${isVisible ? 'toast-visible' : ''}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="toast-content">
        <span className="toast-icon">✓</span>
        <span className="toast-message">{message}</span>
      </div>
    </div>
  );
}

// Toast manager hook for global toast notifications
let toastQueue: Array<{ id: number; message: string; duration?: number }> = [];
let toastIdCounter = 0;
let toastListeners: Array<() => void> = [];

export function showToast(message: string, duration?: number): void {
  const id = toastIdCounter++;
  toastQueue.push({ id, message, duration });
  toastListeners.forEach((listener) => listener());
}

export function useToastQueue() {
  const [currentToast, setCurrentToast] = useState<{
    id: number;
    message: string;
    duration?: number;
  } | null>(null);

  useEffect(() => {
    const updateToast = () => {
      if (toastQueue.length > 0 && !currentToast) {
        const next = toastQueue.shift()!;
        setCurrentToast(next);
      }
    };

    toastListeners.push(updateToast);
    updateToast();

    return () => {
      toastListeners = toastListeners.filter((l) => l !== updateToast);
    };
  }, [currentToast]);

  const handleClose = () => {
    setCurrentToast(null);
  };

  return currentToast ? (
    <Toast
      key={currentToast.id}
      message={currentToast.message}
      duration={currentToast.duration}
      onClose={handleClose}
    />
  ) : null;
}


