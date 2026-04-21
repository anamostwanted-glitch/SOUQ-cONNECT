import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../core/firebase';
import { logAction } from '../../../core/services/auditService';
import { SiteSettings } from '../../../core/types';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { HapticButton } from '../../../shared/components/HapticButton';
import { Save, Loader2, Palette, Layout, Search, Sparkles, LayoutGrid, ListChecks, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { IdentitySettings } from './settings/IdentitySettings';
import { HeroSettings } from './settings/HeroSettings';
import { SearchSettings } from './settings/SearchSettings';
import { MarketSettings } from './settings/MarketSettings';
import { RegistrationSettings } from './settings/RegistrationSettings';
import { SocialProofSettings } from './settings/SocialProofSettings';
import { FooterSettings } from './settings/FooterSettings';
import { AISettings } from './settings/AISettings';
import { NeuralHaloSettings } from './settings/NeuralHaloSettings';
import { FlubberSettings } from './settings/FlubberSettings';
import { LoadingCustomizer } from './LoadingCustomizer';
import { MaintenanceSettings } from './settings/MaintenanceSettings';
import { ShieldAlert } from 'lucide-react';

export const SiteSettingsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [settings, setSettings] = useState<SiteSettings>({
    // ... (rest of initial state remains same)
    maintenanceMode: false,
    maintenanceBypassEmails: ['anamostwanted@gmail.com'],
  } as any);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [currentTab, setCurrentTab] = useState('identity');
  const [showPreview, setShowPreview] = useState(true);

  // Tabs Configuration
  const tabs = [
    { id: 'identity', label: isRtl ? 'الهوية البصرية' : 'Brand Identity', icon: Palette, color: 'text-brand-primary' },
    { id: 'hero', label: isRtl ? 'الواجهة الرئيسية' : 'Hero Section', icon: Layout, color: 'text-brand-primary' },
    { id: 'search', label: isRtl ? 'نظام البحث' : 'Search System', icon: Search, color: 'text-brand-primary' },
    { id: 'market', label: isRtl ? 'تخطيط السوق' : 'Marketplace', icon: LayoutGrid, color: 'text-brand-primary' },
    { id: 'ai', label: isRtl ? 'الذكاء الاصطناعي' : 'AI Assistant', icon: Bot, color: 'text-brand-primary' },
    { id: 'footer', label: isRtl ? 'التذييل' : 'Footer', icon: ListChecks, color: 'text-brand-primary' },
    { id: 'loader', label: isRtl ? 'شاشة التحميل' : 'Loading Screen', icon: Sparkles, color: 'text-brand-primary' },
    { id: 'maintenance', label: isRtl ? 'الصيانة' : 'Maintenance', icon: ShieldAlert, color: 'text-brand-error' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: any) => {
    // ... (logic remains same)
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }));
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        ...settings,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      if (auth.currentUser) {
        await logAction(auth.currentUser.uid, 'UPDATE_SETTINGS', 'settings/site', settings);
      }
      toast.success(isRtl ? 'تم حفظ الإعدادات' : 'Settings saved');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/site', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex h-[400px] items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-brand-primary opacity-50" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto px-4 lg:px-8">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
            <Layout size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-brand-text-main tracking-tight">
              {isRtl ? 'إدارة الواجهة الذكية' : 'Smart Interface Control'}
            </h1>
            <p className="text-xs text-brand-text-muted font-bold uppercase tracking-widest mt-0.5">
              {isRtl ? 'تخصيص تجربة المستخدم المركزية' : 'CUstomize CORE UX & Branding'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <HapticButton
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
              showPreview ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary' : 'bg-brand-background border-brand-border text-brand-text-muted'
            }`}
          >
            <Bot size={18} />
            {isRtl ? (showPreview ? 'إخفاء المعاينة' : 'إظهار المعاينة') : (showPreview ? 'Hide Preview' : 'Show Preview')}
          </HapticButton>
          
          <HapticButton
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-primary text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isRtl ? 'تحديث الموقع' : 'Update Site'}
          </HapticButton>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Nav */}
        <nav className="lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scrollbar-hide no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-black transition-all whitespace-nowrap min-w-max lg:min-w-0 border shadow-sm ${
                currentTab === tab.id 
                  ? 'bg-brand-surface border-brand-primary/30 text-brand-text-main shadow-brand-primary/5' 
                  : 'bg-brand-surface/50 border-brand-border/40 text-brand-text-muted hover:bg-brand-surface hover:text-brand-text-main'
              }`}
            >
              <div className={`p-2 rounded-xl transition-colors ${currentTab === tab.id ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-background text-brand-text-muted'}`}>
                <tab.icon size={18} />
              </div>
              {tab.label}
              {currentTab === tab.id && (
                <motion.div layoutId="activeTabGlow" className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(27,151,167,0.5)]" />
              )}
            </button>
          ))}
        </nav>

        {/* Content & Preview Split */}
        <div className={`lg:col-span-9 grid grid-cols-1 ${showPreview ? 'xl:grid-cols-2' : ''} gap-8 transition-all duration-500`}>
          {/* Form Side */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRtl ? -20 : 20 }}
                className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm min-h-[500px]"
              >
                {currentTab === 'identity' && <IdentitySettings settings={settings} setSettings={setSettings} isRtl={isRtl} handleFileUpload={handleFileUpload} isUploadingLogo={isUploadingLogo} />}
                {currentTab === 'hero' && <HeroSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />}
                {currentTab === 'search' && <SearchSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />}
                {currentTab === 'market' && <MarketSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />}
                {currentTab === 'footer' && <FooterSettings settings={settings} setSettings={setSettings} isRtl={isRtl} handleFileUpload={handleFileUpload} />}
                {currentTab === 'ai' && (
                  <div className="space-y-6">
                    <AISettings settings={settings} setSettings={setSettings} isRtl={isRtl} />
                    <FlubberSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />
                    <NeuralHaloSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />
                  </div>
                )}
                {currentTab === 'maintenance' && <MaintenanceSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />}
                {currentTab === 'loader' && <LoadingCustomizer />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Preview Side */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: isRtl ? -20 : 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="sticky top-24 hidden xl:block"
              >
                <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden aspect-[4/5] flex flex-col relative group">
                  {/* Browser Header Mock */}
                  <div className="p-4 bg-brand-background border-b border-brand-border flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-4 bg-brand-surface rounded-lg h-6 flex items-center px-3 gap-2">
                       {settings.faviconUrl && <img src={settings.faviconUrl} className="w-3 h-3 rounded-sm" />}
                       <span className="text-[10px] text-brand-text-muted truncate font-bold uppercase tracking-wider">{settings.siteName || 'Connect Marketplace'}</span>
                    </div>
                  </div>
                  
                  {/* Preview Canvas */}
                  <div className="flex-1 bg-brand-background overflow-hidden relative">
                     {/* Preview Content based on tab */}
                     <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-brand-background to-brand-surface">
                        <div className="w-full max-w-sm space-y-4">
                           {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-10 object-contain mx-auto mb-6" style={{ transform: `scale(${settings.logoScale || 1})` }} />}
                           <h1 className="text-2xl font-black text-brand-text-main leading-tight">
                              {isRtl ? settings.heroTitleAr : settings.heroTitleEn}
                           </h1>
                           <p className="text-sm text-brand-text-muted font-medium">
                              {isRtl ? settings.heroDescriptionAr : settings.heroDescriptionEn}
                           </p>
                           <div className="flex items-center gap-2 bg-brand-surface border border-brand-border p-2 rounded-2xl shadow-inner">
                              <Search size={14} className="text-brand-text-muted ml-2" />
                              <span className="text-xs text-brand-text-muted/50">{isRtl ? settings.searchPlaceholderAr : settings.searchPlaceholderEn}</span>
                           </div>
                           <button className="w-full py-3 px-6 bg-brand-primary text-white rounded-2xl font-black shadow-lg shadow-brand-primary/20 text-sm">
                              {isRtl ? settings.ctaButtonAr : settings.ctaButtonEn}
                           </button>
                        </div>
                     </div>

                     {/* Intelligence Badge */}
                     <div className="absolute top-6 right-6 p-2 bg-brand-background/80 backdrop-blur-md rounded-2xl border border-brand-border shadow-xl">
                        <Sparkles className="text-brand-primary animate-pulse" size={16} />
                     </div>
                  </div>

                  {/* Canvas Overlay Labels */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-brand-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">
                     Live Preview Mode
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
