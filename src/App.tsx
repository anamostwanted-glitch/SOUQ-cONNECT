import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './core/firebase';
import { UserProfile, AppFeatures, UserRole, SiteSettings } from './core/types';
import { BrandingProvider } from './core/providers/BrandingProvider';
import { Layout } from './modules/site/components/Layout';
import Home from './modules/site/components/Home';
import Auth from './modules/site/components/Auth';
import RoleSelection from './modules/site/components/RoleSelection';
import { MarketInterface } from './modules/marketplace/components/MarketInterface';
import { DiscoveryCanvas } from './components/Discovery/DiscoveryCanvas';
import { ChatHub } from './modules/common/components/ChatHub';
import ChatView from './modules/common/components/ChatView';
import Dashboard from './modules/site/components/Dashboard';
import { ProfileView } from './modules/site/components/ProfileView';
import { NexusRewards } from './modules/user/components/NexusRewards';
import { handleFirestoreError, OperationType } from './core/utils/errorHandling';
import { PageLoader } from './shared/components/PageLoader';

import i18n from './i18n';
import { UserNeuralHub } from './modules/common/components/UserNeuralHub';

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
  const [settings, setSettings] = useState<SiteSettings>({});
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

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SiteSettings);
      }
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
      case 'nexus':
        if (!profile) return <Auth onAuthSuccess={() => setView('nexus')} />;
        return <NexusRewards profile={profile} settings={settings} onBack={() => setView('home')} />;
      default:
        return <Home profile={profile} onNavigate={setView} viewMode={viewMode as any} uiStyle={uiStyle} />;
    }
  };

  return (
    <BrandingProvider>
      <AnimatePresence mode="wait">
        {loading ? (
          <PageLoader key="loader" />
        ) : (
          <motion.div
            key="content"
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
              supplierTab={supplierTab}
              setSupplierTab={setSupplierTab}
              viewMode={viewMode as any}
              setViewMode={setViewMode as any}
              uiStyle={uiStyle}
              setUiStyle={setUiStyle}
            >
              {renderView()}
            </Layout>
          </motion.div>
        )}
      </AnimatePresence>
    </BrandingProvider>
  );
}
