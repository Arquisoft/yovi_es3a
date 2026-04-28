
import React from 'react';
import AuthForm from '../AuthForm';

const LoginForm: React.FC<{ onSuccess?: (username: string) => void }> = ({ onSuccess }) => {
  return (
    <AuthForm
      mode="login"
      endpoint="/login"
      successMessageKey="alert.login.success"
      usernameLabelKey="login.username.label"
      passwordLabelKey="login.password.label"
      usernameValidationKey="login.validation.username_required"
      passwordValidationKey="login.validation.password_required"
      serverErrorKey="login.response.server_error"
      networkErrorKey="login.response.network_error"
      submitButtonIdleKey="login.button.idle"
      submitButtonLoadingKey="login.button.loading"
      footerPromptKey="login.register.prompt"
      footerLinkTo="/register"
      footerLinkLabelKey="login.register.link"
      onSuccess={onSuccess}
    />
  );
};

export default LoginForm;
