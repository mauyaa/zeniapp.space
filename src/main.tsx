import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { validateEnv } from './lib/env';
import { initSentry } from './lib/sentry';
import { App } from './App';

validateEnv();
if (import.meta.env.PROD) {
  initSentry();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore */ });
  }
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container element not found');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
