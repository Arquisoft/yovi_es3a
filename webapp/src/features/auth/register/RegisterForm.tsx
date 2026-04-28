
import React from 'react';
import AuthForm from '../AuthForm';

const RegisterForm: React.FC<{ onSuccess?: (username: string) => void }> = ({ onSuccess }) => {
  return (
    <AuthForm
      mode="register"
      endpoint="/createuser"
      successMessageKey="alert.register.success"
      usernameLabelKey="register.username.label"
      passwordLabelKey="register.password.label"
      usernameValidationKey="register.validation.username_required"
      passwordValidationKey="register.validation.password_required"
      serverErrorKey="register.response.server_error"
      networkErrorKey="register.response.network_error"
      submitButtonIdleKey="register.button.idle"
      submitButtonLoadingKey="register.button.loading"
      footerPromptKey="register.login.prompt"
      footerLinkTo="/login"
      footerLinkLabelKey="register.login.link"
      onSuccess={onSuccess}
    />
  );
};

export default RegisterForm;
