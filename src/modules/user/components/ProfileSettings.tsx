import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User as UserIcon, Mail, Phone, MapPin, Save, Cpu, Zap, BookOpen, FileText, ShieldCheck, Lock, Sparkles, Tag, BrainCircuit, Store, Briefcase, Layers, AlertCircle } from 'lucide-react';
import { doc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { db, auth } from '../../../core/firebase';
import { UserProfile, Category } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { CacheOptimizer } from '../../../shared/components/CacheOptimizer';
import HelpCenter from '../../site/components/HelpCenter';
import { AnimatePresence, motion } from 'motion/react';
import { classifyAndOptimizeSupplier } from '../../../core/services/geminiService';
import { toast } from 'sonner';

interface ProfileSettingsProps {
  profile: UserProfile;
  onBack?: () => void;
  forceShowSupplierSettings?: boolean;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile, onBack, forceShowSupplierSettings }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const isSupplierView = profile.role === 'supplier' || forceShowSupplierSettings;

  const [editName, setEditName] = useState(profile.name || '');
  const [editEmail, setEditEmail] = useState(profile.email || '');
  const [editPhone, setEditPhone] = useState(profile.phone || '');
  const [editLocation, setEditLocation] = useState(profile.location || '');
  const [editBio, setEditBio] = useState(profile.bio || '');
  const [businessDescription, setBusinessDescription] = useState(profile.businessDescription || '');
  const [supplierType, setSupplierType] = useState<'merchant' | 'service_provider' | 'both'>(profile.supplierType || 'merchant');
  const [keywords, setKeywords] = useState<string[]>(profile.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>(profile.categories || []);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      setAllCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    });
    return () => unsub();
  }, [profile]);

  const handleNeuralAnalysis = async () => {
    if (!businessDescription.trim()) return;
    
    try {
      setIsAnalyzing(true);
      const result = await classifyAndOptimizeSupplier(businessDescription, allCategories, i18n.language);
      
      if (result) {
        setSupplierType(result.supplierType);
        setKeywords(result.suggestedKeywords);
        setEditBio(result.optimizedBio);
        
        // Match categories
        if (result.suggestedCategoryIds && result.suggestedCategoryIds.length > 0) {
          setSelectedCategories(prev => {
            const newSet = new Set([...prev, ...result.suggestedCategoryIds]);
            return Array.from(newSet);
          });
        }
      }
    } catch (error) {
      console.error('Neural analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      if (!keywords.includes(keywordInput.trim())) {
        setKeywords([...keywords, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };

  const removeKeyword = (tag: string) => {
    setKeywords(keywords.filter(k => k !== tag));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.uid) return;

    try {
      setIsSaving(true);
      const updateData: any = {
        name: editName,
        email: editEmail,
        phone: editPhone,
        location: editLocation,
        bio: editBio,
        updatedAt: new Date().toISOString()
      };
      
      if (isSupplierView) {
        updateData.categories = selectedCategories;
        updateData.businessDescription = businessDescription;
        updateData.supplierType = supplierType;
        updateData.keywords = keywords;
      }

      await updateDoc(doc(db, 'users', profile.uid), updateData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showHelpCenter && (
          <HelpCenter 
            onClose={() => setShowHelpCenter(false)} 
            isRtl={isRtl} 
          />
        )}
      </AnimatePresence>

      {onBack && (
        <button onClick={onBack} className="text-brand-primary font-bold text-sm mb-4">
          {isRtl ? '← عودة' : '← Back'}
        </button>
      )}
      
      <div className="bg-brand-surface rounded-3xl border border-brand-border shadow-sm overflow-hidden">
        <div className="bg-brand-primary px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">
            {isRtl ? 'تعديل البيانات الشخصية' : 'Edit Personal Info'}
          </h3>
          {saveSuccess && (
            <span className="text-white text-sm font-bold bg-white/20 px-3 py-1 rounded-lg">
              {isRtl ? 'تم الحفظ' : 'Saved'}
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{isRtl ? 'الاسم' : 'Name'}</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                <input 
                  type="email" 
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{isRtl ? 'رقم التواصل' : 'Contact Number'}</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
                <input 
                  type="tel" 
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{isRtl ? 'الموقع' : 'Location'}</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
                <input 
                  type="text" 
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main"
                />
              </div>
            </div>
          </div>

          {/* Supplier Specific Section */}
          {isSupplierView && (
            <div className="space-y-6 pt-4 border-t border-brand-border/50">
              <div className="flex items-center gap-3 mb-2">
                <BrainCircuit className="text-brand-primary" size={20} />
                <h4 className="font-bold text-brand-text-main">{isRtl ? 'إعدادات المورد الذكية' : 'Smart Supplier Settings'}</h4>
              </div>

              {/* Supplier Type Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">
                  {isRtl ? 'نوع النشاط التجاري' : 'Business Type'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'merchant', labelAr: 'تاجر', labelEn: 'Merchant', icon: Store },
                    { id: 'service_provider', labelAr: 'مقدم خدمة', labelEn: 'Service Provider', icon: Briefcase },
                    { id: 'both', labelAr: 'كلاهما', labelEn: 'Both', icon: Layers }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSupplierType(type.id as any)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                        supplierType === type.id
                          ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-sm'
                          : 'bg-brand-background border-brand-border text-brand-text-muted hover:border-brand-primary/50'
                      }`}
                    >
                      <type.icon size={20} />
                      <span className="text-xs font-bold">{isRtl ? type.labelAr : type.labelEn}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Neural Description & Analysis */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">
                    {isRtl ? 'وصف العمل (للتصنيف الذكي)' : 'Business Description (for Smart Classification)'}
                  </label>
                  <button
                    type="button"
                    onClick={handleNeuralAnalysis}
                    disabled={isAnalyzing || !businessDescription.trim()}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-brand-primary hover:opacity-80 disabled:opacity-30 transition-all bg-brand-primary/5 px-3 py-1.5 rounded-full border border-brand-primary/20"
                  >
                    {isAnalyzing ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-primary"></div>
                    ) : (
                      <Sparkles size={12} />
                    )}
                    {isRtl ? 'تحليل ذكي' : 'Neural Analysis'}
                  </button>
                </div>
                <textarea
                  value={businessDescription}
                  onChange={e => setBusinessDescription(e.target.value)}
                  placeholder={isRtl ? 'صف عملك بالتفصيل (مثلاً: أبيع قطع غيار السيارات وأقدم خدمات الصيانة)...' : 'Describe your business in detail (e.g., I sell car parts and provide maintenance services)...'}
                  className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main min-h-[100px] text-sm"
                />
              </div>

              {/* Keywords / Tags */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">
                  {isRtl ? 'الكلمات المفتاحية للأعمال' : 'Business Keywords'}
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-brand-background border border-brand-border rounded-2xl min-h-[50px]">
                  {keywords.map((tag, idx) => (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      key={idx}
                      className="flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary px-3 py-1 rounded-lg text-xs font-bold border border-brand-primary/20"
                    >
                      {tag}
                      <button type="button" onClick={() => removeKeyword(tag)} className="hover:text-red-500">×</button>
                    </motion.span>
                  ))}
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={handleAddKeyword}
                    placeholder={isRtl ? 'أضف كلمة واضغط Enter...' : 'Add keyword and press Enter...'}
                    className="flex-1 bg-transparent outline-none text-xs text-brand-text-main min-w-[150px]"
                  />
                </div>
              </div>

              {/* Categories Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{isRtl ? 'فئات العمل المختارة' : 'Selected Work Categories'}</label>
                <input
                  type="text"
                  placeholder={isRtl ? 'ابحث عن فئة لإضافتها يدوياً...' : 'Search categories to add manually...'}
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full pl-4 pr-4 py-2.5 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main mb-2"
                />
                <div className="flex flex-wrap gap-2 mt-2 max-h-60 overflow-y-auto p-2 bg-brand-background/50 rounded-xl border border-brand-border/50">
                  {allCategories
                    .filter(cat => (isRtl ? cat.nameAr : cat.nameEn).toLowerCase().includes(categorySearch.toLowerCase()))
                    .map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategories(prev => 
                            prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                          );
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedCategories.includes(cat.id)
                            ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                            : 'bg-brand-background border border-brand-border text-brand-text-muted hover:border-brand-primary'
                        }`}
                      >
                        {isRtl ? cat.nameAr : cat.nameEn}
                      </button>
                    ))}
                </div>
              </div>

              {/* Professional Bio */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{isRtl ? 'النبذة التعريفية (Bio)' : 'Professional Bio'}</label>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary transition-all text-brand-text-main min-h-[120px] text-sm"
                />
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <HapticButton
              type="submit"
              disabled={isSaving}
              className="bg-brand-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-primary-hover transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-primary/20"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Save size={18} />
                  {isRtl ? 'حفظ التغييرات' : 'Save Changes'}
                </>
              )}
            </HapticButton>
          </div>
        </form>
      </div>

      {/* System Optimization Section */}
      <div className="bg-brand-surface rounded-3xl border border-brand-border shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
            <Cpu size={24} />
          </div>
          <div>
            <h4 className="font-bold text-brand-text-main">
              {isRtl ? 'تحسين أداء التطبيق' : 'App Performance Optimization'}
            </h4>
            <p className="text-[10px] text-brand-text-muted font-medium uppercase tracking-wider">
              {isRtl ? 'تنظيف ذاكرة التخزين المؤقت وتحسين سرعة التصفح' : 'Clear cache and optimize browsing speed'}
            </p>
          </div>
        </div>
        
        <div className="bg-brand-background/50 rounded-2xl p-4 mb-4 border border-brand-border/50">
          <p className="text-xs text-brand-text-muted leading-relaxed">
            {isRtl 
              ? 'إذا كنت تواجه بطئاً في تحميل الصور أو البيانات، يمكنك استخدام أداة التحسين الذكية لتنظيف الملفات المؤقتة وإعادة ضبط أداء الواجهة بشكل فخم وسلس.'
              : 'If you experience slow loading of images or data, use our smart optimizer to purge temporary files and reset the UI performance for a smooth, premium experience.'}
          </p>
        </div>

        <HapticButton
          onClick={() => setIsOptimizerOpen(true)}
          className="w-full bg-brand-background border border-brand-border text-brand-text-main py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-surface transition-all group shadow-sm"
        >
          <Zap size={18} className="text-brand-primary group-hover:scale-125 transition-transform" />
          {isRtl ? 'تشغيل أداة التحسين الذكية' : 'Run Smart Optimizer Tool'}
        </HapticButton>
      </div>

      <CacheOptimizer 
        isOpen={isOptimizerOpen} 
        onClose={() => setIsOptimizerOpen(false)} 
      />

      {/* User Guide & Policies Section */}
      <div className="bg-brand-surface rounded-3xl border border-brand-border shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
            <BookOpen size={24} />
          </div>
          <div>
            <h4 className="font-bold text-brand-text-main">
              {isRtl ? 'دليل المستخدم والسياسات' : 'User Guide & Policies'}
            </h4>
            <p className="text-[10px] text-brand-text-muted font-medium uppercase tracking-wider">
              {isRtl ? 'عرض الدليل الكامل وشروط الاستخدام' : 'View full guide and terms of use'}
            </p>
          </div>
        </div>
        
        <div className="bg-brand-background/50 rounded-2xl p-4 mb-4 border border-brand-border/50">
          <p className="text-xs text-brand-text-muted leading-relaxed">
            {isRtl 
              ? 'تعرف على كيفية استخدام المنصة بشكل احترافي، واطلع على سياسة الخصوصية وشروط الاستخدام لضمان تجربة آمنة وموثوقة.'
              : 'Learn how to use the platform professionally, and review the privacy policy and terms of use to ensure a safe and reliable experience.'}
          </p>
        </div>

        <HapticButton
          onClick={() => setShowHelpCenter(true)}
          className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-primary-hover transition-all group shadow-lg shadow-brand-primary/20"
        >
          <FileText size={18} className="group-hover:rotate-12 transition-transform" />
          {isRtl ? 'فتح مركز المساعدة' : 'Open Help Center'}
        </HapticButton>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: isRtl ? 'دليل الميزات' : 'Guide', icon: Sparkles },
            { label: isRtl ? 'الشروط' : 'Terms', icon: ShieldCheck },
            { label: isRtl ? 'الخصوصية' : 'Privacy', icon: Lock }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 p-2 bg-brand-background/30 rounded-xl border border-brand-border/30">
              <item.icon size={12} className="text-brand-primary/60" />
              <span className="text-[8px] font-black uppercase tracking-tighter text-brand-text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50/50 dark:bg-red-900/10 rounded-3xl border border-red-200 dark:border-red-900/30 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 shadow-inner">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="font-bold text-red-900 dark:text-red-400">
              {isRtl ? 'منطقة الخطر' : 'Danger Zone'}
            </h4>
            <p className="text-[10px] text-red-600/60 font-medium uppercase tracking-wider">
              {isRtl ? 'إجراءات لا يمكن التراجع عنها' : 'Irreversible actions'}
            </p>
          </div>
        </div>
        
        <p className="text-xs text-red-800/70 dark:text-red-400/70 mb-4 leading-relaxed">
          {isRtl 
            ? 'عند حذف الحساب، سيتم إخفاء بياناتك من المنصة ولن تتمكن من استعادتها مرة أخرى. يرجى التأكد قبل المتابعة.'
            : 'When you delete your account, your data will be hidden from the platform and you will not be able to recover it. Please be sure before proceeding.'}
        </p>

        <HapticButton
          onClick={async () => {
            if (window.confirm(isRtl ? 'هل أنت متأكد من رغبتك في حذف الحساب؟' : 'Are you sure you want to delete your account?')) {
              try {
                setIsSaving(true);
                const deleteData = {
                  status: 'deleted',
                  deletedAt: new Date().toISOString()
                };
                
                // Soft delete from both collections
                await Promise.all([
                  updateDoc(doc(db, 'users', profile.uid), deleteData),
                  updateDoc(doc(db, 'users_public', profile.uid), deleteData).catch(() => {
                    // Ignore if users_public doc doesn't exist (e.g. for customers)
                  })
                ]);
                
                toast.success(isRtl ? 'تم حذف الحساب بنجاح' : 'Account deleted successfully');
                auth.signOut();
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
              } finally {
                setIsSaving(false);
              }
            }
          }}
          className="w-full bg-white dark:bg-red-950 border border-red-200 dark:border-red-900/30 text-red-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-red-50 transition-all shadow-sm"
        >
          {isRtl ? 'حذف الحساب نهائياً' : 'Delete Account Permanently'}
        </HapticButton>
      </div>
    </div>
  );
};
