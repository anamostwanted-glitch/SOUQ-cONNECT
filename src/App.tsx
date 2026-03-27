import React, { useState, useEffect, Suspense, lazy } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import './i18n';
import { UserProfile, UserRole, AppFeatures } from './types';
import { Layout } from './components/Layout';
import { handleFirestoreError, OperationType } from './utils/errorHandling';
import { isAdmin } from './utils/rbac';

// 2. Code Splitting (Lazy Loading)
const Home = lazy(() => import('./components/Home'));
const Auth = lazy(() => import('./components/Auth'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ChatView = lazy(() => import('./components/ChatView'));
const RoleSelection = lazy(() => import('./components/RoleSelection'));
const Legal = lazy(() => import('./components/Legal'));
const ProfileView = lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })));
const MarketplaceView = lazy(() => import('./components/MarketplaceView'));
const NotificationsLog = lazy(() => import('./components/NotificationsLog').then(m => ({ default: m.NotificationsLog })));
const BrandingSettings = lazy(() => import('./components/BrandingSettings'));
const GraphQLDemo = lazy(() => import('./components/GraphQLDemo'));

import { BrandingProvider } from './components/BrandingProvider';

export default function App() {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [features, setFeatures] = useState<AppFeatures>({
    marketplace: true,
    aiChat: true,
    supplierVerification: true,
    marketTrends: true,
    priceIntelligence: true
  });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'dashboard' | 'chat' | 'auth-supplier' | 'auth-customer' | 'role-selection' | 'profile' | 'privacy' | 'terms' | 'marketplace' | 'notifications-log' | 'branding'>('home');
  const [history, setHistory] = useState<string[]>(['home']);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      localStorage.setItem('referralCode', ref);
    }
  }, []);

  const navigate = (newView: any, uid: string | null = null) => {
    if (newView === view && uid === targetUserId) return;
    
    if (newView === 'profile') {
      setTargetUserId(uid);
    }
    
    setHistory(prev => [...prev, newView]);
    setView(newView);
  };

  useEffect(() => {
    (window as any).navigateApp = navigate;
  }, [navigate]);

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // remove current
      const prevView = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setView(prevView as any);
    } else {
      setView('home');
    }
  };
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const [supplierTab, setSupplierTab] = useState<'dashboard' | 'personal' | 'company' | 'marketing'>('dashboard');
  const [viewMode, setViewMode] = useState<'admin' | 'supplier' | 'customer'>('admin');

  const prefetch = (targetView: string) => {
    // Simple prefetching logic: trigger data loading for the target view
    // In a real app, this could involve pre-fetching Firestore collections
    // or pre-loading components.
    console.log(`Prefetching data for: ${targetView}`);
    
    if (targetView === 'dashboard') {
      // Pre-fetch dashboard data if needed
    } else if (targetView === 'marketplace') {
      // Pre-fetch marketplace data
    }
  };

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let unsubFeatures: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user);
      setUser(user);
      
      // Fetch features - move inside auth listener but ensure cleanup
      if (unsubFeatures) unsubFeatures();
      unsubFeatures = onSnapshot(doc(db, 'settings', 'features'), (snap) => {
        console.log('Features snapshot:', snap.exists());
        if (snap.exists()) {
          setFeatures(snap.data() as AppFeatures);
        }
      }, (error) => {
        console.error('Features error:', error);
        handleFirestoreError(error, OperationType.GET, 'settings/features');
      });

      if (user) {
        console.log('User logged in:', user.uid);
        const path = `users/${user.uid}`;
        if (unsubProfile) unsubProfile();
        unsubProfile = onSnapshot(doc(db, 'users', user.uid), async (snap) => {
          console.log('Profile snapshot:', snap.exists());
          if (snap.exists()) {
            let data = snap.data() as UserProfile;
            
            // Force admin role for master email
            if (user.email === 'anamostwanted@gmail.com' && data.role !== 'admin') {
              try {
                const { updateDoc } = await import('firebase/firestore');
                await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
                data.role = 'admin';
              } catch (e) {
                console.error("Failed to force admin role:", e);
              }
            }

            setProfile(data);
            if (data.language) {
              i18n.changeLanguage(data.language);
            }
            
            // Sync email if it was changed via Firebase Auth
            if (user.email && data.email !== user.email) {
              try {
                const { updateDoc } = await import('firebase/firestore');
                await updateDoc(doc(db, 'users', user.uid), { email: user.email });
              } catch (e) {
                console.error("Failed to sync email to Firestore:", e);
              }
            }

            // Redirect if on auth views
            if (view === 'role-selection' || view === 'auth-supplier' || view === 'auth-customer') {
              const isAdminLike = isAdmin(data);
              navigate(data.role === 'supplier' || isAdminLike ? 'dashboard' : 'home');
            }
          }
          setLoading(false);
        }, (error) => {
          console.error('Profile error:', error);
          handleFirestoreError(error, OperationType.GET, path);
          setLoading(false);
        });
      } else {
        console.log('User logged out');
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = undefined;
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
      if (unsubFeatures) unsubFeatures();
    };
  }, [i18n, view]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  const handleAuthSuccess = (role: UserRole) => {
    const isAdminLike = ['admin', 'manager', 'supervisor'].includes(role);
    if (role === 'supplier' || isAdminLike) {
      navigate('dashboard');
    } else {
      navigate('home');
    }
  };

  const renderView = () => {
    const currentProfile = profile ? { ...profile, role: viewMode === 'admin' ? profile.role : viewMode } : null;

    if (!user) {
      switch (view) {
        case 'role-selection':
          return <RoleSelection onSelect={(role) => {
            setSelectedRole(role);
            navigate(role === 'supplier' ? 'auth-supplier' : 'auth-customer');
          }} />;
        case 'auth-supplier':
          return <Auth onAuthSuccess={handleAuthSuccess} initialRole="supplier" />;
        case 'auth-customer':
          return <Auth onAuthSuccess={handleAuthSuccess} initialRole="customer" />;
        case 'home':
          return (
            <div className="space-y-6">
              <GraphQLDemo />
              <Home profile={null} features={features} onNavigate={navigate} onOpenChat={() => navigate('role-selection')} />
            </div>
          );
        case 'privacy':
          return <Legal type="privacy" onBack={goBack} />;
        case 'terms':
          return <Legal type="terms" onBack={goBack} />;
        default:
          return <Home profile={null} features={features} onNavigate={navigate} onOpenChat={() => navigate('role-selection')} />;
      }
    }
    
    switch (view) {
      case 'home':
        return (
          <div className="space-y-6">
            <GraphQLDemo />
            <Home profile={currentProfile} features={features} onNavigate={navigate} onOpenChat={(chatId) => {
              setActiveChatId(chatId);
              navigate('chat');
            }} onViewProfile={(uid) => {
              navigate('profile', uid);
            }} />
          </div>
        );
      case 'privacy':
        return <Legal type="privacy" onBack={goBack} />;
      case 'terms':
        return <Legal type="terms" onBack={goBack} />;
      case 'role-selection':
        return <RoleSelection onSelect={(role) => {
          setSelectedRole(role);
          navigate(role === 'supplier' ? 'auth-supplier' : 'home');
        }} />;
      case 'dashboard':
        return (
          <Dashboard 
            profile={currentProfile} 
            features={features}
            supplierTab={supplierTab}
            setSupplierTab={setSupplierTab}
            onOpenChat={(chatId) => {
              setActiveChatId(chatId);
              navigate('chat');
            }} 
            onViewProfile={(uid) => {
              navigate('profile', uid);
            }}
          />
        );
      case 'chat':
        return activeChatId ? (
          <ChatView 
            chatId={activeChatId} 
            profile={currentProfile} 
            features={features}
            onBack={goBack} 
            onViewProfile={(uid) => {
              navigate('profile', uid);
            }}
          />
        ) : <Dashboard profile={currentProfile} features={features} onOpenChat={setActiveChatId} onViewProfile={(uid) => {
          navigate('profile', uid);
        }} />;
      case 'profile':
        return (
          <ProfileView 
            userId={targetUserId || undefined} 
            profile={!targetUserId ? currentProfile : undefined} 
            features={features}
            onBack={goBack}
          />
        );
      case 'marketplace':
        if (!features.marketplace) {
          navigate('home');
          return null;
        }
        return (
          <MarketplaceView 
            profile={currentProfile} 
            features={features}
            onOpenChat={(chatId) => {
              setActiveChatId(chatId);
              navigate('chat');
            }} 
            onViewProfile={(uid) => {
              navigate('profile', uid);
            }}
          />
        );
      case 'notifications-log':
        return <NotificationsLog onBack={goBack} />;
      case 'branding':
        return <BrandingSettings onBack={goBack} />;
      default:
        return <Home profile={currentProfile} features={features} onNavigate={navigate} onOpenChat={(chatId) => {
          setActiveChatId(chatId);
          navigate('chat');
        }} onViewProfile={(uid) => {
          navigate('profile', uid);
        }} />;
    }
  };

  return (
    <BrandingProvider>
      <Layout 
        profile={profile} 
        features={features}
        currentView={view} 
        setView={navigate}
        setActiveChatId={setActiveChatId}
        onBack={goBack}
        supplierTab={supplierTab}
        setSupplierTab={setSupplierTab}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onPrefetch={prefetch}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center p-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          </div>
        }>
          {renderView()}
        </Suspense>
      </Layout>
    </BrandingProvider>
  );
}

