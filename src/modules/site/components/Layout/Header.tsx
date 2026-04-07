import React, { useState, useRef, useEffect } from 'react';
import { Building2, Home as HomeIcon, LayoutDashboard, Megaphone, ShoppingBag, User, Sparkles, MapPin, Globe, Bell, Menu, UploadCloud, Bot, MessageSquare, BookOpen, Zap, ShieldCheck, LogOut, Settings, User as UserIcon, Search } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { UserProfile, AppFeatures, Notification } from '../../../../core/types';
import { useTranslation } from 'react-i18next';
import { BentoMenu } from './BentoMenu';
import { NotificationDropdown } from './NotificationDropdown';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { auth } from '../../../../core/firebase';

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
    <header className="fixed top-4 left-4 right-4 z-50 pointer-events-none flex justify-center">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="pointer-events-auto w-full max-w-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/50 dark:border-gray-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-[2rem] p-1.5 flex items-center gap-2 relative group"
      >
        {/* Subtle AI Gradient Background */}
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 via-transparent to-brand-teal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Profile / Login */}
        {profile ? (
          <HapticButton
            onClick={() => setView('profile')}
            className="w-10 h-10 shrink-0 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm relative z-10"
          >
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <UserIcon size={18} />
              </div>
            )}
          </HapticButton>
        ) : (
          <HapticButton 
            onClick={() => setView('role-selection')}
            className="w-10 h-10 shrink-0 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-sm relative z-10"
          >
            <UserIcon size={18} />
          </HapticButton>
        )}

        {/* Smart AI Search / Context */}
        <HapticButton 
          onClick={onVisualSearch}
          className="flex-1 flex flex-col justify-center px-2 py-1 text-left rtl:text-right relative z-10"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand-primary animate-pulse" />
            <span className="text-sm font-bold text-brand-text-main">
              {isRtl ? 'كيف أساعدك اليوم؟' : 'How can I help today?'}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={10} className="text-brand-text-muted" />
            <span className="text-[10px] font-medium text-brand-text-muted truncate max-w-[150px]">
              {isLoadingLocation ? (isRtl ? 'تحديد الموقع...' : 'Locating...') : locationName || (isRtl ? 'موقع غير معروف' : 'Unknown')}
            </span>
          </div>
        </HapticButton>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 pr-1 rtl:pl-1 rtl:pr-0 relative z-10">
          {/* Language Toggle */}
          <HapticButton 
            onClick={toggleLanguage}
            className="w-9 h-9 flex items-center justify-center hover:bg-brand-surface rounded-full transition-all text-brand-text-muted hover:text-brand-primary"
            title={isRtl ? 'تبديل اللغة' : 'Toggle Language'}
          >
            <Globe size={18} />
          </HapticButton>

          {/* Notifications */}
          {profile && (
            <NotificationDropdown 
              isOpen={showNotifications}
              setIsOpen={setShowNotifications}
              notifications={notifications}
              unreadCount={unreadCount}
              isRtl={isRtl}
              onNotificationClick={onNotificationClick}
              notifRef={notifRef}
            />
          )}

          {/* Bento Menu */}
          <BentoMenu 
            profile={profile}
            features={features}
            currentView={currentView}
            setView={setView}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isRtl={isRtl}
            onLogout={() => auth.signOut()}
          />
        </div>
      </motion.div>
    </header>
  );
};

