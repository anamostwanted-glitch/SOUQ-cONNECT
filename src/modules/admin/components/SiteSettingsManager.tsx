import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { SiteSettings } from '../../../core/types';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { HapticButton } from '../../../shared/components/HapticButton';
import { Save, Loader2, Globe, Layout, Type, Search, MousePointer2, Image as ImageIcon, Sparkles, Zap, Palette, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { suggestColorHarmony } from '../../../core/services/geminiService';
import { toast } from 'sonner';

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
    logoAuraColor: '#1b97a7',
    showNeuralLogo: true,
    primaryTextColor: '#ffffff',
    secondaryTextColor: '#94a3b8'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isHarmonizing, setIsHarmonizing] = useState(false);

  const handleHarmonize = async () => {
    if (!settings.primaryTextColor) return;
    setIsHarmonizing(true);
    try {
      const result = await suggestColorHarmony(settings.primaryTextColor);
      setSettings(prev => ({
        ...prev,
        secondaryTextColor: result.secondaryColor
      }));
      toast.success(isRtl ? `تم اقتراح لون متناسق: ${result.reason}` : `Suggested harmonious color: ${result.reason}`);
    } catch (error) {
      toast.error(isRtl ? 'فشل اقتراح اللون' : 'Failed to suggest color');
    } finally {
      setIsHarmonizing(false);
    }
  };

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

        {/* Neural Logo Customization */}
        <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-brand-border">
            <div className="flex items-center gap-3">
              <Sparkles className="text-brand-primary" size={24} />
              <h2 className="text-xl font-bold text-brand-text-main">
                {isRtl ? 'تخصيص الشعار العصبي' : 'Neural Logo Customization'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">
                {settings.showNeuralLogo ? (isRtl ? 'مفعل' : 'Enabled') : (isRtl ? 'معطل' : 'Disabled')}
              </span>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, showNeuralLogo: !settings.showNeuralLogo })}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.showNeuralLogo ? 'bg-brand-primary' : 'bg-brand-border'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.showNeuralLogo ? (isRtl ? 'right-7' : 'left-7') : (isRtl ? 'right-1' : 'left-1')}`} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {settings.showNeuralLogo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-brand-text-muted">
                        {isRtl ? 'حجم الشعار' : 'Logo Scale'}
                      </label>
                      <span className="text-xs font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-lg">
                        {Math.round((settings.logoScale || 1) * 100)}%
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.logoScale || 1}
                      onChange={e => setSettings({ ...settings, logoScale: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-brand-text-muted uppercase tracking-tighter">
                      <span>{isRtl ? 'صغير' : 'Small'}</span>
                      <span>{isRtl ? 'طبيعي' : 'Normal'}</span>
                      <span>{isRtl ? 'كبير' : 'Large'}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-brand-text-muted block">
                      {isRtl ? 'لون الهالة (Aura)' : 'Aura Color'}
                    </label>
                    <div className="flex gap-3">
                      <div 
                        className="w-12 h-12 rounded-2xl shadow-inner border-2 border-white relative overflow-hidden ring-1 ring-brand-border"
                        style={{ backgroundColor: settings.logoAuraColor || '#1b97a7' }}
                      >
                        <input 
                          type="color" 
                          value={settings.logoAuraColor || '#1b97a7'}
                          onChange={(e) => setSettings({ ...settings, logoAuraColor: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={settings.logoAuraColor || '#1b97a7'}
                          onChange={(e) => setSettings({ ...settings, logoAuraColor: e.target.value })}
                          className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Text Color Customization */}
        <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-brand-border">
            <Palette className="text-brand-primary" size={24} />
            <h2 className="text-xl font-bold text-brand-text-main">
              {isRtl ? 'تخصيص ألوان النصوص' : 'Text Color Customization'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-sm font-bold text-brand-text-muted block">
                {isRtl ? 'اللون الرئيسي للنصوص' : 'Primary Text Color'}
              </label>
              <div className="flex gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl shadow-inner border-2 border-white relative overflow-hidden ring-1 ring-brand-border"
                  style={{ backgroundColor: settings.primaryTextColor || '#ffffff' }}
                >
                  <input 
                    type="color" 
                    value={settings.primaryTextColor || '#ffffff'}
                    onChange={(e) => setSettings({ ...settings, primaryTextColor: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={settings.primaryTextColor || '#ffffff'}
                    onChange={(e) => setSettings({ ...settings, primaryTextColor: e.target.value })}
                    className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-brand-text-muted block">
                  {isRtl ? 'اللون الثانوي (المساعد)' : 'Secondary Text Color'}
                </label>
                <button
                  onClick={handleHarmonize}
                  disabled={isHarmonizing}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:text-brand-primary-hover transition-colors disabled:opacity-50"
                >
                  {isHarmonizing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  {isRtl ? 'تناسق ذكي' : 'AI Harmony'}
                </button>
              </div>
              <div className="flex gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl shadow-inner border-2 border-white relative overflow-hidden ring-1 ring-brand-border"
                  style={{ backgroundColor: settings.secondaryTextColor || '#94a3b8' }}
                >
                  <input 
                    type="color" 
                    value={settings.secondaryTextColor || '#94a3b8'}
                    onChange={(e) => setSettings({ ...settings, secondaryTextColor: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={settings.secondaryTextColor || '#94a3b8'}
                    onChange={(e) => setSettings({ ...settings, secondaryTextColor: e.target.value })}
                    className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-brand-background/50 rounded-xl border border-brand-border/50">
            <p className="text-xs font-medium text-brand-text-muted leading-relaxed">
              <Sparkles size={12} className="inline mr-1 text-brand-primary" />
              {isRtl 
                ? 'نصيحة: استخدم ميزة "التناسق الذكي" ليقوم الذكاء الاصطناعي باختيار لون ثانوي يتناسب مع لونك الرئيسي ويضمن وضوح القراءة.' 
                : 'Tip: Use "AI Harmony" to let the AI pick a secondary color that matches your primary choice while ensuring readability.'}
            </p>
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
