import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile, BrandingPreferences } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

interface BrandingContextType {
  branding: BrandingPreferences | null;
  updateBranding: (newBranding: BrandingPreferences) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const DEFAULT_BRANDING: BrandingPreferences = {
  primaryColor: '#1b97a7',
  secondaryColor: '#64748b',
  borderRadius: 'xl',
  fontFamily: 'Inter',
  enableGlassmorphism: true,
};

const FONT_MAP: Record<string, string> = {
  'Inter': '"Inter", ui-sans-serif, system-ui, sans-serif',
  'Roboto': '"Roboto", sans-serif',
  'Poppins': '"Poppins", sans-serif',
  'Montserrat': '"Montserrat", sans-serif',
  'System': 'ui-sans-serif, system-ui, sans-serif',
};

const RADIUS_MAP: Record<string, string> = {
  'none': '0px',
  'sm': '0.125rem',
  'md': '0.375rem',
  'lg': '0.5rem',
  'xl': '1rem',
  '2xl': '1.5rem',
  'full': '9999px',
};

// Helper to convert hex to HSL for generating shades
const hexToHSL = (hex: string) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingPreferences>(DEFAULT_BRANDING);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Listen to global site settings
    const unsubscribeGlobal = onSnapshot(doc(db, 'settings', 'site'), (siteDoc) => {
      if (siteDoc.exists() && siteDoc.data().branding) {
        setBranding(prev => ({ ...prev, ...siteDoc.data().branding }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site');
    });

    return () => unsubscribeGlobal();
  }, []);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        if (unsubscribeUser) unsubscribeUser();
        unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            if (data.branding) {
              setBranding(data.branding);
            }
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        });
      } else {
        if (unsubscribeUser) {
          unsubscribeUser();
          unsubscribeUser = undefined;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const { h, s, l } = hexToHSL(branding.primaryColor);
    
    // Apply primary color and its shades
    root.style.setProperty('--brand-primary', branding.primaryColor);
    root.style.setProperty('--primary', branding.primaryColor);
    root.style.setProperty('--brand-primary-h', h.toString());
    root.style.setProperty('--brand-primary-s', `${s}%`);
    root.style.setProperty('--brand-primary-l', `${l}%`);
    
    // Generate functional shades
    root.style.setProperty('--brand-primary-50', `hsl(${h}, ${s}%, 95%)`);
    root.style.setProperty('--brand-primary-100', `hsl(${h}, ${s}%, 90%)`);
    root.style.setProperty('--brand-primary-200', `hsl(${h}, ${s}%, 80%)`);
    root.style.setProperty('--brand-primary-500', branding.primaryColor);
    root.style.setProperty('--brand-primary-600', `hsl(${h}, ${s}%, ${Math.max(0, l - 10)}%)`);
    root.style.setProperty('--brand-primary-700', `hsl(${h}, ${s}%, ${Math.max(0, l - 20)}%)`);
    
    // Secondary color
    root.style.setProperty('--brand-secondary', branding.secondaryColor);
    root.style.setProperty('--secondary', branding.secondaryColor);
    
    // Apply radius
    const radiusValue = RADIUS_MAP[branding.borderRadius] || RADIUS_MAP['xl'];
    root.style.setProperty('--brand-radius', radiusValue);
    root.style.setProperty('--radius', radiusValue);
    
    // Apply font
    root.style.setProperty('--brand-font', FONT_MAP[branding.fontFamily] || FONT_MAP['Inter']);
    
    // Apply glassmorphism
    if (branding.enableGlassmorphism) {
      root.style.setProperty('--brand-glass-blur', '12px');
      root.style.setProperty('--brand-glass-opacity', '0.9');
    } else {
      root.style.setProperty('--brand-glass-blur', '0px');
      root.style.setProperty('--brand-glass-opacity', '1');
    }
  }, [branding]);

  const updateBranding = React.useCallback((newBranding: BrandingPreferences) => {
    setBranding(newBranding);
  }, []);

  const toggleDarkMode = React.useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, updateBranding, isDarkMode, toggleDarkMode }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
