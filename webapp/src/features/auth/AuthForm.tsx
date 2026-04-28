
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAlert } from '../../components/ui/useAlert';

interface AuthFormProps {
  mode: 'login' | 'register';
  endpoint: string;
  successMessageKey: string;
  usernameLabelKey: string;
  passwordLabelKey: string;
  usernameValidationKey: string;
  passwordValidationKey: string;
  serverErrorKey: string;
  networkErrorKey: string;
  submitButtonIdleKey: string;
  submitButtonLoadingKey: string;
  footerPromptKey: string;
  footerLinkTo: string;
  footerLinkLabelKey: string;
  onSuccess?: (username: string) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  mode,
  endpoint,
  successMessageKey,
  usernameLabelKey,
  passwordLabelKey,
  usernameValidationKey,
  passwordValidationKey,
  serverErrorKey,
  networkErrorKey,
  submitButtonIdleKey,
  submitButtonLoadingKey,
  footerPromptKey,
  footerLinkTo,
  footerLinkLabelKey,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { t } = useTranslation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!username.trim()) {
      showAlert(t(usernameValidationKey), 'error');
      return;
    }

    if (!password.trim()) {
      showAlert(t(passwordValidationKey), 'error');
      return;
    }

    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

      const res = await fetch(API_URL + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        showAlert(t(successMessageKey), 'success');
        onSuccess?.(username);
        navigate('/game');
        return;
      }

      showAlert(data.error || t(serverErrorKey), 'error');
    } catch (err: unknown) {
      showAlert(
        err instanceof Error ? err.message : t(networkErrorKey),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-100">

      <div className="text-center mb-4">
        <h2 className="dark-purple-fg fw-bold display-5">
          {mode === 'login' ? t('login.header') : t('register.header')}
        </h2>
      </div>

      {/* Username */}
      <div className="mb-3">
        <label htmlFor="username" className="form-label fw-bold">
          {t(usernameLabelKey)}
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

      {/* Password */}
      <div className="mb-3">
        <label htmlFor="password" className="form-label fw-bold">
          {t(passwordLabelKey)}
        </label>

        <div className="input-group">
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

      {/* Submit */}
      <button
        type="submit"
        className="btn btn-dark purple-bg w-100 fw-bold py-2"
        disabled={loading}
      >
        {loading ? t(submitButtonLoadingKey) : t(submitButtonIdleKey)}
      </button>

      {/* Footer */}
      <div className="text-center mt-4">
        <p className="d-flex align-items-center justify-content-center">
          <span className="me-1">{t(footerPromptKey)}</span>

          <NavLink to={footerLinkTo} className="dark-purple-fg fw-bold text-decoration-none ms-2">
            {t(footerLinkLabelKey)}
          </NavLink>
        </p>
      </div>

    </form>
  );
};

export default AuthForm;
