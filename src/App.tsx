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
import ChatView from './modules/common/components/ChatView';
import Dashboard from './modules/site/components/Dashboard';
import { ProfileView } from './modules/site/components/ProfileView';
import { handleFirestoreError, OperationType } from './core/utils/errorHandling';

import { PageLoader } from './shared/components/PageLoader';

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
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
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
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`, false);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeUser) unsubscribeUser();
      }
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  if (loading) {
    return <PageLoader />;
  }

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
        return <RoleSelection onSelect={(role) => { setView('auth'); }} />;
      case 'auth':
        return <Auth onAuthSuccess={(role) => { setView('home'); }} />;
      case 'marketplace':
        return (
          <MarketInterface 
            profile={profile} 
            features={features}
            onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
            onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
            viewMode={viewMode as any}
          />
        );
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
      case 'dashboard':
        if (!profile) return <Auth onAuthSuccess={() => setView('dashboard')} />;
        return (
          <Dashboard 
            profile={profile}
            features={features}
            supplierTab={supplierTab}
            setSupplierTab={setSupplierTab}
            onOpenChat={(id) => { setActiveChatId(id); setView('chat'); }}
            onViewProfile={(uid) => { setSelectedProfileId(uid); setView('profile'); }}
            viewMode={viewMode as any}
            uiStyle={uiStyle}
          />
        );
      case 'profile':
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
