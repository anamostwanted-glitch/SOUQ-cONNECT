import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SiteSettings, AppFeatures } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

interface SettingsContextType {
  settings: SiteSettings | null;
  features: AppFeatures;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_FEATURES: AppFeatures = {
  marketplace: true,
  aiChat: true,
  supplierVerification: true,
  marketTrends: true,
  priceIntelligence: true,
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [features, setFeatures] = useState<AppFeatures>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const newSettings = snap.data() as SiteSettings;
        setSettings(newSettings);
        if (newSettings.siteName) {
          document.title = newSettings.siteName;
        }
      } else {
        setSettings({});
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
      setSettings({});
      setLoading(false);
    });

    const unsubscribeFeatures = onSnapshot(doc(db, 'settings', 'features'), (snap) => {
      if (snap.exists()) {
        setFeatures(snap.data() as AppFeatures);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/features', false);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeFeatures();
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, features, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
