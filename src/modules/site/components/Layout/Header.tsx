import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Building2, Home as HomeIcon, LayoutDashboard, Megaphone, ShoppingBag, User, Sparkles, MapPin, Globe, Bell, Menu, UploadCloud, Bot, MessageSquare, BookOpen, Zap, ShieldCheck, LogOut, Settings, User as UserIcon, Search, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { useBranding } from '../../../../core/providers/BrandingProvider';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { NotificationDropdown } from './NotificationDropdown';
import { BentoMenu } from './BentoMenu';
import { auth } from '../../../../core/firebase';
import { getUserImageUrl } from '../../../../core/utils/imageUtils';
import { UserProfile, AppFeatures, UserRole, Notification, SiteSettings } from '../../../../core/types';

interface HeaderProps {
  settings: SiteSettings | null;
  siteLogo: string;
  siteName: string;
  logoScale: number;
  animationSpeed: 'slow' | 'normal' | 'fast';
  currentView: string;
  setView: (view: any) => void;
  dashboardTab?: string;
  setDashboardTab?: (tab: string) => void;
  profile: UserProfile | null;
  viewMode: UserRole;
  setViewMode: (mode: UserRole) => void;
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
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  siteLogo,
  siteName,
  logoScale,
  animationSpeed,
  currentView,
  setView,
  dashboardTab,
  setDashboardTab,
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
  notifRef,
  onBack,
}) => {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useBranding();

  const getSpeed = () => {
    switch (animationSpeed) {
      case 'slow': return 4;
      case 'fast': return 1.5;
      default: return 2.5;
    }
  };

  return (
    <header className="fixed top-2 md:top-4 left-2 md:left-4 right-2 md:right-4 z-50 pointer-events-none flex justify-center">
      <motion.div 
        layout
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-effect flex items-center gap-1.5 md:gap-2 p-1 md:p-2 rounded-[2rem] shadow-premium max-w-full md:max-w-2xl w-full md:w-auto pointer-events-auto relative group/header"
      >
        {/* Animated Border Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 via-brand-teal/5 to-brand-primary/5 opacity-0 group-hover/header:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[2rem]" />
        
        {/* Back Button */}
        {onBack && (
          <HapticButton
            onClick={onBack}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-brand-surface/50 border border-brand-border shadow-sm relative z-10 hover:bg-brand-primary hover:text-white transition-all group/back"
          >
            {isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            <span className={`absolute ${isRtl ? 'right-12' : 'left-12'} whitespace-nowrap text-xs font-bold opacity-0 group-hover/back:opacity-100 transition-opacity pointer-events-none bg-brand-surface px-2 py-1 rounded-md border border-brand-border shadow-sm`}>
              {isRtl ? 'رجوع' : 'Back'}
            </span>
          </HapticButton>
        )}

        {/* Profile / Login */}
        <div className="relative shrink-0">
          {profile ? (
            <HapticButton
              onClick={() => setView('profile')}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm relative z-10 hover:ring-2 hover:ring-brand-primary/20 transition-all"
              style={{ transform: `scale(${logoScale})` }}
            >
              <img src={getUserImageUrl(profile)} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              {/* Online Status Pulse */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full z-20" />
            </HapticButton>
          ) : (
            <HapticButton 
              onClick={() => setView('role-selection')}
              className="px-4 h-10 rounded-full bg-brand-primary text-white flex items-center gap-2 shadow-lg shadow-brand-primary/20 relative z-10 transition-all hover:scale-105 active:scale-95"
              style={{ transform: `scale(${logoScale})` }}
            >
              <UserIcon size={16} />
              <span className="text-xs font-bold whitespace-nowrap">
                {isRtl ? 'دخول' : 'Login'}
              </span>
            </HapticButton>
          )}
        </div>

        {/* Smart AI Search / Context */}
        <HapticButton 
          onClick={onVisualSearch}
          className="flex-1 flex flex-col justify-center px-2 md:px-3 py-1 text-left rtl:text-right relative z-10 hover:bg-brand-primary/5 rounded-2xl transition-colors group/search overflow-hidden"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand-primary shrink-0 group-hover/search:animate-bounce" />
            <span className="text-xs md:text-sm font-bold text-brand-text-main truncate">
              {isRtl ? 'كيف أساعدك اليوم؟' : 'How can I help today?'}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={8} className="text-brand-text-muted shrink-0" />
            <span className="text-[8px] md:text-[10px] font-medium text-brand-text-muted truncate max-w-[80px] sm:max-w-[120px] md:max-w-[180px]">
              {isLoadingLocation ? (isRtl ? 'تحديد الموقع...' : 'Locating...') : locationName || (isRtl ? 'موقع غير معروف' : 'Unknown')}
            </span>
          </div>
        </HapticButton>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 pr-1 rtl:pl-1 rtl:pr-0 relative z-10">
          {/* Dark Mode Toggle */}
          <HapticButton 
            onClick={toggleDarkMode}
            className="w-10 h-10 flex items-center justify-center hover:bg-brand-surface rounded-full transition-all text-brand-text-muted hover:text-brand-primary border border-brand-border"
            title={isRtl ? 'تبديل الوضع' : 'Toggle Theme'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </HapticButton>

          {/* Language Toggle */}
          <HapticButton 
            onClick={toggleLanguage}
            className="w-10 h-10 flex items-center justify-center hover:bg-brand-surface rounded-full transition-all text-brand-text-muted hover:text-brand-primary"
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
            dashboardTab={dashboardTab}
            setDashboardTab={setDashboardTab}
            viewMode={viewMode}
            setViewMode={setViewMode}
            isRtl={isRtl}
            onLogout={() => auth.signOut().catch(err => {
              toast.error(isRtl ? 'فشل تسجيل الخروج' : 'Sign out failed');
            })}
          />
        </div>
      </motion.div>
    </header>
  );
};

