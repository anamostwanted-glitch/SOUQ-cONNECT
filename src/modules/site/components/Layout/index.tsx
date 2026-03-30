import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../../../i18n';
import { UserProfile, Notification, AppFeatures, Category } from '../../../../core/types';
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

import { Header } from './Header';
import { MobileMenu } from './MobileMenu';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
  features: AppFeatures;
  currentView: string;
  setView: (view: any) => void;
  setActiveChatId: (id: string | null) => void;
  onBack?: () => void;
  supplierTab?: string;
  setSupplierTab?: (tab: string) => void;
  viewMode: 'admin' | 'supplier' | 'customer';
  setViewMode: (mode: 'admin' | 'supplier' | 'customer') => void;
  uiStyle: 'classic' | 'minimal';
  setUiStyle: (style: 'classic' | 'minimal') => void;
  onPrefetch?: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  profile, 
  features,
  currentView, 
  setView,
  setActiveChatId,
  onBack,
  supplierTab = 'dashboard',
  setSupplierTab,
  viewMode,
  setViewMode,
  uiStyle,
  setUiStyle,
  onPrefetch
}) => {
  const { t } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useBranding();
  const isRtl = i18nInstance.language === 'ar';
  
  const [siteLogo, setSiteLogo] = useState('');
  const [siteName, setSiteName] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<UserProfile[]>([]);
  
  const mainRef = useRef<HTMLElement>(null);
  const scrollDirection = useScrollDirection(mainRef);
  const lastNotificationId = useRef<string | null>(null);
  const isInitialNotifLoad = useRef(true);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
              console.error("Error fetching location", error);
              setLocationName(i18nInstance.language === 'ar' ? 'تعذر تحديد الموقع' : 'Location unavailable');
            } finally {
              setIsLoadingLocation(false);
            }
          },
          (error) => {
            console.error("Geolocation error", error);
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
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'users'), where('role', '==', 'supplier')), (snap) => {
      setAllSuppliers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSiteLogo(data.logoUrl || '');
        setSiteName(data.siteName || '');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
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
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
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
      setSupplierTab?.('dashboard');
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
    i18nInstance.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <div className={`viewport-height flex flex-col bg-brand-background text-brand-text-main font-sans ${isRtl ? 'font-arabic' : ''} transition-colors duration-300 overflow-hidden`}>
      <div className="safe-top bg-brand-background z-50">
        <Header 
          siteLogo={siteLogo}
          siteName={siteName}
          currentView={currentView}
          setView={setView}
          supplierTab={supplierTab}
          setSupplierTab={setSupplierTab}
          profile={profile}
          viewMode={viewMode}
          setViewMode={setViewMode}
          uiStyle={uiStyle}
          setUiStyle={setUiStyle}
          features={features}
          isRtl={isRtl}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          toggleLanguage={toggleLanguage}
          isLoadingLocation={isLoadingLocation}
          locationName={locationName}
          unreadCount={unreadCount}
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          onNotificationClick={handleNotificationClick}
          onVisualSearch={() => setIsVisualSearchOpen(true)}
          onMobileMenuOpen={() => setIsMobileMenuOpen(true)}
          notifRef={notifRef}
          profileRef={profileRef}
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
            onClick={() => sendEmailVerification(auth.currentUser!)}
            className="text-sm font-bold text-brand-warning hover:underline"
          >
            {isRtl ? 'إعادة إرسال الرابط' : 'Resend verification link'}
          </button>
        </div>
      )}

      <main ref={mainRef} className={`flex-1 overflow-y-auto no-scrollbar relative ${currentView !== 'chat' ? 'pb-28 md:pb-0' : ''}`}>
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
        supplierTab={supplierTab}
        setSupplierTab={setSupplierTab}
        isRtl={isRtl}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        toggleLanguage={toggleLanguage}
        siteLogo={siteLogo}
        siteName={siteName}
        onPrefetch={onPrefetch}
      />

      {profile && currentView !== 'chat' && (uiStyle !== 'minimal' || currentView !== 'home') && (
        <div className="safe-bottom bg-brand-background/80 backdrop-blur-xl border-t border-brand-border/50 z-40">
          <BottomNav 
            currentView={currentView}
            setView={setView}
            supplierTab={supplierTab}
            setSupplierTab={setSupplierTab}
            isRtl={isRtl}
            unreadCount={unreadCount}
            scrollDirection={scrollDirection}
            onVisualSearch={() => setIsVisualSearchOpen(true)}
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
            className="fixed bottom-32 right-6 z-40"
          >
            <HapticButton
              onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-12 h-12 bg-brand-primary text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform group relative"
              title={i18n.language === 'ar' ? 'الرجوع للأعلى' : 'Back to Top'}
            >
              <ArrowUp size={24} />
              <span className="absolute right-full mr-4 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
                {i18n.language === 'ar' ? 'الرجوع للأعلى' : 'Back to Top'}
              </span>
            </HapticButton>
          </motion.div>
        )}
      </AnimatePresence>

      <PremiumVisualSearchModal 
        isOpen={isVisualSearchOpen} 
        onClose={() => setIsVisualSearchOpen(false)} 
        categories={categories}
        allSuppliers={allSuppliers}
        profile={profile}
        onStartChat={(requestId, supplierId, customerId) => {
          setActiveChatId(requestId);
          setView('chat');
        }}
      />

      {selectedNotification && (
        <NotificationModal 
          notification={selectedNotification} 
          onClose={() => setSelectedNotification(null)} 
          isRtl={isRtl}
        />
      )}
    </div>
  );
};
