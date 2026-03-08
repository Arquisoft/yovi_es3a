import React, { useState } from 'react';

interface LoginFormProps {
  onLoginSuccess?: (username: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
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
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        setResponseMessage(data.message || `Welcome back, ${username}!`);
        setUsername('');
        setPassword('');
        if (onLoginSuccess) {
          onLoginSuccess(username);
        }
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
        <label htmlFor="login-username">Username:</label>
        <input
          type="text"
          id="login-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="form-input"
          placeholder="Enter your username"
        />
      </div>

      <div className="form-group">
        <label htmlFor="login-password">Password:</label>
        <input
          type="password"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
          placeholder="Enter your password"
        />
      </div>

      <button type="submit" className="submit-button" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>

      {responseMessage && (
        <div className="success-message" style={{ marginTop: 12, color: 'green' }}>
          {responseMessage}
        </div>
      )}

      {error && (
        <div className="error-message" style={{ marginTop: 12, color: 'red' }}>
          {error}
        </div>
      )}
    </form>
  );
};

export default LoginForm;

