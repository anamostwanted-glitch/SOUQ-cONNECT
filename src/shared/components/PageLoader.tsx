import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { SiteSettings } from '../../core/types';
import { Building2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PageLoaderProps {
  previewSettings?: SiteSettings | null;
  isInline?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ previewSettings, isInline }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [settings, setSettings] = useState<SiteSettings | null>(previewSettings || null);

  useEffect(() => {
    if (previewSettings) {
      setSettings(previewSettings);
      return;
    }

    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SiteSettings);
      }
    }, (error) => {
      console.error('Error fetching site settings in PageLoader:', error);
    });

    return () => unsub();
  }, [previewSettings]);

  const getLogoAnimation = () => {
    const anim = settings?.loaderLogoAnimation || 'float';
    switch (anim) {
      case 'bounce':
        return { y: [0, -20, 0] };
      case 'rotate':
        return { rotate: [0, 360] };
      case 'scale':
        return { scale: [1, 1.1, 1] };
      case 'float':
        return { y: [0, -10, 0], x: [0, 5, 0] };
      default:
        return {};
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${isInline ? 'relative w-full h-full' : 'fixed inset-0 z-[9999]'} flex flex-col items-center justify-center overflow-hidden bg-brand-background`}
    >
      {/* Dynamic Background Effects (Matching Home Page) */}
      {!isInline && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              x: [0, 100, 0],
              y: [0, 50, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-brand-primary/10 rounded-full blur-[120px] opacity-60 dark:opacity-30" 
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              rotate: [0, -90, 0],
              x: [0, -100, 0],
              y: [0, -50, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-brand-teal/10 rounded-full blur-[120px] opacity-60 dark:opacity-30" 
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,var(--brand-background)_100%)] opacity-80" />
        </div>
      )}

      {/* Main Content: Just the logo */}
      <div className="relative flex flex-col items-center z-10">
        <motion.div
          animate={getLogoAnimation()}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          {settings?.loaderLogoUrl ? (
            <img 
              src={settings.loaderLogoUrl} 
              alt="Loader Logo" 
              className={`${isInline ? 'h-24' : 'h-32'} w-auto object-contain drop-shadow-2xl`}
              referrerPolicy="no-referrer"
            />
          ) : settings?.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="Site Logo" 
              className={`${isInline ? 'h-24' : 'h-32'} w-auto object-contain drop-shadow-2xl`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-[2rem] bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Building2 size={40} />
              </div>
              <span className="text-brand-text-main font-black text-2xl tracking-tighter uppercase">
                {settings?.siteName || 'B2B2C'}
              </span>
            </div>
          )}

          {/* Neural Pulse Aura */}
          {settings?.enableNeuralPulse !== false && (
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 -z-10 rounded-full blur-3xl"
              style={{ backgroundColor: settings?.logoAuraColor || '#1b97a7' }}
            />
          )}
        </motion.div>

        {/* Status Text */}
        {(settings?.loaderStatusTextAr || settings?.loaderStatusTextEn) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <span className="text-brand-text-main font-bold text-sm tracking-wide">
              {isRtl ? settings.loaderStatusTextAr : settings.loaderStatusTextEn}
            </span>
            <div className="flex justify-center gap-1 mt-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-1 h-1 rounded-full bg-brand-primary"
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer Text */}
      {(settings?.loaderFooterTextAr || settings?.loaderFooterTextEn) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-12 left-0 right-0 text-center"
        >
          <span className="text-brand-text-muted text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
            {isRtl ? settings.loaderFooterTextAr : settings.loaderFooterTextEn}
          </span>
        </motion.div>
      )}
    </motion.div>
  );

};
