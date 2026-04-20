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
import { motion } from 'motion/react';
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

export const SiteSettingsManager: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [settings, setSettings] = useState<SiteSettings>({
    heroTitleAr: '',
    heroTitleEn: '',
    heroDescriptionAr: '',
    heroDescriptionEn: '',
    searchPlaceholderAr: '',
    searchPlaceholderEn: '',
    ctaButtonAr: '',
    ctaButtonEn: '',
    siteName: '',
    logoUrl: '',
    logoScale: 1,
    loaderCenterText: 'SC',
    loaderStatusTextAr: 'جاري التحميل...',
    loaderStatusTextEn: 'Initializing Hub',
    loaderFooterTextAr: 'مدعوم بالذكاء الاصطناعي',
    loaderFooterTextEn: 'Powered by AI Intelligence',
    primaryTextColor: '#ffffff',
    secondaryTextColor: '#94a3b8',
    watermarkUrl: '',
    watermarkText: 'Souq Connect',
    watermarkOpacity: 0.7,
    watermarkPosition: 'bottom-right',
    watermarkScale: 1,
    loaderLogoUrl: '',
    loaderBackgroundStyle: 'gradient',
    loaderBackgroundColor: '#0f172a',
    loaderProgressBarColor: '#1b97a7',
    loaderLogoShape: 'squircle',
    loaderLogoAnimation: 'float',
    gridSettings: {
      mobileCols: 2,
      webCols: 4,
      gap: 16,
      aiAutoPilot: true
    },
    seoTitleAr: 'سوق كونكت | منصة B2B والبحث البصري',
    seoTitleEn: 'Souq Connect | B2B & Visual Search Platform',
    seoDescriptionAr: 'أكبر منصة تجارة B2B ذكية للربط بين الموردين والعملاء باستخدام الذكاء الاصطناعي.',
    seoDescriptionEn: 'The smartest B2B trading platform connecting suppliers and customers with AI.',
    faviconUrl: '',
    socialProof: {
      enabled: true
    },
    haloSettings: {
      enabled: true,
      size: 1.0,
      speed: 1.0,
      sensitivity: 1.0,
      glowStrength: 0.5,
      particleCount: 50,
      particleSize: 2,
      pointGlow: 15
    },
    flubberSettings: {
      enabled: true,
      color: '#10b981',
      opacity: 0.4,
      blobCount: 4,
      speed: 1.0,
      scale: 1.0,
      gooeyness: 30,
      interactive: true
    },
    footerAboutAr: 'سوق كونكت هو المنصة الأولى المدعومة بالذكاء الاصطناعي للربط بين المؤسسات والموردين في الشرق الأوسط. نحن نبني مستقبل التجارة الذكية.',
    footerAboutEn: 'Connect is the first AI-powered platform connecting institutions and suppliers in the Middle East. We are building the future of smart commerce.',
    footerEmail: 'support@connect.ai',
    footerPhone: '',
    footerWebsite: 'https://connect.ai',
    footerAddressAr: 'دبي، الإمارات العربية المتحدة',
    footerAddressEn: 'Dubai, UAE',
    footerCopyrightAr: 'جميع الحقوق محفوظة © 2026 سوق كونكت للذكاء الاصطناعي.',
    footerCopyrightEn: 'All rights reserved © 2026 Connect AI Marketplace.',
    footerShowSecurityBadge: true,
    smartAssistantEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [activeLogoTab, setActiveLogoTab] = useState<'hero' | 'header'>('hero');
  const [currentTab, setCurrentTab] = useState<'settings-identity' | 'settings-hero' | 'settings-search' | 'settings-market' | 'settings-social' | 'settings-registration' | 'settings-footer' | 'settings-loader' | 'settings-ai'>('settings-identity');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'watermark' | 'loaderLogo' | 'favicon' | 'footerLogo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجابايت)' : 'File too large (max 2MB)');
      return;
    }

    if (type === 'logo') setIsUploadingLogo(true);

    try {
      const storageRef = ref(storage, `site/${type}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const fieldMap: Record<string, keyof SiteSettings> = {
        logo: 'logoUrl',
        watermark: 'watermarkUrl',
        loaderLogo: 'loaderLogoUrl',
        favicon: 'faviconUrl',
        footerLogo: 'footerLogoUrl'
      };

      setSettings(prev => ({
        ...prev,
        [fieldMap[type]]: url
      }));
      toast.success(isRtl ? 'تم رفع الملف بنجاح' : 'File uploaded successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `site_settings_upload_${type}`, false);
      toast.error(isRtl ? 'فشل رفع الملف' : 'Failed to upload file');
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings(prev => ({
          ...prev,
          ...data
        }));
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
    setSuccess(false);
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        ...settings,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      if (auth.currentUser) {
        await logAction(auth.currentUser.uid, 'UPDATE_SETTINGS', 'settings/site', settings);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/site', false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-brand-text-main">
            {isRtl ? 'إعدادات الواجهة' : 'Interface Settings'}
          </h1>
        </div>
        <HapticButton
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {isRtl ? 'حفظ التغييرات' : 'Save Changes'}
        </HapticButton>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 font-bold text-center"
        >
          {isRtl ? 'تم حفظ الإعدادات بنجاح!' : 'Settings saved successfully!'}
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-brand-surface rounded-xl border border-brand-border">
        {[
          { id: 'settings-identity', label: isRtl ? 'الهوية' : 'Identity', icon: Palette },
          { id: 'settings-hero', label: isRtl ? 'الترحيب' : 'Hero', icon: Layout },
          { id: 'settings-search', label: isRtl ? 'البحث' : 'Search', icon: Search },
          { id: 'settings-market', label: isRtl ? 'السوق' : 'Market', icon: LayoutGrid },
          { id: 'settings-social', label: isRtl ? 'الإحصائيات' : 'Social Proof', icon: Layout },
          { id: 'settings-registration', label: isRtl ? 'قوائم التسجيل' : 'Registration', icon: ListChecks },
          { id: 'settings-footer', label: isRtl ? 'التذييل' : 'Footer', icon: ListChecks },
          { id: 'settings-ai', label: isRtl ? 'الذكاء الاصطناعي' : 'AI Assistant', icon: Bot },
          { id: 'settings-loader', label: isRtl ? 'شاشة التحميل' : 'Loading Screen', icon: Sparkles },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
              currentTab === tab.id 
                ? 'bg-brand-primary text-white shadow-sm' 
                : 'text-brand-text-muted hover:text-brand-text-main'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={currentTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {currentTab === 'settings-identity' && <IdentitySettings settings={settings} setSettings={setSettings} isRtl={isRtl} handleFileUpload={handleFileUpload} isUploadingLogo={isUploadingLogo} />}
        {currentTab === 'settings-hero' && <HeroSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />}
        {currentTab === 'settings-search' && <SearchSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />}
        {currentTab === 'settings-market' && <MarketSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />}
        {currentTab === 'settings-social' && <SocialProofSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />}
        {currentTab === 'settings-registration' && <RegistrationSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />}
        {currentTab === 'settings-footer' && <FooterSettings settings={settings} setSettings={setSettings} isRtl={isRtl} handleFileUpload={handleFileUpload} />}
        {currentTab === 'settings-ai' && (
          <div className="space-y-6">
            <AISettings settings={settings} setSettings={setSettings} isRtl={isRtl} />
            <FlubberSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />
            <NeuralHaloSettings settings={settings} setSettings={setSettings} isRtl={isRtl} />
          </div>
        )}
        {currentTab === 'settings-loader' && <LoadingCustomizer />}
      </motion.div>
    </div>
  );
};
