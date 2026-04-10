import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db, storage } from '../../../core/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile, BrandingPreferences } from '../../../core/types';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Layout, Type, Sparkles, Save, RotateCcw, ChevronLeft, Wand2, Loader2, Upload, Image as ImageIcon, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { useBranding } from '../../../core/providers/BrandingProvider';
import { generateBrandingSuggestions, generateSupplierLogo, handleAiError } from '../../../core/services/geminiService';

interface BrandingSettingsProps {
  onBack: () => void;
}

const DEFAULT_BRANDING: BrandingPreferences = {
  primaryColor: '#1b97a7',
  secondaryColor: '#64748b',
  borderRadius: 'xl',
  fontFamily: 'Inter',
  enableGlassmorphism: true,
};

const BrandingSettings: React.FC<BrandingSettingsProps> = ({ onBack }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const { branding: globalBranding, updateBranding } = useBranding();
  const [branding, setBranding] = useState<BrandingPreferences>(globalBranding || DEFAULT_BRANDING);
  const [savedBranding, setSavedBranding] = useState<BrandingPreferences>(globalBranding || DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // AI Suggestion States
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiName, setAiName] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Update global branding for live preview whenever local branding changes
  useEffect(() => {
    updateBranding(branding);
  }, [branding, updateBranding]);

  // Revert to saved branding on unmount
  useEffect(() => {
    return () => {
      updateBranding(savedBranding);
    };
  }, [savedBranding, updateBranding]);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'site'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.branding) {
            setBranding(data.branding);
            setSavedBranding(data.branding);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings/site', false);
      }
      
      // Still fetch user profile for AI suggestions
      if (auth.currentUser) {
        try {
          const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            setUserProfile(data);
            // Pre-fill AI inputs
            setAiName(data.companyName || data.name || '');
            setAiDescription(data.bio || '');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser.uid}`, false);
        }
      }
    };
    fetchBranding().catch(err => handleFirestoreError(err, OperationType.GET, 'settings/site', false));
  }, []);

  const handleAiSuggest = async () => {
    if (!aiName || !aiDescription) {
      setMessage(i18n.language === 'ar' ? 'يرجى إدخال الاسم والوصف أولاً' : 'Please enter name and description first');
      return;
    }

    setIsAiLoading(true);
    setMessage('');

    try {
      const result = await generateBrandingSuggestions(aiName, aiDescription);
      setBranding({
        ...branding,
        primaryColor: result.primaryColor,
        secondaryColor: result.secondaryColor,
        fontFamily: result.fontFamily as any,
        borderRadius: result.borderRadius as any,
        enableGlassmorphism: result.enableGlassmorphism
      });
      setMessage(i18n.language === 'ar' ? 'تم توليد اقتراحات ذكية بنجاح!' : 'AI suggestions generated successfully!');
      setShowAiPanel(false);
    } catch (error) {
      handleAiError(error, 'Branding suggestions');
      setMessage(i18n.language === 'ar' ? 'فشل في الحصول على اقتراحات الذكاء الاصطناعي' : 'Failed to get AI suggestions');
    } finally {
      setIsAiLoading(false);
    }
  };

  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingWatermark, setIsUploadingWatermark] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'watermark') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage(i18n.language === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 2 ميجابايت)' : 'File too large (max 2MB)');
      return;
    }

    if (type === 'logo') setIsUploadingLogo(true);
    else setIsUploadingWatermark(true);

    try {
      const storageRef = ref(storage, `site/${type}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      if (type === 'logo') {
        // Update both settings/site logoUrl and branding if needed
        await setDoc(doc(db, 'settings', 'site'), { logoUrl: url }, { merge: true });
      } else {
        await setDoc(doc(db, 'settings', 'site'), { watermarkUrl: url }, { merge: true });
      }
      
      setMessage(i18n.language === 'ar' ? 'تم رفع الملف بنجاح' : 'File uploaded successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `storage/site/${type}`, false);
      setMessage(i18n.language === 'ar' ? 'فشل رفع الملف' : 'Failed to upload file');
    } finally {
      if (type === 'logo') setIsUploadingLogo(false);
      else setIsUploadingWatermark(false);
    }
  };

  const handleGenerateLogo = async () => {
    if (!userProfile?.companyName) {
      setMessage(i18n.language === 'ar' ? 'يرجى إكمال ملفك الشخصي وإضافة اسم الشركة أولاً' : 'Please complete your profile and add company name first');
      return;
    }

    setIsLogoLoading(true);
    try {
      const result = await generateSupplierLogo(
        userProfile.companyName,
        userProfile.bio || 'General Business',
        i18n.language
      );
      
      // For now, we'll just update the colors to match the suggested logo
      // In a real app, we might generate an SVG or image
      setBranding({
        ...branding,
        primaryColor: result.bgColor,
        secondaryColor: result.textColor,
        fontFamily: result.font as any
      });
      
      setMessage(i18n.language === 'ar' ? `تم اقتراح شعار نصي: ${result.logoText}` : `Suggested text logo: ${result.logoText}`);
    } catch (error) {
      handleAiError(error, 'Logo generation');
    } finally {
      setIsLogoLoading(false);
    }
  };

  const handleSave = async () => {
    // Simple contrast check
    const r = parseInt(branding.primaryColor.substring(1, 3), 16);
    const g = parseInt(branding.primaryColor.substring(3, 5), 16);
    const b = parseInt(branding.primaryColor.substring(5, 7), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    
    if (luminance < 0.2) {
      setMessage(i18n.language === 'ar' ? 'اللون الأساسي داكن جداً، قد يؤثر على سهولة القراءة.' : 'Primary color is too dark, may affect readability.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        branding: branding
      }, { merge: true });
      setSavedBranding(branding);
      setMessage(i18n.language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/site', false);
      setMessage(i18n.language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setBranding(DEFAULT_BRANDING);
  };

  // Simple brightness check for accessibility
  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  };

  const contrastColor = getContrastColor(branding.primaryColor);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-brand-surface rounded-full transition-colors"
        >
          <ChevronLeft className={i18n.language === 'ar' ? 'rotate-180' : ''} />
        </button>
        <div>
          <h1 className="text-3xl font-bold">
            {i18n.language === 'ar' ? 'تخصيص الهوية البصرية' : 'Brand Customization'}
          </h1>
          <p className="text-brand-text-muted text-sm mt-1">
            {i18n.language === 'ar' ? 'قم بضبط ألوان وخطوط تطبيقك لتناسب علامتك التجارية' : 'Adjust your app colors and fonts to match your brand identity'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-8">
          {/* AI Suggestion Section */}
          <section className="bg-brand-primary/5 p-6 rounded-3xl border border-brand-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Wand2 size={80} />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-brand-primary">
                <Wand2 size={20} />
                <h2 className="font-bold">{i18n.language === 'ar' ? 'اقتراحات الذكاء الاصطناعي' : 'AI Suggestions'}</h2>
              </div>
              <button 
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="text-xs font-medium text-brand-primary hover:underline"
              >
                {showAiPanel ? (i18n.language === 'ar' ? 'إغلاق' : 'Close') : (i18n.language === 'ar' ? 'تعديل البيانات' : 'Edit Info')}
              </button>
            </div>

            <AnimatePresence>
              {showAiPanel ? (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1">
                      {i18n.language === 'ar' ? 'اسم المتجر/الشركة' : 'Store/Company Name'}
                    </label>
                    <input 
                      type="text"
                      value={aiName}
                      onChange={(e) => setAiName(e.target.value)}
                      placeholder={i18n.language === 'ar' ? 'أدخل اسم علامتك التجارية' : 'Enter your brand name'}
                      className="w-full px-4 py-2 rounded-xl border border-brand-border bg-white outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1">
                      {i18n.language === 'ar' ? 'وصف النشاط' : 'Business Description'}
                    </label>
                    <textarea 
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder={i18n.language === 'ar' ? 'ماذا يقدم متجرك؟ (مثال: متجر لبيع القهوة المختصة)' : 'What does your store offer? (e.g. Specialty coffee shop)'}
                      rows={3}
                      className="w-full px-4 py-2 rounded-xl border border-brand-border bg-white outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm resize-none"
                    />
                  </div>
                </motion.div>
              ) : (
                <p className="text-sm text-brand-text-muted mb-4 line-clamp-2">
                  {aiDescription || (i18n.language === 'ar' ? 'أضف وصفاً لمتجرك للحصول على ألوان وخطوط مخصصة' : 'Add a description to get personalized colors and fonts')}
                </p>
              )}
            </AnimatePresence>

            <div className="flex gap-4">
              <button
                onClick={handleAiSuggest}
                disabled={isAiLoading}
                className="flex-1 py-3 rounded-xl bg-brand-primary text-white font-bold flex items-center justify-center gap-2 hover:bg-brand-primary-hover transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20"
              >
                {isAiLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Wand2 size={20} />
                )}
                {i18n.language === 'ar' ? 'توليد هوية' : 'Generate Identity'}
              </button>
              <button
                onClick={handleGenerateLogo}
                disabled={isLogoLoading}
                className="flex-1 py-3 rounded-xl bg-brand-surface border border-brand-primary/20 text-brand-primary font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/5 transition-all disabled:opacity-50"
              >
                {isLogoLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Sparkles size={20} />
                )}
                {i18n.language === 'ar' ? 'اقتراح شعار' : 'Suggest Logo'}
              </button>
            </div>
          </section>

          {/* Assets Section */}
          <section className="bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-brand-primary">
              <ImageIcon size={20} />
              <h2 className="font-bold">{i18n.language === 'ar' ? 'الأصول البصرية' : 'Visual Assets'}</h2>
            </div>
            
            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="flex items-center gap-4 p-4 bg-brand-background rounded-2xl border border-brand-border group">
                <div className="w-16 h-16 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden relative">
                  <ImageIcon size={24} className="text-brand-text-muted/20" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-brand-text-main">{isRtl ? 'شعار الموقع' : 'Site Logo'}</h4>
                  <p className="text-[10px] text-brand-text-muted mb-3">{isRtl ? 'يظهر في الهيدر وصفحات التحميل' : 'Appears in header and loading pages'}</p>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary/20 transition-all">
                    {isUploadingLogo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {isRtl ? 'رفع الشعار' : 'Upload Logo'}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} disabled={isUploadingLogo} />
                  </label>
                </div>
              </div>

              {/* Watermark Upload */}
              <div className="flex items-center gap-4 p-4 bg-brand-background rounded-2xl border border-brand-border group">
                <div className="w-16 h-16 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden relative">
                  <Sparkles size={24} className="text-brand-text-muted/20" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-brand-text-main">{isRtl ? 'العلامة المائية' : 'Watermark'}</h4>
                  <p className="text-[10px] text-brand-text-muted mb-3">{isRtl ? 'تظهر كخلفية فنية في التطبيق' : 'Appears as artistic background'}</p>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-brand-secondary/10 text-brand-secondary rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-secondary/20 transition-all">
                    {isUploadingWatermark ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {isRtl ? 'رفع العلامة' : 'Upload Watermark'}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'watermark')} disabled={isUploadingWatermark} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Colors */}
          <section className="bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-brand-primary">
              <Palette size={20} />
              <h2 className="font-bold">{i18n.language === 'ar' ? 'الألوان' : 'Colors'}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {i18n.language === 'ar' ? 'اللون الأساسي' : 'Primary Color'}
                </label>
                <div className="flex gap-2">
                  <div 
                    className="w-12 h-12 rounded-xl shadow-inner border border-brand-border relative overflow-hidden"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    <input 
                      type="color" 
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                    className="flex-1 px-3 py-2 rounded-xl border border-brand-border outline-none focus:ring-2 focus:ring-brand-primary/20 font-mono text-sm"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div 
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ backgroundColor: branding.primaryColor, color: contrastColor }}
                  >
                    Aa
                  </div>
                  <span className="text-[10px] text-brand-text-muted">
                    {i18n.language === 'ar' ? 'اختبار التباين' : 'Contrast Test'}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {i18n.language === 'ar' ? 'اللون الثانوي' : 'Secondary Color'}
                </label>
                <div className="flex gap-2">
                  <div 
                    className="w-12 h-12 rounded-xl shadow-inner border border-brand-border relative overflow-hidden"
                    style={{ backgroundColor: branding.secondaryColor }}
                  >
                    <input 
                      type="color" 
                      value={branding.secondaryColor}
                      onChange={(e) => setBranding({...branding, secondaryColor: e.target.value})}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={branding.secondaryColor}
                    onChange={(e) => setBranding({...branding, secondaryColor: e.target.value})}
                    className="flex-1 px-3 py-2 rounded-xl border border-brand-border outline-none focus:ring-2 focus:ring-brand-primary/20 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-brand-border">
              <p className="text-xs font-medium text-brand-text-muted mb-3">
                {i18n.language === 'ar' ? 'باليت مقترحة' : 'Suggested Presets'}
              </p>
              <div className="flex gap-3">
                {[
                  { p: '#1b97a7', s: '#64748b' }, // New Default
                  { p: '#4f46e5', s: '#1e293b' }, // Indigo
                  { p: '#e11d48', s: '#4c0519' }, // Rose
                  { p: '#141414', s: '#71717a' }, // Brutalist
                  { p: '#7c3aed', s: '#2e1065' }, // Violet
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBranding({...branding, primaryColor: preset.p, secondaryColor: preset.s})}
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    style={{ background: `linear-gradient(135deg, ${preset.p} 50%, ${preset.s} 50%)` }}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Typography & Radius */}
          <section className="bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-brand-primary">
              <Type size={20} />
              <h2 className="font-bold">{i18n.language === 'ar' ? 'الخطوط والحواف' : 'Typography & Borders'}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {i18n.language === 'ar' ? 'نوع الخط' : 'Font Family'}
                </label>
                <select 
                  value={branding.fontFamily}
                  onChange={(e) => setBranding({...branding, fontFamily: e.target.value as any})}
                  className="w-full px-4 py-2 rounded-xl border border-brand-border outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="Inter">Inter (Default)</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="System">System Default</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {i18n.language === 'ar' ? 'انحناء الحواف' : 'Border Radius'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['none', 'md', 'xl', '2xl'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setBranding({...branding, borderRadius: r as any})}
                      className={`py-2 rounded-lg border transition-all ${branding.borderRadius === r ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-background border-brand-border hover:border-brand-primary/50'}`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Effects */}
          <section className="bg-brand-surface p-6 rounded-3xl border border-brand-border shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-brand-primary">
              <Sparkles size={20} />
              <h2 className="font-bold">{i18n.language === 'ar' ? 'التأثيرات' : 'Effects'}</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{i18n.language === 'ar' ? 'تأثير الزجاج (Glassmorphism)' : 'Glassmorphism Effect'}</p>
                <p className="text-xs text-brand-text-muted">{i18n.language === 'ar' ? 'تفعيل الشفافية والتمويه في البطاقات' : 'Enable transparency and blur on cards'}</p>
              </div>
              <button
                onClick={() => setBranding({...branding, enableGlassmorphism: !branding.enableGlassmorphism})}
                className={`w-12 h-6 rounded-full transition-all relative ${branding.enableGlassmorphism ? 'bg-brand-primary' : 'bg-brand-border'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${branding.enableGlassmorphism ? (i18n.language === 'ar' ? 'right-7' : 'left-7') : (i18n.language === 'ar' ? 'right-1' : 'left-1')}`} />
              </button>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {saving ? '...' : (i18n.language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
            </button>
            <button
              onClick={handleReset}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              {i18n.language === 'ar' ? 'إعادة تعيين' : 'Reset'}
            </button>
          </div>
          {message && (
            <p className={`text-center text-sm font-medium ${message.includes('Error') || message.includes('خطأ') ? 'text-brand-error' : 'text-brand-success'}`}>
              {message}
            </p>
          )}
        </div>

        {/* Preview */}
        <div className="sticky top-24">
          <div className="bg-brand-background p-8 rounded-[2rem] border-4 border-brand-border shadow-2xl min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold">B</div>
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-brand-surface rounded-full border border-brand-border"></div>
                <div className="w-8 h-8 bg-brand-surface rounded-full border border-brand-border"></div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-2">{i18n.language === 'ar' ? 'معاينة البطاقة' : 'Card Preview'}</h3>
                <p className="text-sm text-brand-text-muted mb-4">
                  {i18n.language === 'ar' 
                    ? 'هذا مثال لكيفية ظهور البطاقات في تطبيقك مع الإعدادات الحالية.' 
                    : 'This is an example of how cards will look in your app with current settings.'}
                </p>
                <button className="btn-primary w-full text-sm py-2">
                  {i18n.language === 'ar' ? 'زر أساسي' : 'Primary Button'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-surface p-4 rounded-xl border border-brand-border">
                  <div className="w-8 h-8 bg-brand-primary/10 rounded-lg flex items-center justify-center text-brand-primary mb-2">
                    <Sparkles size={16} />
                  </div>
                  <div className="h-2 w-12 bg-brand-primary/20 rounded mb-1"></div>
                  <div className="h-2 w-8 bg-brand-text-muted/10 rounded"></div>
                </div>
                <div className="bg-brand-surface p-4 rounded-xl border border-brand-border">
                  <div className="w-8 h-8 bg-brand-secondary/10 rounded-lg flex items-center justify-center text-brand-secondary mb-2">
                    <Layout size={16} />
                  </div>
                  <div className="h-2 w-12 bg-brand-secondary/20 rounded mb-1"></div>
                  <div className="h-2 w-8 bg-brand-text-muted/10 rounded"></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-10 w-full bg-brand-surface border border-brand-border rounded-xl px-4 flex items-center text-xs text-brand-text-muted">
                  {i18n.language === 'ar' ? 'حقل إدخال' : 'Input Field'}
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-brand-text-muted mt-4 uppercase tracking-widest">
            {i18n.language === 'ar' ? 'معاينة حية' : 'Live Preview'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;
