import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { type?: string; size?: string; text?: string; theme?: string; width?: number }
          ) => void;
        };
      };
    };
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export function GoogleSignInButton({
  clientId,
  onSuccess,
  onError,
  disabled,
}: {
  clientId: string;
  onSuccess: (credential: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(Boolean(window.google));

  useEffect(() => {
    if (!clientId || disabled) return;

    if (window.google) {
      setScriptLoaded(true);
      return;
    }

    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => setScriptLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => onError?.('Failed to load Google sign-in');
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [clientId, disabled, onError]);

  useEffect(() => {
    if (!scriptLoaded || !clientId || !containerRef.current || !window.google || disabled) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response?.credential) onSuccess(response.credential);
      },
      auto_select: false,
    });

    try {
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        size: 'large',
        text: 'signin_with',
        theme: 'outline',
        width: 120,
      });
    } catch (e) {
      onError?.('Failed to render Google button');
    }
  }, [scriptLoaded, clientId, onSuccess, onError, disabled]);

  if (!clientId) return null;

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center min-h-[40px]"
      aria-label="Sign in with Google"
    />
  );
}
