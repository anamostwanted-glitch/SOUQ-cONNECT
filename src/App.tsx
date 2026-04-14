import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './core/firebase';
import { UserProfile, AppFeatures, UserRole, SiteSettings, ProductRequest } from './core/types';
import { BrandingProvider } from './core/providers/BrandingProvider';
import { Layout } from './modules/site/components/Layout';
import { Skeleton } from './shared/components/Skeleton';
import { HelpCircle } from 'lucide-react';
import { handleFirestoreError, OperationType, handleAiError } from './core/utils/errorHandling';
import { usePredictiveNavigation } from './shared/hooks/usePredictiveNavigation';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from './i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const Home = lazy(() => import('./modules/site/components/Home'));
const Auth = lazy(() => import('./modules/site/components/Auth'));
const RoleSelection = lazy(() => import('./modules/site/components/RoleSelection'));
const MarketInterface = lazy(() => import('./modules/marketplace/components/MarketInterface').then(m => ({ default: m.MarketInterface })));
const Dashboard = lazy(() => import('./modules/site/components/Dashboard'));
const DiscoveryCanvas = lazy(() => import('./components/Discovery/DiscoveryCanvas').then(m => ({ default: m.DiscoveryCanvas })));
const ChatHub = lazy(() => import('./modules/common/components/ChatHub').then(m => ({ default: m.ChatHub })));
const ChatView = lazy(() => import('./modules/common/components/ChatView'));
const ProfileView = lazy(() => import('./modules/site/components/ProfileView').then(m => ({ default: m.ProfileView })));
const ConnectRewards = lazy(() => import('./modules/user/components/ConnectRewards').then(m => ({ default: m.ConnectRewards })));
const UserInsightsHub = lazy(() => import('./modules/common/components/UserInsightsHub').then(m => ({ default: m.UserInsightsHub })));
const Partnerships = lazy(() => import('./modules/site/components/Partnerships').then(m => ({ default: m.Partnerships })));
const SmartHelp = lazy(() => import('./modules/common/components/SmartHelp').then(m => ({ default: m.SmartHelp })));
const SupplierLandingPage = lazy(() => import('./modules/site/components/SupplierLandingPage')); // Updated chunk

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  const { i18n: i18nInstance } = useTranslation();
  const [currentView, setView] = useState('home');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [features, setFeatures] = useState<AppFeatures>({
    marketplace: true,
    aiChat: true,
    supplierVerification: true,
    marketTrends: true,
    priceIntelligence: true,
  });
  const [viewMode, setViewMode] = useState<UserRole>('customer');
  const [uiStyle, setUiStyle] = useState<'classic' | 'minimal'>('classic');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentRequests, setRecentRequests] = useState<ProductRequest[]>([]);
  const [isMomentOfNeed, setIsMomentOfNeed] = useState(false);
  
  // Predictive Engine
  usePredictiveNavigation(profile, recentSearches, recentRequests, setIsMomentOfNeed);
  const [dashboardTab, setDashboardTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    // Global error handling for unhandled rejections
    let unsubscribeUser: any = null;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setProfile(userData);
            setViewMode(prev => prev === 'customer' && userData.role !== 'customer' ? userData.role : prev);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`, false);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeUser) unsubscribeUser();
      }
    }, (error) => {
      handleAiError(error, "App:onAuthStateChanged", false);
      setLoading(false);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const newSettings = snap.data() as SiteSettings;
        setSettings(newSettings);
        
        // Update document title
        if (newSettings.siteName) {
          document.title = newSettings.siteName;
        }
        
        // Update favicon
        if (newSettings.logoUrl) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = newSettings.logoUrl;
        }
      } else {
        setSettings({});
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
      // Set empty settings if fetch fails to prevent white screen
      setSettings({});
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  useEffect(() => {
    const viewTitles: Record<string, string> = {
      home: settings?.siteName || 'Souq Connect',
      marketplace: i18nInstance.language === 'ar' ? 'السوق الذكي' : 'Smart Marketplace',
      dashboard: i18nInstance.language === 'ar' ? 'لوحة التحكم' : 'Dashboard',
      chat: i18nInstance.language === 'ar' ? 'المحادثات' : 'Chats',
      profile: i18nInstance.language === 'ar' ? 'الملف الشخصي' : 'Profile',
      smart_pulse: i18nInstance.language === 'ar' ? 'نبض السوق' : 'Market Pulse',
      supplier_landing: i18nInstance.language === 'ar' ? 'انضم كمورد' : 'Join as Supplier',
    };

    if (viewTitles[currentView]) {
      document.title = `${viewTitles[currentView]} | ${settings?.siteName || 'Souq Connect'}`;
    }
  }, [currentView, settings, i18nInstance.language]);

  const renderView = () => {
    switch (currentView) {
      case 'supplier_landing':
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <SupplierLandingPage 
              onStart={() => {
                setViewMode('supplier');
                setView('auth');
              }} 
              settings={settings}
            />
          </Suspense>
        );
      case 'home':
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <Home 
              profile={profile} 
              onNavigate={setView} 
              onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
              onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
              viewMode={viewMode as any}
              uiStyle={uiStyle}
            />
          </Suspense>
        );
      case 'role-selection':
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <RoleSelection onSelect={(role) => { setViewMode(role); setView('auth'); }} />
          </Suspense>
        );
      case 'auth':
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <Auth onAuthSuccess={(role) => { setView('home'); }} initialRole={viewMode} />
          </Suspense>
        );
      case 'marketplace':
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <MarketInterface 
              profile={profile} 
              features={features}
              onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
              onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
              viewMode={viewMode as any}
              activeTab={dashboardTab as any}
              setActiveTab={setDashboardTab as any}
            />
          </Suspense>
        );
      case 'discovery':
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <DiscoveryCanvas />
          </Suspense>
        );
      case 'chat':
        if (activeChatId) {
          return (
            <Suspense fallback={<Skeleton className="h-screen w-full" />}>
              <ChatView 
                chatId={activeChatId}
                profile={profile}
                features={features}
                onBack={() => setActiveChatId(null)}
                onViewProfile={(uid) => { /* handle profile view */ }}
              />
            </Suspense>
          );
        }
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <ChatHub 
              profile={profile} 
              onOpenChat={(id) => setActiveChatId(id)}
              onBack={() => setView('home')}
            />
          </Suspense>
        );
      case 'smart_pulse':
        if (!profile) return <Auth onAuthSuccess={() => setView('smart_pulse')} />;
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <div className="pt-24 px-4 min-h-screen bg-brand-background">
              <UserInsightsHub profile={profile} isRtl={i18n.language === 'ar'} />
            </div>
          </Suspense>
        );
      case 'dashboard':
        if (!profile) return <Auth onAuthSuccess={() => setView('dashboard')} />;
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <Dashboard 
              profile={profile}
              features={features}
              dashboardTab={dashboardTab}
              setDashboardTab={setDashboardTab}
              onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
              onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
              viewMode={viewMode as any}
              uiStyle={uiStyle}
            />
          </Suspense>
        );
      case 'help':
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <SmartHelp onBack={() => setView('home')} />
          </Suspense>
        );
      case 'partnerships':
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <Partnerships />
          </Suspense>
        );
      case 'profile':
        if (selectedProfileId === profile?.uid || (!selectedProfileId && profile)) {
          setView('dashboard');
          return null;
        }
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <ProfileView 
              userId={selectedProfileId || profile?.uid} 
              profile={selectedProfileId ? null : profile} 
              currentUserProfile={profile}
              features={features} 
              onBack={() => {
                setSelectedProfileId(null);
                setView('home');
              }} 
            />
          </Suspense>
        );
      case 'connect':
        if (!profile) return <Auth onAuthSuccess={() => setView('connect')} />;
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <ConnectRewards profile={profile} settings={settings} onBack={() => setView('home')} />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <Home profile={profile} onNavigate={setView} viewMode={viewMode as any} uiStyle={uiStyle} />
          </Suspense>
        );
    }
  };

  const onBack = () => {
    // Logic to go back based on currentView
    if (currentView === 'chat') setActiveChatId(null);
    else if (currentView === 'profile') setView('home');
    else if (currentView !== 'home') setView('home');
  };

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <AnimatePresence mode="wait">
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="min-h-screen relative"
              >
                <Layout 
                  settings={settings}
                  profile={profile}
                  features={features}
                  currentView={currentView}
                  setView={setView}
                  setActiveChatId={setActiveChatId}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  uiStyle={uiStyle}
                  setUiStyle={setUiStyle}
                  onBack={onBack}
                  isMomentOfNeed={isMomentOfNeed}
                >
                  {renderView()}
                </Layout>
              </motion.div>
          </AnimatePresence>
        </BrandingProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
