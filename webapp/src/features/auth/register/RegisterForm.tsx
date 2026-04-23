import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

interface RegisterFormProps
{
  onSuccess?: (username: string) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) =>
{
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      const res = await fetch(API_URL + '/createuser',
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
        setResponseMessage(data.message || 'Usuario creado correctamente!');
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

    <form onSubmit={handleSubmit} className="w-100">

      <div className="text-center mb-4">
        <h2 className='dark-purple-fg fw-bold display-5'>Crear cuenta</h2>
      </div>

      <div className="mb-3">
        <label htmlFor="username" className="form-label fw-bold">
          Nombre de usuario:
        </label>
        <div className="input-group">
          <span className="input-group-text bg-transparent border-end-0">
            <i className="bi bi-person-fill"></i>
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
            <i className="bi bi-key-fill"></i>
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

      <button type="submit" className="btn btn-dark purple-bg w-100 fw-bold py-2" disabled={loading}>
        {loading ? 'Intentando crear cuenta...' : 'Crear cuenta'}
      </button>

      <div className="text-center mt-4">
        <p className="d-flex align-items-center justify-content-center">
          <span className='me-1'> ¿Ya estás registrado? </span>
          <NavLink to="/login" className="dark-purple-fg fw-bold text-decoration-none ms-2">
            Iniciar sesión
          </NavLink>
        </p>
      </div>

      {/* ¿Tiene algún uso? */}
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