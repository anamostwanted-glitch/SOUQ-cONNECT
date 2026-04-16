import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../core/firebase';
import { SiteSettings } from '../../../core/types';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { handleAiError, generateLoadingScreenSettings } from '../../../core/services/geminiService';
import { HapticButton } from '../../../shared/components/HapticButton';
import { 
  Save, Loader2, Zap, Sparkles, Type, 
  Eye, Upload, X, Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { PageLoader } from '../../../shared/components/PageLoader';

export const LoadingCustomizer: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SiteSettings);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleGenerateTheme = async () => {
    if (!aiPrompt.trim()) {
      toast.error(isRtl ? 'يرجى كتابة وصف للنمط المطلوب' : 'Please enter a description for the desired theme');
      return;
    }
    setIsGenerating(true);
    try {
      const newSettings = await generateLoadingScreenSettings(aiPrompt);
      if (newSettings) {
        setSettings({ ...settings!, ...newSettings });
        toast.success(isRtl ? 'تم توليد النمط بنجاح' : 'Theme generated successfully');
      } else {
        toast.error(isRtl ? 'فشل توليد النمط' : 'Failed to generate theme');
      }
    } catch (error) {
      handleAiError(error, 'Loading screen theme generation');
      toast.error(isRtl ? 'حدث خطأ أثناء التوليد' : 'Error generating theme');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجابايت)' : 'File too large (max 2MB)');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const storageRef = ref(storage, `site/loader_logo_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setSettings({ ...settings, loaderLogoUrl: url });
      toast.success(isRtl ? 'تم رفع شعار شاشة التحميل بنجاح' : 'Loader logo uploaded successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'storage/loader-logo', false);
      toast.error(isRtl ? 'فشل رفع الشعار' : 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        ...settings,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      toast.success(isRtl ? 'تم حفظ إعدادات شاشة التحميل بنجاح' : 'Loading screen settings saved successfully');
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

  if (!settings) return null;

  const updateSettings = (newSettings: Partial<SiteSettings>) => {
    setSettings({ ...settings, ...newSettings });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-brand-text-main tracking-tight">
            {isRtl ? 'تخصيص شاشة التحميل' : 'Loading Screen Customizer'}
          </h1>
          <p className="text-brand-text-muted mt-1 font-medium">
            {isRtl ? 'تحكم في التجربة البصرية الأولى للمستخدمين' : 'Control the first visual experience for your users'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HapticButton
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 bg-brand-surface border border-brand-border text-brand-text-main px-6 py-3 rounded-xl font-bold hover:bg-brand-background transition-all"
          >
            <Eye size={20} />
            {isRtl ? 'معاينة مباشرة' : 'Live Preview'}
          </HapticButton>
          <HapticButton
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isRtl ? 'حفظ الإعدادات' : 'Save Settings'}
          </HapticButton>
        </div>
      </div>

      {/* AI Generation Section */}
      <div className="bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm space-y-4">
        <h3 className="font-black text-brand-text-main flex items-center gap-2">
          <Bot className="text-brand-primary" size={20} />
          {isRtl ? 'توليد النمط بالذكاء الاصطناعي' : 'AI Theme Generator'}
        </h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={isRtl ? 'صف النمط الذي تريده (مثلاً: عصري، هادئ، تقني...)' : 'Describe the theme you want (e.g., modern, calm, tech...)'}
            className="flex-1 bg-brand-background border border-brand-border rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
          <HapticButton
            onClick={handleGenerateTheme}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-brand-primary text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            {isRtl ? 'توليد' : 'Generate'}
          </HapticButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Visual Effects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-brand-surface p-8 rounded-[2rem] border border-brand-border shadow-sm space-y-8">
            <div className="flex items-center gap-3 pb-4 border-b border-brand-border">
              <Zap className="text-brand-primary" size={24} />
              <h2 className="text-xl font-black text-brand-text-main">{isRtl ? 'التأثيرات البصرية' : 'Visual Effects'}</h2>
            </div>
            {/* New Advanced Customization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-brand-border/50">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest block">
                    {isRtl ? 'نمط الخلفية' : 'Background Style'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['solid', 'gradient', 'mesh', 'animated'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => updateSettings({ loaderBackgroundStyle: style })}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          settings.loaderBackgroundStyle === style 
                            ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20' 
                            : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/30'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest block">
                    {isRtl ? 'شكل الشعار' : 'Logo Shape'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['square', 'circle', 'squircle'] as const).map((shape) => (
                      <button
                        key={shape}
                        onClick={() => updateSettings({ loaderLogoShape: shape })}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          settings.loaderLogoShape === shape 
                            ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20' 
                            : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/30'
                        }`}
                      >
                        {shape}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest block">
                    {isRtl ? 'أنيميشن الشعار' : 'Logo Animation'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['none', 'bounce', 'rotate', 'scale', 'float'] as const).map((anim) => (
                      <button
                        key={anim}
                        onClick={() => updateSettings({ loaderLogoAnimation: anim })}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          settings.loaderLogoAnimation === anim 
                            ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20' 
                            : 'bg-brand-background text-brand-text-muted border-brand-border hover:border-brand-primary/30'
                        }`}
                      >
                        {anim}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                      {isRtl ? 'لون الخلفية' : 'Background Color'}
                    </label>
                    <span className="text-[10px] font-mono font-bold text-brand-primary uppercase">{settings.loaderBackgroundColor}</span>
                  </div>
                  <div className="flex gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl shadow-inner border-2 border-white relative overflow-hidden ring-1 ring-brand-border"
                      style={{ backgroundColor: settings.loaderBackgroundColor }}
                    >
                      <input 
                        type="color" 
                        value={settings.loaderBackgroundColor}
                        onChange={(e) => updateSettings({ loaderBackgroundColor: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={settings.loaderBackgroundColor}
                      onChange={(e) => updateSettings({ loaderBackgroundColor: e.target.value })}
                      className="flex-1 px-4 py-2 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                      {isRtl ? 'لون شريط التقدم' : 'Progress Bar Color'}
                    </label>
                    <span className="text-[10px] font-mono font-bold text-brand-primary uppercase">{settings.loaderProgressBarColor}</span>
                  </div>
                  <div className="flex gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl shadow-inner border-2 border-white relative overflow-hidden ring-1 ring-brand-border"
                      style={{ backgroundColor: settings.loaderProgressBarColor }}
                    >
                      <input 
                        type="color" 
                        value={settings.loaderProgressBarColor}
                        onChange={(e) => updateSettings({ loaderProgressBarColor: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={settings.loaderProgressBarColor}
                      onChange={(e) => updateSettings({ loaderProgressBarColor: e.target.value })}
                      className="flex-1 px-4 py-2 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Content & Texts */}
        <div className="space-y-6">
          <div className="bg-brand-surface p-8 rounded-[2rem] border border-brand-border shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-brand-border">
              <Type className="text-brand-primary" size={24} />
              <h2 className="text-xl font-black text-brand-text-main">{isRtl ? 'محتوى شاشة التحميل' : 'Loading Content'}</h2>
            </div>

            <div className="space-y-4">
              {/* Logo Upload Section */}
              <div className="space-y-2">
                <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                  {isRtl ? 'شعار شاشة التحميل' : 'Loader Logo'}
                </label>
                <div className="relative group">
                  <div className="w-full h-40 bg-brand-background border-2 border-dashed border-brand-border rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all hover:border-brand-primary/50">
                    {settings.loaderLogoUrl ? (
                      <>
                        <img 
                          src={settings.loaderLogoUrl} 
                          alt="Loader Logo" 
                          className="w-full h-full object-contain p-4"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={() => updateSettings({ loaderLogoUrl: '' })}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-brand-text-muted">
                        {isUploadingLogo ? (
                          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                        ) : (
                          <>
                            <Upload size={32} />
                            <span className="text-xs font-bold">{isRtl ? 'اضغط لرفع شعار مخصص' : 'Click to upload custom logo'}</span>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-brand-text-muted font-medium">
                  {isRtl ? 'سيتم استخدام هذا الشعار بدلاً من النص المركزي إذا تم رفعه' : 'This logo will be used instead of center text if uploaded'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                  {isRtl ? 'النص المركزي (بديل الشعار)' : 'Center Text (Logo Alternative)'}
                </label>
                <input
                  type="text"
                  value={settings.loaderCenterText || ''}
                  onChange={(e) => updateSettings({ loaderCenterText: e.target.value })}
                  className="w-full bg-brand-background border border-brand-border rounded-xl p-3.5 text-brand-text-main font-black text-lg focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                  placeholder="SC"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                  {isRtl ? 'نص الحالة (عربي)' : 'Status Text (Arabic)'}
                </label>
                <input
                  type="text"
                  value={settings.loaderStatusTextAr || ''}
                  onChange={(e) => updateSettings({ loaderStatusTextAr: e.target.value })}
                  className="w-full bg-brand-background border border-brand-border rounded-xl p-3.5 text-brand-text-main font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                  {isRtl ? 'نص الحالة (إنجليزي)' : 'Status Text (English)'}
                </label>
                <input
                  type="text"
                  value={settings.loaderStatusTextEn || ''}
                  onChange={(e) => updateSettings({ loaderStatusTextEn: e.target.value })}
                  className="w-full bg-brand-background border border-brand-border rounded-xl p-3.5 text-brand-text-main font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                  {isRtl ? 'نص التذييل (عربي)' : 'Footer Text (Arabic)'}
                </label>
                <input
                  type="text"
                  value={settings.loaderFooterTextAr || ''}
                  onChange={(e) => updateSettings({ loaderFooterTextAr: e.target.value })}
                  className="w-full bg-brand-background border border-brand-border rounded-xl p-3.5 text-brand-text-main font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-brand-text-muted uppercase tracking-widest">
                  {isRtl ? 'نص التذييل (إنجليزي)' : 'Footer Text (English)'}
                </label>
                <input
                  type="text"
                  value={settings.loaderFooterTextEn || ''}
                  onChange={(e) => updateSettings({ loaderFooterTextEn: e.target.value })}
                  className="w-full bg-brand-background border border-brand-border rounded-xl p-3.5 text-brand-text-main font-bold focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center"
          >
            <div className="absolute top-8 right-8 z-[10001]">
              <button
                onClick={() => setShowPreview(false)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest transition-all border border-white/10 active:scale-95"
              >
                {isRtl ? 'إغلاق المعاينة' : 'Close Preview'}
              </button>
            </div>
            
            <div className="w-full h-full relative overflow-hidden">
              <PageLoader previewSettings={settings} isInline={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};