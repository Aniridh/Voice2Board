import { useState, FormEvent } from 'react';
import { setApiKey } from '../utils/storage';
import './ApiKeyInput.css';

interface ApiKeyInputProps {
  onKeySet: () => void;
}

export function ApiKeyInput({ onKeySet }: ApiKeyInputProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setError('Please enter an API key');
      return;
    }

    // Basic validation - OpenAI keys start with sk-
    if (!key.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI keys start with "sk-"');
      return;
    }

    setApiKey(key);
    onKeySet();
  };

  return (
    <div className="api-key-overlay">
      <div className="api-key-modal">
        <h2>Enter OpenAI API Key</h2>
        <p className="api-key-description">
          Your API key is stored locally in your browser and never sent to any
          server except OpenAI.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setError('');
            }}
            placeholder="sk-..."
            className="api-key-input"
            autoFocus
          />
          {error && <p className="api-key-error">{error}</p>}
          <button type="submit" className="api-key-submit">
            Save Key
          </button>
        </form>
      </div>
    </div>
  );
}

