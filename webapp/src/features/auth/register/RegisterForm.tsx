import React, { useState } from 'react';
import '@styles/forms.css';

interface RegisterFormProps {
  onSuccess?: (username: string) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResponseMessage(null);
    setError(null);

    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter a password.');
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${API_URL}/createuser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setResponseMessage(data.message);
        setUsername('');
        setPassword('');
        onSuccess?.(username);
      } else {
        setError(data.error || 'Server error');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="register-form">
      <div className="form-group">
        <label htmlFor="username">Whats your name?</label>
        <input
          type="text"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Whats your password?</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
        />
      </div>

      <button type="submit" className="submit-button" disabled={loading}>
        {loading ? 'Entering...' : 'Lets go!'}
      </button>

      {responseMessage && (
        <div className="success-message">
          {responseMessage}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </form>
  );
};

export default RegisterForm;