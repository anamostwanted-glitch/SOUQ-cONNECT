import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../core/firebase';
import { SiteSettings } from '../../../core/types';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { HapticButton } from '../../../shared/components/HapticButton';
import { Save, Loader2, Globe, Layout, Type, Search, MousePointer2, Image as ImageIcon, Sparkles, Zap, Palette, Wand2, Upload, X, Eye, Building2 } from 'lucide-react';
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
    logoAuraBlur: 20,
    logoAuraSpread: 1.2,
    logoAuraOpacity: 0.4,
    logoAuraStyle: 'solid',
    logoAuraSharpness: 50,
    showNeuralLogo: true,
    enableNeuralPulse: true,
    enableOrbitalRings: true,
    enableShimmerEffect: true,
    animationSpeed: 'normal',
    loaderCenterText: 'DFEI',
    loaderStatusTextAr: 'جاري التحميل...',
    loaderStatusTextEn: 'Initializing Hub',
    loaderFooterTextAr: 'مدعوم بالذكاء الاصطناعي',
    loaderFooterTextEn: 'Powered by Neural Intelligence',
    primaryTextColor: '#ffffff',
    secondaryTextColor: '#94a3b8',
    watermarkUrl: '',
    watermarkOpacity: 0.7,
    watermarkPosition: 'bottom-right',
    watermarkScale: 1,
    loaderLogoUrl: '',
    loaderBackgroundStyle: 'gradient',
    loaderBackgroundColor: '#0f172a',
    loaderProgressBarColor: '#1b97a7',
    loaderLogoShape: 'squircle',
    loaderLogoAnimation: 'float'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isHarmonizing, setIsHarmonizing] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingWatermark, setIsUploadingWatermark] = useState(false);
  const [isUploadingLoaderLogo, setIsUploadingLoaderLogo] = useState(false);
  const [activeLogoTab, setActiveLogoTab] = useState<'hero' | 'header'>('hero');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'watermark' | 'loaderLogo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجابايت)' : 'File too large (max 2MB)');
      return;
    }

    if (type === 'logo') setIsUploadingLogo(true);
    else if (type === 'watermark') setIsUploadingWatermark(true);
    else setIsUploadingLoaderLogo(true);

    try {
      const storageRef = ref(storage, `site/${type}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setSettings(prev => ({
        ...prev,
        [type === 'logo' ? 'logoUrl' : type === 'watermark' ? 'watermarkUrl' : 'loaderLogoUrl']: url
      }));
      toast.success(isRtl ? 'تم رفع الملف بنجاح' : 'File uploaded successfully');
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(isRtl ? 'فشل رفع الملف' : 'Failed to upload file');
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      else if (type === 'watermark') setIsUploadingWatermark(false);
      else setIsUploadingLoaderLogo(false);
    }
  };

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

  useEffect(() => {
    const event = new CustomEvent('site-settings-preview', { detail: settings });
    window.dispatchEvent(event);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        ...settings,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
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
            {isRtl ? 'إعدادات الواجهة والأنيميشن' : 'Interface & Animation Settings'}
          </h1>
          <p className="text-brand-text-muted mt-1">
            {isRtl ? 'تخصيص نصوص الموقع وتأثيرات التحميل البصرية' : 'Customize site texts and visual loading effects'}
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
        {/* Site Identity */}
        <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-brand-border">
            <Palette className="text-brand-primary" size={24} />
            <h2 className="text-xl font-bold text-brand-text-main">
              {isRtl ? 'هوية الموقع البصرية' : 'Site Visual Identity'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <ImageIcon size={14} />
                {isRtl ? 'شعار الموقع' : 'Site Logo'}
              </label>
              <div className="flex items-center gap-4 p-4 bg-brand-background rounded-xl border border-brand-border">
                <div className="w-16 h-16 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden relative group">
                  {settings.logoUrl ? (
                    <>
                      <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      <button 
                        onClick={() => setSettings({ ...settings, logoUrl: '' })}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <ImageIcon size={24} className="text-brand-text-muted/30" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg text-xs font-bold hover:bg-brand-primary/20 transition-all">
                    {isUploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {isRtl ? 'رفع شعار' : 'Upload Logo'}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} disabled={isUploadingLogo} />
                  </label>
                  <p className="text-[10px] text-brand-text-muted mt-2">
                    {isRtl ? 'يفضل استخدام خلفية شفافة PNG' : 'Transparent PNG preferred'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

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

        {/* Neural Logo Customization & Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Live Preview Card (Sticky on Desktop) */}
          <div className="lg:col-span-5 lg:order-2 lg:sticky lg:top-24">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-text-main uppercase tracking-widest text-sm">
                      {isRtl ? 'معاينة حية' : 'Live Preview'}
                    </h3>
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-tighter">
                      {activeLogoTab === 'header' 
                        ? (isRtl ? 'معاينة شعار القائمة' : 'Menu Logo Preview')
                        : (isRtl ? 'معاينة الشعار الرئيسي' : 'Main Logo Preview')
                      }
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-[8px] font-black uppercase tracking-widest rounded-lg border border-brand-primary/20">
                  Neural Engine Active
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-8 p-8 bg-brand-background/50 rounded-[2rem] border border-brand-border/50 relative overflow-hidden min-h-[400px]">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                {/* Logo Preview */}
                <div className="relative group/preview flex flex-col items-center gap-6">
                  <div className="relative">
                    {(activeLogoTab === 'header' ? settings.headerShowNeuralLogo : settings.showNeuralLogo) && (
                      <motion.div 
                        animate={(activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'pulse' ? {
                          scale: [1, (activeLogoTab === 'header' ? settings.headerLogoAuraSpread : settings.logoAuraSpread) || 1.2, 1],
                          opacity: [((activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4) * 0.5, (activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4, ((activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4) * 0.5],
                        } : (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'mesh' ? {
                          scale: [1, 1.1, 1],
                          rotate: [0, 90, 180, 270, 360],
                          borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 60% 40% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
                        } : { 
                          scale: [1, 1.05, 1],
                          opacity: [((activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4) * 0.8, (activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4, ((activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4) * 0.8],
                        }}
                        transition={{ 
                          duration: (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'pulse' ? 3 : 8, 
                          repeat: Infinity, 
                          ease: "easeInOut" 
                        }}
                        className="absolute inset-0 rounded-full pointer-events-none z-0"
                        style={{ 
                          backgroundColor: (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'solid' ? (activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor) : 'transparent',
                          backgroundImage: (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'gradient' ? `radial-gradient(circle, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)} 0%, transparent 70%)` : 
                                           (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'mesh' ? `conic-gradient(from 0deg, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)}, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)}88, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)}44, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)}88, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)})` : 'none',
                          filter: `blur(${(activeLogoTab === 'header' ? settings.headerLogoAuraBlur : settings.logoAuraBlur) || 20}px) contrast(${100 + (((activeLogoTab === 'header' ? settings.headerLogoAuraSharpness : settings.logoAuraSharpness) || 50) - 50) * 2}%)`,
                          opacity: (activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4,
                          transform: `scale(${(activeLogoTab === 'header' ? settings.headerLogoAuraSpread : settings.logoAuraSpread) || 1.2})`,
                        }}
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-center" style={{ transform: `scale(${(activeLogoTab === 'header' ? settings.headerLogoScale : settings.logoScale) || 1})` }}>
                      {settings.logoUrl ? (
                        <img 
                          src={settings.logoUrl} 
                          alt="Preview" 
                          className="h-24 w-auto object-contain drop-shadow-2xl" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-brand-primary">
                          <Building2 size={64} />
                          <span className="font-black text-2xl tracking-tighter">{settings.siteName || 'B2B2C'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watermark Preview */}
                  {settings.watermarkUrl && (
                    <div className="absolute bottom-4 right-4 opacity-50 pointer-events-none">
                      <img src={settings.watermarkUrl} alt="Watermark" className="h-8 w-auto grayscale brightness-0 invert" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                <HapticButton
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-4 bg-brand-primary text-white font-black uppercase tracking-widest rounded-2xl hover:bg-brand-primary-hover transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand-primary/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {saving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ التعديلات' : 'Save Changes')}
                </HapticButton>
                
                {isRtl && (
                  <p className="text-[10px] text-center font-bold text-brand-text-muted uppercase tracking-widest">
                    يتم تطبيق التعديلات فوراً في المعاينة أعلاه
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-7 lg:order-1 bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-brand-border">
              <div className="flex items-center gap-3">
                <Sparkles className="text-brand-primary" size={24} />
                <h2 className="text-xl font-bold text-brand-text-main">
                  {isRtl ? 'تخصيص الشعار العصبي' : 'Neural Logo Customization'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">
                  {activeLogoTab === 'header' 
                    ? (settings.headerShowNeuralLogo ? (isRtl ? 'مفعل' : 'Enabled') : (isRtl ? 'معطل' : 'Disabled'))
                    : (settings.showNeuralLogo ? (isRtl ? 'مفعل' : 'Enabled') : (isRtl ? 'معطل' : 'Disabled'))
                  }
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeLogoTab === 'header') {
                      setSettings({ ...settings, headerShowNeuralLogo: !settings.headerShowNeuralLogo });
                    } else {
                      setSettings({ ...settings, showNeuralLogo: !settings.showNeuralLogo });
                    }
                  }}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    (activeLogoTab === 'header' ? settings.headerShowNeuralLogo : settings.showNeuralLogo) 
                      ? 'bg-brand-primary' 
                      : 'bg-brand-border'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    (activeLogoTab === 'header' ? settings.headerShowNeuralLogo : settings.showNeuralLogo) 
                      ? (isRtl ? 'right-7' : 'left-7') 
                      : (isRtl ? 'right-1' : 'left-1')
                  }`} />
                </button>
              </div>
            </div>

            {/* Tabs for Hero vs Header */}
            <div className="flex gap-2 p-1 bg-brand-background rounded-xl border border-brand-border">
              <button
                onClick={() => setActiveLogoTab('hero')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeLogoTab === 'hero' 
                    ? 'bg-brand-surface text-brand-primary shadow-sm border border-brand-border' 
                    : 'text-brand-text-muted hover:text-brand-text-main'
                }`}
              >
                {isRtl ? 'الشعار الرئيسي (Hero)' : 'Main Logo (Hero)'}
              </button>
              <button
                onClick={() => setActiveLogoTab('header')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeLogoTab === 'header' 
                    ? 'bg-brand-surface text-brand-primary shadow-sm border border-brand-border' 
                    : 'text-brand-text-muted hover:text-brand-text-main'
                }`}
              >
                {isRtl ? 'شعار القائمة (Header)' : 'Menu Logo (Header)'}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {(activeLogoTab === 'header' ? settings.headerShowNeuralLogo : settings.showNeuralLogo) && (
                <motion.div
                  key={activeLogoTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-brand-text-muted">
                          {isRtl ? 'حجم الشعار' : 'Logo Scale'}
                        </label>
                        <span className="text-xs font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-lg">
                          {Math.round(( (activeLogoTab === 'header' ? settings.headerLogoScale : settings.logoScale) || 1) * 100)}%
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={(activeLogoTab === 'header' ? settings.headerLogoScale : settings.logoScale) || 1}
                        onChange={e => setSettings({ 
                          ...settings, 
                          [activeLogoTab === 'header' ? 'headerLogoScale' : 'logoScale']: parseFloat(e.target.value) 
                        })}
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
                          style={{ backgroundColor: (activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor) || '#1b97a7' }}
                        >
                          <input 
                            type="color" 
                            value={(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor) || '#1b97a7'}
                            onChange={(e) => setSettings({ 
                              ...settings, 
                              [activeLogoTab === 'header' ? 'headerLogoAuraColor' : 'logoAuraColor']: e.target.value 
                            })}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </div>
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor) || '#1b97a7'}
                            onChange={(e) => setSettings({ 
                              ...settings, 
                              [activeLogoTab === 'header' ? 'headerLogoAuraColor' : 'logoAuraColor']: e.target.value 
                            })}
                            className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-brand-text-muted">
                          {isRtl ? 'نمط الهالة' : 'Aura Style'}
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(['solid', 'gradient', 'pulse', 'mesh'] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => setSettings({ 
                              ...settings, 
                              [activeLogoTab === 'header' ? 'headerLogoAuraStyle' : 'logoAuraStyle']: style 
                            })}
                            className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                              (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === style 
                                ? 'bg-brand-primary text-white border-brand-primary shadow-sm' 
                                : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/50'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-brand-text-muted">
                          {isRtl ? 'نعومة الحواف (Feather)' : 'Edge Feathering'}
                        </label>
                        <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
                          {(activeLogoTab === 'header' ? settings.headerLogoAuraBlur : settings.logoAuraBlur) || 20}px
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={(activeLogoTab === 'header' ? settings.headerLogoAuraBlur : settings.logoAuraBlur) || 20}
                        onChange={e => setSettings({ 
                          ...settings, 
                          [activeLogoTab === 'header' ? 'headerLogoAuraBlur' : 'logoAuraBlur']: parseInt(e.target.value) 
                        })}
                        className="w-full h-1.5 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-brand-text-muted">
                          {isRtl ? 'مدى الانتشار' : 'Aura Spread'}
                        </label>
                        <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
                          {Math.round(((activeLogoTab === 'header' ? settings.headerLogoAuraSpread : settings.logoAuraSpread) || 1.2) * 100)}%
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="3"
                        step="0.1"
                        value={(activeLogoTab === 'header' ? settings.headerLogoAuraSpread : settings.logoAuraSpread) || 1.2}
                        onChange={e => setSettings({ 
                          ...settings, 
                          [activeLogoTab === 'header' ? 'headerLogoAuraSpread' : 'logoAuraSpread']: parseFloat(e.target.value) 
                        })}
                        className="w-full h-1.5 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-brand-text-muted">
                          {isRtl ? 'الشفافية' : 'Aura Opacity'}
                        </label>
                        <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
                          {Math.round(((activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4) * 100)}%
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={(activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4}
                        onChange={e => setSettings({ 
                          ...settings, 
                          [activeLogoTab === 'header' ? 'headerLogoAuraOpacity' : 'logoAuraOpacity']: parseFloat(e.target.value) 
                        })}
                        className="w-full h-1.5 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-bold text-brand-text-muted">
                          {isRtl ? 'حدة الحواف' : 'Edge Sharpness'}
                        </label>
                        <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded">
                          {(activeLogoTab === 'header' ? settings.headerLogoAuraSharpness : settings.logoAuraSharpness) || 50}%
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={(activeLogoTab === 'header' ? settings.headerLogoAuraSharpness : settings.logoAuraSharpness) || 50}
                        onChange={e => setSettings({ 
                          ...settings, 
                          [activeLogoTab === 'header' ? 'headerLogoAuraSharpness' : 'logoAuraSharpness']: parseInt(e.target.value) 
                        })}
                        className="w-full h-1.5 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-primary"
                      />
                    </div>

                    {isRtl && (
                      <div className="mt-8 p-5 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-brand-primary">
                          <Zap size={16} />
                          <span className="text-xs font-black uppercase tracking-widest">شرح ميزات الشعار العصبي</span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0" />
                            <p className="text-[11px] text-brand-text-muted leading-relaxed">
                              <strong className="text-brand-text-main block mb-0.5">الشعار العصبي (Neural Logo):</strong>
                              يضيف هالة ضوئية تفاعلية حول الشعار تعزز من المظهر التقني والاحترافي للموقع.
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0" />
                            <p className="text-[11px] text-brand-text-muted leading-relaxed">
                              <strong className="text-brand-text-main block mb-0.5">نمط الهالة (Aura Style):</strong>
                              يمكنك الاختيار بين الهالة الثابتة، المتدرجة، أو المتحركة (Pulse) التي تنبض بالحياة، أو نمط الشبكة (Mesh) المتطور.
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0" />
                            <p className="text-[11px] text-brand-text-muted leading-relaxed">
                              <strong className="text-brand-text-main block mb-0.5">حدة الحواف (Sharpness):</strong>
                              تتحكم في مدى نعومة أو حدة أطراف الهالة الضوئية؛ القيم العالية تعطي مظهراً أكثر تحديداً.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live Preview Card (Sticky on Desktop) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-text-main uppercase tracking-widest text-sm">
                      {isRtl ? 'معاينة حية' : 'Live Preview'}
                    </h3>
                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-tighter">
                      {activeLogoTab === 'header' 
                        ? (isRtl ? 'معاينة شعار القائمة' : 'Menu Logo Preview')
                        : (isRtl ? 'معاينة الشعار الرئيسي' : 'Main Logo Preview')
                      }
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-[8px] font-black uppercase tracking-widest rounded-lg border border-brand-primary/20">
                  Neural Engine Active
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-8 p-8 bg-brand-background/50 rounded-[2rem] border border-brand-border/50 relative overflow-hidden min-h-[400px]">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                {/* Logo Preview */}
                <div className="relative group/preview flex flex-col items-center gap-6">
                  <div className="relative">
                    {(activeLogoTab === 'header' ? settings.headerShowNeuralLogo : settings.showNeuralLogo) && (
                      <motion.div 
                        animate={(activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'pulse' ? {
                          scale: [1, (activeLogoTab === 'header' ? settings.headerLogoAuraSpread : settings.logoAuraSpread) || 1.2, 1],
                          opacity: [((activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4) * 0.5, (activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4, ((activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4) * 0.5],
                        } : (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'mesh' ? {
                          scale: [1, 1.1, 1],
                          rotate: [0, 90, 180, 270, 360],
                          borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 60% 40% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
                        } : { 
                          scale: [1, 1.05, 1],
                          opacity: [((activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4) * 0.8, (activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4, ((activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4) * 0.8],
                        }}
                        transition={{ 
                          duration: (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'pulse' ? 3 : 8, 
                          repeat: Infinity, 
                          ease: "easeInOut" 
                        }}
                        className="absolute inset-0 rounded-full pointer-events-none z-0"
                        style={{ 
                          backgroundColor: (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'solid' ? (activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor) : 'transparent',
                          backgroundImage: (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'gradient' ? `radial-gradient(circle, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)} 0%, transparent 70%)` : 
                                           (activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle) === 'mesh' ? `conic-gradient(from 0deg, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)}, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)}88, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)}44, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)}88, ${(activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor)})` : 'none',
                          filter: `blur(${(activeLogoTab === 'header' ? settings.headerLogoAuraBlur : settings.logoAuraBlur) || 20}px) contrast(${100 + (((activeLogoTab === 'header' ? settings.headerLogoAuraSharpness : settings.logoAuraSharpness) || 50) - 50) * 2}%)`,
                          opacity: (activeLogoTab === 'header' ? settings.headerLogoAuraOpacity : settings.logoAuraOpacity) || 0.4,
                          transform: `scale(${(activeLogoTab === 'header' ? settings.headerLogoAuraSpread : settings.logoAuraSpread) || 1.2})`,
                        }}
                      />
                    )}
                    <div className="relative z-10 flex items-center justify-center" style={{ transform: `scale(${(activeLogoTab === 'header' ? settings.headerLogoScale : settings.logoScale) || 1})` }}>
                      {settings.logoUrl ? (
                        <img 
                          src={settings.logoUrl} 
                          alt="Preview" 
                          className="h-24 w-auto object-contain drop-shadow-2xl" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-brand-primary">
                          <Building2 size={64} />
                          <span className="font-black text-2xl tracking-tighter">{settings.siteName || 'B2B2C'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Watermark Preview */}
                  {settings.watermarkUrl && (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[8px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'العلامة المائية' : 'Watermark'}</span>
                      <div className="w-16 h-16 bg-brand-surface rounded-xl border border-brand-border p-2 flex items-center justify-center">
                        <img src={settings.watermarkUrl} alt="Watermark" className="w-full h-full object-contain opacity-50" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Card */}
                <div className="w-full space-y-4">
                  <div className="p-4 bg-brand-surface rounded-2xl border border-brand-border shadow-sm">
                    <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-2">
                      {isRtl ? 'تكوين الهالة' : 'Aura Configuration'}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-brand-text-muted uppercase">{isRtl ? 'النمط' : 'Style'}</span>
                        <span className="text-brand-text-main uppercase">{activeLogoTab === 'header' ? settings.headerLogoAuraStyle : settings.logoAuraStyle}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-brand-text-muted uppercase">{isRtl ? 'اللون' : 'Color'}</span>
                        <span className="text-brand-text-main font-mono">{activeLogoTab === 'header' ? settings.headerLogoAuraColor : settings.logoAuraColor}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold">
                        <span className="text-brand-text-muted uppercase">{isRtl ? 'الانتشار' : 'Spread'}</span>
                        <span className="text-brand-text-main">{Math.round(((activeLogoTab === 'header' ? settings.headerLogoAuraSpread : settings.logoAuraSpread) || 1.2) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
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

        {/* Watermark Settings Section */}
        <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border space-y-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          
          <div className="flex items-center justify-between pb-6 border-b border-brand-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-secondary/10 rounded-2xl flex items-center justify-center text-brand-secondary">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-brand-text-main uppercase tracking-tight">
                  {isRtl ? 'إعدادات العلامة المائية الذكية' : 'Smart Watermark Settings'}
                </h2>
                <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mt-1">
                  {isRtl ? 'تخصيص حماية الصور والعلامة التجارية' : 'Customize image protection & branding'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column: Upload & URL */}
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-black text-brand-text-main uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={16} className="text-brand-secondary" />
                  {isRtl ? 'شعار العلامة المائية' : 'Watermark Logo'}
                </label>
                <div className="flex items-center gap-6 p-6 bg-brand-background rounded-[2rem] border border-brand-border group transition-all hover:border-brand-secondary/50">
                  <div className="w-24 h-24 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden relative group/img shadow-inner">
                    {settings.watermarkUrl ? (
                      <>
                        <img src={settings.watermarkUrl} alt="Watermark" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => setSettings({ ...settings, watermarkUrl: '' })}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <X size={20} />
                        </button>
                      </>
                    ) : (
                      <Sparkles size={32} className="text-brand-text-muted/20" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <label className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3 bg-brand-secondary text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-brand-secondary-hover transition-all shadow-lg shadow-brand-secondary/20">
                      {isUploadingWatermark ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                      {isRtl ? 'رفع علامة مائية' : 'Upload Watermark'}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'watermark')} disabled={isUploadingWatermark} />
                    </label>
                    <p className="text-[10px] text-center font-bold text-brand-text-muted uppercase tracking-tighter">
                      {isRtl ? 'يفضل استخدام PNG شفاف' : 'Transparent PNG recommended'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-black text-brand-text-main uppercase tracking-widest flex items-center gap-2">
                  <Globe size={16} className="text-brand-secondary" />
                  {isRtl ? 'رابط العلامة المائية المباشر' : 'Direct Watermark URL'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.watermarkUrl}
                    onChange={(e) => setSettings({ ...settings, watermarkUrl: e.target.value })}
                    className="w-full bg-brand-background border-brand-border rounded-2xl p-4 text-brand-text-main font-mono text-xs focus:ring-2 focus:ring-brand-secondary/20 transition-all pl-12"
                    placeholder="https://example.com/watermark.png"
                  />
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                </div>
              </div>
            </div>

            {/* Right Column: Controls */}
            <div className="space-y-8 bg-brand-background/30 p-8 rounded-[2rem] border border-brand-border/50">
              {/* Opacity Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black text-brand-text-main uppercase tracking-widest flex items-center gap-2">
                    <Palette size={16} className="text-brand-secondary" />
                    {isRtl ? 'الشفافية' : 'Opacity'}
                  </label>
                  <span className="text-xs font-mono font-black text-brand-secondary bg-brand-secondary/10 px-3 py-1 rounded-lg border border-brand-secondary/20">
                    {Math.round((settings.watermarkOpacity || 0.7) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={settings.watermarkOpacity || 0.7}
                  onChange={(e) => setSettings({ ...settings, watermarkOpacity: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-secondary"
                />
              </div>

              {/* Scale Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-black text-brand-text-main uppercase tracking-widest flex items-center gap-2">
                    <Search size={16} className="text-brand-secondary" />
                    {isRtl ? 'حجم العلامة' : 'Scale'}
                  </label>
                  <span className="text-xs font-mono font-black text-brand-secondary bg-brand-secondary/10 px-3 py-1 rounded-lg border border-brand-secondary/20">
                    {Math.round((settings.watermarkScale || 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={settings.watermarkScale || 1}
                  onChange={(e) => setSettings({ ...settings, watermarkScale: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-brand-border rounded-lg appearance-none cursor-pointer accent-brand-secondary"
                />
              </div>

              {/* Position Grid */}
              <div className="space-y-4">
                <label className="text-sm font-black text-brand-text-main uppercase tracking-widest flex items-center gap-2">
                  <Layout size={16} className="text-brand-secondary" />
                  {isRtl ? 'الموقع المفضل' : 'Preferred Position'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'top-left', label: 'TL' },
                    { id: 'top-right', label: 'TR' },
                    { id: 'center', label: 'C' },
                    { id: 'bottom-left', label: 'BL' },
                    { id: 'bottom-right', label: 'BR' }
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setSettings({ ...settings, watermarkPosition: pos.id as any })}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        settings.watermarkPosition === pos.id 
                          ? 'bg-brand-secondary text-white border-brand-secondary shadow-lg shadow-brand-secondary/20' 
                          : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-secondary/50'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Loader Customization Section */}
        <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border space-y-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-brand-primary/5 rounded-full -ml-16 -mt-16 blur-2xl" />
          
          <div className="flex items-center justify-between pb-6 border-b border-brand-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                <Zap size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-brand-text-main uppercase tracking-tight">
                  {isRtl ? 'تخصيص شاشة التحميل الذكية' : 'Smart Loader Customization'}
                </h2>
                <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest mt-1">
                  {isRtl ? 'تحكم في تجربة المستخدم الأولى' : 'Control the first user experience'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Loader Logo & Texts */}
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-black text-brand-text-main uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={16} className="text-brand-primary" />
                  {isRtl ? 'شعار شاشة التحميل' : 'Loader Logo'}
                </label>
                <div className="flex items-center gap-6 p-6 bg-brand-background rounded-[2rem] border border-brand-border group transition-all hover:border-brand-primary/50">
                  <div className={`w-24 h-24 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden relative group/img shadow-inner ${
                    settings.loaderLogoShape === 'circle' ? 'rounded-full' : 
                    settings.loaderLogoShape === 'squircle' ? 'rounded-[2rem]' : 'rounded-2xl'
                  }`}>
                    {settings.loaderLogoUrl ? (
                      <>
                        <img src={settings.loaderLogoUrl} alt="Loader Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                        <button 
                          onClick={() => setSettings({ ...settings, loaderLogoUrl: '' })}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <X size={20} />
                        </button>
                      </>
                    ) : (
                      <Zap size={32} className="text-brand-text-muted/20" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <label className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3 bg-brand-primary text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20">
                      {isUploadingLoaderLogo ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                      {isRtl ? 'رفع شعار التحميل' : 'Upload Loader Logo'}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'loaderLogo')} disabled={isUploadingLoaderLogo} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                    {isRtl ? 'النص المركزي' : 'Center Text'}
                  </label>
                  <input
                    type="text"
                    value={settings.loaderCenterText}
                    onChange={(e) => setSettings({ ...settings, loaderCenterText: e.target.value })}
                    className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main font-bold focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                    {isRtl ? 'لون شريط التقدم' : 'Progress Bar Color'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={settings.loaderProgressBarColor}
                      onChange={(e) => setSettings({ ...settings, loaderProgressBarColor: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                    />
                    <input
                      type="text"
                      value={settings.loaderProgressBarColor}
                      onChange={(e) => setSettings({ ...settings, loaderProgressBarColor: e.target.value })}
                      className="flex-1 bg-brand-background border-brand-border rounded-xl px-3 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                      {isRtl ? 'نص الحالة (عربي)' : 'Status Text (AR)'}
                    </label>
                    <input
                      type="text"
                      value={settings.loaderStatusTextAr}
                      onChange={(e) => setSettings({ ...settings, loaderStatusTextAr: e.target.value })}
                      className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-xs font-bold"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                      {isRtl ? 'نص الحالة (EN)' : 'Status Text (EN)'}
                    </label>
                    <input
                      type="text"
                      value={settings.loaderStatusTextEn}
                      onChange={(e) => setSettings({ ...settings, loaderStatusTextEn: e.target.value })}
                      className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-xs font-bold"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Loader Styles & Animations */}
            <div className="space-y-8 bg-brand-background/30 p-8 rounded-[2rem] border border-brand-border/50">
              <div className="space-y-4">
                <label className="text-sm font-black text-brand-text-main uppercase tracking-widest">
                  {isRtl ? 'نمط الخلفية' : 'Background Style'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['solid', 'gradient', 'mesh', 'animated'].map((style) => (
                    <button
                      key={style}
                      onClick={() => setSettings({ ...settings, loaderBackgroundStyle: style as any })}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        settings.loaderBackgroundStyle === style 
                          ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' 
                          : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/50'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-black text-brand-text-main uppercase tracking-widest">
                  {isRtl ? 'أنيميشن الشعار' : 'Logo Animation'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['none', 'bounce', 'rotate', 'scale', 'float'].map((anim) => (
                    <button
                      key={anim}
                      onClick={() => setSettings({ ...settings, loaderLogoAnimation: anim as any })}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        settings.loaderLogoAnimation === anim 
                          ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' 
                          : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/50'
                      }`}
                    >
                      {anim}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-black text-brand-text-main uppercase tracking-widest">
                  {isRtl ? 'شكل الشعار' : 'Logo Shape'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['square', 'circle', 'squircle'].map((shape) => (
                    <button
                      key={shape}
                      onClick={() => setSettings({ ...settings, loaderLogoShape: shape as any })}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        settings.loaderLogoShape === shape 
                          ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' 
                          : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/50'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
lassName="text-xs font-mono font-bold text-brand-primary w-12 text-center">
                  {Math.round((settings.watermarkScale || 1) * 100)}%
                </span>
              </div>
            </div>

            {/* Watermark Position */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-text-muted flex items-center gap-2">
                <Layout size={14} />
                {isRtl ? 'موقع العلامة المائية' : 'Watermark Position'}
              </label>
              <select
                value={settings.watermarkPosition || 'bottom-right'}
                onChange={(e) => setSettings({ ...settings, watermarkPosition: e.target.value as any })}
                className="w-full bg-brand-background border-brand-border rounded-xl p-3 text-brand-text-main focus:ring-2 focus:ring-brand-primary/20 transition-all"
              >
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="center">Center</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
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
          </div>
        </div>
      </div>
    </div>
  );
};
