import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../../../i18n';
import { UserProfile, Notification, SiteSettings, AppFeatures, Category, UserRole } from '../../../../core/types';
import { ArrowUp, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db } from '../../../../core/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy, updateDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../../core/utils/errorHandling';
import { soundService, SoundType } from '../../../../core/utils/soundService';
import { useNearbySuppliers } from '../../../../shared/hooks/useNearbySuppliers';
import { useScrollDirection } from '../../../../shared/hooks/useScrollDirection';
import { useBranding } from '../../../../core/providers/BrandingProvider';
import { PremiumVisualSearchModal } from '../../../../shared/components/PremiumVisualSearchModal';
import { NotificationModal } from '../../../../shared/components/NotificationModal';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { GlobalProgress } from '../../../../shared/components/GlobalProgress';

import { AIActionHub } from './AIActionHub';
import { Header } from './Header';
import { MobileMenu } from './MobileMenu';
import { BottomNav } from './BottomNav';
import HelpCenter from '../HelpCenter';

interface LayoutProps {
  children: React.ReactNode;
  settings: SiteSettings | null;
  profile: UserProfile | null;
  features: AppFeatures;
  currentView: string;
  setView: (view: any) => void;
  setActiveChatId: (id: string | null) => void;
  onBack?: () => void;
  dashboardTab?: string;
  setDashboardTab?: (tab: string) => void;
  viewMode: UserRole;
  setViewMode: (mode: UserRole) => void;
  uiStyle: 'classic' | 'minimal';
  setUiStyle: (style: 'classic' | 'minimal') => void;
  onPrefetch?: (view: string) => void;
  chatUnreadCount?: number;
  progress?: number | null;
  isMomentOfNeed?: boolean;
  onOpenNotifications?: () => void;
  notificationsUnreadCount?: number;
}

import { useAuth } from '../../../../core/providers/AuthProvider';
import { useSettings } from '../../../../core/providers/SettingsProvider';
import { useCategories } from '../../../../core/providers/CategoryProvider';

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  setView,
  setActiveChatId,
  onBack,
  dashboardTab = 'overview',
  setDashboardTab,
  uiStyle,
  setUiStyle,
  onPrefetch,
  chatUnreadCount = 0,
  progress = null,
  isMomentOfNeed = false,
  onOpenNotifications,
  notificationsUnreadCount = 0
}) => {
  const { t } = useTranslation();
  const { profile, viewMode, setViewMode } = useAuth();
  const { settings, features } = useSettings();
  const { categories } = useCategories();
  const { isDarkMode, toggleDarkMode } = useBranding();
  const isRtl = i18nInstance.language === 'ar';
  
  const [siteLogo, setSiteLogo] = useState(settings?.logoUrl || '');
  const [siteName, setSiteName] = useState(settings?.siteName || '');
  const [logoScale, setLogoScale] = useState(settings?.logoScale ?? 1);

  // Header specific settings
  const [headerLogoScale, setHeaderLogoScale] = useState(settings?.headerLogoScale ?? settings?.logoScale ?? 1);
  const [headerAnimationSpeed, setHeaderAnimationSpeed] = useState<'slow' | 'normal' | 'fast'>(settings?.headerAnimationSpeed ?? settings?.animationSpeed ?? 'normal');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [visualSearchMode, setVisualSearchMode] = useState<'camera' | 'gallery' | null>(null);
  const [isAIHubOpen, setIsAIHubOpen] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  
  const mainRef = useRef<HTMLElement>(null);
  const scrollDirection = useScrollDirection(mainRef);
  const lastNotificationId = useRef<string | null>(null);
  const isInitialNotifLoad = useRef(true);
  const notifRef = useRef<HTMLDivElement>(null);

  // Sync with settings provider
  useEffect(() => {
    if (settings) {
      setSiteLogo(settings.logoUrl || '');
      setSiteName(settings.siteName || '');
      setLogoScale(settings.logoScale ?? 1);
      setHeaderLogoScale(settings.headerLogoScale ?? settings.logoScale ?? 1);
      setHeaderAnimationSpeed(settings.headerAnimationSpeed ?? settings.animationSpeed ?? 'normal');
    }
  }, [settings]);

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        setShowBackToTop(mainRef.current.scrollTop > 400);
      }
    };
    
    const mainElement = mainRef.current;
    if (mainElement) {
      mainElement.addEventListener('scroll', handleScroll);
      return () => mainElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useNearbySuppliers(profile);

  useEffect(() => {
    const fetchLocation = () => {
      if (navigator.geolocation) {
        setIsLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${i18nInstance.language}`);
              const data = await response.json();
              const state = data.address?.state || data.address?.region || data.address?.city || data.address?.county;
              setLocationName(state || (i18nInstance.language === 'ar' ? 'موقع غير معروف' : 'Unknown Location'));
            } catch (error) {
              toast.error(i18nInstance.language === 'ar' ? 'فشل جلب الموقع' : 'Failed to fetch location');
              setLocationName(i18nInstance.language === 'ar' ? 'تعذر تحديد الموقع' : 'Location unavailable');
            } finally {
              setIsLoadingLocation(false);
            }
          },
          (error) => {
            toast.error(i18nInstance.language === 'ar' ? 'خطأ في تحديد الموقع' : 'Geolocation error');
            setLocationName(i18nInstance.language === 'ar' ? 'تعذر تحديد الموقع' : 'Location unavailable');
            setIsLoadingLocation(false);
          }
        );
      } else {
        setLocationName(i18nInstance.language === 'ar' ? 'غير مدعوم' : 'Not supported');
      }
    };
    fetchLocation();
  }, [i18nInstance.language]);

  useEffect(() => {
    const handlePreview = (e: any) => {
      const data = e.detail;
      if (data.logoUrl !== undefined) setSiteLogo(data.logoUrl);
      if (data.siteName !== undefined) setSiteName(data.siteName);
      if (data.logoScale !== undefined) setLogoScale(data.logoScale);

      // Header specific preview
      if (data.headerLogoScale !== undefined) setHeaderLogoScale(data.headerLogoScale);
      if (data.headerAnimationSpeed !== undefined) setHeaderAnimationSpeed(data.headerAnimationSpeed);
    };
    window.addEventListener('site-settings-preview', handlePreview);
    return () => window.removeEventListener('site-settings-preview', handlePreview);
  }, []);

  useEffect(() => {
    if (!profile || auth.currentUser?.isAnonymous) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      console.log('Notifications:', snap.docs.map(d => d.data()));
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
      if (!isInitialNotifLoad.current && notifs.length > 0) {
        const latest = notifs[0];
        if (latest.id !== lastNotificationId.current && !latest.read) {
          soundService.play(SoundType.NOTIFICATION);
        }
      }
      if (notifs.length > 0) {
        lastNotificationId.current = notifs[0].id;
      }
      isInitialNotifLoad.current = false;
      setNotifications(notifs);
    }, (error) => {
      console.error('Firestore Error in notifications listener:', error);
      handleFirestoreError(error, OperationType.LIST, 'notifications', false);
    });
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        // No-op - notifications handled globally in App.tsx
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`, false);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    await markAsRead(n.id);
    if (n.imageUrl) {
      setSelectedNotification(n);
      return;
    }
    if (n.actionType === 'submit_offer') {
      setView('dashboard');
      setDashboardTab?.('overview');
    } else if (n.actionType === 'accept_chat') {
      if (n.targetId) {
        setActiveChatId(n.targetId);
        setView('chat');
      }
    } else if (n.link) {
      setView(n.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleLanguage = () => {
    const newLang = i18nInstance.language === 'ar' ? 'en' : 'ar';
    i18nInstance.changeLanguage(newLang).catch(err => {
      toast.error(newLang === 'ar' ? 'فشل تغيير اللغة' : 'Language change failed');
    });
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <div className={`viewport-height flex flex-col bg-brand-background text-brand-text-main font-sans ${isRtl ? 'font-arabic' : ''} transition-colors duration-300 overflow-hidden`}>
      <GlobalProgress progress={progress} />
      <div className="z-50">
        <Header 
          settings={settings}
          siteLogo={siteLogo}
          siteName={siteName}
          logoScale={headerLogoScale}
          animationSpeed={headerAnimationSpeed}
          currentView={currentView}
          setView={setView}
          dashboardTab={dashboardTab}
          setDashboardTab={setDashboardTab}
          profile={profile}
          viewMode={viewMode}
          setViewMode={setViewMode}
          uiStyle={uiStyle}
          setUiStyle={setUiStyle}
          features={features}
          isRtl={isRtl}
          toggleLanguage={toggleLanguage}
          isLoadingLocation={isLoadingLocation}
          locationName={locationName}
          unreadCount={notificationsUnreadCount}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onVisualSearch={() => {
            if (window.innerWidth < 768) {
              setIsAIHubOpen(true);
            } else {
              setIsVisualSearchOpen(true);
            }
          }}
          onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
          onOpenHelpCenter={() => setShowHelpCenter(true)}
          onOpenNotifications={onOpenNotifications}
          notifRef={notifRef}
          onBack={currentView !== 'home' ? onBack : undefined}
        />
      </div>

      {auth.currentUser && !auth.currentUser.emailVerified && (
        <div className="bg-brand-warning/10 border-b border-brand-warning/20 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-brand-warning">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">
              {isRtl 
                ? 'يرجى تفعيل بريدك الإلكتروني للوصول الكامل للمميزات.' 
                : 'Please verify your email to access all features.'}
            </p>
          </div>
          <button 
            onClick={() => {
              if (auth.currentUser) {
                sendEmailVerification(auth.currentUser)
                  .then(() => {
                    soundService.play(SoundType.SUCCESS);
                    toast.success(isRtl ? 'تم إرسال رابط التفعيل' : 'Verification link sent');
                  })
                  .catch(err => {
                    handleFirestoreError(err, OperationType.WRITE, 'auth/email-verification', false);
                  });
              }
            }}
            className="text-sm font-bold text-brand-warning hover:underline"
          >
            {isRtl ? 'إعادة إرسال الرابط' : 'Resend verification link'}
          </button>
        </div>
      )}

      <main ref={mainRef} className={`flex-1 overflow-y-auto no-scrollbar relative pt-16 md:pt-20 ${currentView !== 'chat' ? 'pb-32 md:pb-0' : ''}`}>
        <div className="max-w-[2000px] mx-auto px-4 md:px-8">
          {children}
        </div>
      </main>

      <MobileMenu 
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
        profile={profile}
        features={features}
        currentView={currentView}
        setView={setView}
        viewMode={viewMode}
        setViewMode={setViewMode}
        dashboardTab={dashboardTab}
        setDashboardTab={setDashboardTab}
        isRtl={isRtl}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        toggleLanguage={toggleLanguage}
        siteLogo={siteLogo}
        siteName={siteName}
        logoScale={headerLogoScale}
        onPrefetch={onPrefetch}
        onVisualSearch={() => setIsAIHubOpen(true)}
        onOpenHelpCenter={() => setShowHelpCenter(true)}
      />

      {currentView !== 'chat' && !isAIHubOpen && !isVisualSearchOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] md:hidden">
          <BottomNav 
            currentView={currentView}
            setView={setView}
            dashboardTab={dashboardTab}
            setDashboardTab={setDashboardTab}
            isRtl={isRtl}
            unreadCount={chatUnreadCount}
            scrollDirection={scrollDirection}
            onVisualSearch={() => setIsAIHubOpen(true)}
            onToggleNotifications={onOpenNotifications || (() => {})}
            onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
            showNotifications={false}
            onPrefetch={onPrefetch}
            viewMode={viewMode}
          />
        </div>
      )}

      <AnimatePresence>
        {showBackToTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            className={`fixed bottom-56 md:bottom-32 ${isRtl ? 'left-6' : 'right-6'} z-40`}
          >
            <HapticButton
              onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-12 h-12 bg-brand-primary text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform group relative"
              title={i18nInstance.language === 'ar' ? 'الرجوع للأعلى' : 'Back to Top'}
            >
              <ArrowUp size={24} />
              <span className="absolute right-full mr-4 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
                {i18nInstance.language === 'ar' ? 'الرجوع للأعلى' : 'Back to Top'}
              </span>
            </HapticButton>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisualSearchOpen && (
          <PremiumVisualSearchModal 
            isOpen={isVisualSearchOpen} 
            onClose={() => {
              setIsVisualSearchOpen(false);
              setVisualSearchMode(null);
            }} 
            categories={categories}
            allSuppliers={[]} // Optimized: Fetching suppliers on demand inside the modal if needed
            profile={profile}
            initialMode={visualSearchMode}
            onStartChat={(requestId, supplierId, customerId) => {
              setActiveChatId(requestId);
              setView('chat');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAIHubOpen && (
          <AIActionHub 
            isOpen={isAIHubOpen}
            onClose={() => setIsAIHubOpen(false)}
            isRtl={isRtl}
            onAction={(action) => {
              if (action === 'camera' || action === 'gallery') {
                setVisualSearchMode(action);
                setIsVisualSearchOpen(true);
              } else if (action === 'chat') {
                setView('chat');
              } else if (action === 'voice') {
                setView('home');
              } else if (action === 'request') {
                setView('marketplace');
                setDashboardTab?.('requests');
              }
            }}
          />
        )}
      </AnimatePresence>

      {selectedNotification && (
        <NotificationModal 
          notification={selectedNotification} 
          onClose={() => setSelectedNotification(null)} 
          isRtl={isRtl}
        />
      )}

      <AnimatePresence>
        {showHelpCenter && (
          <HelpCenter 
            onClose={() => setShowHelpCenter(false)} 
            isRtl={isRtl} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
