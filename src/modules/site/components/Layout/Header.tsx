import React from 'react';
import { Building2, Home as HomeIcon, LayoutDashboard, Megaphone, ShoppingBag, User, Sparkles, MapPin, Globe, Sun, Moon, Bell, Menu } from 'lucide-react';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { UserProfile, AppFeatures, Notification } from '../../../../core/types';
import { useTranslation } from 'react-i18next';
import { NotificationDropdown } from './NotificationDropdown';
import { ProfileMenu } from './ProfileMenu';

interface HeaderProps {
  siteLogo: string;
  siteName: string;
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
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  toggleLanguage: () => void;
  isLoadingLocation: boolean;
  locationName: string | null;
  unreadCount: number;
  notifications: Notification[];
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  onNotificationClick: (n: Notification) => void;
  onVisualSearch: () => void;
  onMobileMenuOpen: () => void;
  profileRef: React.RefObject<HTMLDivElement>;
  notifRef: React.RefObject<HTMLDivElement>;
}

export const Header: React.FC<HeaderProps> = ({
  siteLogo,
  siteName,
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
  isDarkMode,
  toggleDarkMode,
  toggleLanguage,
  isLoadingLocation,
  locationName,
  unreadCount,
  notifications,
  showNotifications,
  setShowNotifications,
  showProfileMenu,
  setShowProfileMenu,
  onNotificationClick,
  onVisualSearch,
  onMobileMenuOpen,
  notifRef,
  profileRef
}) => {
  const { t, i18n } = useTranslation();

  return (
    <header className="border-b border-white/10 dark:border-gray-800/30 px-4 md:px-8 py-4 sticky top-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-3xl z-50 transition-all duration-500 shadow-sm shadow-brand-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setView('home')}
          >
            {siteLogo ? (
              <img 
                src={siteLogo} 
                alt="Logo" 
                className="h-10 md:h-12 w-auto object-contain transition-transform group-hover:scale-105" 
                style={{ imageRendering: '-webkit-optimize-contrast' }}
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="p-2.5 bg-brand-primary rounded-xl text-white group-hover:bg-brand-primary-hover transition-all shadow-sm shadow-brand-primary/20">
                <Building2 size={22} />
              </div>
            )}
            <span className="hidden sm:inline font-extrabold text-brand-text-main text-xl tracking-tight">
              {siteName || 'B2B Connect'}
            </span>
          </div>

          {uiStyle !== 'minimal' || currentView !== 'home' ? (
            <nav className="hidden md:flex items-center gap-1 bg-brand-background/50 p-1 rounded-2xl border border-brand-border/50">
              <button 
                onClick={() => setView('home')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'home' ? 'bg-brand-surface text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text-main'}`}
              >
                <HomeIcon size={18} />
                {t('home')}
              </button>
              
              <button 
                onClick={() => { setView('dashboard'); setSupplierTab?.('dashboard'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'dashboard' && supplierTab === 'dashboard' ? 'bg-brand-surface text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text-main'}`}
              >
                <LayoutDashboard size={18} />
                {t('dashboard')}
              </button>

              {profile && viewMode !== 'admin' && (
                <button 
                  onClick={() => { setView('dashboard'); setSupplierTab?.('marketing'); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'dashboard' && supplierTab === 'marketing' ? 'bg-brand-surface text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text-main'}`}
                >
                  <Megaphone size={18} />
                  {isRtl ? 'التسويق' : 'Marketing'}
                </button>
              )}

              {features.marketplace && (
                <button 
                  onClick={() => setView('marketplace')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'marketplace' ? 'bg-brand-surface text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text-main'}`}
                >
                  <ShoppingBag size={18} />
                  {t('marketplace')}
                </button>
              )}

              <button 
                onClick={() => setView('profile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${currentView === 'profile' ? 'bg-brand-surface text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text-main'}`}
              >
                <User size={18} />
                {t('profile')}
              </button>

              <HapticButton 
                onClick={onVisualSearch}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-gradient-to-r from-brand-primary to-brand-teal text-white shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all ml-2"
              >
                <Sparkles size={18} />
                {isRtl ? 'البحث البصري' : 'Visual Search'}
                <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Premium</span>
              </HapticButton>
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {uiStyle !== 'minimal' || currentView !== 'home' ? (
            <>
              <div 
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-brand-surface rounded-xl border border-brand-border"
              >
                <MapPin size={14} className="text-brand-primary" />
                <span className="text-[10px] md:text-xs font-semibold text-brand-text-muted truncate max-w-[80px] md:max-w-none">
                  {isLoadingLocation ? (
                    i18n.language === 'ar' ? 'جاري...' : 'Locating...'
                  ) : locationName || (i18n.language === 'ar' ? 'موقع غير معروف' : 'Unknown')}
                </span>
              </div>

              <HapticButton 
                onClick={toggleLanguage}
                className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-brand-surface rounded-xl transition-all text-brand-text-muted hover:text-brand-primary border border-transparent hover:border-brand-border"
              >
                <Globe size={20} />
              </HapticButton>

              <HapticButton 
                onClick={toggleDarkMode}
                className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-brand-surface rounded-xl transition-all text-brand-text-muted hover:text-brand-primary border border-transparent hover:border-brand-border"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </HapticButton>
            </>
          ) : null}

          <HapticButton 
            onClick={toggleDarkMode}
            className="flex md:hidden w-10 h-10 items-center justify-center hover:bg-brand-surface rounded-xl transition-all text-brand-text-muted hover:text-brand-primary border border-transparent hover:border-brand-border"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
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

              <ProfileMenu 
                isOpen={showProfileMenu}
                setIsOpen={setShowProfileMenu}
                profile={profile}
                isRtl={isRtl}
                setView={setView}
                viewMode={viewMode as 'admin' | 'supplier' | 'customer'}
                setViewMode={setViewMode}
                uiStyle={uiStyle}
                setUiStyle={setUiStyle}
                profileRef={profileRef}
              />
            </div>
          ) : (
            <HapticButton 
              onClick={() => setView('role-selection')}
              className="hidden md:block bg-brand-primary text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20"
            >
              {t('login')}
            </HapticButton>
          )}

          <HapticButton 
            onClick={onMobileMenuOpen}
            className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-brand-background rounded-xl text-brand-text-muted transition-all border border-brand-border"
          >
            <Menu size={24} />
          </HapticButton>
        </div>
      </div>
    </header>
  );
};
