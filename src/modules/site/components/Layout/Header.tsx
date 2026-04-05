import React, { useState, useRef, useEffect } from 'react';
import { Building2, Home as HomeIcon, LayoutDashboard, Megaphone, ShoppingBag, User, Sparkles, MapPin, Globe, Bell, Menu, UploadCloud, Bot, MessageSquare, BookOpen } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { UserProfile, AppFeatures, Notification } from '../../../../core/types';
import { useTranslation } from 'react-i18next';
import { NotificationDropdown } from './NotificationDropdown';
import { motion, useAnimation, AnimatePresence } from 'motion/react';

interface HeaderProps {
  siteLogo: string;
  siteName: string;
  logoAuraColor?: string;
  logoAuraBlur?: number;
  logoAuraSpread?: number;
  logoAuraOpacity?: number;
  logoAuraStyle?: 'solid' | 'gradient' | 'pulse' | 'mesh';
  logoAuraSharpness?: number;
  logoScale?: number;
  showNeuralLogo?: boolean;
  currentView: string;
  setView: (view: any) => void;
  supplierTab: string;
  setSupplierTab?: (tab: any) => void;
  profile: UserProfile | null;
  viewMode: string;
  setViewMode: (mode: any) => void;
  uiStyle: 'classic' | 'minimal';
  setUiStyle: (style: 'classic' | 'minimal') => void;
  features: AppFeatures;
  isRtl: boolean;
  toggleLanguage: () => void;
  isLoadingLocation: boolean;
  locationName: string | null;
  unreadCount: number;
  notifications: Notification[];
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  onNotificationClick: (n: Notification) => void;
  onVisualSearch: () => void;
  onMobileMenuOpen: () => void;
  onOpenHelpCenter: () => void;
  notifRef: React.RefObject<HTMLDivElement>;
}

export const Header: React.FC<HeaderProps> = ({
  siteLogo,
  siteName,
  logoAuraColor = '#1b97a7',
  logoAuraBlur = 20,
  logoAuraSpread = 1.2,
  logoAuraOpacity = 0.4,
  logoAuraStyle = 'solid',
  logoAuraSharpness = 50,
  logoScale = 1,
  showNeuralLogo = true,
  currentView,
  setView,
  supplierTab,
  setSupplierTab,
  profile,
  viewMode,
  setViewMode,
  uiStyle,
  setUiStyle,
  features,
  isRtl,
  toggleLanguage,
  isLoadingLocation,
  locationName,
  unreadCount,
  notifications,
  showNotifications,
  setShowNotifications,
  onNotificationClick,
  onVisualSearch,
  onMobileMenuOpen,
  onOpenHelpCenter,
  notifRef
}) => {
  const { t, i18n } = useTranslation();

  return (
    <header className="border-b border-brand-border px-4 md:px-8 py-4 sticky top-0 bg-brand-background/80 backdrop-blur-xl z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left Side: Logo & Nav */}
        <div className="flex items-center gap-8">
          <HapticButton 
            onClick={() => setView('home')}
            className="flex items-center gap-2 text-brand-primary relative group"
          >
            {showNeuralLogo && (
              <motion.div 
                animate={logoAuraStyle === 'pulse' ? {
                  scale: [1, logoAuraSpread, 1],
                  opacity: [logoAuraOpacity * 0.5, logoAuraOpacity, logoAuraOpacity * 0.5],
                } : logoAuraStyle === 'mesh' ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, 90, 180, 270, 360],
                  borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 60% 40% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
                } : { 
                  scale: [1, 1.05, 1],
                  opacity: [logoAuraOpacity * 0.8, logoAuraOpacity, logoAuraOpacity * 0.8],
                }}
                transition={{ 
                  duration: logoAuraStyle === 'pulse' ? 3 : 8, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 rounded-full pointer-events-none z-0"
                style={{ 
                  backgroundColor: logoAuraStyle === 'solid' ? logoAuraColor : 'transparent',
                  backgroundImage: logoAuraStyle === 'gradient' ? `radial-gradient(circle, ${logoAuraColor} 0%, transparent 70%)` : 
                                   logoAuraStyle === 'mesh' ? `conic-gradient(from 0deg, ${logoAuraColor}, ${logoAuraColor}88, ${logoAuraColor}44, ${logoAuraColor}88, ${logoAuraColor})` : 'none',
                  filter: `blur(${logoAuraBlur}px) contrast(${100 + (logoAuraSharpness - 50) * 2}%)`,
                  opacity: logoAuraOpacity,
                  transform: `scale(${logoAuraSpread})`,
                  boxShadow: logoAuraColor.toLowerCase() === '#ffffff' ? '0 0 20px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              />
            )}
            <div className="relative z-10 flex items-center gap-2">
              {siteLogo ? (
                <img 
                  src={siteLogo} 
                  alt="Logo" 
                  className="h-10 w-auto object-contain drop-shadow-sm" 
                  style={{ transform: `scale(${logoScale})` }}
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Building2 size={28} />
                  <span className="font-extrabold text-xl tracking-tight hidden sm:block">
                    {siteName || 'B2B2C'}
                  </span>
                </div>
              )}
            </div>
          </HapticButton>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <button 
              onClick={() => setView('home')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'home' ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
            >
              {t('home')}
            </button>
            
            <button 
              onClick={() => { setView('dashboard'); setSupplierTab?.('dashboard'); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'dashboard' && supplierTab === 'dashboard' ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
            >
              {t('dashboard')}
            </button>

            {features.marketplace && (
              <button 
                onClick={() => setView('marketplace')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'marketplace' ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text-muted hover:text-brand-text-main'}`}
              >
                {t('marketplace')}
              </button>
            )}
          </nav>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-brand-surface rounded-lg border border-brand-border">
            <MapPin size={14} className="text-brand-primary" />
            <span className="text-[10px] font-semibold text-brand-text-muted truncate max-w-[120px]">
              {isLoadingLocation ? (isRtl ? 'جاري...' : 'Locating...') : locationName || (isRtl ? 'موقع غير معروف' : 'Unknown')}
            </span>
          </div>

          <HapticButton 
            onClick={toggleLanguage}
            className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-brand-surface rounded-xl transition-all text-brand-text-muted hover:text-brand-primary"
            title={isRtl ? 'تبديل اللغة' : 'Toggle Language'}
          >
            <Globe size={20} />
          </HapticButton>

          <HapticButton 
            onClick={onOpenHelpCenter}
            className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-brand-surface rounded-xl transition-all text-brand-text-muted hover:text-brand-primary"
            title={isRtl ? 'مركز المساعدة' : 'Help Center'}
          >
            <BookOpen size={20} />
          </HapticButton>

          {features.aiChat && (
            <HapticButton
              onClick={onVisualSearch}
              className="group relative hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-primary via-brand-primary to-brand-teal text-white rounded-xl shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/40 transition-all duration-500 hover:scale-105 active:scale-95 overflow-hidden border border-white/20"
              title={isRtl ? 'المساعد الذكي والبحث البصري' : 'AI Assistant & Visual Search'}
            >
              {/* Animated Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              
              <div className="relative flex items-center gap-2">
                <div className="relative">
                  <Bot size={20} className="relative z-10" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-white/30 blur-md rounded-full"
                  />
                </div>
                <Sparkles size={16} className="text-white/80 animate-pulse" />
                <span className="hidden xl:block text-xs font-black tracking-wider uppercase">
                  {isRtl ? 'الذكاء الاصطناعي' : 'AI Hub'}
                </span>
              </div>
            </HapticButton>
          )}

          <HapticButton 
            onClick={() => setView('chat')}
            className={`hidden md:flex w-10 h-10 items-center justify-center hover:bg-brand-surface rounded-xl transition-all ${currentView === 'chat' ? 'text-brand-primary bg-brand-primary/10' : 'text-brand-text-muted hover:text-brand-primary'}`}
            title={t('chat_hub')}
          >
            <MessageSquare size={20} />
          </HapticButton>

          {profile ? (
            <div className="flex items-center gap-2 md:gap-4">
              <NotificationDropdown 
                isOpen={showNotifications}
                setIsOpen={setShowNotifications}
                notifications={notifications}
                unreadCount={unreadCount}
                isRtl={isRtl}
                onNotificationClick={onNotificationClick}
                notifRef={notifRef}
              />

              <HapticButton
                onClick={onMobileMenuOpen}
                className="w-10 h-10 rounded-xl overflow-hidden border-2 border-brand-primary/20 hover:border-brand-primary transition-all shadow-sm"
              >
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <User size={20} />
                  </div>
                )}
              </HapticButton>
            </div>
          ) : (
            <HapticButton 
              onClick={() => setView('role-selection')}
              className="hidden md:block bg-brand-primary text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20"
            >
              {t('login')}
            </HapticButton>
          )}

          {!profile && (
            <HapticButton 
              onClick={onMobileMenuOpen}
              className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-brand-surface rounded-xl text-brand-text-muted transition-all border border-brand-border"
            >
              <Menu size={24} />
            </HapticButton>
          )}
        </div>
      </div>
    </header>
  );
};
