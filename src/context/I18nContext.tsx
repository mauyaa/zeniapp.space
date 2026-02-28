/* eslint-disable react-refresh/only-export-components -- exports provider + hook */
import React, { createContext, useContext, useMemo, useState } from 'react';
import { getTranslation, type Locale } from '../lib/i18n/translations';

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem('zeni_locale') as Locale | null;
    return stored === 'sw' ? 'sw' : 'en';
  });

  const value = useMemo(
    () => ({
      locale,
      setLocale: (l: Locale) => {
        setLocale(l);
        try {
          localStorage.setItem('zeni_locale', l);
        } catch {
          // ignore
        }
      },
      t: (key: string) => getTranslation(locale, key),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: 'en',
      setLocale: () => { /* no-op when outside provider */ },
      t: (key: string) => getTranslation('en', key),
    };
  }
  return ctx;
}
