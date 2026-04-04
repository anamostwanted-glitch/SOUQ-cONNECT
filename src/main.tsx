import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import { client } from './graphql/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import ErrorBoundary from './core/components/ErrorBoundary';

// Global error handler for unhandled promises (e.g., async functions outside React render)
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // We don't necessarily want to crash the whole app for every background promise,
  // but logging it is crucial. You could also dispatch a custom event here to show a toast.
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
