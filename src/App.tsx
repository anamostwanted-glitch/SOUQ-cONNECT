import React, { useState, useEffect } from 'react';
import { auth, db } from './core/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile, AppFeatures, UserRole } from './core/types';
import { BrandingProvider } from './core/providers/BrandingProvider';
import { Layout } from './modules/site/components/Layout';
import Home from './modules/site/components/Home';
import Auth from './modules/site/components/Auth';
import RoleSelection from './modules/site/components/RoleSelection';
import { MarketInterface } from './modules/marketplace/components/MarketInterface';
import { ChatHub } from './modules/common/components/ChatHub';
import Dashboard from './modules/site/components/Dashboard';
import { ProfileView } from './modules/site/components/ProfileView';
import { handleFirestoreError, OperationType } from './core/utils/errorHandling';

export default function App() {
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
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [supplierTab, setSupplierTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;

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
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeUser) unsubscribeUser();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-background">Loading...</div>;
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <Home 
            profile={profile} 
            onNavigate={setView} 
            onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
            onViewProfile={(uid) => { /* handle profile view */ }}
            viewMode={viewMode as any}
            uiStyle={uiStyle}
          />
        );
      case 'role-selection':
        return <RoleSelection onSelect={(role) => { setView('auth'); }} />;
      case 'auth':
        return <Auth onAuthSuccess={(role) => { setView('home'); }} />;
      case 'marketplace':
        return (
          <MarketInterface 
            profile={profile} 
            features={features}
            onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
            onViewProfile={(uid) => { /* handle profile view */ }}
            viewMode={viewMode as any}
          />
        );
      case 'chat':
        return (
          <ChatHub 
            profile={profile} 
            onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
            onBack={() => setView('home')}
          />
        );
      case 'dashboard':
        if (!profile) return <Auth onAuthSuccess={() => setView('dashboard')} />;
        return (
          <Dashboard 
            profile={profile}
            features={features}
            supplierTab={supplierTab}
            setSupplierTab={setSupplierTab}
            onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
            onViewProfile={(uid) => { /* handle profile view */ }}
            viewMode={viewMode as any}
            uiStyle={uiStyle}
          />
        );
      case 'profile':
        return <ProfileView profile={profile} features={features} onBack={() => setView('home')} />;
      default:
        return <Home profile={profile} onNavigate={setView} viewMode={viewMode as any} uiStyle={uiStyle} />;
    }
  };

  return (
    <BrandingProvider>
      <Layout 
        profile={profile}
        features={features}
        currentView={currentView}
        setView={setView}
        setActiveChatId={setActiveChatId}
        supplierTab={supplierTab}
        setSupplierTab={setSupplierTab}
        viewMode={viewMode as any}
        setViewMode={setViewMode as any}
        uiStyle={uiStyle}
        setUiStyle={setUiStyle}
      >
        {renderView()}
      </Layout>
    </BrandingProvider>
  );
}
