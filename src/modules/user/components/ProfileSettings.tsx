import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Save, 
  Globe, 
  Sparkles, 
  Camera, 
  Loader2, 
  Briefcase, 
  Tag, 
  Building2, 
  AlertCircle, 
  Cpu, 
  Zap, 
  BookOpen, 
  FileText, 
  ShieldCheck, 
  Lock,
  Palette,
  Wand2,
  LayoutGrid,
  X,
  Plus,
  CheckCircle2,
  Search
} from 'lucide-react';
import { doc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType, handleAiError } from '../../../core/utils/errorHandling';
import { db, auth, storage } from '../../../core/firebase';
import { UserProfile, Category } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { CacheOptimizer } from '../../../shared/components/CacheOptimizer';
import HelpCenter from '../../site/components/HelpCenter';
import { AnimatePresence, motion } from 'motion/react';
import { enhanceBio, suggestSupplierCategories } from '../../../core/services/geminiService';
import { compressImage } from '../../../core/utils/imageCropper';
import { toast } from 'sonner';
import { UserBrandingSettings } from './UserBrandingSettings';
import { Badge } from '../../../shared/components/ui/badge';

interface ProfileSettingsProps {
  profile: UserProfile;
  onBack?: () => void;
  forceShowSupplierSettings?: boolean;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile, onBack, forceShowSupplierSettings }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const isSupplierView = profile.role === 'supplier' || forceShowSupplierSettings;

  // Form State
  const [formData, setFormData] = useState({
    name: profile.name || '',
    companyName: profile.companyName || '',
    email: profile.email || '',
    phone: profile.phone || '',
    location: profile.location || '',
    website: profile.website || '',
    bio: profile.bio || profile.businessDescription || '',
    keywords: profile.keywords || [],
    categories: profile.categories || [],
    logoUrl: profile.logoUrl || profile.photoURL || '',
    coverUrl: profile.coverUrl || ''
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [isAiSuggestingCategories, setIsAiSuggestingCategories] = useState(false);
  const [suggestedCategoryIds, setSuggestedCategoryIds] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]";
  const bentoCardClass = `${glassClass} rounded-[2.5rem] p-8 md:p-10 transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] border-2 border-transparent hover:border-brand-primary/20`;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      setAllCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    });
    return () => unsub();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !profile.uid) return;

    const setUploading = type === 'logo' ? setIsUploadingLogo : setIsUploadingCover;
    setUploading(true);
    toast.info(isRtl ? 'جاري معالجة الصورة...' : 'Processing image...');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        // Smart Compress
        const compressedBase64 = await compressImage(base64, type === 'cover' ? 1200 : 400);
        const response = await fetch(compressedBase64);
        const blob = await response.blob();
        
        const storageRef = ref(storage, `users/${profile.uid}/${type}_${Date.now()}`);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        
        handleChange(type === 'logo' ? 'logoUrl' : 'coverUrl', url);
        
        // Auto-save image to profile
        await updateDoc(doc(db, 'users', profile.uid), {
          [type === 'logo' ? 'logoUrl' : 'coverUrl']: url,
          ...(type === 'logo' ? { photoURL: url } : {}) // Sync photoURL with logoUrl
        });
        
        toast.success(isRtl ? 'تم تحديث الصورة بنجاح' : 'Image updated successfully');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error(isRtl ? 'حدث خطأ أثناء رفع الصورة' : 'Error uploading image');
      setUploading(false);
    }
  };

  const handleEnhanceBio = async () => {
    if (!formData.bio.trim()) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceBio(formData.bio, i18n.language);
      handleChange('bio', enhanced);
      toast.success(isRtl ? 'تم تحسين النبذة بذكاء!' : 'Bio enhanced smartly!');
      
      // Auto-suggest categories based on the new bio
      handleAiSuggestCategories(enhanced);
    } catch (error) {
      toast.error(isRtl ? 'فشل التحسين' : 'Enhancement failed');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAiSuggestCategories = async (bioText?: string) => {
    const textToAnalyze = bioText || formData.bio;
    if (!textToAnalyze || allCategories.length === 0) return;

    setIsAiSuggestingCategories(true);
    try {
      const suggestedIds = await suggestSupplierCategories(
        { ...formData, bio: textToAnalyze },
        allCategories,
        i18n.language
      );
      
      if (suggestedIds && suggestedIds.length > 0) {
        setSuggestedCategoryIds(suggestedIds);
        toast.info(isRtl ? 'تم العثور على فئات مقترحة لنشاطك' : 'Suggested categories found for your business');
      }
    } catch (err) {
      console.error('Category suggestion failed:', err);
    } finally {
      setIsAiSuggestingCategories(false);
    }
  };

  const applySuggestedCategories = () => {
    const newCategories = Array.from(new Set([...formData.categories, ...suggestedCategoryIds]));
    handleChange('categories', newCategories);
    setSuggestedCategoryIds([]);
    toast.success(isRtl ? 'تم تطبيق الفئات المقترحة' : 'Suggested categories applied');
  };

  const filteredCategories = allCategories.filter(cat => {
    const name = isRtl ? cat.nameAr : cat.nameEn;
    return name.toLowerCase().includes(categorySearch.toLowerCase());
  });

  const selectedCategories = allCategories.filter(cat => formData.categories.includes(cat.id));
  const suggestedCategories = allCategories.filter(cat => 
    suggestedCategoryIds.includes(cat.id) && !formData.categories.includes(cat.id)
  );
  const otherCategories = filteredCategories.filter(cat => 
    !formData.categories.includes(cat.id) && !suggestedCategoryIds.includes(cat.id)
  );

  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      if (!formData.keywords.includes(keywordInput.trim())) {
        handleChange('keywords', [...formData.keywords, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };

  const handleSave = async () => {
    if (!profile.uid) return;
    try {
      setIsSaving(true);
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        website: formData.website,
        bio: formData.bio,
        companyName: formData.companyName,
        updatedAt: new Date().toISOString()
      };
      
      if (isSupplierView) {
        updateData.categories = formData.categories;
        updateData.keywords = formData.keywords;
        updateData.businessDescription = formData.bio; // Keep in sync
      }

      await updateDoc(doc(db, 'users', profile.uid), updateData);
      setHasChanges(false);
      toast.success(isRtl ? 'تم حفظ التحديثات بنجاح' : 'Updates saved successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`, false);
    } finally {
      setIsSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-brand-background pb-32 font-sans relative" dir={isRtl ? 'rtl' : 'ltr'}>
      
      <AnimatePresence>
        {showHelpCenter && <HelpCenter onClose={() => setShowHelpCenter(false)} isRtl={isRtl} />}
      </AnimatePresence>

      {onBack && (
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between">
          <button onClick={onBack} className="bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-black/70 transition-colors">
            {isRtl ? '← عودة' : '← Back'}
          </button>
        </div>
      )}

      {/* 1. Immersive Header (Cover & Avatar) */}
      <div className="relative w-full h-80 md:h-[450px] bg-brand-surface border-b border-brand-border overflow-hidden">
        {formData.coverUrl ? (
          <img src={formData.coverUrl} className="w-full h-full object-cover" alt="Cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-primary/20 via-brand-secondary/10 to-brand-primary/20 flex items-center justify-center">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <ImageIcon size={64} className="text-brand-primary/30 relative z-10" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-brand-background via-transparent to-transparent"></div>

        {/* Cover Upload Button */}
        <button 
          onClick={() => coverInputRef.current?.click()}
          className="absolute bottom-8 right-8 bg-white/20 backdrop-blur-xl text-white p-4 rounded-3xl hover:bg-white/30 transition-all shadow-2xl border border-white/20 group"
        >
          {isUploadingCover ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} className="group-hover:scale-110 transition-transform" />}
        </button>
        <input type="file" ref={coverInputRef} onChange={(e) => handleImageUpload(e, 'cover')} className="hidden" accept="image/*" />
      </div>

      {/* 2. Identity Section */}
      <div className="px-6 md:px-12 relative -mt-32 sm:-mt-40 flex flex-col sm:flex-row items-center sm:items-end gap-8 mb-16 max-w-7xl mx-auto">
        {/* Floating Avatar */}
        <div className="relative group">
          <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-[3rem] bg-brand-surface border-[6px] border-brand-background shadow-[0_20px_60px_rgba(0,0,0,0.2)] overflow-hidden relative">
            {formData.logoUrl ? (
              <img src={formData.logoUrl} className="w-full h-full object-cover" alt="Logo" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-brand-primary/10 to-brand-primary/20 flex items-center justify-center text-brand-primary text-6xl font-black">
                {formData.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-md">
              <button onClick={() => logoInputRef.current?.click()} className="text-white bg-brand-primary p-5 rounded-2xl shadow-2xl hover:scale-110 transition-transform">
                {isUploadingLogo ? <Loader2 size={28} className="animate-spin" /> : <Camera size={28} />}
              </button>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-brand-background">
            <ShieldCheck size={24} />
          </div>
          <input type="file" ref={logoInputRef} onChange={(e) => handleImageUpload(e, 'logo')} className="hidden" accept="image/*" />
        </div>

        {/* Identity Details */}
        <div className="flex-1 text-center sm:text-start pb-4 space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
            <Zap size={12} />
            {isRtl ? 'هوية معتمدة' : 'Verified Identity'}
          </div>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={isRtl ? 'الاسم الكامل' : 'Full Name'}
            className="text-4xl sm:text-6xl font-black text-brand-text-main bg-transparent border-none outline-none w-full text-center sm:text-start placeholder-brand-text-muted/30 focus:ring-0 p-0 tracking-tight"
          />
          {isSupplierView && (
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-4">
              <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                <Building2 size={20} />
              </div>
              <input 
                type="text" 
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder={isRtl ? 'اسم الشركة / المتجر' : 'Company / Store Name'}
                className="text-xl sm:text-2xl font-bold text-brand-text-muted bg-transparent border-none outline-none flex-1 placeholder-brand-text-muted/30 focus:ring-0 p-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Bento Grid Data Section */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        {/* Bio Card (Spans 8 columns on desktop) */}
        <motion.div variants={itemVariants} className={`lg:col-span-8 ${bentoCardClass} group relative`}>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <FileText size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-text-main">{isRtl ? 'النبذة الاحترافية' : 'Professional Bio'}</h3>
                <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'قصة نجاحك' : 'Your Success Story'}</p>
              </div>
            </div>
            <HapticButton 
              onClick={handleEnhanceBio}
              disabled={isEnhancing || !formData.bio}
              className="flex items-center gap-3 bg-brand-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:-translate-y-1 transition-all disabled:opacity-50"
            >
              {isEnhancing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isRtl ? 'تحسين ذكي' : 'AI Enhance'}
            </HapticButton>
          </div>
          <textarea 
            value={formData.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            placeholder={isRtl ? 'اكتب نبذة عنك أو عن شركتك...' : 'Write a bio about yourself or your company...'}
            className="w-full h-48 bg-brand-background/50 border border-brand-border rounded-[2rem] p-8 text-brand-text-main outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-medium leading-relaxed resize-none text-lg"
          />
        </motion.div>

        {/* Contact Card (Spans 4 columns) */}
        <motion.div variants={itemVariants} className={`lg:col-span-4 ${bentoCardClass} space-y-6`}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-warning/10 flex items-center justify-center text-brand-warning">
              <Phone size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-brand-text-main">{isRtl ? 'التواصل' : 'Contact'}</h3>
              <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'بيانات الوصول' : 'Access Data'}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="group relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-primary transition-transform group-focus-within:scale-110" size={20} />
              <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full pl-14 pr-6 py-4 bg-brand-background/50 border border-brand-border rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-sm" placeholder={t('email')} />
            </div>
            <div className="group relative">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-primary transition-transform group-focus-within:scale-110" size={20} />
              <input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full pl-14 pr-6 py-4 bg-brand-background/50 border border-brand-border rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-sm" placeholder={isRtl ? 'رقم الهاتف' : 'Phone Number'} />
            </div>
            <div className="group relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-primary transition-transform group-focus-within:scale-110" size={20} />
              <input type="text" value={formData.location} onChange={(e) => handleChange('location', e.target.value)} className="w-full pl-14 pr-6 py-4 bg-brand-background/50 border border-brand-border rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-sm" placeholder={isRtl ? 'الموقع' : 'Location'} />
            </div>
            <div className="group relative">
              <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-primary transition-transform group-focus-within:scale-110" size={20} />
              <input type="url" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} className="w-full pl-14 pr-6 py-4 bg-brand-background/50 border border-brand-border rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-sm" placeholder={isRtl ? 'الموقع الإلكتروني' : 'Website'} />
            </div>
          </div>
        </motion.div>

        {/* Work & Categories Card (Supplier Only) */}
        {isSupplierView && (
          <motion.div variants={itemVariants} className={`lg:col-span-12 ${bentoCardClass} relative overflow-hidden`}>
            {/* AI Suggestion Overlay */}
            <AnimatePresence>
              {suggestedCategoryIds.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-x-0 top-0 z-20 p-6 bg-brand-primary text-white shadow-2xl flex items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-2xl">
                      <Zap size={24} className="animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest">{isRtl ? 'اقتراحات ذكية مكتشفة!' : 'Smart Suggestions Detected!'}</p>
                      <p className="text-xs opacity-80">{isRtl ? 'وجدنا فئات تناسب نبذتك الشخصية' : 'We found categories that match your bio'}</p>
                    </div>
                  </div>
                  <HapticButton 
                    onClick={applySuggestedCategories}
                    className="px-8 py-3 bg-white text-brand-primary rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-transform"
                  >
                    {isRtl ? 'تطبيق الاقتراحات' : 'Apply Suggestions'}
                  </HapticButton>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                  <LayoutGrid size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-text-main">{isRtl ? 'رادار التخصص الذكي' : 'Smart Specialization Radar'}</h3>
                  <p className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">{isRtl ? 'الفئات والكلمات المفتاحية' : 'Categories & Keywords'}</p>
                </div>
              </div>
              <HapticButton 
                onClick={() => handleAiSuggestCategories()}
                disabled={isAiSuggestingCategories}
                className="flex items-center gap-3 bg-brand-teal/10 text-brand-teal px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-teal hover:text-white transition-all disabled:opacity-50"
              >
                {isAiSuggestingCategories ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                {isRtl ? 'فحص الفئات' : 'Scan Categories'}
              </HapticButton>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Categories Hub */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em]">{isRtl ? 'مركز التصنيفات' : 'Categories Hub'}</label>
                  {formData.categories.length > 0 && (
                    <span className="text-[10px] font-black bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">
                      {formData.categories.length} {isRtl ? 'مختار' : 'Selected'}
                    </span>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-primary/50 group-focus-within:text-brand-primary transition-colors">
                    <Search size={20} />
                  </div>
                  <input 
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder={isRtl ? 'ابحث عن تخصصك...' : 'Search for your specialty...'}
                    className="w-full pl-14 pr-6 py-4 bg-brand-background/50 border border-brand-border rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-sm"
                  />
                  {categorySearch && (
                    <button 
                      onClick={() => setCategorySearch('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-brand-primary/10 rounded-full text-brand-text-muted transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Selected Section */}
                  {selectedCategories.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest px-2">{isRtl ? 'المختارة حالياً' : 'Currently Selected'}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => handleChange('categories', formData.categories.filter(id => id !== cat.id))}
                            className="px-5 py-2.5 rounded-xl text-sm font-black bg-brand-primary text-white shadow-lg shadow-brand-primary/20 flex items-center gap-2 hover:scale-105 transition-all"
                          >
                            <CheckCircle2 size={16} />
                            {isRtl ? cat.nameAr : cat.nameEn}
                            <X size={14} className="opacity-50" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Section */}
                  {suggestedCategories.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest px-2 flex items-center gap-2">
                        <Zap size={12} /> {isRtl ? 'اقتراحات الذكاء الاصطناعي' : 'AI Suggestions'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => handleChange('categories', [...formData.categories, cat.id])}
                            className="px-5 py-2.5 rounded-xl text-sm font-black bg-brand-teal/10 text-brand-teal border border-brand-teal/20 flex items-center gap-2 hover:bg-brand-teal hover:text-white transition-all"
                          >
                            <Plus size={16} />
                            {isRtl ? cat.nameAr : cat.nameEn}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other / Search Results */}
                  {(categorySearch || (selectedCategories.length === 0 && suggestedCategories.length === 0)) && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest px-2">
                        {categorySearch ? (isRtl ? 'نتائج البحث' : 'Search Results') : (isRtl ? 'كل التصنيفات' : 'All Categories')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {otherCategories.length > 0 ? (
                          otherCategories.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => handleChange('categories', [...formData.categories, cat.id])}
                              className="px-5 py-2.5 rounded-xl text-sm font-black bg-brand-surface border border-brand-border text-brand-text-muted hover:border-brand-primary/50 hover:text-brand-primary transition-all"
                            >
                              {isRtl ? cat.nameAr : cat.nameEn}
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-brand-text-muted italic px-2">{isRtl ? 'لا توجد نتائج مطابقة' : 'No matching results'}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-6">
                <label className="text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em] block px-2 flex items-center gap-2"><Tag size={14}/> {isRtl ? 'الكلمات المفتاحية' : 'Keywords'}</label>
                <div className="flex flex-wrap gap-3 p-8 bg-brand-background/50 border border-brand-border rounded-[2rem] min-h-[150px] content-start">
                  {formData.keywords.map((tag, idx) => (
                    <Badge key={idx} className="flex items-center gap-3 bg-brand-surface text-brand-text-main px-5 py-2.5 rounded-2xl text-sm font-black border border-brand-border hover:border-brand-error/30 transition-colors group">
                      {tag}
                      <button onClick={() => handleChange('keywords', formData.keywords.filter(k => k !== tag))} className="text-brand-text-muted group-hover:text-brand-error transition-colors">
                        <X size={16} />
                      </button>
                    </Badge>
                  ))}
                  <div className="relative flex-1 min-w-[200px]">
                    <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary" size={20} />
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={e => setKeywordInput(e.target.value)}
                      onKeyDown={handleAddKeyword}
                      placeholder={isRtl ? 'أضف كلمة واضغط Enter...' : 'Add keyword and press Enter...'}
                      className="w-full bg-transparent outline-none text-sm font-bold text-brand-text-main pl-12 py-3"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Branding Section */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto mt-8">
        <motion.div variants={itemVariants} className={`${bentoCardClass}`}>
          <UserBrandingSettings profile={profile} />
        </motion.div>
      </div>

      {/* System & Danger Zone */}
      <div className="px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div className={`${bentoCardClass} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Cpu size={24} />
              </div>
              <h4 className="text-xl font-black text-brand-text-main">{isRtl ? 'تحسين الأداء' : 'Performance'}</h4>
            </div>
            <p className="text-sm font-medium text-brand-text-muted mb-8 leading-relaxed">{isRtl ? 'تنظيف الملفات المؤقتة لتسريع تجربة التصفح والبحث.' : 'Clear temporary files to accelerate browsing and search experience.'}</p>
          </div>
          <HapticButton onClick={() => setIsOptimizerOpen(true)} className="w-full bg-brand-background border border-brand-border text-brand-text-main py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-brand-primary/5 hover:text-brand-primary hover:border-brand-primary transition-all">
            <Zap size={20} /> {isRtl ? 'تشغيل المحسن' : 'Run Optimizer'}
          </HapticButton>
        </div>

        <div className={`${glassClass} rounded-[2.5rem] p-8 md:p-10 border-brand-error/20 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-error/10 flex items-center justify-center text-brand-error">
                <AlertCircle size={24} />
              </div>
              <h4 className="text-xl font-black text-brand-error">{isRtl ? 'منطقة الخطر' : 'Danger Zone'}</h4>
            </div>
            <p className="text-sm font-medium text-brand-text-muted mb-8 leading-relaxed">{isRtl ? 'حذف الحساب نهائياً. هذا الإجراء سيؤدي لمسح كافة بياناتك ولا يمكن التراجع عنه.' : 'Permanently delete account. This action will erase all your data and cannot be undone.'}</p>
          </div>
          <HapticButton 
            onClick={async () => {
              if (window.confirm(isRtl ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) {
                try {
                  const deleteData = { status: 'deleted', deletedAt: new Date().toISOString() };
                  await Promise.all([
                    updateDoc(doc(db, 'users', profile.uid!), deleteData),
                    updateDoc(doc(db, 'users_public', profile.uid!), deleteData).catch(() => {})
                  ]);
                  auth.signOut();
                } catch (e) { console.error(e); }
              }
            }}
            className="w-full bg-brand-error/5 border border-brand-error/20 text-brand-error py-5 rounded-2xl font-black hover:bg-brand-error hover:text-white transition-all"
          >
            {isRtl ? 'حذف الحساب' : 'Delete Account'}
          </HapticButton>
        </div>
      </div>

      <CacheOptimizer isOpen={isOptimizerOpen} onClose={() => setIsOptimizerOpen(false)} />

      {/* 4. Floating Save Bar */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:min-w-[500px] bg-brand-surface/80 backdrop-blur-3xl border border-white/20 p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 flex items-center justify-between gap-10"
          >
            <div className="flex items-center gap-4 px-4">
              <div className="w-10 h-10 rounded-full bg-brand-warning/20 flex items-center justify-center text-brand-warning">
                <AlertCircle size={20} />
              </div>
              <span className="text-sm font-black text-brand-text-main">
                {isRtl ? 'تعديلات غير محفوظة' : 'Unsaved Changes'}
              </span>
            </div>
            <HapticButton 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black shadow-2xl shadow-brand-primary/30 hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
              {isRtl ? 'حفظ الآن' : 'Save Now'}
            </HapticButton>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Fallback icon for empty cover
const ImageIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);