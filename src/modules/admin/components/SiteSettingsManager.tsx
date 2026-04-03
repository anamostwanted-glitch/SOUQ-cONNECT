import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { SiteSettings } from '../../../core/types';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { HapticButton } from '../../../shared/components/HapticButton';
import { Save, Loader2, Globe, Layout, Type, Search, MousePointer2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

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
    logoUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SiteSettings);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site');
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
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/site');
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
            {isRtl ? 'إعدادات نصوص الموقع' : 'Site Text Settings'}
          </h1>
          <p className="text-brand-text-muted mt-1">
            {isRtl ? 'تخصيص النصوص المعروضة في الواجهة الرئيسية' : 'Customize texts displayed on the main interface'}
          </p>
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

      <div className="grid grid-cols-1 gap-6">
        {/* Hero Section */}
        <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-brand-border">
            <Layout className="text-brand-primary" size={24} />
            <h2 className="text-xl font-bold text-brand-text-main">
              {isRtl ? 'قسم الترحيب (Hero)' : 'Hero Section'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <Type size={14} />
                {isRtl ? 'العنوان الرئيسي (عربي)' : 'Main Title (Arabic)'}
              </label>
              <input
                type="text"
                value={settings.heroTitleAr}
                onChange={(e) => setSettings({ ...settings, heroTitleAr: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <Type size={14} />
                {isRtl ? 'العنوان الرئيسي (إنجليزي)' : 'Main Title (English)'}
              </label>
              <input
                type="text"
                value={settings.heroTitleEn}
                onChange={(e) => setSettings({ ...settings, heroTitleEn: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <Type size={14} />
                {isRtl ? 'الوصف (عربي)' : 'Description (Arabic)'}
              </label>
              <textarea
                value={settings.heroDescriptionAr}
                onChange={(e) => setSettings({ ...settings, heroDescriptionAr: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all h-24"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <Type size={14} />
                {isRtl ? 'الوصف (إنجليزي)' : 'Description (English)'}
              </label>
              <textarea
                value={settings.heroDescriptionEn}
                onChange={(e) => setSettings({ ...settings, heroDescriptionEn: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all h-24"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-brand-border">
            <Search className="text-brand-teal" size={24} />
            <h2 className="text-xl font-bold text-brand-text-main">
              {isRtl ? 'شريط البحث' : 'Search Bar'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <Type size={14} />
                {isRtl ? 'نص البحث الافتراضي (عربي)' : 'Search Placeholder (Arabic)'}
              </label>
              <input
                type="text"
                value={settings.searchPlaceholderAr}
                onChange={(e) => setSettings({ ...settings, searchPlaceholderAr: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <Type size={14} />
                {isRtl ? 'نص البحث الافتراضي (إنجليزي)' : 'Search Placeholder (English)'}
              </label>
              <input
                type="text"
                value={settings.searchPlaceholderEn}
                onChange={(e) => setSettings({ ...settings, searchPlaceholderEn: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <MousePointer2 size={14} />
                {isRtl ? 'نص زر الطلب (عربي)' : 'CTA Button Text (Arabic)'}
              </label>
              <input
                type="text"
                value={settings.ctaButtonAr}
                onChange={(e) => setSettings({ ...settings, ctaButtonAr: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <MousePointer2 size={14} />
                {isRtl ? 'نص زر الطلب (إنجليزي)' : 'CTA Button Text (English)'}
              </label>
              <input
                type="text"
                value={settings.ctaButtonEn}
                onChange={(e) => setSettings({ ...settings, ctaButtonEn: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Branding Section */}
        <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-brand-border">
            <Globe className="text-brand-primary" size={24} />
            <h2 className="text-xl font-bold text-brand-text-main">
              {isRtl ? 'الهوية والاسم' : 'Branding & Name'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <Type size={14} />
                {isRtl ? 'اسم الموقع' : 'Site Name'}
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <ImageIcon size={14} />
                {isRtl ? 'رابط الشعار' : 'Logo URL'}
              </label>
              <input
                type="text"
                value={settings.logoUrl}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <ImageIcon size={14} />
                {isRtl ? 'رابط العلامة المائية' : 'Watermark URL'}
              </label>
              <input
                type="text"
                value={settings.watermarkUrl}
                onChange={(e) => setSettings({ ...settings, watermarkUrl: e.target.value })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
