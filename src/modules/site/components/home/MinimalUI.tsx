import React from 'react';
import { motion } from 'motion/react';
import { Search, Mic, Camera, Sparkles, Zap, Package, ShoppingBag } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { SiteSettings } from '../../../../core/types';

interface MinimalUIProps {
  settings: SiteSettings | null;
  isRtl: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  onVoiceSearch: () => void;
  onVisualSearch: () => void;
  isListening: boolean;
  onSearch: (e: React.FormEvent) => void;
  logoUrl?: string;
  siteName?: string;
  logoScale: number;
  nextAction?: any;
  onNavigate: (view: any) => void;
  t: any;
}

export const MinimalUI: React.FC<MinimalUIProps> = ({
  settings,
  isRtl,
  searchTerm,
  setSearchTerm,
  onVoiceSearch,
  onVisualSearch,
  isListening,
  onSearch,
  logoUrl,
  siteName,
  logoScale,
  nextAction,
  onNavigate,
  t
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative z-10 max-w-4xl mx-auto px-4 min-h-[calc(100dvh-200px)] md:min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-12"
    >
      {/* Background Gradients (Google-like) */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-teal/5 rounded-full blur-[120px]" />
      </div>

      {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="mb-20 relative group cursor-pointer flex flex-col items-center"
          onClick={onVisualSearch}
        >
          {/* Logo Image/Text */}
          <div 
            className="relative z-10 transition-transform duration-300 group-hover:scale-105"
            style={{ transform: `scale(${logoScale})` }}
          >
            {/* Shimmer Sweep Effect over the logo itself */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite] skew-x-12 z-20 mix-blend-overlay pointer-events-none" />

            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex items-center gap-3 text-brand-primary drop-shadow-2xl">
                <Sparkles size={48} strokeWidth={1.5} />
                <span className="text-3xl font-black tracking-tighter">{siteName || 'Souq Connect'}</span>
              </div>
            )}
          </div>
        </motion.div>

      {/* Search Bar (Minimal) */}
      <div className="w-full relative group mb-12">
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary/10 to-brand-teal/10 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative bg-white dark:bg-gray-900 rounded-full p-1 border border-brand-border shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex items-center px-6 py-2 md:py-3">
            <Search className={`w-5 h-5 text-brand-text-muted ${isRtl ? 'ml-4' : 'mr-4'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch(e as any)}
              placeholder={isRtl ? 'ابحث عن منتجات أو موردين...' : 'Search for products or suppliers...'}
              className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium text-brand-text-main placeholder:text-brand-text-muted/50"
              dir={isRtl ? 'rtl' : 'ltr'}
            />
            <div className="flex items-center gap-2">
              <HapticButton onClick={onVoiceSearch} className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-brand-text-muted hover:text-brand-primary'}`}>
                <Mic size={24} />
              </HapticButton>
              <HapticButton onClick={onVisualSearch} className="p-3 text-brand-text-muted hover:text-brand-teal transition-colors">
                <Camera size={24} />
              </HapticButton>
            </div>
          </div>
        </div>
      </div>
      
      {/* Smart Suggestion */}
      {nextAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <HapticButton
            onClick={() => {
              if (nextAction.action === 'upload_product') onNavigate('dashboard');
              if (nextAction.action === 'search_market') onNavigate('marketplace');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-full text-sm font-medium hover:bg-brand-primary/20 transition-colors"
          >
            {nextAction.icon === 'Package' && <Package size={16} />}
            {nextAction.icon === 'ShoppingBag' && <ShoppingBag size={16} />}
            {t(nextAction.label)}
          </HapticButton>
        </motion.div>
      )}
    </motion.div>
  );
};
