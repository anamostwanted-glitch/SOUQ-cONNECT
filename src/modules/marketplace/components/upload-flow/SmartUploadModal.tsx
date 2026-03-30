import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, UploadCloud, Camera, CheckCircle, AlertCircle, Loader2, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../../../core/firebase';
import { UserProfile, MarketplaceItem } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { handleFirestoreError, OperationType } from '../../../../core/utils/errorHandling';

import { ImageFile, UploadStatus } from './ImageThumbnail';
import { DraggableGrid } from './DraggableGrid';
import { useNetworkAwareness } from '../../hooks/useNetworkAwareness';
import { useSmartCompression } from '../../hooks/useSmartCompression';
import { analyzeProductImage, AIProductSuggestion } from '../../services/aiProductAnalyzer';

interface SmartUploadModalProps {
  onClose: () => void;
  onAdd: () => void;
  categories: { id: string; nameEn: string; nameAr: string }[];
  profile: UserProfile;
}

export const SmartUploadModal: React.FC<SmartUploadModalProps> = ({ onClose, onAdd, categories, profile }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { networkStatus, isOnline } = useNetworkAwareness();
  const { compressImage } = useSmartCompression();

  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIProductSuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [isHighQuality, setIsHighQuality] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!isOnline) {
      setErrorMessage(isRtl ? 'أنت غير متصل بالإنترنت. يرجى التحقق من اتصالك.' : 'You are offline. Please check your connection.');
      return;
    }

    const newImages: ImageFile[] = Array.from(files).map((file, index) => ({
      id: `img-${Date.now()}-${index}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'idle',
      progress: 0,
      isMain: images.length === 0 && index === 0, // First image is main if none exist
    }));

    setImages(prev => [...prev, ...newImages]);

    // Process each image sequentially or in parallel based on network
    for (const img of newImages) {
      await processSingleImage(img.id, img.file);
    }
  };

  const processSingleImage = async (id: string, file: File) => {
    // 1. Compress
    updateImageStatus(id, 'compressing');
    const compressedFile = await compressImage(file, networkStatus);
    
    // 2. Analyze if it's the main image and we don't have suggestions yet
    const currentImages = [...images];
    const isMain = currentImages.length === 0 || currentImages[0].id === id;
    
    if (isMain && !aiSuggestion && !isAnalyzing) {
      updateImageStatus(id, 'analyzing');
      setIsAnalyzing(true);
      
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const suggestion = await analyzeProductImage(base64data, compressedFile.type);
        
        if (suggestion) {
          setAiSuggestion(suggestion);
          setTitle(suggestion.title);
          setDescription(suggestion.description);
          setCategory(categories.find(c => c.nameEn.toLowerCase() === suggestion.category.toLowerCase())?.id || categories[0]?.id || '');
          setPrice(suggestion.priceEstimate.toString());
          setIsHighQuality(suggestion.isHighQuality);
          setFeatures(suggestion.features);
        }
        setIsAnalyzing(false);
        updateImageStatus(id, 'success'); // Ready to upload
      };
    } else {
      updateImageStatus(id, 'success'); // Ready to upload
    }

    // Update the file reference to the compressed one
    setImages(prev => prev.map(img => img.id === id ? { ...img, file: compressedFile } : img));
  };

  const updateImageStatus = (id: string, status: UploadStatus, progress: number = 0, error?: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, status, progress, error } : img));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const newImages = prev.filter(img => img.id !== id);
      // Reassign main image if needed
      if (newImages.length > 0 && !newImages.some(img => img.isMain)) {
        newImages[0].isMain = true;
      }
      return newImages;
    });
  };

  const uploadToStorage = async (img: ImageFile, productId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      updateImageStatus(img.id, 'uploading', 0);
      const storageRef = ref(storage, `marketplace/${productId}/${img.id}`);
      const uploadTask = uploadBytesResumable(storageRef, img.file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          updateImageStatus(img.id, 'uploading', progress);
        },
        (error) => {
          updateImageStatus(img.id, 'error', 0, error.message);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          updateImageStatus(img.id, 'success', 100);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || images.length === 0) return;

    setIsSubmitting(true);
    try {
      // 1. Create initial document
      const docRef = await addDoc(collection(db, 'marketplace'), {
        sellerId: auth.currentUser.uid,
        sellerName: profile.name,
        sellerRole: profile.role,
        title,
        description,
        price: Number(price),
        currency: t('currency'),
        category,
        location: profile.location || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isVerifiedSupplier: profile.isVerified || false,
        sellerPhone: profile.phone || '',
        isHighQuality,
        features,
        images: [] // Will update after upload
      });

      // 2. Upload images
      const uploadPromises = images.map(img => uploadToStorage(img, docRef.id));
      const uploadedUrls = await Promise.all(uploadPromises);

      // 3. Update document with image URLs
      await updateDoc(doc(db, 'marketplace', docRef.id), {
        images: uploadedUrls
      });

      onAdd();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'marketplace');
      setIsSubmitting(false);
    }
  };

  const glassClass = "bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 shadow-2xl";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-4xl h-full sm:h-[90vh] sm:rounded-3xl overflow-hidden flex flex-col ${glassClass}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {isRtl ? 'إضافة منتج جديد' : 'Add New Product'}
            </h2>
            {!isOnline && (
              <span className="flex items-center gap-1 text-xs font-bold bg-red-500/10 text-red-500 px-2 py-1 rounded-full">
                <WifiOff size={12} /> {isRtl ? 'غير متصل' : 'Offline'}
              </span>
            )}
            {isOnline && networkStatus !== '4g' && (
              <span className="flex items-center gap-1 text-xs font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full">
                <Wifi size={12} /> {networkStatus.toUpperCase()}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6">
          
          {/* Error Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
              >
                <AlertCircle size={16} />
                <span className="text-sm font-bold">{errorMessage}</span>
                <button onClick={() => setErrorMessage(null)} className="ml-2 hover:bg-red-600 rounded-full p-1">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Left Side: Upload Zone */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div 
              className={`relative flex-1 min-h-[200px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-6 transition-all ${
                isDragging 
                  ? 'border-brand-primary bg-brand-primary/5 scale-[1.02]' 
                  : 'border-slate-300 dark:border-slate-600 hover:border-brand-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect}
              />
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                ref={cameraInputRef} 
                onChange={handleFileSelect}
              />

              <div className="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-4">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 text-center">
                {isRtl ? 'اسحب وأفلت الصور هنا' : 'Drag & Drop images here'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                {isRtl ? 'أو استخدم الأزرار أدناه لاختيار الصور' : 'Or use the buttons below to select images'}
              </p>

              <div className="flex gap-3 w-full max-w-xs">
                <HapticButton 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                >
                  {isRtl ? 'المعرض' : 'Gallery'}
                </HapticButton>
                <HapticButton 
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Camera size={18} />
                  {isRtl ? 'الكاميرا' : 'Camera'}
                </HapticButton>
              </div>
            </div>

            {/* Draggable Grid */}
            <DraggableGrid 
              images={images} 
              setImages={setImages} 
              onRemove={removeImage} 
              onRetry={(id) => {
                const img = images.find(i => i.id === id);
                if (img) processSingleImage(id, img.file);
              }}
            />
          </div>

          {/* Right Side: Form & AI Suggestions */}
          <div className="w-full md:w-1/2 flex flex-col">
            <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
              
              {/* AI Suggestion Banner */}
              <AnimatePresence>
                {aiSuggestion && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 border border-brand-primary/20 rounded-2xl p-4 mb-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center shrink-0">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-brand-primary mb-1">
                          {isRtl ? 'تم التعبئة بواسطة الذكاء الاصطناعي' : 'Auto-filled by AI'}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {isRtl 
                            ? 'قمنا بتحليل الصورة واقتراح هذه التفاصيل. يمكنك تعديلها كما تشاء.' 
                            : 'We analyzed the image and suggested these details. Feel free to edit them.'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isRtl ? 'اسم المنتج' : 'Product Title'}
                </label>
                <input 
                  required
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary/50 outline-none"
                  placeholder={isRtl ? 'مثال: حذاء رياضي نايك' : 'e.g., Nike Running Shoes'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'السعر' : 'Price'}
                  </label>
                  <div className="relative">
                    <input 
                      required
                      type="number" 
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className={`w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 ${isRtl ? 'pl-4 pr-10' : 'pr-4 pl-10'} focus:ring-2 focus:ring-brand-primary/50 outline-none`}
                      placeholder="0.00"
                    />
                    <span className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-4' : 'left-4'} text-slate-400 font-bold`}>
                      {t('currency')}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'الفئة' : 'Category'}
                  </label>
                  <select 
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary/50 outline-none appearance-none"
                  >
                    <option value="" disabled>{isRtl ? 'اختر الفئة' : 'Select Category'}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {isRtl ? cat.nameAr : cat.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isRtl ? 'الوصف' : 'Description'}
                </label>
                <textarea 
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary/50 outline-none resize-none"
                  placeholder={isRtl ? 'اكتب وصفاً جذاباً لمنتجك...' : 'Write an appealing description...'}
                />
              </div>

            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <HapticButton 
            form="product-form"
            type="submit"
            disabled={isSubmitting || images.length === 0 || images.some(img => img.status !== 'success')}
            className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {isRtl ? 'جاري النشر...' : 'Publishing...'}
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                {isRtl ? 'نشر المنتج' : 'Publish Product'}
              </>
            )}
          </HapticButton>
        </div>
      </motion.div>
    </div>
  );
};
