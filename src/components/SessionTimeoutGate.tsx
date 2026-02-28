import React from 'react';
import { useAuth } from '../context/AuthProvider';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { SessionTimeoutModal } from './SessionTimeoutModal';

/**
 * Renders session timeout warning modal and triggers logout on idle.
 * Only active when user is authenticated.
 */
export function SessionTimeoutGate({ children }: { children: React.ReactNode }) {
  const { isAuthed, logout } = useAuth();
  const { showWarn, stayLoggedIn } = useSessionTimeout(logout, {
    idleMinutes: 30,
    warnBeforeMinutes: 2,
    enabled: isAuthed,
  });

  return (
    <>
      {children}
      <SessionTimeoutModal
        open={showWarn}
        onStayLoggedIn={stayLoggedIn}
        onLogOut={() => {
          logout();
        }}
      />
    </>
  );
}
