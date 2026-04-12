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

// Global error handler for unhandled promises (e.g., async functions outside React render)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason instanceof Error) {
    console.error('Unhandled rejection:', event.reason.message, event.reason.stack);
  } else {
    console.error('Unhandled rejection with no reason or non-Error reason:', event.reason);
  }
  handleAiError(event.reason || 'Unknown unhandled rejection', 'Global:unhandledrejection', false);
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
