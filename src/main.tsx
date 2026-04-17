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
  
  // If there's no reason, it might be a silent rejection or something weird
  if (!reason) {
    console.warn('Unhandled rejection with no reason');
    return;
  }

  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  
  // Suppress redundant logging for known handled AI errors that might still bubble up
  if (errorMessage.includes('AI Service Busy') || errorMessage.includes('503') || errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
    console.warn('Handled AI service busy rejection:', errorMessage);
    event.preventDefault(); // Prevent default browser logging
    return;
  }

  // Ignore ResizeObserver loop errors (benign)
  if (errorMessage.includes('ResizeObserver loop limit exceeded') || errorMessage.includes('ResizeObserver loop completed with undelivered notifications')) {
    event.preventDefault();
    return;
  }

  // Ignore dynamic import errors (handled by vite:preloadError or lazyWithRetry)
  if (errorMessage.includes('Failed to fetch dynamically imported module') || errorMessage.includes('Importing a cell from a closed bucket')) {
    console.warn('Suppressing dynamic import error in global handler (handled by retry logic)');
    event.preventDefault();
    return;
  }

  if (reason instanceof Error) {
    console.error('Unhandled rejection:', reason.message, reason.stack);
  } else {
    console.error('Unhandled rejection (non-Error):', reason);
  }
  
  handleAiError(reason, 'Global:unhandledrejection', false);
});

import { CoreProvider } from './core/providers/CoreProvider';
import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <CoreProvider>
          <App />
        </CoreProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
