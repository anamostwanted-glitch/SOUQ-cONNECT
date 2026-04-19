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
import { PageLoader } from './shared/components/PageLoader';
import { SmartVoiceHub } from './shared/components/SmartVoiceHub';
import { NotificationCenter } from './modules/common/components/NotificationCenter';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './core/firebase';

const Home = lazy(() => import('./modules/site/components/Home'));
const Auth = lazy(() => import('./modules/site/components/Auth'));
const RoleSelection = lazy(() => import('./modules/site/components/RoleSelection'));
const MarketInterface = lazy(() => import('./modules/marketplace/components/MarketInterface').then(m => ({ default: m.MarketInterface })));
const Dashboard = lazy(() => import('./modules/site/components/Dashboard'));
const DiscoveryCanvas = lazy(() => import('./components/Discovery/DiscoveryCanvas').then(m => ({ default: m.DiscoveryCanvas })));
const ChatHub = lazy(() => import('./modules/common/components/ChatHub').then(m => ({ default: m.ChatHub })));
const ChatView = lazy(() => import('./modules/common/components/ChatView'));
const ProfileView = lazy(() => import('./modules/site/components/ProfileView'));
const ConnectRewards = lazy(() => import('./modules/user/components/ConnectRewards').then(module => ({ default: module.ConnectRewards })));
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isVoiceHubOpen, setIsVoiceHubOpen] = useState(false);

  // Global Notifications Listener for Badge Count
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnreadNotificationsCount(snap.size);
    });
    return () => unsub();
  }, [profile?.uid]);

  // Deep Link Navigation Logic
  const handleDeepNavigate = (link: string) => {
    if (!link) return;
    
    // Support both full URLs and internal paths
    const cleanLink = link.includes('://') ? new URL(link).pathname + new URL(link).search : link;
    const [path, search] = cleanLink.split('?');
    const params = new URLSearchParams(search);

    if (path.includes('dashboard')) {
      const tab = params.get('tab');
      setView('dashboard');
      if (tab) setDashboardTab(tab);
    } else if (path.includes('chat')) {
      const id = params.get('id') || params.get('chatId');
      setView('chat');
      if (id) setActiveChatId(id);
    } else if (path.includes('marketplace')) {
      const itemId = params.get('itemId');
      const tab = params.get('tab');
      setView('marketplace');
      if (itemId) setInitialItemId(itemId);
      if (tab) setDashboardTab(tab);
    } else if (path.includes('profile')) {
      const uid = params.get('uid');
      if (uid) {
        setSelectedProfileId(uid);
        setView('profile');
      }
    } else if (path.includes('smart_pulse')) {
      setView('smart_pulse');
    } else if (path.includes('connect')) {
      setView('connect');
    }
  };

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
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [initialItemId, setInitialItemId] = useState<string | null>(null);

  const loading = authLoading || settingsLoading;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    
    // View from query param (legacy)
    const viewParam = params.get('view');
    const uidParam = params.get('uid');
    const itemIdParam = params.get('itemId');
    const tabParam = params.get('tab');
    const actionParam = params.get('action');

    // Parse path segments for clean URLs
    const pathSegments = path.split('/').filter(Boolean);
    
    if (pathSegments[0] === 'marketplace' && pathSegments[1]) {
      setView('marketplace');
      // Potential to handle category slug here if needed by MarketInterface
    } else if (pathSegments[0] === 'profile' && pathSegments[1]) {
      setSelectedProfileId(pathSegments[1]);
      setView('profile');
    } else if (pathSegments[0] === 'product' && pathSegments[1]) {
      setInitialItemId(pathSegments[1]);
      setView('marketplace');
    }

    if (viewParam) {
      setView(viewParam);
    }

    if (uidParam) {
      setSelectedProfileId(uidParam);
    }
    
    if (itemIdParam) {
      setInitialItemId(itemIdParam);
    }

    if (tabParam) {
      setDashboardTab(tabParam);
    }

    // Special action mapping (e.g. from neural insights or external links)
    if (actionParam === 'ai-portal') {
      setView('dashboard');
      setDashboardTab('ai-hub');
    }

    // Voice-Driven Navigation Listener
    const handleVoiceNav = (e: any) => {
      if (e.detail?.view) {
        setView(e.detail.view);
        if (e.detail.tab) setDashboardTab(e.detail.tab);
        if (e.detail.searchQuery) setVoiceSearchQuery(e.detail.searchQuery);
      }
    };
    window.addEventListener('voice-navigation', handleVoiceNav);
    return () => window.removeEventListener('voice-navigation', handleVoiceNav);
  }, []);

  useEffect(() => {
    // Auto-redirect new suppliers to onboarding if they haven't completed it
    const isNewSupplier = profile?.role === 'supplier' && !profile.onboardingCompleted;
    if (isNewSupplier && currentView !== 'supplier_onboarding' && currentView !== 'auth' && currentView !== 'supplier_landing') {
      setView('supplier_onboarding');
    }

    // Redirect completed suppliers AWAY from onboarding
    if (profile?.role === 'supplier' && profile.onboardingCompleted && currentView === 'supplier_onboarding') {
      setView('home');
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

  if (loading) {
    return <PageLoader previewSettings={settings} />;
  }

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
              onAuthSuccess={() => { 
                setView('home'); 
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
              initialVoiceQuery={voiceSearchQuery}
              onClearVoiceQuery={() => setVoiceSearchQuery(null)}
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
                onViewProfile={(uid) => {
                  setSelectedProfileId(uid);
                  setView('profile');
                }}
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
        // Core Team: Allow owners to view their own profile if explicitly targeted via UID/Deep Link
        // Otherwise, default to dashboard for own profile to allow editing
        const isDeepLink = new URLSearchParams(window.location.search).has('uid');
        if ((selectedProfileId === profile?.uid && !isDeepLink) || (!selectedProfileId && profile)) {
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
              onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
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

  const onVoiceProcessed = (data: any) => {
    // Intelligent Navigation based on Voice Intent
    if (data.product) {
      // If it's a listing intent (supplier) or a search (customer)
      if (profile?.role === 'supplier') {
        setView('dashboard');
        setDashboardTab('products');
        // In a real app, we'd pre-populate the 'Add Product' form here
      } else {
        setView('marketplace');
        setDashboardTab('all' as any);
        // We could also pass the product name as a search query
      }
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
      
      <NotificationCenter 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={handleDeepNavigate}
      />

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
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              notificationsUnreadCount={unreadNotificationsCount}
            >
              {renderView()}
            </Layout>

            <SmartVoiceHub 
              isOpen={isVoiceHubOpen} 
              onClose={() => setIsVoiceHubOpen(false)}
              onProcessed={onVoiceProcessed}
            />
          </motion.div>
      </AnimatePresence>
    </div>
  );
}
