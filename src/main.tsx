import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import ErrorBoundary from './core/components/ErrorBoundary';
import { handleAiError } from './core/utils/errorHandling';
import { initSentry } from './core/utils/sentry';

initSentry();

// Global error handler for Vite preload errors (chunk loading failures)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error, reloading page...', event);
  window.location.reload();
});

// Global error handler for unhandled promises (e.g., async functions outside React render)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = String(reason?.message || reason || '');
  
  // Suppress common benign errors or errors handled elsewhere
  const isBenign = 
    message.includes('Quota exceeded') ||
    message.includes('high demand') ||
    message.includes('503') ||
    message.includes('UNAVAILABLE') ||
    message.includes('ResizeObserver') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('failed to connect to websocket') ||
    message.includes('Importing a cell from a closed bucket') ||
    message.includes('AI Service Busy') ||
    message.includes('permission-denied') ||
    message.includes('Missing or insufficient permissions') ||
    reason?.isAiHandled === true;

  if (isBenign) {
    event.preventDefault();
    return;
  }

  handleAiError(reason, 'Global:unhandledrejection', false);
});

import { CoreProvider } from './core/providers/CoreProvider';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <CoreProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </CoreProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
