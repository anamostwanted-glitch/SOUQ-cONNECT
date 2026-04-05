import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Sparkles } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { SiteSettings } from '../../core/types';

interface PageLoaderProps {
  previewSettings?: SiteSettings;
  isInline?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ previewSettings, isInline }) => {
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

  const speedMultiplier = settings?.animationSpeed === 'fast' ? 0.5 : settings?.animationSpeed === 'slow' ? 2 : 1;

  const getLogoAnimation = () => {
    switch (settings?.loaderLogoAnimation) {
      case 'bounce':
        return { y: [0, -20, 0], transition: { duration: 1 * speedMultiplier, repeat: Infinity, ease: "easeInOut" as const } };
      case 'rotate':
        return { rotate: [0, 360], transition: { duration: 4 * speedMultiplier, repeat: Infinity, ease: "linear" as const } };
      case 'scale':
        return { scale: [1, 1.1, 1], transition: { duration: 2 * speedMultiplier, repeat: Infinity, ease: "easeInOut" as const } };
      case 'float':
        return { y: [0, -10, 0], x: [0, 5, 0], transition: { duration: 3 * speedMultiplier, repeat: Infinity, ease: "easeInOut" as const } };
      default:
        return {};
    }
  };

  const getBackgroundStyles = () => {
    switch (settings?.loaderBackgroundStyle) {
      case 'gradient':
        return { background: `radial-gradient(circle at center, ${settings?.loaderBackgroundColor || '#ffffff'} 0%, var(--brand-background) 100%)` };
      case 'mesh':
        return { background: `conic-gradient(from 0deg, ${settings?.logoAuraColor}22, transparent, ${settings?.logoAuraColor}22)` };
      case 'animated':
        return { background: 'var(--brand-background)' }; // Handled by separate motion div if needed
      default:
        return { backgroundColor: 'var(--brand-background)' };
    }
  };

  return (
    <div 
      className={`${isInline ? 'absolute' : 'fixed'} inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden`}
      style={getBackgroundStyles()}
    >
      {settings?.loaderBackgroundStyle === 'animated' && (
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{ duration: 20 * speedMultiplier, repeat: Infinity, ease: "linear" as const }}
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${settings?.logoAuraColor}44 0%, transparent 50%), radial-gradient(circle at 70% 70%, ${settings?.logoAuraColor}44 0%, transparent 50%)`
          }}
        />
      )}
      {/* Top Logo - B2B2C */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 * speedMultiplier, ease: "easeOut" }}
        className="absolute top-8 left-0 right-0 flex justify-center"
      >
        <div className="flex items-center gap-2 text-brand-primary">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
          ) : (
            <>
              <Building2 size={32} />
              <span className="font-extrabold text-2xl tracking-tight">{settings?.siteName || 'B2B2C'}</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Center Logo - DFEI */}
      <div className="relative flex flex-col items-center">
        {/* Animated Background Glow */}
        {settings?.enableNeuralPulse !== false && (
          <motion.div
            animate={settings?.logoAuraStyle === 'pulse' ? {
              scale: [1, settings?.logoAuraSpread || 1.5, 1],
              opacity: [(settings?.logoAuraOpacity || 0.3) * 0.5, settings?.logoAuraOpacity || 0.3, (settings?.logoAuraOpacity || 0.3) * 0.5],
            } : settings?.logoAuraStyle === 'mesh' ? {
              scale: [1, 1.2, 1],
              rotate: [0, 90, 180, 270, 360],
            } : { 
              scale: [1, 1.1, 1],
              opacity: [(settings?.logoAuraOpacity || 0.3) * 0.8, settings?.logoAuraOpacity || 0.3, (settings?.logoAuraOpacity || 0.3) * 0.8],
            }}
            transition={{ 
              duration: (settings?.logoAuraStyle === 'pulse' ? 3 : 8) * speedMultiplier, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ 
              backgroundColor: settings?.logoAuraStyle === 'solid' ? settings?.logoAuraColor : 'transparent',
              backgroundImage: settings?.logoAuraStyle === 'gradient' ? `radial-gradient(circle, ${settings?.logoAuraColor} 0%, transparent 70%)` : 
                               settings?.logoAuraStyle === 'mesh' ? `conic-gradient(from 0deg, ${settings?.logoAuraColor}, ${settings?.logoAuraColor}88, ${settings?.logoAuraColor}44, ${settings?.logoAuraColor}88, ${settings?.logoAuraColor})` : 'none',
              filter: `blur(${settings?.logoAuraBlur || 100}px) contrast(${100 + ((settings?.logoAuraSharpness || 50) - 50) * 2}%)`,
              opacity: settings?.logoAuraOpacity || 0.3,
              transform: `scale(${settings?.logoAuraSpread || 1.5})`,
            }}
          />
        )}

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1 * speedMultiplier, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <div className="relative">
            {settings?.enableOrbitalRings !== false && (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20 * speedMultiplier, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-8 border-2 border-dashed border-brand-primary/30 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15 * speedMultiplier, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-12 border border-brand-primary/10 rounded-full"
                />
              </>
            )}
            
            <motion.div 
              animate={getLogoAnimation()}
              className={`w-32 h-32 bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center shadow-2xl shadow-brand-primary/40 relative overflow-hidden group ${
                settings?.loaderLogoShape === 'circle' ? 'rounded-full' : 
                settings?.loaderLogoShape === 'squircle' ? 'rounded-[2.5rem]' : 'rounded-3xl'
              }`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {settings?.loaderLogoUrl ? (
                <img 
                  src={settings.loaderLogoUrl} 
                  alt="Loader Logo" 
                  className="w-full h-full object-contain p-4"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-white font-black text-4xl tracking-tighter">{settings?.loaderCenterText || 'DFEI'}</span>
              )}
              {settings?.enableShimmerEffect !== false && (
                <motion.div
                  animate={{ 
                    left: ['-100%', '200%'],
                  }}
                  transition={{ duration: 2 * speedMultiplier, repeat: Infinity, ease: "easeInOut" as const, repeatDelay: 1 }}
                  className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                />
              )}
            </motion.div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 * speedMultiplier }}
              className="flex items-center gap-2 text-brand-primary font-bold tracking-widest uppercase text-sm"
            >
              <Sparkles size={16} className="animate-pulse" />
              <span>
                {localStorage.getItem('i18nextLng')?.startsWith('ar') 
                  ? (settings?.loaderStatusTextAr || 'جاري التحميل...') 
                  : (settings?.loaderStatusTextEn || 'Initializing Hub')}
              </span>
              <Sparkles size={16} className="animate-pulse" />
            </motion.div>
            
            {/* Progress Bar */}
            <div className="w-48 h-1 bg-brand-surface rounded-full overflow-hidden border border-brand-border/50">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2 * speedMultiplier, repeat: Infinity, ease: "easeInOut" }}
                className="h-full"
                style={{ 
                  backgroundColor: settings?.loaderProgressBarColor || 'var(--brand-primary)',
                  boxShadow: `0 0 10px ${settings?.loaderProgressBarColor || 'var(--brand-primary)'}88`
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-12 text-brand-text-muted text-xs font-medium tracking-widest uppercase opacity-50 px-4 text-center">
        {localStorage.getItem('i18nextLng')?.startsWith('ar') 
          ? (settings?.loaderFooterTextAr || 'مدعوم بالذكاء الاصطناعي') 
          : (settings?.loaderFooterTextEn || 'Powered by Neural Intelligence')}
      </div>
    </div>
  );
};
