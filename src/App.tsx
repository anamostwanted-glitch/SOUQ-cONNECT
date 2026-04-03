import React, { useState, useEffect, Suspense, lazy } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { auth, db } from './core/firebase';
import { UserProfile, AppFeatures, UserRole } from './core/types';
import { Layout as AppLayout } from './modules/site/components/Layout';
import { usePersistedState } from './shared/hooks/usePersistedState';
import ErrorBoundary from './core/components/ErrorBoundary';
import Auth from './modules/site/components/Auth';
import RoleSelection from './modules/site/components/RoleSelection';
import { ProfileView } from './modules/site/components/ProfileView';

import { TooltipProvider } from './shared/components/ui/tooltip';
import { BrandingProvider } from './core/providers/BrandingProvider';
import { Toaster } from 'sonner';
import { CacheOptimizer } from './shared/components/CacheOptimizer';

// Lazy load views for better performance
const Home = lazy(() => import('./modules/site/components/Home'));
const Dashboard = lazy(() => import('./modules/site/components/Dashboard'));
const MarketInterface = lazy(() => import('./modules/marketplace/components/MarketInterface').then(m => ({ default: m.MarketInterface })));
const ChatView = lazy(() => import('./modules/common/components/ChatView'));
const ChatHub = lazy(() => import('./modules/common/components/ChatHub').then(m => ({ default: m.ChatHub })));
const NotificationsLog = lazy(() => import('./modules/site/components/NotificationsLog').then(m => ({ default: m.NotificationsLog })));
const Legal = lazy(() => import('./modules/site/components/Legal'));

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setView] = useState('home');
  const [viewMode, setViewMode] = usePersistedState<'admin' | 'supplier' | 'customer'>('view_mode', 'customer');
  const [uiStyle, setUiStyle] = usePersistedState<'classic' | 'minimal'>('ui_style', 'classic');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [supplierTab, setSupplierTab] = useState<string>('dashboard');
  const [selectedProfileUid, setSelectedProfileUid] = useState<string | null>(null);
  const [isAutoOptimizerOpen, setIsAutoOptimizerOpen] = useState(false);
  const [features, setFeatures] = useState<AppFeatures>({
    marketplace: true,
    aiChat: true,
    supplierVerification: true,
    marketTrends: true,
    priceIntelligence: true
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const profileData = snap.data() as UserProfile;
        setProfile(profileData);
        if (profileData.role === 'admin') {
          // If it's an admin, set viewMode to admin if it's currently customer (default)
          // This ensures admins see the admin view by default
          if (viewMode === 'customer') {
            setViewMode('admin');
          }
        } else {
          setViewMode(profileData.role as any);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'features'), (snap) => {
      if (snap.exists()) {
        setFeatures(snap.data() as AppFeatures);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const lastOptimization = localStorage.getItem('last_system_optimization');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!lastOptimization || (now - parseInt(lastOptimization)) > oneDay) {
      // Small delay to let the app settle
      const timer = setTimeout(() => {
        setIsAutoOptimizerOpen(true);
        localStorage.setItem('last_system_optimization', now.toString());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    const q = query(
      collection(db, 'chats'),
      where(profile.role === 'supplier' ? 'supplierId' : 'customerId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      let count = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        count += (data.unreadCount?.[user.uid] || 0);
      });
      setChatUnreadCount(count);
    });
    return unsub;
  }, [user, profile]);

  const handleAuthSuccess = (role: UserRole) => {
    setView('home');
    if (role === 'admin') {
      setViewMode('admin');
    } else {
      setViewMode(role as any);
    }
  };

  const handleOpenChat = (chatId: string) => {
    setActiveChatId(chatId);
    setView('chat');
  };

  const handleViewProfile = (uid: string) => {
    setSelectedProfileUid(uid);
    setView('profile-detail');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <Home 
            profile={profile} 
            onNavigate={setView} 
            onOpenChat={handleOpenChat}
            onViewProfile={handleViewProfile}
            viewMode={viewMode}
            uiStyle={uiStyle}
          />
        );
      case 'dashboard':
        return (
          <Dashboard 
            profile={profile!} 
            features={features} 
            supplierTab={supplierTab}
            setSupplierTab={setSupplierTab}
            onOpenChat={handleOpenChat}
            onViewProfile={handleViewProfile}
            viewMode={viewMode}
            uiStyle={uiStyle}
          />
        );
      case 'marketplace':
        return (
          <MarketInterface 
            profile={profile} 
            features={features} 
            onOpenChat={handleOpenChat}
            onViewProfile={handleViewProfile}
          />
        );
      case 'profile':
        return (
          <ProfileView 
            userId={user!.uid}
            profile={profile!} 
            features={features} 
            onBack={() => setView('home')}
          />
        );
      case 'profile-detail':
        return (
          <ProfileView 
            userId={selectedProfileUid!}
            features={features}
            onBack={() => setView('home')}
          />
        );
      case 'chat':
        return activeChatId ? (
          <ChatView 
            chatId={activeChatId} 
            profile={profile} 
            features={features} 
            onBack={() => setActiveChatId(null)}
            onViewProfile={handleViewProfile}
          />
        ) : (
          <ChatHub 
            profile={profile}
            onOpenChat={handleOpenChat}
            onBack={() => setView('home')}
          />
        );
      case 'notifications-log':
        return <NotificationsLog onBack={() => setView('home')} />;
      case 'privacy':
      case 'terms':
        return <Legal type={currentView} onBack={() => setView('home')} />;
      default:
        return <Home profile={profile} onNavigate={setView} onOpenChat={handleOpenChat} onViewProfile={handleViewProfile} viewMode={viewMode} />;
    }
  };

  return (
    <ErrorBoundary>
      <BrandingProvider>
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <CacheOptimizer 
            isOpen={isAutoOptimizerOpen} 
            onClose={() => setIsAutoOptimizerOpen(false)} 
            autoStart={true}
          />
          {(!user && currentView === 'role-selection') ? (
            <RoleSelection onSelect={(role) => setView(`auth-${role}`)} />
          ) : (!user && currentView.startsWith('auth-')) ? (
            <Auth onAuthSuccess={handleAuthSuccess} initialRole={currentView.split('-')[1] as UserRole} />
          ) : (
            <AppLayout 
              profile={profile}
              features={features}
              currentView={currentView}
              setView={setView}
              setActiveChatId={setActiveChatId}
              viewMode={viewMode}
              setViewMode={setViewMode}
              uiStyle={uiStyle}
              setUiStyle={setUiStyle}
              supplierTab={supplierTab}
              setSupplierTab={setSupplierTab}
              chatUnreadCount={chatUnreadCount}
            >
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
                </div>
              }>
                {renderView()}
              </Suspense>
            </AppLayout>
          )}
        </TooltipProvider>
      </BrandingProvider>
    </ErrorBoundary>
  );
};

export default App;
