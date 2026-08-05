import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { AICategorySelector } from './AICategorySelector';
import { Category, UserProfile } from '../../../core/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { toast } from 'sonner';
import { Building2, Phone, MapPin, Globe, Sparkles, Check, ArrowRight, ArrowLeft, ShieldCheck, Share2 } from 'lucide-react';

interface SupplierOnboardingProps {
  profile: UserProfile;
  categories: Category[];
  onComplete: () => void;
}

export const SupplierOnboarding: React.FC<SupplierOnboardingProps> = ({ profile, categories, onComplete }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState(profile.companyName || profile.name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [location, setLocation] = useState(profile.location || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(profile.categories || []);
  const [website, setWebsite] = useState(profile.website || '');
  const [socialLinks, setSocialLinks] = useState({
    whatsapp: profile.phone || '',
    instagram: profile.socialLinks?.instagram || '',
    twitter: profile.socialLinks?.twitter || '',
    linkedin: profile.socialLinks?.linkedin || '',
  });

  // Debounced auto-save function
  const saveProgress = useCallback(async (data: Partial<UserProfile>) => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
    } finally {
      setIsSaving(false);
    }
  }, [profile.uid]);

  // Auto-save categories change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProgress({ 
        companyName,
        bio,
        phone,
        location,
        categories: selectedCategories,
        website,
        socialLinks
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [companyName, bio, phone, location, selectedCategories, website, socialLinks, saveProgress]);

  const handleFinish = async () => {
    if (selectedCategories.length === 0) {
      toast.error(isRtl ? 'يرجى اختيار تصنيف واحد على الأقل للمورد' : 'Please select at least one category');
      setStep(2);
      return;
    }

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), { 
        companyName,
        name: companyName,
        bio,
        phone,
        location,
        categories: selectedCategories,
        website,
        socialLinks,
        onboardingCompleted: true,
        isMvmVerified: true,
      });
      toast.success(isRtl ? 'تم إكمال ملف المورد بنجاح! مرحباً بك في سوق كونكت' : 'Supplier onboarding completed! Welcome to Souq Connect.');
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
      toast.error(isRtl ? 'فشل حفظ البيانات' : 'Failed to save data');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 dir-rtl">
      {/* Header Banner */}
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold">
          <Sparkles size={14} />
          <span>{isRtl ? 'إعداد حساب المورد المعتمد' : 'Verified Supplier Setup'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {isRtl ? 'مرحباً بك في منصة سوق كونكت' : 'Welcome to Souq Connect'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          {isRtl 
            ? 'أكمل الخطوات التالية لتلقي طلبيات الشراء والعروض من المؤسسات مباشرة' 
            : 'Complete the steps below to start receiving RFQs and purchase orders'}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex justify-between items-center mb-3 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span className={step === 1 ? 'text-brand-primary' : ''}>1. {isRtl ? 'معلومات الشركة' : 'Company Info'}</span>
          <span className={step === 2 ? 'text-brand-primary' : ''}>2. {isRtl ? 'اختيار الفئة والتصنيفات' : 'Categories'}</span>
          <span className={step === 3 ? 'text-brand-primary' : ''}>3. {isRtl ? 'التواصل الاجتماعي والربط' : 'Social & Contact'}</span>
        </div>
        <div className="flex h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="bg-brand-primary transition-all duration-300 rounded-full" 
            style={{ width: `${(step / 3) * 100}%` }} 
          />
        </div>
        <div className="mt-2 text-end text-[10px] text-slate-400 font-medium">
          {isSaving ? (isRtl ? 'جاري حفظ التغييرات...' : 'Saving changes...') : (isRtl ? 'تم الحفظ تلقائياً' : 'Auto-saved')}
        </div>
      </div>

      {/* Main Content Step Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {isRtl ? 'معلومات الشركة أو المؤسسة' : 'Company & Business Details'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isRtl ? 'تساعد هذه البيانات المشترين والمؤسسات للتعرف على نشاطك التجارية' : 'Help buyers learn about your company'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isRtl ? 'اسم الشركة / العلامة التجارية *' : 'Company Name *'}
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={isRtl ? 'مثال: شركة النخبة للتوريدات' : 'e.g. Elite Supplies Co.'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isRtl ? 'رقم الهاتف / الواتساب للتواصل *' : 'Phone / WhatsApp *'}
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+966 50 000 0000"
                      className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary dir-ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isRtl ? 'المدينة والفرع الرئيسي' : 'City & Main Location'}
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute right-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={isRtl ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
                      className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isRtl ? 'نبذة عن المنتجات والخدمات المقدمة' : 'Company Bio & Products'}
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={isRtl ? 'صف طبيعة المنتجات، المواد الموردة، أو الخدمات التي تقدمونها...' : 'Describe products and services offered...'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {isRtl ? 'اختيار فئات التوريد (التصنيف الذكي)' : 'Select Supply Categories'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isRtl ? 'اختر الفئات التي توردها ليصلك إشعارات وتنبيهات الطلبيات ذات الصلة تلقائياً' : 'Select categories to receive matching RFQs'}
                  </p>
                </div>
              </div>

              <AICategorySelector 
                categories={categories} 
                selectedCategoryIds={selectedCategories} 
                onChange={setSelectedCategories}
                isRtl={isRtl}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
                  <Share2 size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {isRtl ? 'روابط التواصل الاجتماعي والموقع الإلكتروني' : 'Social Media & Links'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isRtl ? 'اعرض حسابات التواصل الاجتماعي ووسائل الاتصال للعملاء لزيادة الموثوقية' : 'Show social channels to increase buyer trust'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isRtl ? 'الموقع الإلكتروني' : 'Website URL'}
                  </label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary dir-ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Instagram
                    </label>
                    <input
                      type="text"
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                      placeholder="https://instagram.com/yourhandle"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary dir-ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      LinkedIn
                    </label>
                    <input
                      type="text"
                      value={socialLinks.linkedin}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                      placeholder="https://linkedin.com/company/yourcompany"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary dir-ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Twitter / X
                    </label>
                    <input
                      type="text"
                      value={socialLinks.twitter}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                      placeholder="https://x.com/yourhandle"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary dir-ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      WhatsApp {isRtl ? 'للتواصل المباشر' : 'Direct'}
                    </label>
                    <input
                      type="text"
                      value={socialLinks.whatsapp}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="+966 50 000 0000"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:border-brand-primary dir-ltr"
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-3">
                  <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={20} />
                  <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                    {isRtl 
                      ? 'بإكمال هذا الملف، ستحصل على الشارة الفضية للموردين المعتمدين وتصلك إشعارات الطلبات ذات الأولوية.' 
                      : 'Completing your profile unlocks Verified Supplier status and priority RFQs.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between items-center">
        <button 
          disabled={step === 1} 
          onClick={() => setStep(s => s - 1)} 
          className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5"
        >
          {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          <span>{isRtl ? 'السابق' : 'Previous'}</span>
        </button>

        <button 
          onClick={() => step < 3 ? setStep(s => s + 1) : handleFinish()} 
          className="px-8 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold shadow-lg shadow-brand-primary/25 hover:opacity-95 transition-all flex items-center gap-1.5"
        >
          <span>{step === 3 ? (isRtl ? 'حفظ وإكمال الإعداد' : 'Finish & Complete') : (isRtl ? 'التالي' : 'Next')}</span>
          {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
};

