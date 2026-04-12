import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../../../i18n';
import { UserProfile, Notification, AppFeatures, Category, UserRole } from '../../../../core/types';
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
import { NeuralPulse } from '../NeuralPulse';
import { GlobalProgress } from '../../../../shared/components/GlobalProgress';

import { AIActionHub } from './AIActionHub';
import { Header } from './Header';
import { MobileMenu } from './MobileMenu';
import { BottomNav } from './BottomNav';
import HelpCenter from '../HelpCenter';

interface LayoutProps {
  children: React.ReactNode;
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
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  profile, 
  features,
  currentView, 
  setView,
  setActiveChatId,
  onBack,
  dashboardTab = 'overview',
  setDashboardTab,
  viewMode,
  setViewMode,
  uiStyle,
  setUiStyle,
  onPrefetch,
  chatUnreadCount = 0,
  progress = null,
  isMomentOfNeed = false
}) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useBranding();
  const isRtl = i18nInstance.language === 'ar';
  
  const [siteLogo, setSiteLogo] = useState('');
  const [siteName, setSiteName] = useState('');
  const [logoAuraColor, setLogoAuraColor] = useState('#1b97a7');
  const [logoAuraBlur, setLogoAuraBlur] = useState(20);
  const [logoAuraSpread, setLogoAuraSpread] = useState(1.2);
  const [logoAuraOpacity, setLogoAuraOpacity] = useState(0.4);
  const [logoAuraStyle, setLogoAuraStyle] = useState<'solid' | 'gradient' | 'pulse' | 'mesh'>('solid');
  const [logoAuraSharpness, setLogoAuraSharpness] = useState(50);
  const [logoScale, setLogoScale] = useState(1);
  const [showNeuralLogo, setShowNeuralLogo] = useState(true);

  // Header specific settings
  const [headerLogoAuraColor, setHeaderLogoAuraColor] = useState('#1b97a7');
  const [headerLogoAuraBlur, setHeaderLogoAuraBlur] = useState(20);
  const [headerLogoAuraSpread, setHeaderLogoAuraSpread] = useState(1.2);
  const [headerLogoAuraOpacity, setHeaderLogoAuraOpacity] = useState(0.4);
  const [headerLogoAuraStyle, setHeaderLogoAuraStyle] = useState<'solid' | 'gradient' | 'pulse' | 'mesh'>('solid');
  const [headerLogoAuraSharpness, setHeaderLogoAuraSharpness] = useState(50);
  const [headerLogoScale, setHeaderLogoScale] = useState(1);
  const [headerShowNeuralLogo, setHeaderShowNeuralLogo] = useState(true);
  const [enableNeuralPulse, setEnableNeuralPulse] = useState(true);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [visualSearchMode, setVisualSearchMode] = useState<'camera' | 'gallery' | null>(null);
  const [isAIHubOpen, setIsAIHubOpen] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const mainRef = useRef<HTMLElement>(null);
  const scrollDirection = useScrollDirection(mainRef);
  const lastNotificationId = useRef<string | null>(null);
  const isInitialNotifLoad = useRef(true);
  const notifRef = useRef<HTMLDivElement>(null);

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
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, (error) => {
      console.error('Firestore Error in categories listener:', error);
      handleFirestoreError(error, OperationType.LIST, 'categories', false);
    });
    return () => unsub();
  }, []);

  // Sync Role to Custom Claims for performance & security
  useEffect(() => {
    let isMounted = true;
    const syncRole = async () => {
      if (!profile || !auth.currentUser) return;
      
      // Check if we already tried and failed recently to avoid infinite loops
      const lastSyncError = sessionStorage.getItem('last_role_sync_error');
      if (lastSyncError && Date.now() - parseInt(lastSyncError) < 60000) return;

      try {
        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch('/api/sync-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ role: profile.role })
        });
        
        if (response.ok) {
          if (!isMounted) return;
          const data = await response.json();
          if (data.warning === "Identity Toolkit API disabled") {
            console.warn('Custom roles (Custom Claims) are currently disabled. System will fallback to Firestore rules checks.');
          } else {
            // Force token refresh to pick up new claims
            await auth.currentUser.getIdToken(true);
            console.log('Role synced to custom claims successfully');
          }
          sessionStorage.removeItem('last_role_sync_error');
        } else {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            if (errorData.error === "Identity Toolkit API disabled") {
              console.warn('Custom roles (Custom Claims) are currently disabled. System will fallback to Firestore rules checks.');
              sessionStorage.setItem('last_role_sync_error', Date.now().toString());
            }
          } else {
            console.warn('Server returned non-JSON response for role sync. Server might be restarting.');
          }
        }
      } catch (error) {
        console.error('Failed to sync role to custom claims:', error);
        sessionStorage.setItem('last_role_sync_error', Date.now().toString());
      }
    };

    syncRole();
    return () => { isMounted = false; };
  }, [profile?.role, auth.currentUser?.uid]);

  useEffect(() => {
    const handlePreview = (e: any) => {
      const data = e.detail;
      if (data.logoUrl !== undefined) setSiteLogo(data.logoUrl);
      if (data.siteName !== undefined) setSiteName(data.siteName);
      if (data.logoAuraColor !== undefined) setLogoAuraColor(data.logoAuraColor);
      if (data.logoAuraBlur !== undefined) setLogoAuraBlur(data.logoAuraBlur);
      if (data.logoAuraSpread !== undefined) setLogoAuraSpread(data.logoAuraSpread);
      if (data.logoAuraOpacity !== undefined) setLogoAuraOpacity(data.logoAuraOpacity);
      if (data.logoAuraStyle !== undefined) setLogoAuraStyle(data.logoAuraStyle);
      if (data.logoAuraSharpness !== undefined) setLogoAuraSharpness(data.logoAuraSharpness);
      if (data.logoScale !== undefined) setLogoScale(data.logoScale);
      if (data.showNeuralLogo !== undefined) setShowNeuralLogo(data.showNeuralLogo);

      // Header specific preview
      if (data.headerLogoAuraColor !== undefined) setHeaderLogoAuraColor(data.headerLogoAuraColor);
      if (data.headerLogoAuraBlur !== undefined) setHeaderLogoAuraBlur(data.headerLogoAuraBlur);
      if (data.headerLogoAuraSpread !== undefined) setHeaderLogoAuraSpread(data.headerLogoAuraSpread);
      if (data.headerLogoAuraOpacity !== undefined) setHeaderLogoAuraOpacity(data.headerLogoAuraOpacity);
      if (data.headerLogoAuraStyle !== undefined) setHeaderLogoAuraStyle(data.headerLogoAuraStyle);
      if (data.headerLogoAuraSharpness !== undefined) setHeaderLogoAuraSharpness(data.headerLogoAuraSharpness);
      if (data.headerLogoScale !== undefined) setHeaderLogoScale(data.headerLogoScale);
      if (data.headerShowNeuralLogo !== undefined) setHeaderShowNeuralLogo(data.headerShowNeuralLogo);
      if (data.enableNeuralPulse !== undefined) setEnableNeuralPulse(data.enableNeuralPulse);
    };
    window.addEventListener('site-settings-preview', handlePreview);
    return () => window.removeEventListener('site-settings-preview', handlePreview);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSiteLogo(data.logoUrl || '');
        setSiteName(data.siteName || '');
        setLogoAuraColor(data.logoAuraColor || '#1b97a7');
        setLogoAuraBlur(data.logoAuraBlur ?? 20);
        setLogoAuraSpread(data.logoAuraSpread ?? 1.2);
        setLogoAuraOpacity(data.logoAuraOpacity ?? 0.4);
        setLogoAuraStyle(data.logoAuraStyle || 'solid');
        setLogoAuraSharpness(data.logoAuraSharpness ?? 50);
        setLogoScale(data.logoScale ?? 1);
        setShowNeuralLogo(data.showNeuralLogo ?? true);

        // Header specific
        setHeaderLogoAuraColor(data.headerLogoAuraColor || data.logoAuraColor || '#1b97a7');
        setHeaderLogoAuraBlur(data.headerLogoAuraBlur ?? data.logoAuraBlur ?? 20);
        setHeaderLogoAuraSpread(data.headerLogoAuraSpread ?? data.logoAuraSpread ?? 1.2);
        setHeaderLogoAuraOpacity(data.headerLogoAuraOpacity ?? data.logoAuraOpacity ?? 0.4);
        setHeaderLogoAuraStyle(data.headerLogoAuraStyle || data.logoAuraStyle || 'solid');
        setHeaderLogoAuraSharpness(data.headerLogoAuraSharpness ?? data.logoAuraSharpness ?? 50);
        setHeaderLogoScale(data.headerLogoScale ?? data.logoScale ?? 1);
        setHeaderShowNeuralLogo(data.headerShowNeuralLogo ?? data.showNeuralLogo ?? true);
        setEnableNeuralPulse(data.enableNeuralPulse ?? true);
      }
    }, (error) => {
      console.error('Firestore Error in settings/site listener:', error);
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
    });
    return () => unsub();
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
        setShowNotifications(false);
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
    setShowNotifications(false);
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
          siteLogo={siteLogo}
          siteName={siteName}
          logoAuraColor={headerLogoAuraColor}
          logoAuraBlur={headerLogoAuraBlur}
          logoAuraSpread={headerLogoAuraSpread}
          logoAuraOpacity={headerLogoAuraOpacity}
          logoAuraStyle={headerLogoAuraStyle}
          logoAuraSharpness={headerLogoAuraSharpness}
          logoScale={headerLogoScale}
          showNeuralLogo={headerShowNeuralLogo}
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
          unreadCount={unreadCount}
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
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

      <main ref={mainRef} className={`flex-1 overflow-y-auto no-scrollbar relative pt-20 ${currentView !== 'chat' ? 'pb-28 md:pb-0' : ''}`}>
        {children}
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
        logoAuraColor={headerLogoAuraColor}
        logoAuraBlur={headerLogoAuraBlur}
        logoAuraSpread={headerLogoAuraSpread}
        logoAuraOpacity={headerLogoAuraOpacity}
        logoAuraStyle={headerLogoAuraStyle}
        logoAuraSharpness={headerLogoAuraSharpness}
        logoScale={headerLogoScale}
        showNeuralLogo={headerShowNeuralLogo}
        onPrefetch={onPrefetch}
        onVisualSearch={() => setIsAIHubOpen(true)}
        onOpenHelpCenter={() => setShowHelpCenter(true)}
      />

      {currentView !== 'chat' && (uiStyle !== 'minimal' || currentView !== 'home') && !isAIHubOpen && !isVisualSearchOpen && (
        <div className="safe-bottom bg-brand-background/80 backdrop-blur-xl border-t border-brand-border/50 z-40">
          <BottomNav 
            currentView={currentView}
            setView={setView}
            dashboardTab={dashboardTab}
            setDashboardTab={setDashboardTab}
            isRtl={isRtl}
            unreadCount={chatUnreadCount}
            scrollDirection={scrollDirection}
            onVisualSearch={() => setIsAIHubOpen(true)}
            onToggleNotifications={() => setShowNotifications(!showNotifications)}
            showNotifications={showNotifications}
            onPrefetch={onPrefetch}
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

      {enableNeuralPulse && (
        <div className="hidden md:block">
          <NeuralPulse isMomentOfNeed={isMomentOfNeed} />
        </div>
      )}
    </div>
  );
};
