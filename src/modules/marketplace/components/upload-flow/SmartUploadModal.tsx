import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, UploadCloud, Camera, CheckCircle, AlertCircle, Loader2, Sparkles, Wifi, WifiOff, Wand2, MapPin, Phone, Tag, Plus, Trash2, Mic } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType, handleAiError } from '../../../../core/utils/errorHandling';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../../../core/firebase';
import { UserProfile, MarketplaceItem } from '../../../../core/types';
import { HapticButton } from '../../../../shared/components/HapticButton';
import { AINeuralCategorySelector } from '../../../../shared/components/AINeuralCategorySelector';
import { processImageTo4x5WithWatermark } from '../../../../core/utils/imageManipulation';
import { getProxiedImageUrl } from '../../../../core/utils/imageUtils';
import { toast } from 'sonner';

import { ImageFile, UploadStatus } from './ImageThumbnail';
import { DraggableGrid } from './DraggableGrid';
import { useNetworkAwareness } from '../../hooks/useNetworkAwareness';
import { useSmartCompression } from '../../hooks/useSmartCompression';
import { analyzeProductImage, AIProductSuggestion, generateAlternativeProductImage } from '../../services/aiProductAnalyzer';
import { suggestPrice, translateText } from '../../../../core/services/geminiService';

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
  const [watermarkText, setWatermarkText] = useState('Souq Connect');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.7);
  const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right'>('bottom-right');
  const [watermarkScale, setWatermarkScale] = useState(1);
  const [aiQuotaExhausted, setAiQuotaExhausted] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = i18n.language;
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDescription(prev => prev + ' ' + transcript);
        setIsListening(false);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [i18n.language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        console.log('Fetched watermark settings:', data);
        setWatermarkUrl(data.watermarkUrl || data.watermarkLogoUrl);
        setWatermarkText(data.watermarkText || data.siteName || 'Souq Connect');
        setWatermarkOpacity(data.watermarkOpacity ?? 0.7);
        setWatermarkPosition(data.watermarkPosition || 'bottom-right');
        setWatermarkScale(data.watermarkScale ?? 1);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
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
          toast.error(isRtl ? 'فشل في الحصول على الموقع' : 'Failed to get location');
          handleFirestoreError(err, OperationType.GET, 'location_fetch', false);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        toast.error(isRtl ? 'تم رفض الوصول للموقع' : 'Location access denied');
        handleFirestoreError(err, OperationType.GET, 'geolocation', false);
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
      reader.onerror = (error) => {
        toast.error(isRtl ? 'فشل في قراءة الملف' : 'Failed to read file');
        handleFirestoreError(error, OperationType.GET, 'file_reader', false);
        setErrorMessage(isRtl ? 'فشل قراءة الملف' : 'Error reading file');
        setIsGeneratingImage(false);
      };
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
              const processedBlob = await processImageTo4x5WithWatermark(file, getProxiedImageUrl(watermarkUrl), watermarkText, watermarkOpacity, watermarkPosition, watermarkScale);
              const processedFile = new File([processedBlob], `ai-generated-${Date.now()}.png`, { type: 'image/png' });
              
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
          toast.error(isRtl ? 'خطأ في معالجة الصورة' : 'Error processing image');
          handleFirestoreError(error, OperationType.GET, 'reader_onloadend', false);
          setIsGeneratingImage(false);
        }
      };
    } catch (error) {
      handleAiError(error, 'image_generation');
      toast.error(isRtl ? 'فشل في توليد الصورة' : 'Failed to generate image');
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
      toast.error(isRtl ? 'خطأ في معالجة الملفات' : 'Error processing files');
      handleFirestoreError(error, OperationType.CREATE, 'process_files', false);
      setErrorMessage(isRtl ? 'حدث خطأ أثناء معالجة الملفات' : 'Error processing files');
    }
  };

  const retryAnalysis = async (id: string) => {
    const img = images.find(i => i.id === id);
    if (!img || isAnalyzing) return;
    
    // Use originalFile if available, otherwise compressed file
    const fileToAnalyze = img.originalFile || img.file;
    await analyzeSpecificImage(id, fileToAnalyze);
  };

  const analyzeSpecificImage = async (id: string, file: File) => {
    try {
      updateImageStatus(id, 'analyzing');
      setIsAnalyzing(true);
      setErrorMessage(null);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          console.log('Manual AI analysis started for image:', id);
          const suggestion = await analyzeProductImage(base64data, file.type);
          
          if (suggestion && !(suggestion as any).error) {
            console.log('Manual AI suggestion received:', suggestion);
            setAiSuggestion(suggestion);
            
            // Set title and description if empty
            const suggestedTitle = isRtl 
              ? (suggestion.productNameAr || suggestion.productNameEn) 
              : (suggestion.productNameEn || suggestion.productNameAr);
            
            const suggestedDesc = isRtl 
              ? (suggestion.descriptionAr || suggestion.descriptionEn) 
              : (suggestion.descriptionEn || suggestion.descriptionAr);

            if (!title) setTitle(suggestedTitle || '');
            if (!description) setDescription(suggestedDesc || '');
            
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
            
            toast.success(isRtl ? 'تم تحليل المنتج بنجاح' : 'Product analyzed successfully');
            updateImageStatus(id, 'success');
          } else {
            const errorMsg = suggestion && (suggestion as any).error;
            if (errorMsg === 'MISSING_API_KEY') {
              setErrorMessage(isRtl ? 'مفتاح الذكاء الاصطناعي مفقود. يرجى ضبطه في الإعدادات.' : 'AI API Key missing. Please set it in settings.');
            } else if (errorMsg === 'QUOTA_EXHAUSTED') {
              setAiQuotaExhausted(true);
              setErrorMessage(isRtl ? 'تم استنفاد حصة الذكاء الاصطناعي.' : 'AI Quota exhausted.');
            } else {
              setErrorMessage(isRtl ? 'لم يتمكن الذكاء الاصطناعي من تحليل الصورة. يرجى التأكد من إعدادات مفتاح الـ API.' : 'AI could not analyze the image. Please check your API key settings.');
            }
            updateImageStatus(id, 'error', 0, errorMsg || 'AI analysis failed');
          }
        } catch (error: any) {
          if (error.message === 'QUOTA_EXHAUSTED') {
            setAiQuotaExhausted(true);
            setErrorMessage(isRtl ? 'تم استنفاد حصة الذكاء الاصطناعي.' : 'AI Quota exhausted.');
          } else if (error.message === 'MISSING_API_KEY') {
            setErrorMessage(isRtl ? 'مفتاح الذكاء الاصطناعي مفقود.' : 'AI API Key missing.');
          } else {
            setErrorMessage(isRtl ? 'فشل تحليل الصورة.' : 'Image analysis failed.');
          }
          handleAiError(error, 'image_analysis');
          updateImageStatus(id, 'error', 0, error.message || 'Analysis error');
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.onerror = (error) => {
        toast.error(isRtl ? 'فشل في قراءة الصورة للتحليل' : 'Failed to read image for analysis');
        handleFirestoreError(error, OperationType.GET, 'analyze_specific_image_reader', false);
        setErrorMessage(isRtl ? 'خطأ في قراءة ملف الصورة.' : 'Error reading image file.');
        updateImageStatus(id, 'error', 0, 'Error reading file');
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      handleAiError(error, 'image_analysis_init');
      setIsAnalyzing(false);
      updateImageStatus(id, 'error', 0, 'Analysis initialization error');
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
      const processedBlob = await processImageTo4x5WithWatermark(compressedFile, getProxiedImageUrl(watermarkUrl), watermarkText, watermarkOpacity, watermarkPosition, watermarkScale);
      const processedFile = new File([processedBlob], file.name, { type: 'image/jpeg' });
      
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
            reader.onloadend = async () => {
              try {
                const base64data = reader.result as string;
                try {
                  console.log('Starting AI analysis for image:', id);
                  const suggestion = await analyzeProductImage(base64data, processedFile.type);
                  
                  if (suggestion && !(suggestion as any).error) {
                    console.log('AI suggestion received:', suggestion);
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
                  } else {
                    const errorMsg = suggestion && (suggestion as any).error;
                    if (errorMsg === 'MISSING_API_KEY') {
                      setErrorMessage(isRtl ? 'مفتاح الذكاء الاصطناعي مفقود.' : 'AI API Key missing.');
                    } else if (errorMsg === 'QUOTA_EXHAUSTED') {
                      setAiQuotaExhausted(true);
                      setErrorMessage(isRtl ? 'تم استنفاد حصة الذكاء الاصطناعي.' : 'AI Quota exhausted.');
                    }
                    console.warn('AI analysis returned no suggestion or error:', errorMsg);
                  }
                } catch (error: any) {
                  if (error.message === 'QUOTA_EXHAUSTED') {
                    setAiQuotaExhausted(true);
                    setErrorMessage(isRtl ? 'تم استنفاد حصة الذكاء الاصطناعي. يرجى المحاولة لاحقاً.' : 'AI Quota exhausted. Please try again later.');
                  } else if (error.message === 'MISSING_API_KEY') {
                    setErrorMessage(isRtl ? 'مفتاح الذكاء الاصطناعي مفقود. يرجى ضبطه في الإعدادات.' : 'AI API Key is missing. Please set it in settings.');
                  } else {
                    setErrorMessage(isRtl ? 'فشل تحليل الصورة بالذكاء الاصطناعي.' : 'AI image analysis failed.');
                  }
                  handleAiError(error, 'image_analysis');
                } finally {
                  setIsAnalyzing(false);
                  updateImageStatus(id, 'success'); // Ready to upload
                }
              } catch (error) {
                toast.error(isRtl ? 'خطأ في قراءة الصورة' : 'Error reading image');
                handleFirestoreError(error, OperationType.GET, 'analyze_product_image_reader', false);
                setIsAnalyzing(false);
                updateImageStatus(id, 'error', 0, 'Error in analysis');
              }
            };
            reader.onerror = (error) => {
              toast.error(isRtl ? 'فشل في قراءة الملف' : 'Failed to read file');
              handleFirestoreError(error, OperationType.GET, 'file_reader_analyze', false);
              updateImageStatus(id, 'error', 0, 'Error reading file');
              setIsAnalyzing(false);
            };
            reader.readAsDataURL(compressedFile); // Use compressed but unwatermarked for analysis
          } catch (error) {
            handleAiError(error, 'image_analysis_timeout');
            setIsAnalyzing(false);
            updateImageStatus(id, 'error', 0, 'Error in analysis');
          }
        }, 1500);
      } else {
        updateImageStatus(id, 'success'); // Ready to upload
      }
    } catch (error) {
      toast.error(isRtl ? 'خطأ في معالجة الصورة' : 'Error processing image');
      handleFirestoreError(error, OperationType.GET, `process_single_image_${id}`, false);
      updateImageStatus(id, 'error', 0, isRtl ? 'خطأ في معالجة الصورة' : 'Error processing image');
    }
  };

  const updateImageStatus = (id: string, status: UploadStatus, progress: number = 0, error?: string) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, status, progress, error } : img));
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setTitle((isRtl ? aiSuggestion.productNameAr : aiSuggestion.productNameEn) || '');
    setDescription((isRtl ? aiSuggestion.descriptionAr : aiSuggestion.descriptionEn) || '');
    setPrice(aiSuggestion.priceEstimate ? aiSuggestion.priceEstimate.toString() : '');
    setClassification(aiSuggestion.category || '');
    
    // Also try to match and set the category ID
    const cat = categories.find(c => 
      c.nameEn.toLowerCase() === aiSuggestion.category?.toLowerCase() || 
      c.nameAr.toLowerCase() === aiSuggestion.category?.toLowerCase()
    );
    if (cat) {
      setSelectedCategories([cat.id]);
    }

    setFeatures(aiSuggestion.features || []);
    setIsHighQuality(!!aiSuggestion.isHighQuality);
    setBilingualContent({
      titleAr: aiSuggestion.productNameAr || '',
      titleEn: aiSuggestion.productNameEn || '',
      descriptionAr: aiSuggestion.descriptionAr || '',
      descriptionEn: aiSuggestion.descriptionEn || '',
      keywordsAr: aiSuggestion.keywordsAr || [],
      keywordsEn: aiSuggestion.keywordsEn || []
    });
    setAiSuggestion(null);
    toast.success(isRtl ? 'تم تطبيق بيانات الذكاء الاصطناعي' : 'AI data applied successfully');
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    try {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await processFiles(e.dataTransfer.files);
      }
    } catch (error) {
      toast.error(isRtl ? 'خطأ في سحب الملف' : 'Error in drop');
      handleFirestoreError(error, OperationType.CREATE, 'handle_drop', false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files && e.target.files.length > 0) {
        await processFiles(e.target.files);
      }
    } catch (error) {
      toast.error(isRtl ? 'خطأ في اختيار الملف' : 'Error selecting file');
      handleFirestoreError(error, OperationType.CREATE, 'handle_file_select', false);
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
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            updateImageStatus(img.id, 'success', 100);
            resolve(downloadURL);
          } catch (error) {
            updateImageStatus(img.id, 'error', 0, error instanceof Error ? error.message : 'Upload failed');
            reject(error);
          }
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
          handleAiError(e, 'translation');
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
          handleAiError(e, 'translation');
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
      handleFirestoreError(error, OperationType.CREATE, 'marketplace', false);
      setIsSubmitting(false);
    }
  };

  const glassClass = "bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 shadow-2xl";

  return (
    <motion.div 
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
          className={`w-full sm:w-[95%] md:w-full max-w-5xl h-full sm:h-auto max-h-screen sm:max-h-[90vh] sm:rounded-3xl rounded-t-[32px] overflow-hidden flex flex-col ${glassClass} relative`}
        >
        {/* Mobile Pull Bar */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-8 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {isRtl ? 'إضافة منتج ذكي' : 'Smart Product Upload'}
              </h2>
              <div className="flex gap-1.5">
                {!isOnline && (
                  <span className="flex items-center gap-1 text-[10px] font-black bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full uppercase tracking-widest">
                    <WifiOff size={10} /> {isRtl ? 'أوفلاين' : 'Offline'}
                  </span>
                )}
                {isOnline && networkStatus !== '4g' && (
                  <span className="flex items-center gap-1 text-[10px] font-black bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full uppercase tracking-widest">
                    <Wifi size={10} /> {networkStatus.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {isRtl ? 'مدعوم بتقنيات الذكاء الاصطناعي العصبية' : 'Powered by Neural AI Technologies'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all hover:rotate-90">
            <X size={24} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* AI Suggestion Banner */}
        <AnimatePresence>
          {aiSuggestion && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-brand-primary/5 border-b border-brand-primary/10 overflow-hidden"
            >
              <div className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary relative">
                    <Sparkles size={18} className="animate-pulse" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-warning rounded-full animate-ping" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-brand-primary uppercase tracking-widest">
                      {isRtl ? 'اقتراح الذكاء الاصطناعي جاهز' : 'AI Suggestion Ready'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {isRtl ? 'تم تحليل الصورة وتوليد البيانات تلقائياً' : 'Image analyzed and data generated automatically'}
                    </p>
                  </div>
                </div>
                <HapticButton 
                  onClick={applyAiSuggestion}
                  className="px-4 py-1.5 bg-brand-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-brand-primary/20 hover:scale-105 transition-transform"
                >
                  {isRtl ? 'تطبيق البيانات' : 'Apply Data'}
                </HapticButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col md:flex-row gap-8">
          
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
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {isRtl ? 'إدارة الصور' : 'Manage Images'}
                </h4>
                {images.length > 0 && !aiSuggestion && !isAnalyzing && (
                  <button 
                    onClick={() => retryAnalysis(images.find(img => img.isMain)?.id || images[0].id)}
                    className="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                  >
                    <Sparkles size={10} />
                    {isRtl ? 'إعادة التحليل الذكي' : 'Retry AI Analysis'}
                  </button>
                )}
              </div>
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

          {/* Right Side: Form Details */}
          <div className="w-full md:w-1/2 flex flex-col gap-8">
            
            {/* Basic Info Section */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-brand-primary rounded-full" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {isRtl ? 'المعلومات الأساسية' : 'Basic Information'}
                </h3>
              </div>

              <motion.div layout className="space-y-4">
                <motion.div layout className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                    <Tag size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder={isRtl ? 'عنوان المنتج (مثال: آيفون 15 برو)' : 'Product Title (e.g. iPhone 15 Pro)'}
                    value={title || ''}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-bold text-slate-900 dark:text-white"
                  />
                </motion.div>

              <motion.div layout className="flex gap-4">
                  <motion.div layout className="relative group flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                      <span className="font-bold text-sm">{t('currency')}</span>
                    </div>
                    <input 
                      type="number" 
                      placeholder={isRtl ? 'السعر' : 'Price'}
                      value={price || ''}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-14 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-bold text-slate-900 dark:text-white"
                    />
                    <HapticButton 
                      onClick={async () => {
                        if (!title || selectedCategories.length === 0) return;
                        const catName = categories.find(c => c.id === selectedCategories[0])?.nameEn || '';
                        const suggestedPrice = await suggestPrice(title, catName, i18n.language);
                        if (suggestedPrice > 0) setPrice(suggestedPrice.toString());
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-primary hover:text-brand-primary/80"
                    >
                      <Sparkles size={18} />
                    </HapticButton>
                  </motion.div>
                  <motion.div layout className="relative group flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                      <Sparkles size={18} />
                    </div>
                    <input 
                      type="text" 
                      placeholder={isRtl ? 'التصنيف (مثال: إلكترونيات)' : 'Classification (e.g. Electronics)'}
                      value={classification || ''}
                      onChange={(e) => setClassification(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-bold text-slate-900 dark:text-white"
                    />
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            {/* Category Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-brand-primary rounded-full" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {isRtl ? 'الفئات الذكية' : 'Smart Categories'}
                </h3>
              </div>
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

            {/* Features Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-brand-primary rounded-full" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {isRtl ? 'المميزات والخصائص' : 'Features & Specs'}
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {features.map((feature, idx) => (
                  <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    key={idx} 
                    className="px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-xl text-xs font-bold flex items-center gap-2 border border-brand-primary/20"
                  >
                    {feature}
                    <button onClick={() => setFeatures(features.filter((_, i) => i !== idx))} className="hover:text-red-500">
                      <X size={12} />
                    </button>
                  </motion.span>
                ))}
              </div>

              <div className="relative group">
                <input 
                  type="text" 
                  placeholder={isRtl ? 'أضف ميزة (مثال: مقاوم للماء)' : 'Add feature (e.g. Waterproof)'}
                  value={featureInput || ''}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && featureInput.trim()) {
                      e.preventDefault();
                      setFeatures([...features, featureInput.trim()]);
                      setFeatureInput('');
                    }
                  }}
                  className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium text-slate-900 dark:text-white"
                />
                <HapticButton 
                  onClick={() => {
                    if (featureInput.trim()) {
                      setFeatures([...features, featureInput.trim()]);
                      setFeatureInput('');
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-primary text-white rounded-xl shadow-lg"
                >
                  <Plus size={20} />
                </HapticButton>
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-brand-primary rounded-full" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {isRtl ? 'وصف المنتج' : 'Product Description'}
                  </h3>
                </div>
                <HapticButton 
                  onClick={toggleListening}
                  className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                >
                  <Mic size={16} />
                </HapticButton>
              </div>
              <textarea 
                placeholder={isRtl ? 'اكتب وصفاً تفصيلياً للمنتج...' : 'Write a detailed description...'}
                value={description || ''}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium text-slate-900 dark:text-white resize-none"
              />
            </div>

            {/* Contact & Location Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                  <MapPin size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder={isRtl ? 'الموقع' : 'Location'}
                  value={location || ''}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium text-slate-900 dark:text-white"
                />
                <button 
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-primary hover:scale-110 transition-transform disabled:opacity-50"
                >
                  {isLocating ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                </button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                  <Phone size={18} />
                </div>
                <input 
                  type="tel" 
                  placeholder={isRtl ? 'رقم الهاتف' : 'Phone Number'}
                  value={phone || ''}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Quality Toggle */}
            <label className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl cursor-pointer group hover:bg-emerald-500/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-600 uppercase tracking-wider">
                    {isRtl ? 'منتج عالي الجودة' : 'High Quality Product'}
                  </p>
                  <p className="text-[10px] text-emerald-600/70 font-medium">
                    {isRtl ? 'سيظهر المنتج في قسم العروض المميزة' : 'Product will appear in featured section'}
                  </p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={isHighQuality} 
                onChange={(e) => setIsHighQuality(e.target.checked)}
                className="w-5 h-5 rounded border-emerald-500 text-emerald-500 focus:ring-emerald-500"
              />
            </label>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-8 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            {isRtl ? 'بالضغط على نشر، أنت توافق على شروط الاستخدام' : 'By clicking publish, you agree to our terms of service'}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <HapticButton 
              onClick={onClose}
              className="flex-1 sm:flex-none px-8 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </HapticButton>
            <HapticButton 
              onClick={handleSubmit}
              disabled={isSubmitting || images.length === 0}
              className="flex-1 sm:flex-none px-12 py-4 bg-brand-primary text-white rounded-2xl font-black shadow-xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {isRtl ? 'جاري النشر...' : 'Publishing...'}
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  {isRtl ? 'نشر المنتج الآن' : 'Publish Product Now'}
                </>
              )}
            </HapticButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
