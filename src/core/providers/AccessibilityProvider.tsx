import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'extra-large';
  highContrast: boolean;
  reducedMotion: boolean;
  dyslexicFont: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('accessibility_settings');
    return saved ? JSON.parse(saved) : {
      fontSize: 'normal',
      highContrast: false,
      reducedMotion: false,
      dyslexicFont: false,
    };
  });

  useEffect(() => {
    localStorage.setItem('accessibility_settings', JSON.stringify(settings));
    
    // Apply settings to document root
    const root = document.documentElement;
    
    // Font Size
    root.classList.remove('text-large', 'text-extra-large');
    if (settings.fontSize === 'large') root.classList.add('text-large');
    if (settings.fontSize === 'extra-large') root.classList.add('text-extra-large');

    // High Contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Dyslexic Font
    if (settings.dyslexicFont) {
      root.classList.add('dyslexic-font');
    } else {
      root.classList.remove('dyslexic-font');
    }

    // Reduced Motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [settings]);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings({
      fontSize: 'normal',
      highContrast: false,
      reducedMotion: false,
      dyslexicFont: false,
    });
  };

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
