import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { SiteSettings } from '../../core/types';
import { Building2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { handleFirestoreError, OperationType } from '../../core/utils/errorHandling';

interface PageLoaderProps {
  previewSettings?: SiteSettings | null;
  isInline?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ previewSettings, isInline }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [settings, setSettings] = useState<SiteSettings | null>(previewSettings && Object.keys(previewSettings).length > 0 ? previewSettings : null);

  useEffect(() => {
    if (previewSettings && Object.keys(previewSettings).length > 0) {
      setSettings(previewSettings);
      return;
    }

    // If no preview settings, fetch from Firestore
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SiteSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
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
      style={{ 
        backgroundColor: settings?.loaderBackgroundStyle === 'solid' ? settings?.loaderBackgroundColor : undefined 
      }}
      className={`${isInline ? 'relative w-full h-full' : 'fixed inset-0 z-[9999]'} flex flex-col items-center justify-center overflow-hidden ${settings?.loaderBackgroundStyle === 'solid' ? '' : 'bg-brand-background'}`}
    >
      {/* Dynamic Background Effects (Matching Home Page) */}
      {!isInline && (settings?.loaderBackgroundStyle === 'gradient' || settings?.loaderBackgroundStyle === 'animated' || !settings?.loaderBackgroundStyle) && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <motion.div 
            animate={settings?.loaderBackgroundStyle === 'animated' ? { 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              x: [0, 100, 0],
              y: [0, 50, 0]
            } : {}}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-brand-primary/10 rounded-full blur-[120px] opacity-60 dark:opacity-30" 
            style={{ backgroundColor: settings?.loaderProgressBarColor ? `${settings.loaderProgressBarColor}10` : undefined }}
          />
          <motion.div 
            animate={settings?.loaderBackgroundStyle === 'animated' ? { 
              scale: [1.2, 1, 1.2],
              rotate: [0, -90, 0],
              x: [0, -100, 0],
              y: [0, -50, 0]
            } : {}}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-brand-teal/10 rounded-full blur-[120px] opacity-60 dark:opacity-30" 
          />
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-80" 
            style={{ background: settings?.loaderBackgroundColor ? `radial-gradient(circle at center, transparent 0%, ${settings.loaderBackgroundColor} 100%)` : 'radial-gradient(circle at center, transparent 0%, var(--brand-background) 100%)' }}
          />
        </div>
      )}

      {/* Mesh Background */}
      {!isInline && settings?.loaderBackgroundStyle === 'mesh' && (
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute inset-0 bg-brand-background" style={{ backgroundColor: settings?.loaderBackgroundColor }} />
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                x: [Math.random() * 100, Math.random() * 100, Math.random() * 100],
                y: [Math.random() * 100, Math.random() * 100, Math.random() * 100],
              }}
              transition={{ duration: 15 + Math.random() * 10, repeat: Infinity, ease: "linear" }}
              className="absolute w-96 h-96 rounded-full blur-[100px]"
              style={{
                backgroundColor: i % 2 === 0 ? settings?.loaderProgressBarColor || '#0D9488' : '#3B82F6',
                opacity: 0.1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main Content: Just the logo */}
      <div className="relative flex flex-col items-center z-10">
        <motion.div
          animate={getLogoAnimation()}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          {(settings?.loaderLogoUrl || settings?.logoUrl) ? (
            <>
              {settings.loaderLogoUrl && (
                <img 
                  key={`loader-img-${settings.loaderLogoUrl}`}
                  src={settings.loaderLogoUrl} 
                  alt="Loader Logo" 
                  className={`${isInline ? 'h-24' : 'h-32'} w-auto object-contain drop-shadow-2xl`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (settings.logoUrl && target.src !== settings.logoUrl) {
                      target.src = settings.logoUrl;
                    } else {
                      target.style.display = 'none';
                      const textEl = document.getElementById('loader-center-text');
                      if (textEl) textEl.style.display = 'flex';
                    }
                  }}
                />
              )}
              {!settings.loaderLogoUrl && settings.logoUrl && (
                <img 
                  key={`site-img-${settings.logoUrl}`}
                  src={settings.logoUrl} 
                  alt="Site Logo" 
                  className={`${isInline ? 'h-24' : 'h-32'} w-auto object-contain drop-shadow-2xl`}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const textEl = document.getElementById('loader-center-text');
                    if (textEl) textEl.style.display = 'flex';
                  }}
                />
              )}
            </>
          ) : null}

          <div 
            id="loader-center-text"
            className="flex flex-col items-center gap-4"
            style={{ display: (settings && (settings.loaderLogoUrl || settings.logoUrl)) ? 'none' : 'flex' }}
          >
            {settings?.loaderCenterText ? (
              <div className="flex flex-col items-center gap-4">
                <div 
                  className={`w-20 h-20 rounded-[2rem] bg-brand-primary/10 flex items-center justify-center text-brand-primary ${settings?.loaderLogoAnimation === 'rotate' ? 'animate-spin-slow' : ''}`}
                  style={{ 
                    borderRadius: settings?.loaderLogoShape === 'circle' ? '50%' : settings?.loaderLogoShape === 'squircle' ? '40%' : '2rem',
                    backgroundColor: settings?.loaderProgressBarColor ? `${settings.loaderProgressBarColor}10` : undefined,
                    color: settings?.loaderProgressBarColor
                  }}
                >
                  <Building2 size={40} />
                </div>
                <span 
                  className="text-brand-text-main font-black text-2xl tracking-tighter uppercase"
                  style={{ color: settings?.loaderProgressBarColor }}
                >
                  {settings.loaderCenterText}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-[2rem] bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Building2 size={40} />
                </div>
                <span className="text-brand-text-main font-black text-2xl tracking-tighter uppercase">
                  {settings?.siteName || 'Souq Connect'}
                </span>
              </div>
            )}
          </div>
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
