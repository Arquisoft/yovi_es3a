import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAlert } from '../../../components/ui/useAlert'; 
import { useTranslation } from 'react-i18next';

interface RegisterFormProps
{
  onSuccess?: (username: string) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) =>
{
  const navigate = useNavigate();
   const { showAlert } = useAlert();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();
  const handleSubmit = async (event: React.FormEvent) =>
  {
    event.preventDefault();

    if (!username.trim()) {showAlert( t('register.response.username_required') , 'error'); return;}
    if (!password.trim()) {showAlert( t('register.response.password_required') , 'error'); return;}

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
        showAlert(data.message || t('register.response.success') , 'success');
        onSuccess?.(username);

        navigate("/game");

        return;
      } else {
        showAlert(data.error || t('register.response.server_error'), 'error');
      }
    } catch (err: unknown) {
      showAlert(err instanceof Error ? err.message : t('register.response.network_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    
    <form onSubmit={handleSubmit} className="w-100">

        <div className="text-center mb-4">
          <h2 className='dark-purple-fg fw-bold display-5'>
            <span> {t('register.header')} </span>
          </h2>
        </div>

        <div className="mb-3">
          <label htmlFor="username" className="form-label fw-bold">
            <span> {t('register.username.label')} </span>
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
            <span> {t('register.password.label')} </span>
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

        <button type="submit" className="btn btn-dark purple-bg w-100 fw-bold py-2" disabled={loading}>
          {loading ? t('register.button.loading') : t('register.button.idle') }
        </button>

        <div className="text-center mt-4">
          <p className="d-flex align-items-center justify-content-center">
            <span className='me-1'> {t('register.login.prompt')} </span>
            <NavLink to="/login" className="dark-purple-fg fw-bold text-decoration-none ms-2">
              {t('register.login.link')}
            </NavLink>
          </p>
        </div>
      </form>
  );
};

export default RegisterForm;