import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SiteSettings, AppFeatures } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import i18n from 'i18next';

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

  // Function to update SEO and Favicon
  const updateMetadata = (data: SiteSettings, lang: string) => {
    // 1. Title
    const title = lang === 'ar' 
      ? (data.seoTitleAr || data.siteName || 'سوق كونكت') 
      : (data.seoTitleEn || data.siteName || 'Souq Connect');
    document.title = title;

    // 2. Description
    const description = lang === 'ar' 
      ? (data.seoDescriptionAr || 'منصة ربط الموردين بالعملاء') 
      : (data.seoDescriptionEn || 'B2B Trading Platform');
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // 3. Favicon
    if (data.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = data.faviconUrl;
    }
  };

  useEffect(() => {
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const newSettings = snap.data() as SiteSettings;
        setSettings(newSettings);
        updateMetadata(newSettings, i18n.language);
      } else {
        setSettings({});
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
      setSettings({});
      setLoading(false);
    });

    // Handle language changes for SEO update
    const handleLangChange = (lang: string) => {
      if (settings) updateMetadata(settings, lang);
    };
    i18n.on('languageChanged', handleLangChange);

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
      i18n.off('languageChanged', handleLangChange);
    };
  }, [settings?.siteName, settings?.seoTitleAr, settings?.seoTitleEn, settings?.seoDescriptionAr, settings?.seoDescriptionEn, settings?.faviconUrl]);

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
