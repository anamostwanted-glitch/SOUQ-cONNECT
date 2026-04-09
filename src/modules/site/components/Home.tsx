import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistedState } from '../../../shared/hooks/usePersistedState';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, getDocs, doc, onSnapshot, query, where, orderBy, getDoc, setDoc, writeBatch, updateDoc, arrayUnion, limit } from 'firebase/firestore';
import { db, storage, auth } from '../../../core/firebase';
import { UserProfile, Category, ProductRequest, Chat, AppFeatures } from '../../../core/types';
import { UserRequestCard } from '../../user/components/UserRequestCard';
import { 
  categorizeProduct, 
  getAiAssistantResponse, 
  enhanceRequestDescription, 
  analyzeProductImage, 
  matchSuppliers,
  analyzeUserBehavior,
  parseVoiceRequest,
  translateText,
  generateProductCopy,
  enhanceProductImageDescription
} from '../../../core/services/geminiService';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import UserProfileModal from '../../../shared/components/UserProfileModal';
import { PremiumVisualSearchModal } from '../../../shared/components/PremiumVisualSearchModal';
import { soundService, SoundType } from '../../../core/utils/soundService';
import { HapticButton } from '../../../shared/components/HapticButton';
import { SupplierRegistrationCTA } from './home/SupplierRegistrationCTA';
import { MatchedSuppliersSection } from './home/MatchedSuppliersSection';
import { getNextBestAction } from '../../../core/services/PredictiveService';
import { 
  Bot, 
  Sparkles as SparklesIcon, 
  X, 
  Search, 
  Package, 
  Building2, 
  Mic,
  Camera,
  Trash2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Hammer,
  Zap,
  Droplets,
  Wrench,
  ShoppingBag
} from 'lucide-react';

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

interface HomeProps {
  profile: UserProfile | null;
  onNavigate: (view: any) => void;
  onOpenChat?: (chatId: string) => void;
  onViewProfile?: (uid: string) => void;
  viewMode?: 'admin' | 'supplier' | 'customer';
  uiStyle?: 'classic' | 'minimal';
}

const Home: React.FC<HomeProps> = ({ 
  profile, 
  onNavigate, 
  onOpenChat,
  onViewProfile,
  viewMode,
  uiStyle = 'classic'
}) => {
  const { t, i18n } = useTranslation();
  const effectiveRole = viewMode || profile?.role || 'customer';
  const isRtl = i18n.language === 'ar';
  const [searchQuery, setSearchQuery] = usePersistedState('home_search_query', '');
  const [recentSearches, setRecentSearches] = usePersistedState<string[]>('home_recent_searches', []);
  const [draftDescription, setDraftDescription] = usePersistedState('home_draft_description', '');
  const [showDraftArea, setShowDraftArea] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isActionsTrayOpen, setIsActionsTrayOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [matchedSuppliers, setMatchedSuppliers] = useState<UserProfile[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<ProductRequest | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [siteName, setSiteName] = useState('');
  const [heroTitleAr, setHeroTitleAr] = useState('');
  const [heroTitleEn, setHeroTitleEn] = useState('');
  const [heroDescriptionAr, setHeroDescriptionAr] = useState('');
  const [heroDescriptionEn, setHeroDescriptionEn] = useState('');
  const [searchPlaceholderAr, setSearchPlaceholderAr] = useState('');
  const [searchPlaceholderEn, setSearchPlaceholderEn] = useState('');
  const [ctaButtonAr, setCtaButtonAr] = useState('');
  const [ctaButtonEn, setCtaButtonEn] = useState('');
  const [logoScale, setLogoScale] = useState(1);
  const [logoAuraColor, setLogoAuraColor] = useState('#1b97a7');
  const [logoAuraBlur, setLogoAuraBlur] = useState(20);
  const [logoAuraSpread, setLogoAuraSpread] = useState(1.2);
  const [logoAuraOpacity, setLogoAuraOpacity] = useState(0.4);
  const [logoAuraStyle, setLogoAuraStyle] = useState<'solid' | 'gradient' | 'pulse' | 'mesh'>('solid');
  const [logoAuraSharpness, setLogoAuraSharpness] = useState(50);
  const [showNeuralLogo, setShowNeuralLogo] = useState(true);
  const [primaryTextColor, setPrimaryTextColor] = useState('#ffffff');
  const [secondaryTextColor, setSecondaryTextColor] = useState('#94a3b8');
  const [enableNeuralPulse, setEnableNeuralPulse] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showConciergeTrigger, setShowConciergeTrigger] = useState(false);
  const [conciergeReason, setConciergeReason] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [productCopy, setProductCopy] = useState<{ title: string; description: string; highlights: string[] } | null>(null);
  const [isEnhancingImage, setIsEnhancingImage] = useState(false);
  const [imageEnhancements, setImageEnhancements] = useState<{ suggestions: string[]; caption: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const requestsRef = useRef<HTMLDivElement>(null);
  const nextAction = getNextBestAction(profile, 'home');

  const updateConciergeConsent = async () => {
    if (!profile?.uid || !profile?.phone) return;
    try {
      // 1. Update consent in Firestore
      await updateDoc(doc(db, 'users', profile.uid), {
        conciergeConsent: true
      });
      
      // 2. Send welcome message via WhatsApp
      await fetch('/api/send-concierge-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: profile.phone,
          message: isRtl 
            ? 'أهلاً بك! تم تفعيل تنبيهات الكونسيرج الذكية. سنرسل لك تنبيهات مخصصة فقط عندما نجد المورد الذي يناسب احتياجاتك بدقة.'
            : 'Welcome! Smart concierge alerts are now enabled. We will send you personalized alerts only when we find the supplier that perfectly matches your needs.'
        })
      });
      
      setShowConciergeTrigger(false);
    } catch (error) {
      console.error('Error updating concierge consent:', error);
    }
  };

  useEffect(() => {
    if (matchedSuppliers.length > 0 && !profile?.conciergeConsent && !showConciergeTrigger) {
      setShowConciergeTrigger(true);
    }
  }, [matchedSuppliers, profile?.conciergeConsent]);

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageEnhancements(null);
  };

  useEffect(() => {
    const handlePreview = (e: any) => {
      const data = e.detail;
      if (data.logoAuraColor !== undefined) setLogoAuraColor(data.logoAuraColor);
      if (data.logoAuraBlur !== undefined) setLogoAuraBlur(data.logoAuraBlur);
      if (data.logoAuraSpread !== undefined) setLogoAuraSpread(data.logoAuraSpread);
      if (data.logoAuraOpacity !== undefined) setLogoAuraOpacity(data.logoAuraOpacity);
      if (data.logoAuraStyle !== undefined) setLogoAuraStyle(data.logoAuraStyle);
      if (data.logoAuraSharpness !== undefined) setLogoAuraSharpness(data.logoAuraSharpness);
      if (data.logoScale !== undefined) setLogoScale(data.logoScale);
      if (data.showNeuralLogo !== undefined) setShowNeuralLogo(data.showNeuralLogo);
      if (data.enableNeuralPulse !== undefined) setEnableNeuralPulse(data.enableNeuralPulse);
    };
    window.addEventListener('site-settings-preview', handlePreview);
    return () => window.removeEventListener('site-settings-preview', handlePreview);
  }, []);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLogoUrl(data.logoUrl || '');
        setSiteName(data.siteName || '');
        setHeroTitleAr(data.heroTitleAr || '');
        setHeroTitleEn(data.heroTitleEn || '');
        setHeroDescriptionAr(data.heroDescriptionAr || '');
        setHeroDescriptionEn(data.heroDescriptionEn || '');
        setSearchPlaceholderAr(data.searchPlaceholderAr || '');
        setSearchPlaceholderEn(data.searchPlaceholderEn || '');
        setCtaButtonAr(data.ctaButtonAr || '');
        setCtaButtonEn(data.ctaButtonEn || '');
        setLogoScale(data.logoScale ?? 1);
        setLogoAuraColor(data.logoAuraColor || '#1b97a7');
        setLogoAuraBlur(data.logoAuraBlur ?? 20);
        setLogoAuraSpread(data.logoAuraSpread ?? 1.2);
        setLogoAuraOpacity(data.logoAuraOpacity ?? 0.4);
        setLogoAuraStyle(data.logoAuraStyle || 'solid');
        setLogoAuraSharpness(data.logoAuraSharpness ?? 50);
        setShowNeuralLogo(data.showNeuralLogo ?? true);
        setPrimaryTextColor(data.primaryTextColor || '#ffffff');
        setSecondaryTextColor(data.secondaryTextColor || '#94a3b8');
        setEnableNeuralPulse(data.enableNeuralPulse ?? true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        const cats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        const sorted = cats.sort((a, b) => {
          const nameA = isRtl ? a.nameAr : a.nameEn;
          const nameB = isRtl ? b.nameAr : b.nameEn;
          return nameA.localeCompare(nameB, i18n.language);
        });
        setCategories(sorted);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'categories', false);
      }
    };
    fetchCategories().catch(err => console.error("Unhandled fetchCategories error:", err));
  }, []);

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('construction') || name.includes('بناء') || name.includes('مقاولات')) return Hammer;
    if (name.includes('electrical') || name.includes('كهرباء')) return Zap;
    if (name.includes('plumbing') || name.includes('سباكة')) return Droplets;
    if (name.includes('maintenance') || name.includes('صيانة')) return Wrench;
    return Package;
  };

  const handleVoiceInput = React.useCallback(() => {
    setVoiceError(null);
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceError(i18n.language === 'ar' ? 'متصفحك لا يدعم التعرف على الصوت' : 'Your browser does not support speech recognition');
      setTimeout(() => setVoiceError(null), 3000);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setAiStatus(i18n.language === 'ar' ? 'جاري الاستماع...' : 'Listening...');
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setAiStatus(i18n.language === 'ar' ? 'جاري تحليل طلبك الصوتي...' : 'Analyzing your voice request...');
      
      try {
        const parsed = await parseVoiceRequest(transcript, i18n.language);
        if (parsed.productName) {
          setSearchQuery(parsed.productName);
        }
        if (parsed.description) {
          setDraftDescription(parsed.description);
          setShowDraftArea(true);
        }
      } catch (error) {
        console.error('Voice parsing error:', error);
      } finally {
        setAiStatus('');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setVoiceError(i18n.language === 'ar' ? 'حدث خطأ أثناء التعرف على الصوت' : 'An error occurred during speech recognition');
      setTimeout(() => setVoiceError(null), 3000);
      setIsListening(false);
      setAiStatus('');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (aiStatus === (i18n.language === 'ar' ? 'جاري الاستماع...' : 'Listening...')) {
        setAiStatus('');
      }
    };

    recognition.start();
  }, [i18n.language, setSearchQuery, setDraftDescription, setShowDraftArea, setAiStatus, parseVoiceRequest]);

  const handleGenerateCopy = async () => {
    if (!searchQuery) return;
    setIsGeneratingCopy(true);
    setAiStatus(i18n.language === 'ar' ? 'جاري إنشاء محتوى تسويقي...' : 'Generating marketing copy...');
    try {
      const result = await generateProductCopy(
        searchQuery, 
        [], // Features could be extracted from description if we had more time
        i18n.language === 'ar' ? 'تجار وموردين' : 'Traders and Suppliers',
        i18n.language
      );
      setProductCopy(result);
      setDraftDescription(result.description);
      setShowDraftArea(true);
    } catch (error) {
      console.error('Copy generation error:', error);
    } finally {
      setIsGeneratingCopy(false);
      setAiStatus('');
    }
  };

  const handleEnhanceImage = async () => {
    if (!imagePreview) return;
    setIsEnhancingImage(true);
    setAiStatus(i18n.language === 'ar' ? 'جاري تحليل الصورة وتقديم مقترحات...' : 'Analyzing image and generating suggestions...');
    try {
      const base64 = imagePreview.split(',')[1];
      const result = await enhanceProductImageDescription(base64, selectedImage?.type || 'image/jpeg', i18n.language);
      setImageEnhancements(result);
    } catch (error) {
      console.error('Image enhancement error:', error);
    } finally {
      setIsEnhancingImage(false);
      setAiStatus('');
    }
  };

  const handleDraftRequest = async () => {
    if (!searchQuery) return;
    setIsDrafting(true);
    setShowDraftArea(true);
    setAiStatus(i18n.language === 'ar' ? 'جاري صياغة الطلب...' : 'Drafting request...');
    
    try {
      let aiDescription = '';
      if (selectedImage) {
        setAiStatus(i18n.language === 'ar' ? 'جاري تحليل الصورة بالذكاء الاصطناعي...' : 'AI is analyzing the image...');
        const base64 = imagePreview?.split(',')[1];
        if (base64) {
          const result = await analyzeProductImage(base64, selectedImage.type);
          if (result) {
            aiDescription = (i18n.language === 'ar' ? result.descriptionAr : result.descriptionEn) || '';
            if (!searchQuery) {
              setSearchQuery((i18n.language === 'ar' ? result.productNameAr : result.productNameEn) || '');
            }
          }
        }
      }
      
      setAiStatus(i18n.language === 'ar' ? 'جاري صياغة الطلب...' : 'Drafting request...');
      const enhancedDescription = await enhanceRequestDescription(searchQuery + (aiDescription ? ` (Image context: ${aiDescription})` : ''), i18n.language);
      setDraftDescription(enhancedDescription);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDrafting(false);
      setAiStatus('');
    }
  };

  useEffect(() => {
    const analyzeBehavior = async () => {
      if (!profile || recentSearches.length < 2) return;
      
      try {
        const q = query(collection(db, 'requests'), where('customerId', '==', profile.uid), limit(5));
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProductRequest));
        
        const analysis = await analyzeUserBehavior(profile, recentSearches, requests);
        if (analysis.isMomentOfNeed && !profile?.conciergeConsent && !showConciergeTrigger) {
          setConciergeReason(analysis.reason);
          setShowConciergeTrigger(true);
        }
      } catch (error) {
        console.error('Error analyzing behavior:', error);
      }
    };
    
    analyzeBehavior().catch(err => console.error("Analyze behavior error:", err));
  }, [recentSearches, profile]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (searchQuery.trim()) {
      setRecentSearches(prev => [...prev.slice(-4), searchQuery.trim()]);
    }
    
    console.log('handleRequest called. Profile:', profile);
    if (!profile) {
      console.log('No profile found, navigating to role-selection');
      onNavigate('role-selection');
      return;
    }
    let trimmedQuery = searchQuery.trim();
    if (!trimmedQuery && !selectedImage) {
      console.log('Missing searchQuery and image');
      return;
    }

    // Log search query
    try {
      if (trimmedQuery && profile?.uid) {
        await addDoc(collection(db, 'searches'), {
          query: trimmedQuery,
          userId: profile.uid,
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('Error logging search:', e);
    }

    setLoading(true);
    setSearchQuery('');
    setDraftDescription('');
    setShowDraftArea(false);
    const initialStatus = i18n.language === 'ar' 
      ? 'نعمل على تحسين طلبك باستخدام الذكاء الاصطناعي لضمان أفضل العروض...' 
      : 'Enhancing your request with AI to ensure the best offers...';
    setAiStatus(initialStatus);
    
    try {
      let imageUrl = '';
      let aiDescription = '';

      if (selectedImage) {
        setAiStatus(i18n.language === 'ar' ? 'جاري تحليل الصورة تقنياً...' : 'Analyzing image specifications...');
        const base64 = imagePreview?.split(',')[1];
        if (base64) {
          try {
            const result = await analyzeProductImage(base64, selectedImage.type);
            if (result) {
              aiDescription = (i18n.language === 'ar' ? result.descriptionAr : result.descriptionEn) || '';
              if (!trimmedQuery) {
                const newQuery = (i18n.language === 'ar' ? result.productNameAr : result.productNameEn) || '';
                setSearchQuery(newQuery);
                trimmedQuery = newQuery; // Update local variable so the rest of the function uses it
              }
            }
          } catch (imgAiErr) {
            console.error('Image AI analysis failed:', imgAiErr);
          }
        }

        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
          useWebWorker: true
        };
        try {
          const compressedFile = await imageCompression(selectedImage, options);
          const storageRef = ref(storage, `requests/${auth.currentUser?.uid || profile?.uid || 'guest'}_${Date.now()}_${compressedFile.name}`);
          await uploadBytes(storageRef, compressedFile);
          imageUrl = await getDownloadURL(storageRef);
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
        }
      }

      // Use AI to find the best category and enhance description in parallel
      setAiStatus(i18n.language === 'ar' ? 'جاري صياغة الطلب بشكل احترافي وتصنيفه...' : 'Professionalizing request and categorizing...');
      
      let categoryId: string | null = null;
      let finalDescription = trimmedQuery;

      let currentCategories = categories;
      if (currentCategories.length === 0) {
        try {
          const querySnapshot = await getDocs(collection(db, 'categories'));
          currentCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
          setCategories(currentCategories);
        } catch (error) {
          console.error('Failed to fetch categories during request:', error);
        }
      }

      try {
        const categoryPromise = currentCategories.length > 0 
          ? categorizeProduct(trimmedQuery + ' ' + aiDescription, currentCategories)
          : Promise.resolve(null);
        
        let descriptionPromise: Promise<string>;
        if (!showDraftArea || !draftDescription) {
          descriptionPromise = enhanceRequestDescription(trimmedQuery + (aiDescription ? ` (Image context: ${aiDescription})` : ''), i18n.language);
        } else {
          descriptionPromise = Promise.resolve(draftDescription);
        }

        const [aiCategoryId, aiFinalDescription] = await Promise.all([categoryPromise, descriptionPromise]);
        categoryId = aiCategoryId;
        finalDescription = aiFinalDescription || trimmedQuery;
      } catch (aiError) {
        console.warn('AI Processing failed or quota exceeded, using standard data:', aiError);
      }

      if (!categoryId && currentCategories.length > 0) {
        // Try to find a category that matches the search query manually if AI fails or returns null
        const searchWords = trimmedQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const manualMatch = currentCategories.find(c => {
          const nameAr = c.nameAr || '';
          const nameEn = c.nameEn || '';
          const keywords = c.keywords || [];
          
          return nameAr.includes(trimmedQuery) || 
            nameEn.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
            searchWords.some(w => nameAr.includes(w) || nameEn.toLowerCase().includes(w)) ||
            keywords.some(kw => kw.toLowerCase().includes(trimmedQuery.toLowerCase()) || searchWords.some(w => kw.toLowerCase().includes(w)));
        });
        
        // If still no match, use the first category as a last resort to prevent blocking the user
        categoryId = manualMatch ? manualMatch.id : currentCategories[0].id;
        console.warn('AI and manual match failed, using fallback category:', categoryId);
      }

      if (categoryId) {
        try {
          setAiStatus(i18n.language === 'ar' ? 'جاري إرسال طلبك إلى الموردين المعتمدين...' : 'Sending your request to verified suppliers...');
          const category = currentCategories.find(c => c.id === categoryId);
          const requestRef = await addDoc(collection(db, 'requests'), {
            customerId: auth.currentUser?.uid || profile?.uid || 'guest',
            customerName: profile?.name || 'Guest',
            productName: trimmedQuery,
            description: finalDescription || trimmedQuery,
            imageUrl,
            categoryId: categoryId,
            categoryNameAr: category?.nameAr || '',
            categoryNameEn: category?.nameEn || '',
            status: 'open',
            createdAt: new Date().toISOString(),
            location: profile?.location || ''
          });
          console.log('Request added successfully. ID:', requestRef.id);
          const requestData: ProductRequest = {
            id: requestRef.id,
            customerId: auth.currentUser?.uid || profile?.uid || 'guest',
            customerName: profile?.name || 'Guest',
            productName: trimmedQuery,
            description: finalDescription || trimmedQuery,
            imageUrl,
            categoryId: categoryId,
            categoryNameAr: category?.nameAr || '',
            categoryNameEn: category?.nameEn || '',
            status: 'open',
            createdAt: new Date().toISOString(),
            location: profile?.location || ''
          };
          setLastRequest(requestData);
          setLastRequestId(requestRef.id);
          
          // Scroll to result section
          setTimeout(() => {
            requestsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);

          // Update category's keywords and suggestedKeywords automatically
          try {
            const categoryRef = doc(db, 'categories', categoryId);
            const categorySnap = await getDoc(categoryRef);
            if (categorySnap.exists()) {
              const catData = categorySnap.data() as Category;
              const currentKeywords = catData.keywords || [];
              const currentSuggested = catData.suggestedKeywords || [];
              const currentAuto = catData.autoKeywords || [];
              
              const updates: any = {};
              let hasUpdates = false;

              // Add to active keywords if not already there
              if (!currentKeywords.includes(trimmedQuery)) {
                updates.keywords = [...currentKeywords, trimmedQuery].slice(-100); // Limit to 100 active keywords
                hasUpdates = true;
              }

              // Track as auto-added
              if (!currentAuto.includes(trimmedQuery)) {
                updates.autoKeywords = [...currentAuto, trimmedQuery].slice(-100);
                hasUpdates = true;
              }

              // Also keep in suggested for history/AI context if needed
              if (!currentSuggested.includes(trimmedQuery) && !currentKeywords.includes(trimmedQuery)) {
                updates.suggestedKeywords = [...currentSuggested, trimmedQuery].slice(-50);
                hasUpdates = true;
              }

              if (hasUpdates) {
                await updateDoc(categoryRef, updates);
              }
            }
          } catch (err) {
            console.error('Error updating keywords:', err);
          }

          // Notify all suppliers in this category and potentially parent categories
          try {
            console.log('Starting notification process for categoryId:', categoryId);
            
            // 1. Get suppliers in the specific category
            const suppliersQuery = query(
              collection(db, 'users'),
              where('role', '==', 'supplier'),
              where('categories', 'array-contains', categoryId)
            );
            const suppliersSnap = await getDocs(suppliersQuery);
            
            let categorySuppliers: UserProfile[] = [];
            suppliersSnap.forEach((doc) => {
              categorySuppliers.push({ uid: doc.id, ...doc.data() } as UserProfile);
            });

            // 2. If no suppliers in subcategory, try parent category
            if (categorySuppliers.length === 0) {
              const currentCat = categories.find(c => c.id === categoryId);
              if (currentCat?.parentId) {
                console.log('No suppliers in subcategory, checking parent category:', currentCat.parentId);
                const parentSuppliersQuery = query(
                  collection(db, 'users'),
                  where('role', '==', 'supplier'),
                  where('categories', 'array-contains', currentCat.parentId)
                );
                const parentSuppliersSnap = await getDocs(parentSuppliersQuery);
                parentSuppliersSnap.forEach((doc) => {
                  categorySuppliers.push({ uid: doc.id, ...doc.data() } as UserProfile);
                });
              }
            }

            // 3. Fallback: If still no suppliers, try to find suppliers by keywords or name (broad search)
            if (categorySuppliers.length === 0) {
              console.log('No suppliers found in categories, performing broad search...');
              const allSuppliersQuery = query(
                collection(db, 'users'),
                where('role', '==', 'supplier'),
                limit(50)
              );
              const allSuppliersSnap = await getDocs(allSuppliersQuery);
              const allSuppliers = allSuppliersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
              
              // Simple keyword matching as a fallback before AI matchmaking
              const keywords = trimmedQuery.toLowerCase().split(' ');
              categorySuppliers = allSuppliers.filter(s => {
                const nameMatch = (s.companyName || s.name || '').toLowerCase().includes(trimmedQuery.toLowerCase());
                const keywordMatch = s.keywords?.some(k => keywords.includes(k.toLowerCase()));
                const bioMatch = (s.bio || '').toLowerCase().includes(trimmedQuery.toLowerCase());
                return nameMatch || keywordMatch || bioMatch;
              });
            }

            console.log('Suppliers found for matching:', categorySuppliers.length);
            
            if (categorySuppliers.length > 0) {
              const batch = writeBatch(db);
              categorySuppliers.forEach((supplier) => {
                const notifRef = doc(collection(db, 'notifications'));
                batch.set(notifRef, {
                  userId: supplier.uid,
                  titleAr: 'طلب جديد',
                  titleEn: 'New Request',
                  bodyAr: `هناك طلب جديد لـ "${trimmedQuery}" قد يهمك.`,
                  bodyEn: `There is a new request for "${trimmedQuery}" that might interest you.`,
                  link: 'dashboard',
                  actionType: 'submit_offer',
                  targetId: requestRef.id,
                  read: false,
                  createdAt: new Date().toISOString()
                });
              });
              await batch.commit();
              console.log('Notifications created for', categorySuppliers.length, 'suppliers.');

              // Smart Matchmaking
              setIsMatching(true);
              try {
                // --- FAST TIER ---
                // Pre-filter by location or rating if possible for instant feedback
                const fastMatches = categorySuppliers
                  .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                  .slice(0, 3);
                setMatchedSuppliers(fastMatches);

                // --- SMART TIER ---
                // Run AI matching in the background
                const { uids: matchedIds, reasoning } = await matchSuppliers(trimmedQuery, categorySuppliers, categories, profile?.location);
                let matched = categorySuppliers.filter(s => matchedIds.includes(s.uid));
                
                // If AI returned empty but we have category suppliers, show them as "Relevant" instead of "Suggested"
                if (matched.length === 0 && categorySuppliers.length > 0) {
                  matched = categorySuppliers.slice(0, 3);
                }
                
                // Update with smarter matches
                setMatchedSuppliers(matched);
                
                // Update the request document with matched suppliers and reasoning for dashboard display
                await updateDoc(doc(db, 'requests', requestRef.id), {
                  suggestedSupplierIds: matched.map(s => s.uid),
                  aiReasoning: reasoning // Store the reasoning
                });
              } catch (err) {
                console.error('Matchmaking error:', err);
                // Keep the fast matches if smart tier fails
              } finally {
                setIsMatching(false);
              }
            } else {
              setMatchedSuppliers([]);
              console.log('No suppliers found even after broad search.');
            }

          } catch (notifErr) {
            console.error('Error sending notifications or matching:', notifErr);
            setIsMatching(false);
          }

          soundService.play(SoundType.NOTIFICATION);
          setSuccess(true);
          setAiStatus(i18n.language === 'ar' ? 'تم إرسال طلبك بنجاح!' : 'Request sent successfully!');
          setSearchQuery('');
          setDraftDescription('');
          setShowDraftArea(false);
          setImagePreview(null);
          setSelectedImage(null);
          setProductCopy(null);
          setImageEnhancements(null);
          setTimeout(() => {
            setSuccess(false);
            setAiStatus('');
          }, 5000);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'requests', false);
          setAiStatus(i18n.language === 'ar' ? 'حدث خطأ أثناء حفظ الطلب. يرجى المحاولة مرة أخرى.' : 'Error saving request. Please try again.');
          setTimeout(() => setAiStatus(''), 5000);
        }
      } else {
        setAiStatus(i18n.language === 'ar' 
          ? 'لم نتمكن من تحديد القسم المناسب تلقائياً. يرجى محاولة توضيح الطلب أكثر.' 
          : 'We could not automatically determine the appropriate category. Please try to clarify your request.');
        setTimeout(() => setAiStatus(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setAiStatus(i18n.language === 'ar' ? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' : 'An unexpected error occurred. Please try again.');
      setTimeout(() => setAiStatus(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-background relative overflow-hidden" style={{ 
      '--primary-text': primaryTextColor,
      '--secondary-text': secondaryTextColor
    } as React.CSSProperties}>
      {/* Minimal UI Mode */}
      {uiStyle === 'minimal' && effectiveRole !== 'admin' ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 max-w-4xl mx-auto px-4 min-h-[calc(100dvh-200px)] md:min-h-[calc(100vh-80px)] flex flex-col items-center justify-center py-12"
        >
          {/* Background Gradients (Google-like) */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-teal/5 rounded-full blur-[120px]" />
          </div>

          {/* Logo - Neural Spark Concept (No Box) */}
          {showNeuralLogo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="mb-20 relative group cursor-pointer flex flex-col items-center"
              onClick={() => setIsVisualSearchOpen(true)}
            >
              {/* Spinning Neural Glow (Visible on Hover) */}
              <motion.div 
                animate={logoAuraStyle === 'pulse' ? {
                  scale: [1, logoAuraSpread, 1],
                  opacity: [logoAuraOpacity * 0.5, logoAuraOpacity, logoAuraOpacity * 0.5],
                } : logoAuraStyle === 'mesh' ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, 90, 180, 270, 360],
                  borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 60% 40% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
                } : { 
                  scale: [1, 1.05, 1],
                  opacity: [logoAuraOpacity * 0.8, logoAuraOpacity, logoAuraOpacity * 0.8],
                }}
                transition={{ 
                  duration: logoAuraStyle === 'pulse' ? 3 : 8, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-48 md:h-48 opacity-0 group-hover:opacity-40 rounded-full pointer-events-none" 
                style={{ 
                  backgroundColor: logoAuraStyle === 'solid' ? logoAuraColor : 'transparent',
                  backgroundImage: logoAuraStyle === 'gradient' ? `radial-gradient(circle, ${logoAuraColor} 0%, transparent 70%)` : 
                                   logoAuraStyle === 'mesh' ? `conic-gradient(from 0deg, ${logoAuraColor}, ${logoAuraColor}88, ${logoAuraColor}44, ${logoAuraColor}88, ${logoAuraColor})` : 'none',
                  filter: `blur(${logoAuraBlur}px) contrast(${100 + (logoAuraSharpness - 50) * 2}%)`,
                  opacity: logoAuraOpacity,
                  transform: `scale(${logoAuraSpread})`,
                  boxShadow: logoAuraColor.toLowerCase() === '#ffffff' ? '0 0 30px 5px rgba(0,0,0,0.05)' : 'none'
                }}
              />
              
              {/* Logo Image/Text */}
              <div 
                className="relative z-10 transition-transform duration-300 group-hover:scale-105"
                style={{ transform: `scale(${logoScale})` }}
              >
                {/* Shimmer Sweep Effect over the logo itself */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 dark:via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite] skew-x-12 z-20 mix-blend-overlay pointer-events-none" />

                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex items-center gap-3 text-brand-primary drop-shadow-2xl">
                    <SparklesIcon size={48} strokeWidth={1.5} />
                    <span className="text-3xl font-black tracking-tighter">{siteName || 'B2B2C'}</span>
                  </div>
                )}
              </div>
              
              {/* Electric AI Indicator (Floating below) */}
              <div 
                className="absolute -bottom-8 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0"
                style={{ 
                  color: logoAuraColor,
                  filter: logoAuraColor.toLowerCase() === '#ffffff' ? 'drop-shadow(0 0 2px rgba(0,0,0,0.2))' : 'none'
                }}
              >
                <Zap size={14} className="animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest drop-shadow-md">
                  {isRtl ? 'تحليل ذكي' : 'Neural AI'}
                </span>
              </div>
            </motion.div>
          )}

          {/* Search Bar (Minimal) */}
          <div className="w-full relative group mb-12">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary/10 to-brand-teal/10 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-white dark:bg-gray-900 rounded-full p-1 border border-brand-border shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center px-6 py-2 md:py-3">
                <Search className={`w-5 h-5 text-brand-text-muted ${isRtl ? 'ml-4' : 'mr-4'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRequest(e as any)}
                  placeholder={isRtl ? 'ابحث عن منتجات أو موردين...' : 'Search for products or suppliers...'}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium text-brand-text-main placeholder:text-brand-text-muted/50"
                  dir={isRtl ? 'rtl' : 'ltr'}
                />
                <div className="flex items-center gap-2">
                  <HapticButton onClick={handleVoiceInput} className="p-3 text-brand-text-muted hover:text-brand-primary transition-colors">
                    <Mic size={24} />
                  </HapticButton>
                  <HapticButton onClick={() => setIsVisualSearchOpen(true)} className="p-3 text-brand-text-muted hover:text-brand-teal transition-colors">
                    <Camera size={24} />
                  </HapticButton>
                </div>
              </div>
            </div>
          </div>
          
          {/* Smart Suggestion */}
          {nextAction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <HapticButton
                onClick={() => {
                  if (nextAction.action === 'upload_product') onNavigate('dashboard');
                  if (nextAction.action === 'search_market') onNavigate('marketplace');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-full text-sm font-medium hover:bg-brand-primary/20 transition-colors"
              >
                {nextAction.icon === 'Package' && <Package size={16} />}
                {nextAction.icon === 'ShoppingBag' && <ShoppingBag size={16} />}
                {t(nextAction.label)}
              </HapticButton>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-200px)] md:min-h-[calc(100vh-80px)] py-12 md:py-24 relative overflow-hidden">
          {/* Dynamic Background Effects */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                x: [0, 100, 0],
                y: [0, 50, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-brand-primary/10 rounded-full blur-[120px] opacity-60 dark:opacity-30" 
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                rotate: [0, -90, 0],
                x: [0, -100, 0],
                y: [0, -50, 0]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-brand-teal/10 rounded-full blur-[120px] opacity-60 dark:opacity-30" 
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,var(--brand-background)_100%)] opacity-80" />
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20"
            ref={requestsRef}
          >
            {/* Hero Section */}
            <div className="text-center mb-16 md:mb-24 relative">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              >
                {/* Neural Brand Crown */}
                {showNeuralLogo && (
              <div className="flex justify-center mb-12 relative group">
                {/* Dynamic Aura Effect */}
                <motion.div 
                  animate={logoAuraStyle === 'pulse' ? {
                    scale: [1, 1.02, 1],
                    opacity: [logoAuraOpacity * 0.6, logoAuraOpacity * 0.8, logoAuraOpacity * 0.6],
                  } : logoAuraStyle === 'mesh' ? {
                    scale: [1, 1.05, 1],
                    rotate: [0, 45, 90, 45, 0],
                    borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "50% 50% 50% 50% / 50% 50% 50% 50%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
                  } : { 
                    scale: [1, 1.02, 1],
                    opacity: [logoAuraOpacity * 0.7, logoAuraOpacity * 0.9, logoAuraOpacity * 0.7],
                  }}
                  transition={{ 
                    duration: logoAuraStyle === 'pulse' ? 5 : 12, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 rounded-full pointer-events-none z-0"
                  style={{ 
                    backgroundColor: logoAuraStyle === 'solid' ? logoAuraColor : 'transparent',
                    backgroundImage: logoAuraStyle === 'gradient' ? `radial-gradient(circle, ${logoAuraColor} 0%, transparent 70%)` : 
                                     logoAuraStyle === 'mesh' ? `conic-gradient(from 0deg, ${logoAuraColor}, ${logoAuraColor}88, ${logoAuraColor}44, ${logoAuraColor}88, ${logoAuraColor})` : 'none',
                    filter: `blur(${logoAuraBlur}px) contrast(${100 + (logoAuraSharpness - 50) * 2}%)`,
                    opacity: logoAuraOpacity,
                    transform: `scale(${logoAuraSpread})`,
                    boxShadow: logoAuraColor.toLowerCase() === '#ffffff' ? '0 0 40px 10px rgba(0,0,0,0.05)' : 'none'
                  }}
                />
                
                {/* Logo Container with Scale */}
                <div 
                  className="relative z-10 transition-all duration-700 ease-[0.23,1,0.32,1] group-hover:scale-110"
                  style={{ 
                    transform: `scale(${logoScale})`,
                    filter: 'drop-shadow(0 20px 50px rgba(0,0,0,0.2)) drop-shadow(0 10px 15px rgba(0,0,0,0.1))'
                  }}
                >
                  {logoUrl ? (
                    <div className="relative group/logo">
                      {/* High-End Glass Reflection Overlay */}
                      <div className="absolute inset-0 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-1000 z-20 pointer-events-none overflow-hidden rounded-xl">
                        <motion.div 
                          animate={{ 
                            left: ['-100%', '200%'],
                            top: ['-100%', '200%']
                          }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                          className="absolute w-full h-[200%] bg-gradient-to-br from-transparent via-white/40 to-transparent -rotate-45"
                        />
                      </div>

                      <img 
                        src={logoUrl} 
                        alt={siteName || "Logo"} 
                        className="h-24 md:h-32 w-auto object-contain relative z-10"
                        style={{ 
                          imageRendering: 'auto' as any,
                          WebkitPrintColorAdjust: 'exact'
                        } as any}
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Subtle Inner Glow for HD look */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500 z-15" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-brand-primary drop-shadow-2xl">
                      <SparklesIcon size={72} strokeWidth={1} className="animate-pulse" />
                      <span className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-brand-primary to-brand-teal">
                        {siteName || 'DEIF'}
                      </span>
                    </div>
                  )}
                  
                  {/* Advanced AI Pulse Ring */}
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0, 0.3, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -inset-8 rounded-full border-2 border-brand-primary/30 pointer-events-none"
                    style={{ 
                      borderColor: `${logoAuraColor}44`,
                    }}
                  />
                </div>
              </div>
            )}
            
            <h1 className="text-4xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tight leading-[1.1] md:leading-[1.05]" style={{ color: 'var(--primary-text)' }}>
              {isRtl ? (
                <>
                  {heroTitleAr || 'اطلب أي منتج'} <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-teal to-brand-primary bg-[length:200%_auto] animate-gradient-x">
                    {heroTitleAr ? '' : 'بذكاء وسهولة'}
                  </span>
                </>
              ) : (
                <>
                  {heroTitleEn || 'Request Any Product'} <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-teal to-brand-primary bg-[length:200%_auto] animate-gradient-x">
                    {heroTitleEn ? '' : 'Smart & Easy'}
                  </span>
                </>
              )}
            </h1>
            <p className="text-lg md:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed font-medium" style={{ color: 'var(--secondary-text)' }}>
              {isRtl 
                ? (heroDescriptionAr || 'المنصة الأولى التي تجمع بين قوة الذكاء الاصطناعي وشبكة واسعة من الموردين الموثوقين لتلبية جميع احتياجاتك بضغطة زر.') 
                : (heroDescriptionEn || 'The first platform combining AI power with a vast network of trusted suppliers to fulfill all your needs with a single click.')}
            </p>
          </motion.div>
        </div>

        {/* Search Bar Container */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="max-w-4xl mx-auto relative group mb-12 md:mb-20"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary/20 via-brand-teal/20 to-brand-primary/20 rounded-[3rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-2 md:p-3 border border-white/40 dark:border-gray-700/50 shadow-2xl shadow-brand-primary/10">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
                <div className="flex-1 relative w-full">
                  <div className={`absolute ${isRtl ? 'right-5 md:right-6' : 'left-5 md:left-6'} top-1/2 -translate-y-1/2 text-brand-text-muted`}>
                    <Search className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2} />
                  </div>
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRequest(e as any)}
                    placeholder={isRtl ? (searchPlaceholderAr || 'ماذا تريد أن تطلب اليوم؟') : (searchPlaceholderEn || 'What do you want to request today?')}
                    className={`w-full bg-transparent border-none focus:ring-0 text-base md:text-xl font-bold text-brand-text-main placeholder:text-brand-text-muted/60 py-3.5 md:py-6 ${isRtl ? 'pr-14 md:pr-20 pl-12 md:pl-20' : 'pl-14 md:pl-20 pr-12 md:pr-20'} rounded-full`}
                    dir={isRtl ? 'rtl' : 'ltr'}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className={`absolute ${isRtl ? 'left-5 md:left-6' : 'right-5 md:right-6'} top-1/2 -translate-y-1/2 p-1.5 md:p-2 hover:bg-brand-surface rounded-full transition-colors text-brand-text-muted`}
                    >
                      <X className="w-4.5 h-4.5 md:w-5 md:h-5" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto px-2 md:px-0">
                  {/* Actions Tray */}
                  <div className="flex flex-1 md:flex-none items-center gap-1.5 md:gap-2 bg-brand-surface/50 backdrop-blur-xl p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-brand-border/50">
                    <HapticButton
                      onClick={handleVoiceInput}
                      className="p-2.5 md:p-3 text-brand-text-muted hover:text-brand-teal hover:bg-brand-teal/10 rounded-lg md:rounded-xl transition-all"
                      title={isRtl ? 'بحث صوتي' : 'Voice Search'}
                    >
                      <Mic className="w-5 h-5 md:w-5.5 md:h-5.5" />
                    </HapticButton>
                    <div className="w-px h-5 md:h-6 bg-brand-border/50 mx-0.5 md:mx-1" />
                    <HapticButton
                      onClick={() => setIsVisualSearchOpen(true)}
                      className="p-2.5 md:p-3 text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg md:rounded-xl transition-all"
                      title={isRtl ? 'بحث بصري' : 'Visual Search'}
                    >
                      <Camera className="w-5 h-5 md:w-5.5 md:h-5.5" />
                    </HapticButton>
                    <div className="w-px h-5 md:h-6 bg-brand-border/50 mx-0.5 md:mx-1" />
                    <HapticButton
                      onClick={handleDraftRequest}
                      disabled={!searchQuery || isDrafting}
                      className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 text-brand-primary font-bold hover:bg-brand-primary/10 rounded-lg md:rounded-xl transition-all disabled:opacity-40"
                    >
                      {isDrafting ? <Loader2 className="w-4.5 h-4.5 md:w-5 md:h-5 animate-spin" /> : <SparklesIcon className="w-4.5 h-4.5 md:w-5 md:h-5" />}
                      <span className="text-xs md:text-sm">{isRtl ? 'تحسين' : 'Enhance'}</span>
                    </HapticButton>
                  </div>

                  <HapticButton
                    onClick={(e) => handleRequest(e as any)}
                    disabled={!searchQuery || loading}
                    className="flex-1 md:flex-none bg-gradient-to-r from-brand-primary to-brand-teal text-white px-5 md:px-10 py-3.5 md:py-5 rounded-xl md:rounded-[2rem] font-black text-base md:text-lg shadow-xl shadow-brand-primary/20 hover:shadow-2xl hover:shadow-brand-primary/30 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 md:gap-3 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <ArrowRight className={`w-5 h-5 md:w-6 md:h-6 ${isRtl ? 'rotate-180' : ''}`} />}
                    <span className="md:inline">{isRtl ? (ctaButtonAr || 'اطلب') : (ctaButtonEn || 'Request')}</span>
                  </HapticButton>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* 3. Conditional Content (Suggested Text & Image Preview) */}
        <AnimatePresence mode="wait">
          {(showDraftArea || imagePreview || voiceError || aiStatus || isMatching) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 space-y-4"
            >
              {voiceError && (
                <div className="p-4 bg-brand-error/10 text-brand-error rounded-2xl border border-brand-error/20 flex flex-col gap-2 text-sm font-bold">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={18} />
                    {voiceError}
                  </div>
                  <button 
                    onClick={() => document.getElementById('search-input')?.focus()}
                    className="text-xs underline hover:text-brand-error-dark"
                  >
                    {isRtl ? 'جرب الكتابة بدلاً من ذلك' : 'Try typing instead'}
                  </button>
                </div>
              )}

              {aiStatus && (
                <div className={`flex items-center gap-3 text-brand-teal font-bold text-xs uppercase tracking-widest bg-brand-teal/5 py-3 px-6 rounded-2xl border border-brand-teal/10 ${success ? '' : 'animate-pulse'}`}>
                  <Bot size={16} />
                  {aiStatus}
                </div>
              )}

              {isMatching && (
                <div className="p-8 bg-brand-surface rounded-[2rem] border border-brand-primary/20 shadow-xl text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-4 border-brand-primary/20 border-t-brand-primary rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-brand-primary">
                      <Search size={32} className="animate-bounce" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-brand-text dark:text-white mb-2">
                      {i18n.language === 'ar' ? 'جاري البحث عن أفضل الموردين...' : 'Finding Best Matches...'}
                    </h3>
                    <p className="text-sm text-brand-text-muted">
                      {i18n.language === 'ar' ? 'يقوم الذكاء الاصطناعي الآن بتحليل طلبك ومطابقته مع الموردين الأكثر كفاءة' : 'AI is analyzing your request and matching it with the most qualified suppliers'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {imagePreview && (
                  <div className="md:col-span-3 relative group">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full aspect-square object-cover rounded-[2rem] border-4 border-white shadow-xl" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem] flex flex-col items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleEnhanceImage}
                        disabled={isEnhancingImage}
                        className="bg-brand-teal text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-teal-dark transition-all flex items-center gap-2"
                      >
                        {isEnhancingImage ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <SparklesIcon size={12} />}
                        {isRtl ? 'تحسين الصورة' : 'Enhance Image'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-brand-error text-white p-2 rounded-full shadow-lg hover:bg-brand-error transition-all transform hover:scale-110"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                {imageEnhancements && (
                  <div className="md:col-span-12 p-6 bg-brand-surface rounded-[2rem] border border-brand-teal/20 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-black text-brand-teal flex items-center gap-2 uppercase tracking-widest">
                        <SparklesIcon size={16} />
                        {isRtl ? 'مقترحات تحسين الصورة' : 'Image Improvement Suggestions'}
                      </h4>
                      <button onClick={() => setImageEnhancements(null)} className="text-brand-text-muted hover:text-brand-error">
                        <X size={16} />
                      </button>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {imageEnhancements.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-brand-text-main flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-teal mt-1.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                    <div className="p-4 bg-brand-background rounded-xl border border-brand-border">
                      <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">
                        {isRtl ? 'تسمية توضيحية مقترحة' : 'Suggested Caption'}
                      </p>
                      <p className="text-xs text-brand-text-main italic">"{imageEnhancements.caption}"</p>
                    </div>
                  </div>
                )}

                {showDraftArea && (
                  <div className={`${imagePreview ? 'md:col-span-9' : 'md:col-span-12'} relative`}>
                    <div className="p-6 bg-brand-surface rounded-[2rem] border border-brand-border-light shadow-xl shadow-brand-border/50 relative group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-brand-teal/10 text-brand-teal rounded-lg">
                            <SparklesIcon size={14} />
                          </div>
                          <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                            {isRtl ? 'اقتراح الذكاء الاصطناعي' : 'AI Suggestion'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleGenerateCopy}
                            disabled={isGeneratingCopy}
                            className="px-3 py-2 -mx-3 -my-2 rounded-lg text-[10px] font-black text-brand-primary uppercase tracking-widest hover:bg-brand-primary/10 flex items-center gap-1 transition-colors"
                          >
                            {isGeneratingCopy ? <div className="w-3 h-3 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" /> : <Bot size={12} />}
                            {isRtl ? 'إنشاء محتوى تسويقي' : 'Generate Marketing Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDraftArea(false)}
                            className="p-2 -m-2 rounded-lg text-brand-text-muted hover:bg-brand-error/10 hover:text-brand-error transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {productCopy && (
                        <div className="mb-4 p-4 bg-brand-primary/5 rounded-xl border border-brand-primary/10">
                          <h5 className="text-sm font-black text-brand-primary mb-1">{productCopy.title}</h5>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {productCopy.highlights.map((h, i) => (
                              <span key={i} className="px-2 py-1 bg-white border border-brand-primary/20 text-[10px] font-bold text-brand-primary rounded-lg">
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <textarea
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-brand-text-muted text-lg leading-relaxed resize-none p-0 min-h-[120px]"
                        placeholder={isRtl ? 'أضف مزيداً من التفاصيل...' : 'Add more details...'}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* 4. Result Section (Last Request & Matched Suppliers) */}
        <AnimatePresence>
          {(lastRequest || matchedSuppliers.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-12 space-y-8"
            >
              {lastRequest && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-brand-text-main flex items-center gap-2">
                      <Package size={20} className="text-brand-primary" />
                      {isRtl ? 'طلبك الأخير' : 'Your Recent Request'}
                    </h3>
                    <HapticButton 
                      onClick={() => onNavigate('dashboard')}
                      className="text-xs font-bold text-brand-primary hover:underline"
                    >
                      {isRtl ? 'عرض الكل في لوحة التحكم' : 'View all in dashboard'}
                    </HapticButton>
                  </div>
                  <UserRequestCard 
                    request={lastRequest}
                    profile={profile!}
                    onOpenChat={onOpenChat || (() => {})}
                    onViewProfile={onViewProfile || (() => {})}
                    onDelete={async (id) => {
                      if (window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا الطلب؟' : 'Are you sure you want to delete this request?')) {
                        try {
                          await updateDoc(doc(db, 'requests', id), {
                            status: 'deleted',
                            deletedAt: new Date().toISOString()
                          });
                          setLastRequest(null);
                          setLastRequestId(null);
                        } catch (error) {
                          console.error("Error deleting request:", error);
                        }
                      }
                    }}
                  />
                </div>
              )}

              {matchedSuppliers.length > 0 && (
                <MatchedSuppliersSection 
                  matchedSuppliers={matchedSuppliers} 
                  isRtl={isRtl} 
                  onOpenChat={onOpenChat || (() => {})} 
                  onViewProfile={onViewProfile || (() => {})} 
                />
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {!profile && (
          <SupplierRegistrationCTA isRtl={isRtl} i18n={i18n} onNavigate={onNavigate} />
        )}

      </div>
    )}

    {isVisualSearchOpen && (
      <PremiumVisualSearchModal
        isOpen={isVisualSearchOpen}
        onClose={() => setIsVisualSearchOpen(false)}
        profile={profile}
        categories={categories}
        allSuppliers={[]}
        onStartChat={() => onNavigate('chat')}
      />
    )}
    {/* Floating Explore Button */}
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => onNavigate('marketplace')}
      className="fixed bottom-6 right-6 z-50 bg-brand-primary text-white p-4 rounded-full shadow-2xl flex items-center gap-2"
    >
      <SparklesIcon size={24} />
      <span className="font-bold">{isRtl ? 'اكتشف' : 'Explore'}</span>
    </motion.button>

      {/* Concierge Trigger */}
      <AnimatePresence>
        {showConciergeTrigger && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-brand-border"
          >
            <h3 className="text-lg font-black text-brand-text-main mb-2">
              {isRtl ? 'اجعلنا مساعدك الشخصي' : 'Make us your personal assistant'}
            </h3>
            <p className="text-sm text-brand-text-muted mb-6">
              {isRtl 
                ? 'بدلاً من تضييع وقتك في البحث، اسمح لنا بإرسال تنبيهات ذكية ومخصصة لك فقط عندما نجد المورد الذي يناسب احتياجاتك بدقة. لا رسائل مزعجة، فقط ما تحتاجه فعلياً.'
                : 'Instead of wasting your time searching, let us send you smart, personalized alerts only when we find the supplier that perfectly matches your needs. No spam, just what you actually need.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConciergeTrigger(false)}
                className="flex-1 py-3 rounded-xl font-bold text-brand-text-muted hover:bg-brand-background transition-colors"
              >
                {isRtl ? 'ليس الآن' : 'Not now'}
              </button>
              <button
                onClick={() => updateConciergeConsent().catch(err => console.error("Consent update error:", err))}
                className="flex-[2] py-3 rounded-xl font-bold bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors"
              >
                {isRtl ? 'تفعيل التنبيهات' : 'Enable alerts'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
</div>
);
};

export default Home;
