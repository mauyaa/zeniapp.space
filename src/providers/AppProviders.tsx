import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import { ToastProvider } from '../context/ToastContext';
import { ChatProvider } from '../context/ChatContext';
import { ThemeProvider } from '../context/ThemeContext';
import { I18nProvider } from '../context/I18nContext';
import { NotificationProvider } from '../context/NotificationContext';
import { SessionTimeoutGate } from '../components/SessionTimeoutGate';
import { network } from '../lib/enhanced-api';
import { logger } from '../lib/logger';

/**
 * Composed app providers — flattens nesting and centralizes provider order.
 * Order matters: Theme → Toast → Auth → Session → Notifications → Chat → Router
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const removeOnlineListener = network.addOnlineListener(() => {
      logger.info('App: Network is back online');
    });
    const removeOfflineListener = network.addOfflineListener(() => {
      logger.info('App: Network went offline');
    });
    return () => {
      removeOnlineListener();
      removeOfflineListener();
    };
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
          <SessionTimeoutGate>
            <NotificationProvider>
              <ChatProvider>
                <BrowserRouter>{children}</BrowserRouter>
              </ChatProvider>
            </NotificationProvider>
          </SessionTimeoutGate>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
