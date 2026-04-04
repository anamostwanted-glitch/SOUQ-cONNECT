import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Tag, 
  MapPin, 
  DollarSign, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  Eye,
  ChevronRight,
  ChevronLeft,
  Info,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { SmartImageUploader } from '../../../shared/components/SmartImageUploader';
import { validatePhoneNumber, translateText } from '../../../core/services/geminiService';
import { Category, UserProfile, MarketplaceItem } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { BlurImage } from '../../../shared/components/BlurImage';
import { AINeuralCategorySelector } from '../../../shared/components/AINeuralCategorySelector';

interface MarketplaceAddProductProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Partial<MarketplaceItem>) => Promise<void>;
  categories: Category[];
  profile: UserProfile | null;
  initialData?: MarketplaceItem;
}

export const MarketplaceAddProduct: React.FC<MarketplaceAddProductProps> = ({
  isOpen,
  onClose,
  onAdd,
  categories,
  profile,
  initialData
}) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any | null>(null);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    categories: [] as string[],
    location: profile?.location || '',
    phone: profile?.phone || '',
    features: [] as string[],
    isHighQuality: false,
    classification: ''
  });

  const [watermarkSettings, setWatermarkSettings] = useState<{
    logo?: string;
    text?: string;
    opacity?: number;
    position?: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';
  }>({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWatermarkSettings({
          logo: data.watermarkUrl || data.watermarkLogoUrl,
          text: data.siteName || "B2B2C Connect",
          opacity: data.watermarkOpacity ?? 0.7,
          position: data.watermarkPosition || 'bottom-right'
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        price: initialData.price.toString(),
        categories: initialData.categories || [],
        location: initialData.location,
        phone: initialData.sellerPhone || '',
        features: initialData.features || [],
        isHighQuality: initialData.isHighQuality || false,
        classification: initialData.classification || ''
      });
      setUploadedImages(initialData.images.map((url, i) => ({
        id: `existing-${i}`,
        preview: url,
        finalUrl: url,
        status: 'success',
        progress: 100,
        file: new File([], 'existing-image')
      })));
      setStep(2); // Go straight to details when editing
    } else {
      // Reset form when not editing
      setFormData({
        title: '',
        description: '',
        price: '',
        categories: [] as string[],
        location: profile?.location || '',
        phone: profile?.phone || '',
        features: [],
        isHighQuality: false,
        classification: ''
      });
      setUploadedImages([]);
      setStep(1);
    }
  }, [initialData, profile, isOpen]);

  const [phoneValidation, setPhoneValidation] = useState<{
    isValid: boolean;
    formattedNumber: string;
    country: string;
    suggestion?: string;
  } | null>(null);

  // Sync AI data from uploader
  useEffect(() => {
    if (uploadedImages.length > 0 && uploadedImages[0].aiData) {
      setAiSuggestions(uploadedImages[0].aiData);
      if (!formData.title) {
        setShowAiSuggestions(true);
      }
    }
  }, [uploadedImages]);

  const applyAiSuggestions = () => {
    if (!aiSuggestions) return;
    setFormData(prev => ({
      ...prev,
      title: aiSuggestions.productName,
      description: aiSuggestions.description,
      categories: [aiSuggestions.category],
      features: aiSuggestions.features,
      isHighQuality: aiSuggestions.isHighQuality,
      classification: aiSuggestions.classification
    }));
    setShowAiSuggestions(false);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert(t('geolocation_not_supported', 'Geolocation is not supported by your browser'));
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${i18n.language}`);
        const data = await response.json();
        
        const city = data.address.city || data.address.town || data.address.village || '';
        const country = data.address.country || '';
        const locationStr = city ? `${city}, ${country}` : country;
        
        setFormData(prev => ({ ...prev, location: locationStr }));
      } catch (error) {
        console.error("Error getting location name:", error);
      } finally {
        setIsLocating(false);
      }
    }, (error) => {
      console.error("Geolocation error:", error);
      setIsLocating(false);
    });
  };

  // Phone validation
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        if (formData.phone && formData.phone.length > 5) {
          const result = await validatePhoneNumber(formData.phone, i18n.language);
          setPhoneValidation(result);
          if (result.isValid) {
            setFormData(prev => ({ ...prev, phone: result.formattedNumber }));
          }
        }
      } catch (error) {
        console.error("Error validating phone number:", error);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData.phone, i18n.language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Automatic Translation
      let titleAr = '';
      let titleEn = '';
      let descriptionAr = '';
      let descriptionEn = '';

      if (i18n.language.startsWith('ar')) {
        titleAr = formData.title;
        descriptionAr = formData.description;
        [titleEn, descriptionEn] = await Promise.all([
          translateText(formData.title, 'en'),
          translateText(formData.description, 'en')
        ]);
      } else {
        titleEn = formData.title;
        descriptionEn = formData.description;
        [titleAr, descriptionAr] = await Promise.all([
          translateText(formData.title, 'ar'),
          translateText(formData.description, 'ar')
        ]);
      }

      await onAdd({
        ...formData,
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn,
        price: parseFloat(formData.price),
        images: uploadedImages.map(img => img.finalUrl || img.preview),
        sellerPhone: formData.phone,
        isHighQuality: formData.isHighQuality,
        features: formData.features
      });
      onClose();
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xl overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-4xl min-h-screen sm:min-h-0 sm:max-h-[90vh] sm:rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-brand-primary text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('sell_item', 'Sell New Item')}</h2>
              <p className="text-[10px] text-white/70 uppercase tracking-widest font-bold">
                {t('step', 'Step')} {step} / 2
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Form Area */}
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-8">
              {step === 1 ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-brand-primary font-bold mb-2">
                    <ImageIcon className="w-5 h-5" />
                    <h3>{t('product_images', 'Product Images')}</h3>
                  </div>
                  <SmartImageUploader 
                    onImagesChange={setUploadedImages}
                    maxImages={10}
                    watermarkLogo={watermarkSettings.logo}
                    watermarkText={watermarkSettings.text}
                    watermarkOpacity={watermarkSettings.opacity}
                    watermarkPosition={watermarkSettings.position}
                  />
                  {uploadedImages.length > 0 && (
                    <div className="flex justify-end">
                      <HapticButton 
                        onClick={() => setStep(2)}
                        className="flex items-center gap-2 bg-brand-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-primary/20"
                      >
                        {t('next_step', 'Next Step')}
                        <ChevronRight className="w-5 h-5" />
                      </HapticButton>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-brand-primary font-bold mb-2">
                    <Info className="w-5 h-5" />
                    <h3>{t('product_details', 'Product Details')}</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {/* AI Suggestions Banner */}
                    <AnimatePresence>
                      {aiSuggestions && showAiSuggestions && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-brand-primary/10 border border-brand-primary/20 rounded-2xl p-4 overflow-hidden"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-brand-primary text-white rounded-xl">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-black text-brand-primary uppercase tracking-wider mb-1">
                                {t('ai_suggestions', 'Smart Suggestions Available')}
                              </h4>
                              <p className="text-xs text-slate-600 mb-3">
                                {t('ai_suggestions_desc', 'AI has analyzed your image and generated a title, description, and category.')}
                              </p>
                              <div className="flex gap-2">
                                <HapticButton 
                                  onClick={applyAiSuggestions}
                                  className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg shadow-sm"
                                >
                                  {t('apply_all', 'Apply All')}
                                </HapticButton>
                                <button 
                                  onClick={() => setShowAiSuggestions(false)}
                                  className="px-4 py-2 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-lg"
                                >
                                  {t('dismiss', 'Dismiss')}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                        {t('item_title', 'Title')}
                        {formData.title && <Sparkles className="w-3 h-3 text-brand-primary" />}
                      </label>
                      <input 
                        required
                        type="text"
                        placeholder={t('title_placeholder', 'e.g. Industrial Water Pump')}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-primary focus:bg-white outline-none transition-all"
                        value={formData.title || ''}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Price */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t('item_price', 'Price')}</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            required
                            type="number"
                            placeholder="0.00"
                            className="w-full pl-12 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-primary focus:bg-white outline-none transition-all"
                            value={formData.price || ''}
                            onChange={e => setFormData({...formData, price: e.target.value})}
                          />
                        </div>
                      </div>

                      {/* Category */}
                      <div>
                        <AINeuralCategorySelector 
                          categories={categories}
                          selectedCategoryIds={formData.categories}
                          onSelect={(ids) => setFormData({...formData, categories: ids})}
                          productInfo={{
                            title: formData.title,
                            description: formData.description,
                            imageUrl: uploadedImages[0]?.preview
                          }}
                          isRtl={i18n.language === 'ar'}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t('item_description', 'Description')}</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder={t('desc_placeholder', 'Describe your product in detail...')}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-primary focus:bg-white outline-none transition-all resize-none"
                        value={formData.description || ''}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                      />
                    </div>

                    {/* Phone & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t('phone', 'Phone Number')}</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            type="tel"
                            placeholder="+966 50 000 0000"
                            className={`w-full pl-12 pr-5 py-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:bg-white outline-none transition-all ${
                              phoneValidation?.isValid ? 'border-emerald-200 focus:ring-emerald-500' : 
                              phoneValidation?.isValid === false ? 'border-red-200 focus:ring-red-500' : 
                              'border-slate-200 focus:ring-brand-primary'
                            }`}
                            value={formData.phone || ''}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                          />
                          {phoneValidation?.isValid && (
                            <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                          )}
                        </div>
                        {phoneValidation?.suggestion && (
                          <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {phoneValidation.suggestion}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">{t('location', 'Location')}</label>
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                          <input 
                            type="text"
                            placeholder={t('location_placeholder', 'City, Country')}
                            className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-primary focus:bg-white outline-none transition-all"
                            value={formData.location || ''}
                            onChange={e => setFormData({...formData, location: e.target.value})}
                          />
                          <button 
                            type="button"
                            onClick={handleGetLocation}
                            disabled={isLocating}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all disabled:opacity-50"
                            title={t('get_my_location', 'Get My Location')}
                          >
                            {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 text-slate-500 font-bold hover:text-brand-primary transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      {t('back', 'Back')}
                    </button>
                    
                    <HapticButton 
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-3 bg-brand-primary text-white px-10 py-4 rounded-2xl font-bold hover:bg-brand-primary-hover transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                      {t('publish_now', 'Publish Now')}
                    </HapticButton>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Preview Area (Desktop) */}
          <div className="hidden lg:block w-96 bg-slate-50 p-8 border-l border-slate-100 overflow-y-auto">
            <div className="flex items-center gap-2 text-slate-400 font-bold mb-6 uppercase tracking-widest text-xs">
              <Eye className="w-4 h-4" />
              {t('live_preview', 'Live Preview')}
            </div>

            <div className="sticky top-0">
              <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-xl">
                <div className="aspect-[4/5] bg-slate-100 relative">
                  {uploadedImages.length > 0 ? (
                    <img 
                      src={uploadedImages[0].preview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <ImageIcon className="w-12 h-12 mb-2" />
                      <p className="text-xs font-bold">{t('no_image', 'No Image')}</p>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-brand-primary font-black shadow-sm">
                    {formData.price || '0.00'} {t('currency', 'SAR')}
                  </div>
                  {formData.isHighQuality && (
                    <div className="absolute top-4 left-4 bg-brand-primary text-white p-1.5 rounded-full shadow-lg">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                </div>
                
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">
                    <Tag className="w-3 h-3" />
                    <span>{formData.categories.length > 0 ? formData.categories.join(', ') : t('category', 'Category')}</span>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1 line-clamp-1">
                    {formData.title || t('product_title', 'Product Title')}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-4">
                    <MapPin className="w-3 h-3" />
                    <span>{formData.location || t('location', 'Location')}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {profile?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">{profile?.name || 'Seller'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  "{t('preview_note', 'This is how your product will appear to buyers. Make sure your title and price are accurate.')}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
