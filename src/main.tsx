import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/react';
import { client } from './graphql/client';
import App from './App.tsx';
import './index.css';
import './i18n';
import ErrorBoundary from './core/components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </ErrorBoundary>
  </StrictMode>,
);
