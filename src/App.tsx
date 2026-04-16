import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductRequest } from './core/types';
import { Layout } from './modules/site/components/Layout';
import { Skeleton } from './shared/components/Skeleton';
import { usePredictiveNavigation } from './shared/hooks/usePredictiveNavigation';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'sonner';
import { useAuth } from './core/providers/AuthProvider';
import { useSettings } from './core/providers/SettingsProvider';
import { useCategories } from './core/providers/CategoryProvider';

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
const UserNeuralHub = lazy(() => import('./modules/common/components/UserNeuralHub').then(m => ({ default: m.UserNeuralHub })));
const Partnerships = lazy(() => import('./modules/site/components/Partnerships').then(m => ({ default: m.Partnerships })));
const SmartHelp = lazy(() => import('./modules/common/components/SmartHelp').then(m => ({ default: m.SmartHelp })));
const SupplierLandingPage = lazy(() => import('./modules/site/components/SupplierLandingPage'));
const SupplierOnboarding = lazy(() => import('./modules/site/components/SupplierOnboarding').then(m => ({ default: m.SupplierOnboarding })));

export default function App() {
  const { i18n: i18nInstance } = useTranslation();
  const { profile, viewMode, setViewMode, loading: authLoading } = useAuth();
  const { settings, features, loading: settingsLoading } = useSettings();
  const { categories, loading: categoriesLoading } = useCategories();

  const [currentView, setView] = useState('home');
  const [uiStyle, setUiStyle] = useState<'classic' | 'minimal'>('classic');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Persist last active chat
  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem('last_active_chat_id', activeChatId);
    }
  }, [activeChatId]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentRequests, setRecentRequests] = useState<ProductRequest[]>([]);
  const [isMomentOfNeed, setIsMomentOfNeed] = useState(false);
  
  // Predictive Engine
  usePredictiveNavigation(profile, recentSearches, recentRequests, setIsMomentOfNeed);
  const [dashboardTab, setDashboardTab] = useState('overview');
  const [progress, setProgress] = useState<number | null>(null);
  const [initialItemId, setInitialItemId] = useState<string | null>(null);

  const loading = authLoading || settingsLoading;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const itemIdParam = params.get('itemId');

    if (viewParam) {
      setView(viewParam);
    }
    
    if (itemIdParam) {
      setInitialItemId(itemIdParam);
    }
  }, []);

  useEffect(() => {
    // Auto-redirect new suppliers to onboarding
    if (profile?.role === 'supplier' && (!profile.categories || profile.categories.length === 0) && currentView !== 'supplier_onboarding' && currentView !== 'auth') {
      setView('supplier_onboarding');
    }
  }, [profile, currentView]);

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

  useEffect(() => {
    // Only auto-resume if entering chat view from elsewhere
    const prevView = localStorage.getItem('prev_view');
    if (currentView === 'chat' && !activeChatId && prevView !== 'chat') {
      const lastId = localStorage.getItem('last_active_chat_id');
      if (lastId) {
        setActiveChatId(lastId);
      }
    }
    localStorage.setItem('prev_view', currentView);
  }, [currentView, activeChatId]);

  const renderView = () => {
    console.log('DEBUG: Current View:', currentView);
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
      case 'supplier_onboarding':
        if (!profile) return <Auth onAuthSuccess={() => setView('supplier_onboarding')} />;
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <SupplierOnboarding 
              profile={profile} 
              categories={categories} 
              onComplete={() => setView('home')} 
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
            <Auth 
              onAuthSuccess={(role) => { 
                if (role === 'supplier' || viewMode === 'supplier') {
                  setView('supplier_onboarding');
                } else {
                  setView('home'); 
                }
              }} 
              initialRole={viewMode} 
            />
          </Suspense>
        );
      case 'marketplace':
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <MarketInterface 
              onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
              onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
              activeTab={dashboardTab as any}
              setActiveTab={setDashboardTab as any}
              initialItemId={initialItemId}
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
              <UserNeuralHub profile={profile} isRtl={i18nInstance.language === 'ar'} />
            </div>
          </Suspense>
        );
      case 'dashboard':
        if (!profile) return <Auth onAuthSuccess={() => setView('dashboard')} />;
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <Dashboard 
              dashboardTab={dashboardTab}
              setDashboardTab={setDashboardTab}
              onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
              onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
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
            <Home onNavigate={setView} uiStyle={uiStyle} />
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
    <div className="min-h-screen relative">
      <Toaster position="top-center" richColors />
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
    </div>
  );
}
