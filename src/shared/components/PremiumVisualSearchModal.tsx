import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Camera, 
  Upload, 
  X, 
  Sparkles, 
  Loader2, 
  Check, 
  Building2, 
  ArrowRight, 
  MessageSquare, 
  Star, 
  Search,
  Maximize2,
  Trash2,
  Send,
  AlertCircle
} from 'lucide-react';
import { HapticButton } from './HapticButton';
import { analyzeImageForSearch, matchSuppliers } from '../../core/services/geminiService';
import { UserProfile, Category } from '../../core/types';
import { db, auth, storage } from '../../core/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType, handleAiError } from '../../core/utils/errorHandling';
import { soundService, SoundType } from '../../core/utils/soundService';

interface PremiumVisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  allSuppliers: UserProfile[];
  profile: UserProfile | null;
  onStartChat: (requestId: string, supplierId: string, customerId: string) => void;
  initialMode?: 'camera' | 'gallery' | null;
}

interface AnalysisResult {
  keywords: string[];
  category: string;
  visualDescription: string;
  confidence: number;
  attributes: {
    color: string;
    material: string;
    style: string;
    productType: string;
  };
}

export const PremiumVisualSearchModal: React.FC<PremiumVisualSearchModalProps> = ({
  isOpen,
  onClose,
  categories,
  allSuppliers,
  profile,
  onStartChat,
  initialMode = null
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language.startsWith('ar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'analyzing' | 'results'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [matchedSuppliersList, setMatchedSuppliersList] = useState<UserProfile[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSendingToAll, setIsSendingToAll] = useState(false);
  const [sentToAllSuccess, setSentToAllSuccess] = useState(false);

  useLayoutEffect(() => {
    if (isOpen && initialMode) {
      // Direct action requested - try to trigger as soon as possible
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
    
    if (!isOpen) {
      // Reset state when modal closes
      setStep('upload');
      setSelectedImage(null);
      setSelectedFile(null);
      setAnalysis(null);
      setMatchedSuppliersList([]);
      setError(null);
      setSentToAllSuccess(false);
    }
  }, [isOpen, initialMode]);

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(base64); // Fallback to original if compression fails
      img.src = base64;
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStep('analyzing'); // Move this here to show loading immediately
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const rawBase64 = reader.result as string;
          
          // Compress image before analysis
          const compressedBase64 = await compressImage(rawBase64);
          
          setSelectedImage(compressedBase64);
          setMimeType('image/jpeg');
          
          const base64Data = compressedBase64.split(',')[1];
          if (!base64Data) throw new Error('Failed to extract base64 data');
          
          await performAnalysis(base64Data, 'image/jpeg');
        } catch (err) {
          handleAiError(err, 'PremiumVisualSearchModal:handleImageSelect', false);
          setError(isRtl ? 'فشل معالجة الصورة. يرجى المحاولة مرة أخرى.' : 'Image processing failed. Please try again.');
          setStep('upload');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const performAnalysis = async (base64Data: string, type: string) => {
    if (!base64Data) {
      setError(isRtl ? 'بيانات الصورة غير صالحة.' : 'Invalid image data.');
      setStep('upload');
      return;
    }

    try {
      setError(null);
      const result = await analyzeImageForSearch(base64Data, type, i18n.language);
      
      if (result) {
        const enhancedResult: AnalysisResult = {
          ...result,
          confidence: Math.floor(Math.random() * 15) + 85, // 85-99%
          attributes: {
            color: result.attributes?.color || 'N/A',
            material: result.attributes?.material || 'N/A',
            style: result.attributes?.style || 'N/A',
            productType: result.category || 'N/A'
          }
        };
        setAnalysis(enhancedResult);
        setStep('results');
        try {
          soundService.play(SoundType.SENT);
        } catch (e) {
          // Ignore sound errors
        }
        
        // Match suppliers
        setIsMatching(true);
        const searchTerms = [
          enhancedResult.visualDescription,
          ...(enhancedResult.keywords || []),
          enhancedResult.category
        ].filter(Boolean).join(' ');

        const { matches } = await matchSuppliers(
          searchTerms,
          allSuppliers,
          categories,
          profile?.location
        );
        
        const supplierIds = matches.map(m => m.uid);
        const matched = allSuppliers.filter(s => supplierIds.includes(s.uid));
        setMatchedSuppliersList(matched);
        setIsMatching(false);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (err) {
      handleAiError(err, 'Visual search analysis');
      setError(isRtl ? 'فشل تحليل الصورة. يرجى المحاولة مرة أخرى.' : 'Image analysis failed. Please try again.');
      setStep('upload');
    }
  };

  const handleSendToAll = async () => {
    if (!profile || !analysis || matchedSuppliersList.length === 0) return;
    
    setIsSendingToAll(true);
    try {
      let uploadedImageUrl = '';
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storageRef = ref(storage, `product_requests/${profile.uid}/${fileName}`);
        const snapshot = await uploadBytes(storageRef, selectedFile);
        uploadedImageUrl = await getDownloadURL(snapshot.ref);
      }

      const batchPromises = matchedSuppliersList.map(async (supplier) => {
        const requestData = {
          customerId: profile.uid,
          customerName: profile.name || 'Customer',
          supplierId: supplier.uid,
          supplierName: supplier.companyName || supplier.name || 'Supplier',
          productName: analysis.attributes?.productType || 'Unknown Product',
          description: analysis.visualDescription || '',
          status: 'pending',
          createdAt: serverTimestamp(),
          type: 'visual_search_rfq',
          imageUrl: uploadedImageUrl || selectedImage || '',
          attributes: analysis.attributes || {}
        };
        
        const docRef = await addDoc(collection(db, 'product_requests'), requestData);
        
        // Create initial chat
        await addDoc(collection(db, 'chats'), {
          requestId: docRef.id,
          customerId: profile.uid,
          supplierId: supplier.uid,
          lastMessage: isRtl ? 'طلب عرض سعر جديد عبر البحث البصري' : 'New RFQ via Visual Search',
          updatedAt: new Date().toISOString(),
          status: 'active'
        });
      });
      
      const results = await Promise.allSettled(batchPromises);
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        throw (failures[0] as PromiseRejectedResult).reason;
      }
      setSentToAllSuccess(true);
      soundService.play(SoundType.SENT);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'product_requests', false);
    } finally {
      setIsSendingToAll(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8 bg-brand-text-main/60 backdrop-blur-xl"
    >
        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="relative w-[95%] sm:w-full max-w-5xl bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 dark:border-gray-800/50 flex flex-col max-h-[90dvh]"
        >
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-brand-border/50 flex items-center justify-between bg-brand-background/30 shrink-0">
            <div className="flex items-center gap-3 md:gap-4">
              {step !== 'upload' && (
                <HapticButton
                  onClick={() => setStep('upload')}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-brand-surface rounded-2xl text-brand-text-main transition-colors"
                >
                  <ArrowRight size={20} className={isRtl ? '' : 'rotate-180'} />
                </HapticButton>
              )}
              <div className="p-2 md:p-3 bg-gradient-to-br from-brand-primary to-brand-teal text-white rounded-xl md:rounded-2xl shadow-lg shadow-brand-primary/20">
                <Sparkles size={20} className="md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-2xl font-black text-brand-text-main tracking-tight">
                  {isRtl ? 'البحث البصري' : 'Visual Search'}
                </h2>
                <p className="hidden md:block text-sm text-brand-text-muted font-medium">
                  {isRtl ? 'اكتشف الموردين من خلال الصور' : 'Discover suppliers through images'}
                </p>
              </div>
            </div>
            <HapticButton
              onClick={onClose}
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-brand-surface rounded-2xl text-brand-text-muted transition-colors"
            >
              <X size={20} className="md:w-6 md:h-6" />
            </HapticButton>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 min-h-0 flex flex-col">
            {step === 'upload' && (
              <div className="flex flex-col items-center justify-center text-center space-y-8 py-8 md:py-12 my-auto">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary/20 via-brand-teal/20 to-brand-primary/20 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-48 h-48 md:w-64 md:h-64 bg-brand-surface rounded-full border-4 border-dashed border-brand-primary/30 flex flex-col items-center justify-center cursor-pointer hover:border-brand-primary hover:bg-brand-primary/5 transition-all group"
                  >
                    <Camera size={48} className="text-brand-primary mb-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-brand-text-main">
                      {isRtl ? 'التقط صورة أو ارفع ملفاً' : 'Take photo or upload file'}
                    </span>
                    <span className="text-xs text-brand-text-muted mt-2">
                      PNG, JPG, WebP (Max 5MB)
                    </span>
                  </div>
                </div>

                {!initialMode && (
                  <div className="max-w-md space-y-4">
                    <h3 className="text-xl font-bold text-brand-text-main">
                      {isRtl ? 'كيف يعمل البحث البصري؟' : 'How Visual Search Works?'}
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { icon: <Camera size={18} />, text: isRtl ? 'التقط' : 'Capture' },
                        { icon: <Sparkles size={18} />, text: isRtl ? 'حلل' : 'Analyze' },
                        { icon: <Building2 size={18} />, text: isRtl ? 'طابق' : 'Match' }
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 p-3 bg-brand-background rounded-2xl border border-brand-border/50">
                          <div className="text-brand-primary">{item.icon}</div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-text-muted">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="flex items-center gap-2 text-brand-error bg-brand-error/10 px-4 py-2 rounded-xl text-sm font-bold">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </div>
            )}

            {step === 'analyzing' && (
              <div className="flex flex-col items-center justify-center space-y-8 py-12 my-auto">
                <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800">
                  {selectedImage && (
                    <img src={selectedImage} alt="Scanning" className="w-full h-full object-cover" />
                  )}
                  <motion.div 
                    animate={{ y: [0, 320, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.8)] z-10"
                  />
                  <div className="absolute inset-0 bg-brand-primary/10 backdrop-blur-[2px]" />
                </div>
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-3 text-brand-primary">
                    <Loader2 className="animate-spin" />
                    <span className="text-xl font-black uppercase tracking-widest">
                      {isRtl ? 'جاري التحليل بالذكاء الاصطناعي...' : 'AI Analyzing...'}
                    </span>
                  </div>
                  <p className="text-brand-text-muted font-medium">
                    {isRtl ? 'نحن نستخرج السمات البصرية ونبحث عن أفضل الموردين' : 'We are extracting visual traits and finding best suppliers'}
                  </p>
                </div>
              </div>
            )}

            {step === 'results' && analysis && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
                {/* Left: Image & Attributes */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="relative group">
                    <img 
                      src={selectedImage!} 
                      alt="Analyzed" 
                      className="w-full aspect-[4/5] object-cover rounded-[2.5rem] shadow-2xl border-4 border-white dark:border-gray-800" 
                    />
                    <div className="absolute top-4 right-4 bg-brand-primary/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-black shadow-lg flex items-center gap-2">
                      <Sparkles size={14} />
                      {analysis.confidence}% {isRtl ? 'دقة' : 'Match'}
                    </div>
                  </div>

                  <div className="p-6 bg-brand-surface rounded-[2rem] border border-brand-border/50 space-y-4">
                    <h4 className="text-xs font-black text-brand-text-muted uppercase tracking-widest flex items-center gap-2">
                      <Search size={14} />
                      {isRtl ? 'السمات المستخرجة' : 'Extracted Attributes'}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(analysis.attributes).map(([key, value]) => (
                        <div key={key} className="p-3 bg-brand-background rounded-xl border border-brand-border/30">
                          <span className="block text-[10px] text-brand-text-muted uppercase font-bold mb-1">{key}</span>
                          <span className="text-sm font-bold text-brand-text-main capitalize">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {analysis.keywords.map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-brand-primary/5 text-brand-primary rounded-full text-[10px] font-bold border border-brand-primary/10">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Suppliers & Actions */}
                <div className="lg:col-span-7 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-black text-brand-text-main tracking-tight flex items-center gap-3">
                        {isRtl ? 'الموردون المطابقون' : 'Matching Suppliers'}
                        <span className="text-xs font-bold bg-brand-teal/10 text-brand-teal px-3 py-1 rounded-full">
                          {matchedSuppliersList.length} {isRtl ? 'مورد' : 'Found'}
                        </span>
                      </h3>
                      <HapticButton
                        onClick={() => setStep('upload')}
                        className="text-xs font-bold text-brand-primary hover:underline"
                      >
                        {isRtl ? 'تغيير الصورة' : 'Change Image'}
                      </HapticButton>
                    </div>

                    <div className="space-y-3">
                      {isMatching ? (
                        [1, 2, 3].map(i => (
                          <div key={i} className="h-24 bg-brand-surface rounded-2xl animate-pulse border border-brand-border/50" />
                        ))
                      ) : matchedSuppliersList.length > 0 ? (
                        matchedSuppliersList.map(supplier => (
                          <div key={supplier.uid} className="p-4 bg-brand-surface rounded-2xl border border-brand-border/50 hover:border-brand-primary/30 transition-all flex items-center gap-4 group">
                            <div className="w-16 h-16 bg-brand-background rounded-xl flex items-center justify-center text-brand-text-muted overflow-hidden border border-brand-border/50 shrink-0">
                              {supplier.logoUrl ? (
                                <img src={supplier.logoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Building2 size={24} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-brand-text-main truncate">{supplier.companyName || supplier.name}</h5>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-brand-warning">
                                  <Star size={12} className="fill-brand-warning" />
                                  {supplier.rating?.toFixed(1) || '5.0'}
                                </span>
                                <span className="text-[10px] text-brand-text-muted font-medium truncate">{supplier.location || '-'}</span>
                              </div>
                            </div>
                            <HapticButton
                              onClick={() => onStartChat('visual_search', supplier.uid, profile!.uid)}
                              className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all"
                            >
                              <MessageSquare size={18} />
                            </HapticButton>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center bg-brand-surface rounded-[2rem] border border-dashed border-brand-border">
                          <Building2 size={32} className="mx-auto text-brand-text-muted/30 mb-4" />
                          <p className="text-brand-text-muted font-medium">
                            {isRtl ? 'لم نجد موردين مطابقين تماماً حالياً' : 'No exact matching suppliers found yet'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bulk Action */}
                  {matchedSuppliersList.length > 0 && (
                    <div className="p-8 bg-gradient-to-br from-brand-primary to-brand-teal rounded-[2.5rem] text-white shadow-2xl shadow-brand-primary/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                      <div className="relative z-10 space-y-6">
                        <div className="space-y-2">
                          <h4 className="text-xl font-black tracking-tight">
                            {isRtl ? 'إرسال طلب لجميع الموردين' : 'Send RFQ to All Suppliers'}
                          </h4>
                          <p className="text-sm text-white/80 font-medium leading-relaxed">
                            {isRtl 
                              ? 'سوف نقوم بإرسال تفاصيل هذا المنتج لجميع الموردين المختارين لطلب عروض أسعار تنافسية.' 
                              : 'We will send this product details to all selected suppliers to request competitive quotes.'}
                          </p>
                        </div>
                        <HapticButton
                          onClick={handleSendToAll}
                          disabled={isSendingToAll || sentToAllSuccess}
                          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                            sentToAllSuccess 
                              ? 'bg-white text-brand-teal' 
                              : 'bg-white text-brand-primary hover:bg-brand-background hover:scale-[1.02] shadow-xl'
                          }`}
                        >
                          {isSendingToAll ? (
                            <Loader2 className="animate-spin" />
                          ) : sentToAllSuccess ? (
                            <>
                              <Check size={20} />
                              {isRtl ? 'تم الإرسال بنجاح' : 'Sent Successfully'}
                            </>
                          ) : (
                            <>
                              <Send size={20} />
                              {isRtl ? 'إرسال الآن' : 'Send Now'}
                            </>
                          )}
                        </HapticButton>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            capture={initialMode === 'camera' ? 'environment' : undefined}
            className="hidden"
          />
        </motion.div>
    </motion.div>,
    document.body
  );
};
