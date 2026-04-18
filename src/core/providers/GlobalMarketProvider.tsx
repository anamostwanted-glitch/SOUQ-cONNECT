import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateGlobalMarketContext } from '../services/geminiService';
import { useAuth } from './AuthProvider';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface GlobalMarketContextType {
  currency: string;
  region: string;
  exchangeRate: number;
  units: string;
  greeting: string;
  nuance: string;
  isSyncing: boolean;
  setCurrency: (currency: string) => Promise<void>;
  setRegion: (region: string) => Promise<void>;
}

const GlobalMarketContext = createContext<GlobalMarketContextType | undefined>(undefined);

export const GlobalMarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const [currency, setCurrencyState] = useState(profile?.currency || 'JOD');
  const [region, setRegionState] = useState(profile?.region || 'Jordan');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [units, setUnits] = useState('Metric');
  const [greeting, setGreeting] = useState('');
  const [nuance, setNuance] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (profile?.currency) setCurrencyState(profile.currency);
    if (profile?.region) setRegionState(profile.region);
  }, [profile]);

  useEffect(() => {
    const syncMarketContext = async () => {
      setIsSyncing(true);
      try {
        const context = await generateGlobalMarketContext(region, 'JOD', currency);
        setExchangeRate(context.exchangeRate || 1);
        setUnits(context.units || 'Metric');
        setGreeting(i18n.language === 'ar' ? context.greetingAr : context.greetingEn);
        setNuance(i18n.language === 'ar' ? context.nuanceAr : context.nuanceEn);
      } catch (error) {
        console.error('Failed to sync global market context:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    syncMarketContext();
  }, [region, currency, i18n.language]);

  const updateCurrency = async (newCurrency: string) => {
    setCurrencyState(newCurrency);
    if (profile?.uid) {
      try {
        await updateDoc(doc(db, 'users', profile.uid), { currency: newCurrency });
      } catch (e) {
        console.error('Failed to update user currency:', e);
      }
    }
  };

  const updateRegion = async (newRegion: string) => {
    setRegionState(newRegion);
    if (profile?.uid) {
      try {
        await updateDoc(doc(db, 'users', profile.uid), { region: newRegion });
      } catch (e) {
        console.error('Failed to update user region:', e);
      }
    }
  };

  return (
    <GlobalMarketContext.Provider value={{ 
      currency, 
      region, 
      exchangeRate, 
      units, 
      greeting, 
      nuance, 
      isSyncing,
      setCurrency: updateCurrency,
      setRegion: updateRegion
    }}>
      {children}
    </GlobalMarketContext.Provider>
  );
};

export const useGlobalMarket = () => {
  const context = useContext(GlobalMarketContext);
  if (context === undefined) {
    throw new Error('useGlobalMarket must be used within a GlobalMarketProvider');
  }
  return context;
};
