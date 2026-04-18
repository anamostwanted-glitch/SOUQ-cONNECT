import React from 'react';
import { AuthProvider } from './AuthProvider';
import { SettingsProvider } from './SettingsProvider';
import { CategoryProvider } from './CategoryProvider';
import { BrandingProvider } from './BrandingProvider';
import { GlobalMarketProvider } from './GlobalMarketProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export const CoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GlobalMarketProvider>
            <SettingsProvider>
              <CategoryProvider>
                <BrandingProvider>
                  {children}
                </BrandingProvider>
              </CategoryProvider>
            </SettingsProvider>
          </GlobalMarketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
};
