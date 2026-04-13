import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import { client } from './graphql/client';
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
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  
  // Suppress redundant logging for known handled AI errors that might still bubble up
  if (errorMessage.includes('AI Service Busy') || errorMessage.includes('503') || errorMessage.includes('high demand')) {
    console.warn('Handled AI service busy rejection:', errorMessage);
    event.preventDefault(); // Prevent default browser logging
    return;
  }

  if (reason instanceof Error) {
    console.error('Unhandled rejection:', reason.message, reason.stack);
  } else {
    console.error('Unhandled rejection with no reason or non-Error reason:', reason);
  }
  
  handleAiError(reason || 'Unknown unhandled rejection', 'Global:unhandledrejection', false);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </ErrorBoundary>
  </StrictMode>,
);
