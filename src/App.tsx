import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MarketInterface } from './modules/marketplace/components/MarketInterface';
import Dashboard from './modules/site/components/Dashboard';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './core/firebase';
import { UserProfile, AppFeatures, UserRole, SiteSettings, ProductRequest } from './core/types';
import { BrandingProvider } from './core/providers/BrandingProvider';
import { Layout } from './modules/site/components/Layout';
import Home from './modules/site/components/Home';
import Auth from './modules/site/components/Auth';
import RoleSelection from './modules/site/components/RoleSelection';
import { Skeleton } from './shared/components/Skeleton';
import { HelpCircle } from 'lucide-react';
import { handleFirestoreError, OperationType, handleAiError } from './core/utils/errorHandling';
import { PageLoader } from './shared/components/PageLoader';
import { UserNeuralHub } from './modules/common/components/UserNeuralHub';
import { usePredictiveNavigation } from './shared/hooks/usePredictiveNavigation';
import { useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { preFetchNeuralPulse } from './core/services/geminiService';
import { DiscoveryCanvas } from './components/Discovery/DiscoveryCanvas';
import { ChatHub } from './modules/common/components/ChatHub';
import ChatView from './modules/common/components/ChatView';
import { ProfileView } from './modules/site/components/ProfileView';
import { ConnectRewards } from './modules/user/components/ConnectRewards';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  const { i18n } = useTranslation();
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
  const [settings, setSettings] = useState<SiteSettings>({});
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
    let unsubscribeUser: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setProfile(userData);
            setViewMode(prev => prev === 'customer' && userData.role !== 'customer' ? userData.role : prev);
            
            // Pre-fetch AI insights for smoother experience
            preFetchNeuralPulse(userData).catch(err => handleAiError(err, "Neural Pulse pre-fetch"));
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
        setSettings(snap.data() as SiteSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <Home 
            profile={profile} 
            onNavigate={setView} 
            onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
            onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
            viewMode={viewMode as any}
            uiStyle={uiStyle}
          />
        );
      case 'role-selection':
        return <RoleSelection onSelect={(role) => { setViewMode(role); setView('auth'); }} />;
      case 'auth':
        return <Auth onAuthSuccess={(role) => { setView('home'); }} initialRole={viewMode} />;
      case 'marketplace':
        return (
          <Suspense fallback={<Skeleton className="h-screen w-full" />}>
            <MarketInterface 
              profile={profile} 
              features={features}
              onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
              onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
              viewMode={viewMode as any}
            />
          </Suspense>
        );
      case 'discovery':
        return <DiscoveryCanvas />;
      case 'chat':
        if (activeChatId) {
          return (
            <ChatView 
              chatId={activeChatId}
              profile={profile}
              features={features}
              onBack={() => setActiveChatId(null)}
              onViewProfile={(uid) => { /* handle profile view */ }}
            />
          );
        }
        return (
          <ChatHub 
            profile={profile} 
            onOpenChat={(id) => setActiveChatId(id)}
            onBack={() => setView('home')}
          />
        );
      case 'smart_pulse':
        if (!profile) return <Auth onAuthSuccess={() => setView('smart_pulse')} />;
        return (
          <div className="pt-24 px-4 min-h-screen bg-brand-background">
            <UserNeuralHub profile={profile} isRtl={i18n.language === 'ar'} />
          </div>
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
          <div className="pt-24 px-4 min-h-screen bg-brand-background flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mb-6">
              <HelpCircle size={40} />
            </div>
            <h1 className="text-3xl font-black text-brand-text-main mb-4">
              {i18n.language === 'ar' ? 'مركز المساعدة الذكي' : 'Neural Help Center'}
            </h1>
            <p className="text-brand-text-muted max-w-md mb-8">
              {i18n.language === 'ar' 
                ? 'نحن هنا لمساعدتك. قريباً سنقوم بإطلاق نظام دعم مدعوم بالذكاء الاصطناعي للإجابة على جميع استفساراتك.' 
                : 'We are here to help. Soon we will launch an AI-powered support system to answer all your inquiries.'}
            </p>
            <button 
              onClick={() => setView('home')}
              className="px-8 py-3 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20"
            >
              {i18n.language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </button>
          </div>
        );
      case 'profile':
        if (selectedProfileId === profile?.uid || (!selectedProfileId && profile)) {
          setView('dashboard');
          return null;
        }
        return (
          <ProfileView 
            userId={selectedProfileId || profile?.uid} 
            profile={selectedProfileId ? null : profile} 
            features={features} 
            onBack={() => {
              setSelectedProfileId(null);
              setView('home');
            }} 
          />
        );
      case 'connect':
        if (!profile) return <Auth onAuthSuccess={() => setView('connect')} />;
        return <ConnectRewards profile={profile} settings={settings} onBack={() => setView('home')} />;
      default:
        return <Home profile={profile} onNavigate={setView} viewMode={viewMode as any} uiStyle={uiStyle} />;
    }
  };

  const onBack = () => {
    // Logic to go back based on currentView
    if (currentView === 'chat') setActiveChatId(null);
    else if (currentView === 'profile') setView('home');
    else if (currentView !== 'home') setView('home');
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 100;
    const isRtl = i18n.language === 'ar';
    
    // RTL: Swipe Right -> Back
    // LTR: Swipe Left -> Back
    if (isRtl) {
      if (info.offset.x > swipeThreshold) onBack();
    } else {
      if (info.offset.x < -swipeThreshold) onBack();
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <AnimatePresence mode="wait">
          {loading ? (
            <PageLoader key="loader" />
          ) : (
            <motion.div
              key="content"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="min-h-screen"
            >
              <Layout 
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
          )}
        </AnimatePresence>
      </BrandingProvider>
    </QueryClientProvider>
  );
}
