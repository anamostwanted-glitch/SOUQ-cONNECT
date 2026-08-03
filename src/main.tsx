
const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Encountered two children with the same key')) {
    originalError(...args);
    console.trace('Duplicate key trace');
  } else {
    originalError(...args);
  }
};
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
  
  // Prevent unhandled rejection crashes / console errors
  event.preventDefault();

  const isBenign = 
    !reason ||
    message === '' ||
    message === '[object Object]' ||
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
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Load failed') ||
    message.includes('The operation is insecure') ||
    message.includes('play() request') ||
    message.includes('canceled') ||
    message.includes('cancelled') ||
    message.includes('IndexedDB') ||
    message.includes('analytics') ||
    reason?.isAiHandled === true;

  if (!isBenign) {
    console.warn('Unhandled Promise Rejection:', reason);
  }
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
