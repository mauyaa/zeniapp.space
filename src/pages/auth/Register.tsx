import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthPage } from './AuthPage';

export function RegisterPage() {
  const navigate = useNavigate();
  return (
    <AuthPage
      initialMode="register"
      onModeChange={(mode) => {
        navigate(mode === 'login' ? '/login' : '/register', { replace: true });
      }}
    />
  );
}
