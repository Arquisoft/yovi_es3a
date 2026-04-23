import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { createPortal } from 'react-dom';

interface LoginFormProps
{
  onSuccess?: (username: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) =>
{
  const alertRoot = document.getElementById("alert-portal");
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dismiss alerts automatically after 5 seconds.
  useEffect(() =>
  {
    if (error || responseMessage)
    {
      const timer = setTimeout(() =>
      {
        setError('');
        setResponseMessage('');
      },
      5000);

      return () => clearTimeout(timer);
    }
  }, [error, responseMessage]);

  const handleSubmit = async (event: React.FormEvent) =>
  {
    event.preventDefault();
    setResponseMessage(null);
    setError(null);

    if (!username.trim()) {setError('Please enter a username.'); return;}
    if (!password.trim()) {setError('Please enter a password.'); return;}

    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

      const res = await fetch(API_URL + '/login',
      {
        method: 'POST',
        headers:
        {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok)
      {
        setResponseMessage(data.message || 'Welcome back, ' + username + '!');
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

    <>
      {/* Success/error alerts container */}
      {(error || responseMessage) && alertRoot && createPortal(
        <div className="alert-container">
          {responseMessage &&
          (
            <div className="alert alert-success alert-dismissible fade show d-flex align-items-center border-0 bg-success bg-opacity-10 text-success small" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              <div>{responseMessage}</div>
              <button type="button" className="btn-close small" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          )}

          {error &&
          (
            <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center border-0 bg-danger bg-opacity-10 text-danger small" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>{error}</div>
              <button type="button" className="btn-close small" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
          )}
        </div>,
        alertRoot
      )}

      <form onSubmit={handleSubmit} className="w-100">
        
        <div className="text-center mb-4">
          <h2 className='dark-purple-fg fw-bold display-5'>Inicio de sesión</h2>
        </div>
        
        <div className="mb-3">
          <label htmlFor="username" className="form-label fw-bold">
            Nombre de usuario:
          </label>
          <div className="input-group">
            <span className="input-group-text bg-transparent border-end-0">
              <i className="bi bi-key-fill"></i>
            </span>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-control bg-transparent border-start-0"
            />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="password" className="form-label fw-bold">
            Contraseña:
          </label>
          <div className='input-group'>
            <span className="input-group-text bg-transparent border-end-0">
              <i className="bi bi-person-fill"></i>
            </span>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control bg-transparent border-start-0"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-dark purple-bg  w-100 fw-bold py-2" disabled={loading}>
          {loading ? 'Iniciando sesión...' : 'Entrar'}
        </button>

        <div className="text-center mt-4">
          <p className="d-flex align-items-center justify-content-center">
            <span className='me-1'> ¿No tienes cuenta? </span>
            <NavLink to="/register" className="dark-purple-fg fw-bold text-decoration-none ms-2">
              Crear cuenta
            </NavLink>
          </p>
        </div>
        
      </form>
    </>
  );
};

export default LoginForm;