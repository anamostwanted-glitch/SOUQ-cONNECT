import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { NotificationCenter } from './modules/common/components/NotificationCenter';
import { MaintenancePage } from './shared/components/MaintenancePage';
import { ImmuneSystemProvider } from './core/providers/ImmuneSystemProvider';
import { NeuralPulseIndicator } from './core/components/NeuralPulseIndicator';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './core/firebase';
import { analytics } from './core/services/AnalyticsService';
import { soundService } from './core/utils/soundService';

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
const Legal = lazy(() => import('./modules/site/components/Legal'));
const SupplierLandingPage = lazy(() => import('./modules/site/components/SupplierLandingPage'));
const SupplierOnboarding = lazy(() => import('./modules/site/components/SupplierOnboarding').then(m => ({ default: m.SupplierOnboarding })));

import { getChatId } from './core/utils/utils';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n: i18nInstance } = useTranslation();
  const { profile, viewMode, setViewMode, loading: authLoading } = useAuth();
  const { settings, features, loading: settingsLoading } = useSettings();
  const { categories, loading: categoriesLoading } = useCategories();

  const handleOpenChat = (id: string) => {
    let targetId = id;
    // If it's a single target UID and not a special chat, normalize it
    if (profile && !id.includes('_') && !id.startsWith('category_') && id !== 'system') {
      targetId = getChatId(profile.uid, id);
    }
    setActiveChatId(targetId);
    setView('chat');
  };

  // Helper for backward compatibility while migrating
  const setView = (view: string, params?: Record<string, string>) => {
    let path = '/';
    switch (view) {
      case 'home': path = '/'; break;
      case 'marketplace': path = '/marketplace'; break;
      case 'dashboard': path = '/dashboard'; break;
      case 'chat': path = '/chat'; break;
      case 'profile': path = '/profile'; break;
      case 'auth': path = '/auth'; break;
      case 'role-selection': path = '/role-selection'; break;
      case 'smart_pulse': path = '/smart-pulse'; break;
      case 'supplier_landing': path = '/join'; break;
      case 'supplier_onboarding': path = '/onboarding'; break;
      case 'help': path = '/help'; break;
      case 'terms': path = '/terms'; break;
      case 'privacy': path = '/privacy'; break;
      case 'connect': path = '/rewards'; break;
      default: path = `/${view}`;
    }
    
    if (params) {
      const search = new URLSearchParams(params).toString();
      path += `?${search}`;
    }
    
    navigate(path);
  };

  // Sync currentView state with location for legacy compatibility
  const [currentView, setCurrentView] = useState('home');

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      // Avoid tracking small/benign errors
      if (event.message.includes('ResizeObserver') || event.message.includes('Script error')) return;
      
      console.warn('App Warning [Global:error]:', event.message);
      analytics.trackEvent('app_error', { message: event.message, stack: event.error?.stack });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || String(event.reason);
      
      // Filter out Firebase permission errors from global tracking as they are handled locally
      if (reason.includes('Missing or insufficient permissions')) {
        console.warn('Permission warning (handled locally):', reason);
        return;
      }

      console.warn('App Warning [Global:unhandledrejection]:', reason);
      analytics.trackEvent('promise_rejection', { reason });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setCurrentView('home');
    else if (path.startsWith('/marketplace')) setCurrentView('marketplace');
    else if (path.startsWith('/dashboard')) setCurrentView('dashboard');
    else if (path.startsWith('/chat')) setCurrentView('chat');
    else if (path.startsWith('/profile')) setCurrentView('profile');
    else if (path.startsWith('/auth')) setCurrentView('auth');
    else if (path.startsWith('/role-selection')) setCurrentView('role-selection');
    else if (path.startsWith('/smart-pulse')) setCurrentView('smart_pulse');
    else if (path.startsWith('/join')) setCurrentView('supplier_landing');
    else if (path.startsWith('/onboarding')) setCurrentView('supplier_onboarding');
    else if (path.startsWith('/help')) setCurrentView('help');
    else if (path.startsWith('/terms')) setCurrentView('terms');
    else if (path.startsWith('/privacy')) setCurrentView('privacy');
    else if (path.startsWith('/rewards')) setCurrentView('connect');
    else setCurrentView('home');
  }, [location.pathname]);

  const [uiStyle, setUiStyle] = useState<'classic' | 'minimal'>('classic');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  const isMaintenanceActive = settings?.maintenanceMode;
  const isBypassed = profile?.email && (
    settings?.maintenanceBypassEmails?.includes(profile.email) || 
    profile.email === 'anamostwanted@gmail.com'
  );
  const isAuthPage = location.pathname.startsWith('/auth');
  const isStorefrontMode = new URLSearchParams(location.search).get('mode') === 'storefront';
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isVoiceHubOpen, setIsVoiceHubOpen] = useState(false);

  // Track Session Start
  useEffect(() => {
    analytics.trackEvent('session_start');
    soundService.preload();
  }, []);

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
    <ImmuneSystemProvider>
      <div className="min-h-screen relative">
        <Toaster position="top-center" richColors />
        <div className="hidden md:block">
          <NeuralPulseIndicator />
        </div>
        
        <NotificationCenter 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={handleDeepNavigate}
      />

      {isMaintenanceActive && !isBypassed && !isAuthPage ? (
        <ErrorBoundary>
          <MaintenancePage settings={settings} />
        </ErrorBoundary>
      ) : (
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
              isStorefrontMode={isStorefrontMode}
            >
              <Routes>
                <Route path="/join" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      <SupplierLandingPage 
                        onStart={() => {
                          setViewMode('supplier');
                          setView('auth');
                        }} 
                        settings={settings}
                      />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/onboarding" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      {profile ? (
                        <SupplierOnboarding 
                          profile={profile} 
                          categories={categories} 
                          onComplete={() => setView('home')} 
                        />
                      ) : (
                        <Auth onAuthSuccess={() => setView('supplier_onboarding')} onNavigate={setView} />
                      )}
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      <Home 
                        profile={profile} 
                        onNavigate={setView} 
                        onOpenChat={handleOpenChat}
                        onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
                        viewMode={viewMode as any}
                        uiStyle={uiStyle}
                      />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/role-selection" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      <RoleSelection onSelect={(role) => { setViewMode(role); setView('auth'); }} />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/auth" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      <Auth 
                        onAuthSuccess={() => { 
                          setView('home'); 
                        }} 
                        onNavigate={setView}
                        initialRole={viewMode} 
                      />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/marketplace/*" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      <MarketInterface 
                        onOpenChat={handleOpenChat}
                        onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
                        activeTab={dashboardTab as any}
                        setActiveTab={setDashboardTab as any}
                        initialItemId={initialItemId}
                        initialVoiceQuery={voiceSearchQuery}
                        onClearVoiceQuery={() => setVoiceSearchQuery(null)}
                      />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/discovery" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      <DiscoveryCanvas />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/chat/*" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      {activeChatId ? (
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
                      ) : (
                        <ChatHub 
                          profile={profile} 
                          onOpenChat={(id) => setActiveChatId(id)}
                          onBack={() => setView('home')}
                        />
                      )}
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/smart-pulse" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      {profile ? (
                        <div className="pt-24 px-4 min-h-screen bg-brand-background">
                          <UserNeuralHub profile={profile} isRtl={i18nInstance.language === 'ar'} />
                        </div>
                      ) : (
                        <Auth onAuthSuccess={() => setView('smart_pulse')} onNavigate={setView} />
                      )}
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/dashboard/*" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      {profile ? (
                        <Dashboard 
                          dashboardTab={dashboardTab}
                          setDashboardTab={setDashboardTab}
                          onOpenChat={handleOpenChat}
                          onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
                          uiStyle={uiStyle}
                        />
                      ) : (
                        <Auth onAuthSuccess={() => setView('dashboard')} onNavigate={setView} />
                      )}
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/help" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      <SmartHelp onBack={() => setView('home')} />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/partnerships" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      <Partnerships />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/profile/*" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      <ProfileView 
                        userId={selectedProfileId || profile?.uid} 
                        profile={selectedProfileId ? null : profile} 
                        currentUserProfile={profile}
                        features={features} 
                        onOpenChat={handleOpenChat}
                        onBack={() => setView('home')} 
                      />
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="/terms" element={<ErrorBoundary><Suspense fallback={<Skeleton className="h-screen w-full" />}><Legal type="terms" onBack={() => setView('home')} /></Suspense></ErrorBoundary>} />
                <Route path="/privacy" element={<ErrorBoundary><Suspense fallback={<Skeleton className="h-screen w-full" />}><Legal type="privacy" onBack={() => setView('home')} /></Suspense></ErrorBoundary>} />
                <Route path="/rewards" element={
                  <ErrorBoundary>
                    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
                      {profile ? (
                        <ConnectRewards profile={profile} settings={settings} onBack={() => setView('home')} />
                      ) : (
                        <Auth onAuthSuccess={() => setView('connect')} onNavigate={setView} />
                      )}
                    </Suspense>
                  </ErrorBoundary>
                } />
                <Route path="*" element={<ErrorBoundary><Suspense fallback={<Skeleton className="h-screen w-full" />}><Home onNavigate={setView} uiStyle={uiStyle} /></Suspense></ErrorBoundary>} />
              </Routes>
            </Layout>

            <SmartVoiceHub 
              isOpen={isVoiceHubOpen} 
              onClose={() => setIsVoiceHubOpen(false)}
              onProcessed={onVoiceProcessed}
            />
          </motion.div>
        </AnimatePresence>
      )}
      </div>
    </ImmuneSystemProvider>
  );
}
