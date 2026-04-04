import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, UploadCloud, Camera, CheckCircle, AlertCircle, Loader2, Sparkles, Wifi, WifiOff, Wand2, MapPin, Phone, Tag, Plus, Trash2 } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../../../core/utils/errorHandling';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../../../core/firebase';
import { UserProfile, MarketplaceItem } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';

import { ImageFile, UploadStatus } from './ImageThumbnail';
import { DraggableGrid } from './DraggableGrid';
import { useNetworkAwareness } from '../../hooks/useNetworkAwareness';
import { useSmartCompression } from '../../hooks/useSmartCompression';
import { analyzeProductImage, AIProductSuggestion, generateAlternativeProductImage } from '../../services/aiProductAnalyzer';
import { processImageTo4x5WithWatermark } from '../../../../core/utils/imageManipulation';
import { AINeuralCategorySelector } from '../../../../shared/components/AINeuralCategorySelector';
import { translateText } from '../../../../core/services/geminiService';

interface SmartUploadModalProps {
  onClose: () => void;
  onAdd: () => void;
  categories: { id: string; nameEn: string; nameAr: string }[];
  profile: UserProfile;
}

export const SmartUploadModal: React.FC<SmartUploadModalProps> = ({ onClose, onAdd, categories, profile }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language.startsWith('ar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { networkStatus, isOnline } = useNetworkAwareness();
  const { compressImage } = useSmartCompression();

  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIProductSuggestion | null>(null);
  const [bilingualContent, setBilingualContent] = useState({ titleAr: '', titleEn: '', descriptionAr: '', descriptionEn: '', keywordsAr: [] as string[], keywordsEn: [] as string[] });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [watermarkUrl, setWatermarkUrl] = useState<string | undefined>();
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.7);
  const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const [aiQuotaExhausted, setAiQuotaExhausted] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWatermarkUrl(data.watermarkUrl || data.watermarkLogoUrl);
        setWatermarkOpacity(data.watermarkOpacity ?? 0.7);
        setWatermarkPosition(data.watermarkPosition || 'bottom-right');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site');
    });
    return () => unsub();
  }, []);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isHighQuality, setIsHighQuality] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [classification, setClassification] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [location, setLocation] = useState(profile.location || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [isLocating, setIsLocating] = useState(false);
  const [featureInput, setFeatureInput] = useState('');

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage(isRtl ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${i18n.language}`);
          const data = await response.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';
          const country = data.address.country || '';
          setLocation(city && country ? `${city}, ${country}` : city || country || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        } catch (err) {
          console.error('Location error:', err);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setIsLocating(false);
        setErrorMessage(isRtl ? 'فشل تحديد الموقع. يرجى إدخاله يدوياً.' : 'Failed to get location. Please enter it manually.');
      }
    );
  };

  const addFeature = () => {
    if (featureInput.trim() && !features.includes(featureInput.trim())) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleGenerateAlternativeImage = async () => {
    if (images.length === 0 || !title || selectedCategories.length === 0) return;
    
    setIsGeneratingImage(true);
    try {
      const mainImage = images.find(img => img.isMain) || images[0];
      
      const reader = new FileReader();
      reader.readAsDataURL(mainImage.originalFile || mainImage.file);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          const catName = categories.find(c => c.id === selectedCategories[0])?.nameEn || selectedCategories[0];
          
          try {
            const newImageDataUrl = await generateAlternativeProductImage(base64data, mainImage.file.type, title, catName);
            
            if (newImageDataUrl) {
              const res = await fetch(newImageDataUrl);
              const blob = await res.blob();
              const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: 'image/png' });
              
              // Process to 4:5 and add watermark
              const processedFile = await processImageTo4x5WithWatermark(file, watermarkUrl, true, watermarkOpacity, watermarkPosition);
              
              const newImage: ImageFile = {
                id: `img-ai-${Date.now()}`,
                file: processedFile,
                previewUrl: URL.createObjectURL(processedFile),
                status: 'success',
                progress: 100,
                isMain: false,
              };
              
              setImages(prev => [...prev, newImage]);
            } else {
              setErrorMessage(isRtl ? 'فشل توليد الصورة. حاول مرة أخرى.' : 'Failed to generate image. Try again.');
            }
          } catch (error: any) {
            if (error.message === 'QUOTA_EXHAUSTED') {
              setAiQuotaExhausted(true);
              setErrorMessage(isRtl ? 'تم استنفاد حصة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.' : 'AI Quota exhausted. Please try again later.');
            } else {
              setErrorMessage(isRtl ? 'حدث خطأ أثناء توليد الصورة.' : 'Error generating image.');
            }
          } finally {
            setIsGeneratingImage(false);
          }
        } catch (error) {
          console.error("Error in reader.onloadend:", error);
          setIsGeneratingImage(false);
        }
      };
    } catch (error) {
      console.error(error);
      setErrorMessage(isRtl ? 'حدث خطأ أثناء توليد الصورة.' : 'Error generating image.');
      setIsGeneratingImage(false);
    }
  };

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

    try {
      const newImages: ImageFile[] = Array.from(files).map((file, index) => ({
        id: `img-${Date.now()}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'idle',
        progress: 0,
        isMain: images.length === 0 && index === 0, // First image is main if none exist
      }));

      const wasEmpty = images.length === 0;
      setImages(prev => [...prev, ...newImages]);

      // Process each image sequentially or in parallel based on network
      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i];
        const isMain = wasEmpty && i === 0;
        await processSingleImage(img.id, img.file, isMain);
      }
    } catch (error) {
      console.error('Error processing files:', error);
      setErrorMessage(isRtl ? 'حدث خطأ أثناء معالجة الملفات' : 'Error processing files');
    }
  };

  const processSingleImage = async (id: string, file: File, isMain: boolean = false) => {
    try {
      // 1. Compress
      updateImageStatus(id, 'compressing');
      const compressedFile = await compressImage(file, networkStatus);
      
      // Store compressed but unwatermarked file for AI
      setImages(prev => prev.map(img => img.id === id ? { ...img, originalFile: compressedFile } : img));

      // 2. Process to 4:5 and add watermark
      updateImageStatus(id, 'processing');
      const processedFile = await processImageTo4x5WithWatermark(compressedFile, watermarkUrl, false, watermarkOpacity, watermarkPosition);
      
      // Update the file reference to the processed one
      setImages(prev => prev.map(img => img.id === id ? { ...img, file: processedFile, previewUrl: URL.createObjectURL(processedFile) } : img));
      
      // 3. Analyze if it's the main image and we don't have suggestions yet
      if (isMain && !aiSuggestion && !isAnalyzing && !aiQuotaExhausted) {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        
        debounceTimer.current = setTimeout(async () => {
          try {
            updateImageStatus(id, 'analyzing');
            setIsAnalyzing(true);
            
            const reader = new FileReader();
            reader.readAsDataURL(compressedFile); // Use compressed but unwatermarked for analysis
            reader.onloadend = async () => {
              try {
                const base64data = reader.result as string;
                try {
                  const suggestion = await analyzeProductImage(base64data, processedFile.type);
                  
                  if (suggestion) {
                    setAiSuggestion(suggestion);
                    
                    // Set title and description based on current language, fallback to other if empty
                    const suggestedTitle = isRtl 
                      ? (suggestion.productNameAr || suggestion.productNameEn) 
                      : (suggestion.productNameEn || suggestion.productNameAr);
                    
                    const suggestedDesc = isRtl 
                      ? (suggestion.descriptionAr || suggestion.descriptionEn) 
                      : (suggestion.descriptionEn || suggestion.descriptionAr);
  
                    // Only set if currently empty to avoid overwriting user edits
                    if (!title) setTitle(suggestedTitle || '');
                    if (!description) setDescription(suggestedDesc || '');
                    
                    // Store bilingual content for later use
                    setBilingualContent({
                      titleAr: suggestion.productNameAr || '',
                      titleEn: suggestion.productNameEn || '',
                      descriptionAr: suggestion.descriptionAr || '',
                      descriptionEn: suggestion.descriptionEn || '',
                      keywordsAr: suggestion.keywordsAr || [],
                      keywordsEn: suggestion.keywordsEn || []
                    });
                    
                    const cat = categories.find(c => c.nameEn.toLowerCase() === suggestion.category?.toLowerCase());
                    if (cat && selectedCategories.length === 0) setSelectedCategories([cat.id]);
                    if (!price) setPrice(suggestion.priceEstimate?.toString() || '');
                    setIsHighQuality(suggestion.isHighQuality);
                    if (features.length === 0) setFeatures(suggestion.features || []);
                  }
                } catch (error: any) {
                  if (error.message === 'QUOTA_EXHAUSTED') {
                    setAiQuotaExhausted(true);
                  }
                  console.error('AI Analysis error:', error);
                } finally {
                  setIsAnalyzing(false);
                  updateImageStatus(id, 'success'); // Ready to upload
                }
              } catch (error) {
                console.error("Error in reader.onloadend analyzeProductImage:", error);
                setIsAnalyzing(false);
                updateImageStatus(id, 'error', 0, 'Error in analysis');
              }
            };
            reader.onerror = (error) => {
              console.error('FileReader error:', error);
              updateImageStatus(id, 'error', 0, 'Error reading file');
              setIsAnalyzing(false);
            };
          } catch (error) {
            console.error('Error in analysis timeout:', error);
            setIsAnalyzing(false);
            updateImageStatus(id, 'error', 0, 'Error in analysis');
          }
        }, 1500);
      } else {
        updateImageStatus(id, 'success'); // Ready to upload
      }
    } catch (error) {
      console.error(`Error processing image ${id}:`, error);
      updateImageStatus(id, 'error', 0, isRtl ? 'خطأ في معالجة الصورة' : 'Error processing image');
    }
  };

  const updateImageStatus = (id: string, status: UploadStatus, progress: number = 0, error?: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, status, progress, error } : img));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    try {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await processFiles(e.dataTransfer.files);
      }
    } catch (error) {
      console.error('Error in handleDrop:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files && e.target.files.length > 0) {
        await processFiles(e.target.files);
      }
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
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
    if (!auth.currentUser) return;
    
    if (images.length === 0) {
      setErrorMessage(isRtl ? 'يرجى إضافة صورة واحدة على الأقل.' : 'Please add at least one image.');
      return;
    }

    setIsSubmitting(true);
    try {
      // AI Translation
      let titleAr = '';
      let titleEn = '';
      let descriptionAr = '';
      let descriptionEn = '';

      if (aiSuggestion && bilingualContent.titleAr) {
        titleAr = bilingualContent.titleAr;
        titleEn = bilingualContent.titleEn;
        descriptionAr = bilingualContent.descriptionAr;
        descriptionEn = bilingualContent.descriptionEn;
      } else if (i18n.language.startsWith('ar')) {
        titleAr = title;
        descriptionAr = description;
        try {
          const [tTitle, tDesc] = await Promise.all([
            translateText(title, 'en'),
            translateText(description, 'en')
          ]);
          titleEn = tTitle;
          descriptionEn = tDesc;
        } catch (e) {
          console.error('Translation error:', e);
          titleEn = title;
          descriptionEn = description;
        }
      } else {
        titleEn = title;
        descriptionEn = description;
        try {
          const [tTitle, tDesc] = await Promise.all([
            translateText(title, 'ar'),
            translateText(description, 'ar')
          ]);
          titleAr = tTitle;
          descriptionAr = tDesc;
        } catch (e) {
          console.error('Translation error:', e);
          titleAr = title;
          descriptionAr = description;
        }
      }

      // 1. Create initial document
      const docRef = await addDoc(collection(db, 'marketplace'), {
        sellerId: auth.currentUser.uid,
        sellerName: profile.name,
        sellerRole: profile.role,
        title,
        description,
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn,
        price: Number(price),
        currency: t('currency'),
        categories: selectedCategories,
        location: location || profile.location || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isVerifiedSupplier: profile.isVerified || false,
        sellerPhone: phone || profile.phone || '',
        isHighQuality,
        features,
        classification,
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
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => {
        // Strictly prevent closure on backdrop click to avoid unexpected disappearance
        e.stopPropagation();
      }}
    >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-[95%] sm:w-full max-w-4xl h-auto max-h-[90vh] sm:rounded-3xl rounded-[24px] overflow-hidden flex flex-col ${glassClass}`}
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
              className={`relative flex-1 min-h-[300px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center overflow-hidden transition-all ${
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

              {images.length > 0 ? (
                <>
                  {/* Large Preview of Main Image */}
                  <img 
                    src={images.find(img => img.isMain)?.previewUrl || images[0]?.previewUrl} 
                    alt="Main Preview" 
                    className="absolute inset-0 w-full h-full object-contain bg-slate-100 dark:bg-slate-800"
                  />
                  
                  {/* Overlay for adding more */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                    <div className="flex gap-3">
                      <HapticButton 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        <UploadCloud size={18} />
                        {isRtl ? 'إضافة المزيد' : 'Add More'}
                      </HapticButton>
                      <HapticButton 
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        <Camera size={18} />
                        {isRtl ? 'الكاميرا' : 'Camera'}
                      </HapticButton>
                    </div>
                  </div>
                  
                  {/* Main badge */}
                  <div className="absolute top-4 left-4 bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                    {isRtl ? 'الصورة الرئيسية' : 'Main Image'}
                  </div>
                </>
              ) : (
                <div className="p-6 flex flex-col items-center justify-center w-full h-full">
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
              )}
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

            {/* AI Image Generation Button */}
            <div className="mt-4">
              <HapticButton
                type="button"
                onClick={handleGenerateAlternativeImage}
                disabled={isGeneratingImage || images.length === 0 || !title || selectedCategories.length === 0}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {isRtl ? 'جاري توليد صورة احترافية...' : 'Generating Professional Image...'}
                  </>
                ) : (
                  <>
                    <Wand2 size={18} />
                    {isRtl ? 'توليد صورة احترافية بالذكاء الاصطناعي' : 'Generate Professional Image with AI'}
                  </>
                )}
              </HapticButton>
              {(!title || selectedCategories.length === 0) && images.length > 0 && (
                <p className="text-[10px] text-amber-500 mt-2 text-center font-bold">
                  {isRtl 
                    ? 'يرجى كتابة اسم المنتج واختيار الفئة لتفعيل توليد الصور.' 
                    : 'Please enter product title and select category to enable image generation.'}
                </p>
              )}
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                {isRtl 
                  ? 'سيقوم الذكاء الاصطناعي بإنشاء صورة بديلة احترافية بناءً على الصورة المرفقة واسم المنتج.' 
                  : 'AI will generate a professional alternative image based on the uploaded photo and product title.'}
              </p>
            </div>
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

                {aiQuotaExhausted && !aiSuggestion && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <AlertCircle size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-600 mb-1">
                          {isRtl ? 'ميزات الذكاء الاصطناعي محدودة حالياً' : 'AI Features Currently Limited'}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {isRtl 
                            ? 'تم استنفاد حصة الاستخدام المجانية للذكاء الاصطناعي. يمكنك الاستمرار في إدخال تفاصيل المنتج يدوياً.' 
                            : 'Free AI usage quota has been reached. You can still enter product details manually.'}
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
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    value={title || ''}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary/50 outline-none"
                    placeholder={isRtl ? 'مثال: حذاء رياضي نايك' : 'e.g., Nike Running Shoes'}
                  />
                  {isAnalyzing && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-brand-primary" />
                      <span className="text-[10px] font-bold text-brand-primary animate-pulse">
                        {isRtl ? 'جاري التحليل...' : 'Analyzing...'}
                      </span>
                    </div>
                  )}
                </div>
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
                      value={price || ''}
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
                  <AINeuralCategorySelector 
                    categories={categories}
                    selectedCategoryIds={selectedCategories}
                    onSelect={setSelectedCategories}
                    productInfo={{
                      title,
                      description,
                      imageUrl: images[0]?.previewUrl
                    }}
                    isRtl={isRtl}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isRtl ? 'الوصف' : 'Description'}
                </label>
                <textarea 
                  required
                  rows={4}
                  value={description || ''}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary/50 outline-none resize-none"
                  placeholder={isRtl ? 'اكتب وصفاً جذاباً لمنتجك...' : 'Write an appealing description...'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="tel" 
                      value={phone || ''}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 ${isRtl ? 'pl-4 pr-10' : 'pr-4 pl-10'} focus:ring-2 focus:ring-brand-primary/50 outline-none`}
                      placeholder="+966..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'الموقع' : 'Location'}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={location || ''}
                      onChange={(e) => setLocation(e.target.value)}
                      className={`w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 ${isRtl ? 'pl-12 pr-10' : 'pr-12 pl-10'} focus:ring-2 focus:ring-brand-primary/50 outline-none`}
                      placeholder={isRtl ? 'المدينة، الدولة' : 'City, Country'}
                    />
                    <button 
                      type="button"
                      onClick={handleGetLocation}
                      className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-2' : 'right-2'} p-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors`}
                    >
                      {isLocating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isRtl ? 'التصنيف' : 'Classification'}
                </label>
                <input 
                  type="text" 
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-primary/50 outline-none"
                  placeholder={isRtl ? 'جديد، مستعمل، إلخ...' : 'New, Used, etc...'}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isRtl ? 'المميزات' : 'Features'}
                </label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    className="flex-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-primary/50 outline-none"
                    placeholder={isRtl ? 'أضف ميزة...' : 'Add a feature...'}
                  />
                  <button 
                    type="button"
                    onClick={addFeature}
                    className="p-2 bg-brand-primary text-white rounded-xl hover:bg-brand-primary-hover transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {features.map((feature, index) => (
                    <span key={index} className="flex items-center gap-1 px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold">
                      {feature}
                      <button type="button" onClick={() => removeFeature(index)} className="hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                  <Sparkles size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                    {isRtl ? 'منتج عالي الجودة' : 'High Quality Product'}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {isRtl ? 'سيظهر هذا المنتج في قسم المنتجات المميزة' : 'This product will appear in the featured products section'}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsHighQuality(!isHighQuality)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${isHighQuality ? 'bg-brand-primary' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isHighQuality ? 'translate-x-6' : ''}`} />
                </button>
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
