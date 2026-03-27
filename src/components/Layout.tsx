import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UserProfile, Notification, AppFeatures } from '../types';
import { LogOut, Globe, User, LayoutDashboard, Home as HomeIcon, Building2, Bell, Check, MapPin, Menu, X as CloseIcon, AlertCircle, Moon, Sun, ShoppingBag, Megaphone, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { signOut, sendEmailVerification } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { soundService, SoundType } from '../utils/soundService';
import { NotificationModal } from './NotificationModal';
import { useNearbySuppliers } from '../hooks/useNearbySuppliers';
import { HapticButton } from './HapticButton';
import { useScrollDirection, ScrollDirection } from '../hooks/useScrollDirection';
import { useBranding } from './BrandingProvider';

interface LayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
  features: AppFeatures;
  currentView: string;
  setView: (view: any) => void;
  setActiveChatId: (id: string | null) => void;
  onBack?: () => void;
  supplierTab?: 'dashboard' | 'personal' | 'company' | 'marketing';
  setSupplierTab?: (tab: 'dashboard' | 'personal' | 'company' | 'marketing') => void;
  viewMode: 'admin' | 'supplier' | 'customer';
  setViewMode: (mode: 'admin' | 'supplier' | 'customer') => void;
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
  onPrefetch
}) => {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useBranding();
  const isRtl = i18n.language === 'ar';
  const [siteLogo, setSiteLogo] = useState('');
  const [siteName, setSiteName] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const lastNotificationId = useRef<string | null>(null);
  const isInitialNotifLoad = useRef(true);
  const notifRef = useRef<HTMLDivElement>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrollDirection = useScrollDirection();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${i18n.language}`);
              const data = await response.json();
              const state = data.address?.state || data.address?.region || data.address?.city || data.address?.county;
              if (state) {
                setLocationName(state);
              } else {
                setLocationName(i18n.language === 'ar' ? 'موقع غير معروف' : 'Unknown Location');
              }
            } catch (error) {
              console.error("Error fetching location", error);
              setLocationName(i18n.language === 'ar' ? 'تعذر تحديد الموقع' : 'Location unavailable');
            } finally {
              setIsLoadingLocation(false);
            }
          },
          (error) => {
            console.error("Geolocation error", error);
            setLocationName(i18n.language === 'ar' ? 'تعذر تحديد الموقع' : 'Location unavailable');
            setIsLoadingLocation(false);
          }
        );
      } else {
        setLocationName(i18n.language === 'ar' ? 'غير مدعوم' : 'Not supported');
      }
    };

    fetchLocation();
  }, [i18n.language]);

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
      
      // Play sound if new notification
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
      // Maybe scroll to request?
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

  const [verificationSent, setVerificationSent] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      try {
        await sendEmailVerification(auth.currentUser);
        setVerificationSent(true);
        setTimeout(() => setVerificationSent(false), 5000);
      } catch (error) {
        console.error("Error sending verification email", error);
      }
    }
  };

  React.useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  return (
    <div className={`min-h-screen bg-brand-background text-brand-text-main font-sans ${isRtl ? 'font-arabic' : ''} pb-20 md:pb-0 transition-colors duration-300`}>
      <header className="border-b border-brand-border px-4 md:px-8 py-4 sticky top-0 bg-brand-surface/80 backdrop-blur-md z-50 transition-colors duration-300">
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
          </nav>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
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

          <HapticButton 
            onClick={toggleDarkMode}
            className="flex md:hidden w-10 h-10 items-center justify-center hover:bg-brand-surface rounded-xl transition-all text-brand-text-muted hover:text-brand-primary border border-transparent hover:border-brand-border"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </HapticButton>

          {profile ? (
            <div className="flex items-center gap-2 md:gap-4">
              <div className="relative" ref={notifRef}>
                <HapticButton 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="hidden md:flex w-10 h-10 items-center justify-center hover:bg-brand-surface rounded-xl transition-all relative text-brand-text-muted hover:text-brand-primary border border-transparent hover:border-brand-border"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand-error rounded-full border-2 border-brand-surface"></span>
                  )}
                </HapticButton>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute top-full mt-3 w-80 bg-brand-surface rounded-2xl shadow-2xl border border-brand-border overflow-hidden z-50 ${isRtl ? 'left-0' : 'right-0'}`}
                    >
                      <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-background/50">
                        <h3 className="font-bold text-brand-text-main">{isRtl ? 'الإشعارات' : 'Notifications'}</h3>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-lg uppercase tracking-wider">
                            {unreadCount} {isRtl ? 'جديد' : 'New'}
                          </span>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => handleNotificationClick(n)}
                              className={`p-4 border-b border-brand-border-light last:border-0 cursor-pointer transition-colors hover:bg-brand-background ${!n.read ? 'bg-brand-primary/5' : ''}`}
                            >
                              <div className="flex gap-3">
                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.read ? 'bg-brand-primary' : 'bg-transparent'}`} />
                                <div>
                                  <p className="text-sm font-bold text-brand-text-main leading-tight mb-1">{isRtl ? n.titleAr : n.titleEn}</p>
                                  <p className="text-xs text-brand-text-muted leading-relaxed">{isRtl ? n.bodyAr : n.bodyEn}</p>
                                  <p className="text-[10px] text-brand-text-muted/60 mt-2 font-medium">
                                    {new Date(n.createdAt).toLocaleDateString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center">
                            <div className="w-12 h-12 bg-brand-background rounded-full flex items-center justify-center mx-auto mb-3 text-brand-text-muted/30">
                              <Bell size={24} />
                            </div>
                            <p className="text-sm text-brand-text-muted font-medium">{isRtl ? 'لا توجد إشعارات' : 'No notifications yet'}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={notifRef}>
                <HapticButton 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 hover:bg-brand-surface rounded-xl transition-all border border-transparent hover:border-brand-border"
                >
                  <User size={20} className="text-brand-text-muted" />
                  <span className="text-sm font-bold text-brand-text-main">{profile.name}</span>
                </HapticButton>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute top-full mt-3 w-56 bg-brand-surface rounded-2xl shadow-2xl border border-brand-border overflow-hidden z-50 ${isRtl ? 'left-0' : 'right-0'}`}
                    >
                      {profile.role === 'admin' && (
                        <div className="p-2 border-b border-brand-border">
                          <p className="text-xs font-bold text-brand-text-muted px-3 py-2 uppercase tracking-wider">{isRtl ? 'تبديل الواجهة' : 'Switch View'}</p>
                          <button 
                            onClick={() => { setViewMode('supplier'); setShowProfileMenu(false); }}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-brand-text-main hover:bg-brand-background transition-colors"
                          >
                            {isRtl ? 'عرض كـ مورد' : 'View as Supplier'}
                          </button>
                          <button 
                            onClick={() => { setViewMode('customer'); setShowProfileMenu(false); }}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-brand-text-main hover:bg-brand-background transition-colors"
                          >
                            {isRtl ? 'عرض كـ عميل' : 'View as Customer'}
                          </button>
                        </div>
                      )}
                      <button 
                        onClick={() => { setView('notifications-log'); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-brand-text-main hover:bg-brand-background transition-colors border-b border-brand-border"
                      >
                        {isRtl ? 'سجل الإشعارات' : 'Notifications Log'}
                      </button>
                      <HapticButton 
                        onClick={() => { signOut(auth); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-brand-error hover:bg-brand-error/10 transition-colors"
                      >
                        {t('logout')}
                      </HapticButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-brand-background rounded-xl text-brand-text-muted transition-all border border-brand-border"
          >
            <Menu size={24} />
          </HapticButton>
        </div>
      </div>
    </header>

      {auth.currentUser && !auth.currentUser.emailVerified && (
        <div className="bg-brand-warning/10 border-b border-brand-warning/20 px-4 py-3 flex items-center justify-between">
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

      {viewMode !== 'admin' && (
        <div className="bg-brand-primary text-white px-4 py-2 flex items-center justify-between">
          <p className="text-sm font-medium">
            {isRtl 
              ? `أنت تشاهد الواجهة كـ ${viewMode === 'supplier' ? 'مورد' : 'عميل'}` 
              : `You are viewing as ${viewMode === 'supplier' ? 'Supplier' : 'Customer'}`}
          </p>
          <button 
            onClick={() => setViewMode('admin')}
            className="text-sm font-bold underline"
          >
            {isRtl ? 'العودة للوحة الإدارة' : 'Back to Admin'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-brand-text-main/40 backdrop-blur-md z-[60] md:hidden"
            />
            <motion.div 
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className={`fixed top-0 bottom-0 w-80 bg-white/95 backdrop-blur-xl shadow-2xl z-[70] md:hidden ${isRtl ? 'right-0' : 'left-0'}`}
            >
              <div className="p-8 flex flex-col h-full">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    {siteLogo ? (
                      <img src={siteLogo} alt="Logo" className="h-10 w-auto" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="p-2 bg-brand-primary rounded-xl text-white">
                        <Building2 size={20} />
                      </div>
                    )}
                    <span className="font-extrabold text-brand-text-main text-lg tracking-tight">{siteName || 'B2B Connect'}</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-brand-background rounded-xl text-brand-text-muted transition-colors">
                    <CloseIcon size={24} />
                  </button>
                </div>

                <nav className="flex flex-col gap-3">
                  <HapticButton 
                    onClick={() => { setView('home'); setIsMobileMenuOpen(false); }}
                    onPrefetch={() => onPrefetch?.('home')}
                    className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${currentView === 'home' ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text-muted hover:bg-brand-background'}`}
                  >
                    <HomeIcon size={22} />
                    {t('home')}
                  </HapticButton>
                  
                  <HapticButton 
                    onClick={() => { setView('dashboard'); setSupplierTab?.('dashboard'); setIsMobileMenuOpen(false); }}
                    onPrefetch={() => onPrefetch?.('dashboard')}
                    className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${currentView === 'dashboard' && supplierTab === 'dashboard' ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text-muted hover:bg-brand-background'}`}
                  >
                    <LayoutDashboard size={22} />
                    {t('dashboard')}
                  </HapticButton>

                  {profile && viewMode !== 'admin' && (
                    <HapticButton 
                      onClick={() => { 
                        setView('dashboard'); 
                        setSupplierTab?.('marketing');
                        setIsMobileMenuOpen(false); 
                      }}
                      onPrefetch={() => onPrefetch?.('dashboard')}
                      className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${currentView === 'dashboard' && supplierTab === 'marketing' ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text-muted hover:bg-brand-background'}`}
                    >
                      <Megaphone size={22} />
                      {isRtl ? 'التسويق والنمو' : 'Marketing & Growth'}
                    </HapticButton>
                  )}

                  {features.marketplace && (
                    <HapticButton 
                      onClick={() => { setView('marketplace'); setIsMobileMenuOpen(false); }}
                      onPrefetch={() => onPrefetch?.('marketplace')}
                      className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${currentView === 'marketplace' ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text-muted hover:bg-brand-background'}`}
                    >
                      <ShoppingBag size={22} />
                      {t('marketplace')}
                    </HapticButton>
                  )}

                  <HapticButton 
                    onClick={() => { setView('profile'); setIsMobileMenuOpen(false); }}
                    onPrefetch={() => onPrefetch?.('profile')}
                    className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${currentView === 'profile' ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-text-muted hover:bg-brand-background'}`}
                  >
                    <User size={22} />
                    {t('profile')}
                  </HapticButton>

                  <button 
                    onClick={() => { toggleDarkMode(); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-4 p-4 rounded-2xl font-bold text-brand-text-muted hover:bg-brand-background transition-all"
                  >
                    {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
                    {isDarkMode ? (isRtl ? 'الوضع الفاتح' : 'Light Mode') : (isRtl ? 'الوضع الليلي' : 'Dark Mode')}
                  </button>

                  <button 
                    onClick={() => { toggleLanguage(); setIsMobileMenuOpen(false); }}
                    className="flex items-center gap-4 p-4 rounded-2xl font-bold text-brand-text-muted hover:bg-brand-background transition-all"
                  >
                    <Globe size={22} />
                    {i18n.language === 'ar' ? 'English' : 'العربية'}
                  </button>

                  {profile?.role === 'admin' && (
                    <div className="mt-4 p-4 bg-brand-background rounded-2xl">
                      <p className="text-xs font-bold text-brand-text-muted px-2 py-2 uppercase tracking-wider">{isRtl ? 'تبديل الواجهة' : 'Switch View'}</p>
                      <button 
                        onClick={() => { setViewMode('supplier'); setIsMobileMenuOpen(false); }}
                        className="w-full text-left px-2 py-2 rounded-lg text-sm font-medium text-brand-text-main hover:bg-brand-surface transition-colors"
                      >
                        {isRtl ? 'عرض كـ مورد' : 'View as Supplier'}
                      </button>
                      <button 
                        onClick={() => { setViewMode('customer'); setIsMobileMenuOpen(false); }}
                        className="w-full text-left px-2 py-2 rounded-lg text-sm font-medium text-brand-text-main hover:bg-brand-surface transition-colors"
                      >
                        {isRtl ? 'عرض كـ عميل' : 'View as Customer'}
                      </button>
                    </div>
                  )}
                </nav>

                <div className="mt-auto pt-8 border-t border-brand-border">
                  {profile ? (
                    <div className="flex items-center gap-4 mb-8 p-4 bg-brand-background rounded-2xl">
                      <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary font-bold text-lg">
                        {profile.name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-brand-text-main">{profile.name}</span>
                        <span className="text-xs text-brand-text-muted font-semibold uppercase tracking-wider">{t(profile.role)}</span>
                      </div>
                    </div>
                  ) : (
                    <HapticButton 
                      onClick={() => { setView('role-selection'); setIsMobileMenuOpen(false); }}
                      className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold mb-6 shadow-lg shadow-brand-primary/20"
                    >
                      {t('login')}
                    </HapticButton>
                  )}
                  
                  <div className="flex flex-col gap-4 px-2">
                    <button 
                      onClick={() => { setView('privacy'); setIsMobileMenuOpen(false); }}
                      className="text-left text-sm font-bold text-brand-text-muted hover:text-brand-primary transition-colors"
                    >
                      {isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}
                    </button>
                    <button 
                      onClick={() => { setView('terms'); setIsMobileMenuOpen(false); }}
                      className="text-left text-sm font-bold text-brand-text-muted hover:text-brand-primary transition-colors"
                    >
                      {isRtl ? 'شروط الاستخدام' : 'Terms of Use'}
                    </button>
                  </div>

                  {profile && (
                    <button 
                      onClick={() => signOut(auth)}
                      className="flex items-center gap-4 p-4 rounded-2xl font-bold text-brand-error hover:bg-brand-error/10 transition-all mt-6"
                    >
                      <LogOut size={22} />
                      {t('logout')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar for Mobile with Contextual Visibility */}
      {profile && currentView !== 'chat' && (
        <motion.div 
          initial={{ y: 0 }}
          animate={{ y: scrollDirection === ScrollDirection.DOWN ? 100 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed bottom-0 left-0 right-0 bg-brand-surface/80 backdrop-blur-2xl border-t border-brand-border px-4 py-3 pb-safe flex items-center justify-between md:hidden z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
        >
          <HapticButton 
            onClick={() => setView('home')}
            onPrefetch={() => onPrefetch?.('home')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'home' ? 'text-brand-primary scale-110' : 'text-brand-text-muted'}`}
          >
            <HomeIcon size={22} />
            <span className="text-[10px] font-bold tracking-tight">{t('home')}</span>
          </HapticButton>
          <HapticButton 
            onClick={() => { setView('dashboard'); setSupplierTab?.('dashboard'); }}
            onPrefetch={() => onPrefetch?.('dashboard')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'dashboard' && supplierTab === 'dashboard' ? 'text-brand-primary scale-110' : 'text-brand-text-muted'}`}
          >
            <LayoutDashboard size={22} />
            <span className="text-[10px] font-bold tracking-tight">{isRtl ? 'الرئيسية' : 'Dash'}</span>
          </HapticButton>
          {profile && viewMode !== 'admin' && (
            <HapticButton 
              onClick={() => { setView('dashboard'); setSupplierTab?.('marketing'); }}
              onPrefetch={() => onPrefetch?.('dashboard')}
              className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'dashboard' && supplierTab === 'marketing' ? 'text-brand-primary scale-110' : 'text-brand-text-muted'}`}
            >
              <Megaphone size={22} />
              <span className="text-[10px] font-bold tracking-tight">{isRtl ? 'تسويق' : 'Market'}</span>
            </HapticButton>
          )}
          {features.marketplace && (
            <HapticButton 
              onClick={() => setView('marketplace')}
              onPrefetch={() => onPrefetch?.('marketplace')}
              className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'marketplace' ? 'text-brand-primary scale-110' : 'text-brand-text-muted'}`}
            >
              <ShoppingBag size={22} />
              <span className="text-[10px] font-bold tracking-tight">{t('marketplace')}</span>
            </HapticButton>
          )}
          <HapticButton 
            onClick={() => setView('profile')}
            onPrefetch={() => onPrefetch?.('profile')}
            className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'profile' ? 'text-brand-primary scale-110' : 'text-brand-text-muted'}`}
          >
            <User size={22} />
            <span className="text-[10px] font-bold tracking-tight">{t('profile')}</span>
          </HapticButton>
          <HapticButton 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`flex flex-col items-center gap-1.5 transition-all relative ${showNotifications ? 'text-brand-primary scale-110' : 'text-brand-text-muted'}`}
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-brand-error rounded-full border-2 border-brand-surface"></span>
            )}
            <span className="text-[10px] font-bold tracking-tight">{isRtl ? 'تنبيهات' : 'Notif'}</span>
          </HapticButton>
        </motion.div>
      )}

      {/* Contextual Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ 
              opacity: scrollDirection === ScrollDirection.DOWN ? 0 : 1,
              scale: scrollDirection === ScrollDirection.DOWN ? 0.5 : 1,
              y: scrollDirection === ScrollDirection.DOWN ? 100 : 0 
            }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`fixed bottom-24 md:bottom-8 ${isRtl ? 'left-8' : 'right-8'} p-4 bg-brand-primary text-white rounded-full shadow-2xl z-40 hover:bg-brand-primary-hover transition-all`}
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      <main 
        className={`max-w-7xl mx-auto ${currentView === 'chat' ? 'px-0 py-0' : 'px-4 md:px-8 py-8'} ${profile && currentView !== 'chat' ? 'pb-24 md:pb-8' : ''}`}
        onPointerDown={(e) => {
          const startX = e.clientX;
          const handlePointerUp = (upEvent: PointerEvent) => {
            const endX = upEvent.clientX;
            const diffX = endX - startX;
            const threshold = 100; // Minimum swipe distance
            
            if (Math.abs(diffX) > threshold) {
              if (isRtl) {
                // In RTL, swipe right to left to go back (diffX < -threshold)
                if (diffX < -threshold) {
                  onBack ? onBack() : setView('home');
                }
              } else {
                // In LTR, swipe left to right to go back (diffX > threshold)
                if (diffX > threshold) {
                  onBack ? onBack() : setView('home');
                }
              }
            }
            window.removeEventListener('pointerup', handlePointerUp);
          };
          window.addEventListener('pointerup', handlePointerUp);
        }}
      >
        {children}
      </main>

      {currentView !== 'chat' && (
        <footer className="border-t border-brand-border mt-20 py-12 bg-brand-background/50">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-3">
                {siteLogo ? (
                  <img src={siteLogo} alt="Logo" className="h-8 w-auto" referrerPolicy="no-referrer" />
                ) : (
                  <div className="p-2 bg-brand-primary rounded-xl text-white">
                    <Building2 size={16} />
                  </div>
                )}
                <span className="text-brand-text-main font-extrabold text-lg tracking-tight">{siteName || 'B2B Connect'}</span>
              </div>

              <div className="text-brand-text-muted text-xs font-bold uppercase tracking-wider">
                © {new Date().getFullYear()} {siteName || 'B2B Connect'}. {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
              </div>
            </div>
          </div>
        </footer>
      )}

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
