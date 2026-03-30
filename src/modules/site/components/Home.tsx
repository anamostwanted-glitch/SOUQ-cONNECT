import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistedState } from '../../../shared/hooks/usePersistedState';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, getDocs, doc, onSnapshot, query, where, orderBy, getDoc, setDoc, writeBatch, deleteDoc, updateDoc, arrayUnion, limit } from 'firebase/firestore';
import { db, storage, auth } from '../../../core/firebase';
import { UserProfile, Category, ProductRequest, Chat, AppFeatures } from '../../../core/types';
import { 
  categorizeProduct, 
  getAiAssistantResponse, 
  enhanceRequestDescription, 
  analyzeProductImage, 
  matchSuppliers,
  parseVoiceRequest,
  translateText,
  generateProductCopy,
  enhanceProductImageDescription
} from '../../../core/services/geminiService';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import UserProfileModal from '../../../shared/components/UserProfileModal';
import { soundService, SoundType } from '../../../core/utils/soundService';
import ChatCard from '../../common/components/ChatCard';
import { HapticButton } from '../../../shared/components/HapticButton';
import { AIInsights } from './AIInsights';
import { 
  MessageSquare, 
  Clock, 
  Bot, 
  X as CloseIcon, 
  Sparkles as SparklesIcon, 
  Image as ImageIcon, 
  Upload, 
  X, 
  Search, 
  Send, 
  Package, 
  Building2, 
  Plus,
  Star,
  Mic,
  MicOff,
  Camera,
  ChevronDown,
  ChevronUp,
  Trash2,
  MapPin,
  AlertCircle,
  Hammer,
  Zap,
  Droplets,
  Wrench,
  Briefcase,
  ShoppingBag,
  Sparkles,
  Loader2,
  ArrowRight,
  Activity,
  TrendingUp,
  ShieldCheck,
  Cpu,
  Layers,
  BarChart3,
  Settings2,
  BellRing,
  CheckCircle2,
  History,
  LayoutGrid,
  ListFilter,
  MoreHorizontal,
  ExternalLink,
  ArrowUpRight,
  Target,
  FileText,
  CreditCard,
  UserCheck,
  Globe,
  Monitor,
  LayoutDashboard,
  User
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

interface HomeProps {
  profile: UserProfile | null;
  features: AppFeatures;
  onNavigate: (view: any) => void;
  onOpenChat: (chatId: string) => void;
  onViewProfile?: (uid: string) => void;
  viewMode?: 'admin' | 'supplier' | 'customer';
  uiStyle?: 'classic' | 'minimal';
}

const Home: React.FC<HomeProps> = ({ 
  profile, 
  features, 
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
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [supplierChats, setSupplierChats] = useState<Chat[]>([]);
  const [customerChats, setCustomerChats] = useState<Chat[]>([]);
  const [showAllChats, setShowAllChats] = useState(false);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [visibleRequestsCount, setVisibleRequestsCount] = useState(10);
  const [requestToDelete, setRequestToDelete] = useState<{id: string, imageUrl?: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [translatedRequests, setTranslatedRequests] = useState<Record<string, string>>({});
  const [isTranslatingRequest, setIsTranslatingRequest] = useState<Record<string, boolean>>({});
  const [allSuppliers, setAllSuppliers] = useState<UserProfile[]>([]);
  const [isSuggestingMore, setIsSuggestingMore] = useState<Record<string, boolean>>({});
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [productCopy, setProductCopy] = useState<{ title: string; description: string; highlights: string[] } | null>(null);
  const [isEnhancingImage, setIsEnhancingImage] = useState(false);
  const [imageEnhancements, setImageEnhancements] = useState<{ suggestions: string[]; caption: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isLoading: boolean;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isLoading: false
  });
  const [showAiInsights, setShowAiInsights] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestsRef = useRef<HTMLDivElement>(null);

  const scrollToRequests = () => {
    requestsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'supplier'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const supps = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setAllSuppliers(supps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleSuggestMoreSuppliers = async (requestId: string, categoryId: string, currentSuggestedIds: string[]) => {
    if (isSuggestingMore[requestId]) return;
    setIsSuggestingMore(prev => ({ ...prev, [requestId]: true }));
    try {
      // Find suppliers in this category who are not already suggested
      const newSuppliers = allSuppliers.filter(s => 
        s.categories?.includes(categoryId) && !currentSuggestedIds.includes(s.uid)
      );

      if (newSuppliers.length > 0) {
        // Add up to 4 more
        const toAdd = newSuppliers.slice(0, 4).map(s => s.uid);
        const updatedIds = [...currentSuggestedIds, ...toAdd];
        await updateDoc(doc(db, 'requests', requestId), {
          suggestedSupplierIds: updatedIds
        });
        soundService.play(SoundType.SENT);
      } else {
        // Broad search if no category match
        const broadSuppliers = allSuppliers.filter(s => !currentSuggestedIds.includes(s.uid));
        if (broadSuppliers.length > 0) {
          const toAdd = broadSuppliers.slice(0, 4).map(s => s.uid);
          const updatedIds = [...currentSuggestedIds, ...toAdd];
          await updateDoc(doc(db, 'requests', requestId), {
            suggestedSupplierIds: updatedIds
          });
          soundService.play(SoundType.SENT);
        }
      }
    } catch (error) {
      console.error('Error suggesting more suppliers:', error);
    } finally {
      setIsSuggestingMore(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleClearAllRequests = async () => {
    if (!profile) return;
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      const batch = writeBatch(db);
      const userRequests = effectiveRole === 'admin' ? requests : requests.filter(r => r.customerId === profile.uid);
      userRequests.forEach(req => {
        batch.delete(doc(db, 'requests', req.id));
      });
      await batch.commit();
      setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {}, isLoading: false });
    } catch (error) {
      console.error('Error clearing requests:', error);
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleClearAllChats = async () => {
    if (!profile) return;
    setConfirmModal(prev => ({ ...prev, isLoading: true }));
    try {
      const batch = writeBatch(db);
      const userChats = (effectiveRole === 'supplier' || effectiveRole === 'admin') ? supplierChats : customerChats;
      userChats.forEach(chat => {
        batch.delete(doc(db, 'chats', chat.id));
      });
      await batch.commit();
      setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {}, isLoading: false });
    } catch (error) {
      console.error('Error clearing chats:', error);
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleTranslateRequest = async (requestId: string, text: string) => {
    if (translatedRequests[requestId]) {
      const newTranslated = { ...translatedRequests };
      delete newTranslated[requestId];
      setTranslatedRequests(newTranslated);
      return;
    }

    setIsTranslatingRequest(prev => ({ ...prev, [requestId]: true }));
    try {
      const targetLang = i18n.language === 'ar' ? 'Arabic' : 'English';
      const translation = await translateText(text, targetLang);
      setTranslatedRequests(prev => ({ ...prev, [requestId]: translation }));
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslatingRequest(prev => ({ ...prev, [requestId]: false }));
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleRequestsCount(prev => prev + 10);
      }
    }, { threshold: 0.1 });

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [sentinelRef]);

  // Image Upload State
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('Matched suppliers updated:', matchedSuppliers);
  }, [matchedSuppliers]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Back to Top State
  const [chatLoading, setChatLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      setRequests([]);
      return;
    }

    let q;
    if (effectiveRole === 'customer') {
      q = query(collection(db, 'requests'), where('customerId', '==', profile.uid));
    } else if (effectiveRole === 'supplier') {
      q = query(collection(db, 'requests'), where('status', '==', 'open'));
    } else {
      q = query(collection(db, 'requests'));
    }

    const unsub = onSnapshot(q, (snap) => {
      console.log('onSnapshot triggered. Documents count:', snap.size);
      let reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductRequest));
      console.log('Fetched requests:', reqs);
      
      // Filter by supplier categories if applicable
      if (effectiveRole === 'supplier') {
        const supplierCats = profile.categories || [];
        console.log('Supplier categories:', supplierCats);
        if (supplierCats.length > 0) {
          reqs = reqs.filter(r => supplierCats.includes(r.categoryId));
          console.log('Filtered requests for supplier:', reqs);
        } else {
          // If supplier has no categories registered, they shouldn't see any requests
          reqs = [];
          console.log('Supplier has no categories, requests set to empty');
        }

        // Sort by proximity if supplier has a location
        if (profile.location) {
          const supplierLoc = profile.location.toLowerCase().trim();
          reqs.sort((a, b) => {
            const locA = (a.location || '').toLowerCase().trim();
            const locB = (b.location || '').toLowerCase().trim();
            
            const aMatch = locA === supplierLoc || locA.includes(supplierLoc) || supplierLoc.includes(locA);
            const bMatch = locB === supplierLoc || locB.includes(supplierLoc) || supplierLoc.includes(locB);
            
            if (aMatch && !bMatch) return -1;
            if (bMatch && !aMatch) return 1;
            
            // If both match or both don't, sort by date
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
        } else {
          // Default sort by date
          reqs.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
        }
      } else {
        // Default sort by date for customers/admins
        reqs.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
      }
      
      setRequests(reqs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests');
    });

    return () => unsub();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    let unsubSupplierChats = () => {};
    if (effectiveRole === 'supplier' || effectiveRole === 'admin') {
      const qChats = effectiveRole === 'admin' 
        ? query(collection(db, 'chats'))
        : query(collection(db, 'chats'), where('supplierId', '==', profile.uid));
      unsubSupplierChats = onSnapshot(qChats, (snap) => {
        const allChatsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
        allChatsData.sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return timeB - timeA;
        });
        setSupplierChats(allChatsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chats');
      });
    }

    let unsubCustomerChats = () => {};
    if (profile.role === 'customer') {
      const qChats = query(collection(db, 'chats'), where('customerId', '==', profile.uid));
      unsubCustomerChats = onSnapshot(qChats, (snap) => {
        const allChatsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chat));
        allChatsData.sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return timeB - timeA;
        });
        setCustomerChats(allChatsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'chats');
      });
    }

    return () => {
      unsubSupplierChats();
      unsubCustomerChats();
    };
  }, [profile]);

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
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site');
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        const cats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(cats);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    };
    fetchCategories();
  }, []);

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('construction') || name.includes('بناء') || name.includes('مقاولات')) return Hammer;
    if (name.includes('electrical') || name.includes('كهرباء')) return Zap;
    if (name.includes('plumbing') || name.includes('سباكة')) return Droplets;
    if (name.includes('maintenance') || name.includes('صيانة')) return Wrench;
    return Package;
  };

  const handleVoiceInput = () => {
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

    recognition.onerror = (event: any) => {
      setVoiceError(i18n.language === 'ar' ? 'حدث خطأ أثناء التعرف على الصوت' : 'An error occurred during speech recognition');
      setTimeout(() => setVoiceError(null), 3000);
      setIsListening(false);
      setAiStatus('');
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
        console.error(error);
      } finally {
        setAiStatus('');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
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
  };

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
          const result = await analyzeProductImage(base64, selectedImage.type, i18n.language);
          if (result) {
            aiDescription = result.description;
            if (!searchQuery) {
              setSearchQuery(result.productName);
            }
          }
        }
      }
      
      setAiStatus(i18n.language === 'ar' ? 'جاري صياغة الطلب...' : 'Drafting request...');
      const { enhanceRequestDescription } = await import('../../../core/services/geminiService');
      const enhancedDescription = await enhanceRequestDescription(searchQuery + (aiDescription ? ` (Image context: ${aiDescription})` : ''), i18n.language);
      setDraftDescription(enhancedDescription);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDrafting(false);
      setAiStatus('');
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (trimmedQuery) {
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
            const result = await analyzeProductImage(base64, selectedImage.type, i18n.language);
            if (result) {
              aiDescription = result.description;
              if (!trimmedQuery) {
                setSearchQuery(result.productName);
                trimmedQuery = result.productName; // Update local variable so the rest of the function uses it
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
          const storageRef = ref(storage, `requests/${auth.currentUser?.uid || profile.uid}_${Date.now()}_${compressedFile.name}`);
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
        const manualMatch = currentCategories.find(c => 
          c.nameAr.includes(trimmedQuery) || 
          c.nameEn.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
          searchWords.some(w => c.nameAr.includes(w) || c.nameEn.toLowerCase().includes(w)) ||
          c.keywords?.some(kw => kw.toLowerCase().includes(trimmedQuery.toLowerCase()) || searchWords.some(w => kw.toLowerCase().includes(w)))
        );
        
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
            location: profile.location || ''
          });
          console.log('Request added successfully. ID:', requestRef.id);
          setLastRequestId(requestRef.id);

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
              matchSuppliers(trimmedQuery, categorySuppliers, categories, profile.location).then(matchedIds => {
                let matched = categorySuppliers.filter(s => matchedIds.includes(s.uid));
                
                // If AI returned empty but we have category suppliers, show them as "Relevant" instead of "Suggested"
                if (matched.length === 0 && categorySuppliers.length > 0) {
                  matched = categorySuppliers.slice(0, 3);
                }
                
                setMatchedSuppliers(matched);
                // Update the request document with matched suppliers for dashboard display
                updateDoc(doc(db, 'requests', requestRef.id), {
                  suggestedSupplierIds: matched.map(s => s.uid)
                }).catch(e => console.error('Error updating request with matched suppliers:', e));
                setIsMatching(false);
              }).catch(err => {
                console.error('Matchmaking error:', err);
                setMatchedSuppliers(categorySuppliers.slice(0, 3)); // Fallback to first 3
                setIsMatching(false);
              });
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
          console.error('Firestore error:', error);
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

  const handleStartChat = async (requestId: string, supplierId: string, customerId: string) => {
    if (!profile) return;
    setChatLoading(supplierId);
    
    // Query by requestId to find existing chat
    const q = query(
      collection(db, 'chats'), 
      where('requestId', '==', requestId)
    );
    
    try {
      const snap = await getDocs(q);
      // Filter in memory to ensure we have the right participants
      const existingChat = snap.docs.find(doc => {
        const data = doc.data();
        return data.supplierId === supplierId && data.customerId === customerId;
      });
      
      if (existingChat) {
        onOpenChat(existingChat.id);
      } else {
        const newChat = await addDoc(collection(db, 'chats'), {
          requestId,
          supplierId,
          customerId,
          updatedAt: new Date().toISOString(),
          lastMessage: i18n.language === 'ar' ? 'بدء المحادثة' : 'Chat started'
        });
        onOpenChat(newChat.id);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    } finally {
      setChatLoading(null);
    }
  };

  const handleApproveAndStartChat = async (requestId: string, supplierId: string, customerId: string) => {
    try {
      const requestRef = doc(db, 'requests', requestId);
      await updateDoc(requestRef, {
        approvedSuppliers: arrayUnion(supplierId)
      });
      await handleStartChat(requestId, supplierId, customerId);
    } catch (error) {
      console.error('Error approving supplier:', error);
    }
  };

  const handleDeleteRequest = (requestId: string, imageUrl?: string) => {
    setRequestToDelete({ id: requestId, imageUrl });
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    setIsDeleting(true);
    try {
      if (requestToDelete.imageUrl && !requestToDelete.imageUrl.startsWith('data:')) {
        try {
          const imageRef = ref(storage, requestToDelete.imageUrl);
          await deleteObject(imageRef);
        } catch (e) {
          console.error('Error deleting image:', e);
        }
      }
      
      await deleteDoc(doc(db, 'requests', requestToDelete.id));
      setRequestToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `requests/${requestToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-background relative overflow-hidden">
      {/* Minimal UI Mode */}
      {uiStyle === 'minimal' && effectiveRole !== 'admin' ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 max-w-4xl mx-auto px-4 pt-20 pb-32 flex flex-col items-center"
        >
          {/* Background Gradients (Google-like) */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-teal/5 rounded-full blur-[120px]" />
          </div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 md:h-24 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-3 text-brand-primary">
                <SparklesIcon size={48} strokeWidth={1.5} className="animate-pulse-slow" />
                <span className="text-3xl font-black tracking-tighter">B2B</span>
              </div>
            )}
          </motion.div>

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
                  <HapticButton onClick={handleVoiceInput} className="p-2 text-brand-text-muted hover:text-brand-primary transition-colors">
                    <Mic size={20} />
                  </HapticButton>
                  <HapticButton onClick={() => onNavigate('marketplace')} className="p-2 text-brand-text-muted hover:text-brand-teal transition-colors">
                    <Camera size={20} />
                  </HapticButton>
                </div>
              </div>
            </div>
          </div>

          {/* App Grid (Google Apps Style) */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-6 md:gap-10 w-full max-w-2xl">
            {[
              { id: 'marketplace', icon: ShoppingBag, label: isRtl ? 'السوق' : 'Market', color: 'bg-blue-500', action: () => onNavigate('marketplace') },
              { id: 'requests', icon: ListFilter, label: isRtl ? 'طلباتي' : 'Requests', color: 'bg-green-500', action: () => { scrollToRequests(); } },
              { id: 'chats', icon: MessageSquare, label: isRtl ? 'المحادثات' : 'Chats', color: 'bg-yellow-500', action: () => onNavigate('chat') },
              { id: 'dashboard', icon: LayoutDashboard, label: isRtl ? 'التحليلات' : 'Analytics', color: 'bg-red-500', action: () => onNavigate('dashboard') },
              { id: 'suppliers', icon: Building2, label: isRtl ? 'الموردين' : 'Suppliers', color: 'bg-purple-500', action: () => onNavigate('marketplace') },
              { id: 'wallet', icon: CreditCard, label: isRtl ? 'المدفوعات' : 'Payments', color: 'bg-teal-500', action: () => onNavigate('dashboard') },
              { id: 'profile', icon: User, label: isRtl ? 'الملف' : 'Profile', color: 'bg-orange-500', action: () => onNavigate('profile') },
              { id: 'insights', icon: Sparkles, label: isRtl ? 'رؤى الذكاء' : 'AI Insights', color: 'bg-indigo-500', action: () => { setShowAiInsights(!showAiInsights); } },
            ].map((app) => (
              <motion.button
                key={app.id}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={app.action}
                className="flex flex-col items-center gap-3 group"
              >
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${app.color} text-white flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                  <app.icon size={28} />
                </div>
                <span className="text-xs md:text-sm font-bold text-brand-text-main group-hover:text-brand-primary transition-colors">
                  {app.label}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Recent Activity Section (Simplified) */}
          <div className="w-full mt-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-brand-text-main flex items-center gap-2">
                <Activity size={20} className="text-brand-teal" />
                {isRtl ? 'النشاط الأخير' : 'Recent Activity'}
              </h2>
              <button 
                onClick={() => { scrollToRequests(); }} 
                className="text-sm font-bold text-brand-primary hover:underline"
              >
                {isRtl ? 'عرض الكل' : 'View All'}
              </button>
            </div>

            <div className="space-y-4">
              {requests.slice(0, 3).map((req) => (
                <div key={req.id} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-brand-border flex items-center gap-4 hover:border-brand-primary/30 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-brand-surface overflow-hidden border border-brand-border shrink-0">
                    {req.imageUrl ? (
                      <img src={req.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-text-muted">
                        <Package size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-brand-text-main truncate">{req.description}</h3>
                    <p className="text-xs text-brand-text-muted mt-0.5">{new Date(req.createdAt).toLocaleDateString(i18n.language)}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    req.status === 'open' ? 'bg-green-100 text-green-600' : 'bg-brand-surface text-brand-text-muted'
                  }`}>
                    {req.status}
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <div className="text-center py-10 text-brand-text-muted font-medium italic">
                  {isRtl ? 'لا يوجد نشاط مؤخراً' : 'No recent activity'}
                </div>
              )}
            </div>
          </div>

          {/* AI Insights Floating (Minimal) */}
          <AnimatePresence>
            {showAiInsights && (
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="fixed right-6 top-24 bottom-24 w-80 z-50"
              >
                <AIInsights 
                  role={effectiveRole}
                  stats={{
                    matchRate: 94,
                    avgResponseTime: '12m',
                    marketActivity: 82,
                    requestQuality: 88
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-start min-h-[calc(100vh-80px)] px-4 py-12 md:py-24 relative overflow-hidden">
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
            {/* Logo Display */}
            <div className="flex justify-center mb-10">
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-tr from-brand-primary/20 via-brand-teal/20 to-brand-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative p-4 md:p-6 bg-white/40 dark:bg-gray-900/40 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] border border-white/40 dark:border-gray-700/50 shadow-2xl shadow-brand-primary/5 group-hover:shadow-brand-primary/10 transition-all duration-500">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-12 md:h-20 w-auto object-contain" />
                  ) : (
                    <div className="h-12 w-12 md:h-20 md:w-20 flex items-center justify-center text-brand-primary">
                      <SparklesIcon size={32} strokeWidth={1.5} className="md:hidden animate-pulse-slow" />
                      <SparklesIcon size={48} strokeWidth={1.5} className="hidden md:block animate-pulse-slow" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <h1 className="text-4xl md:text-7xl lg:text-8xl font-black mb-8 text-brand-text-main tracking-tight leading-[1.1] md:leading-[1.05]">
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
            <p className="text-lg md:text-2xl text-brand-text-muted max-w-3xl mx-auto mb-12 leading-relaxed font-medium px-4 md:px-0">
              {isRtl 
                ? (heroDescriptionAr || 'المنصة الأولى التي تجمع بين قوة الذكاء الاصطناعي وشبكة واسعة من الموردين الموثوقين لتلبية جميع احتياجاتك بضغطة زر.') 
                : (heroDescriptionEn || 'The first platform combining AI power with a vast network of trusted suppliers to fulfill all your needs with a single click.')}
            </p>
          </motion.div>

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
        </div>

        {/* Contextual Shortcuts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-5xl mx-auto mb-16 md:mb-24"
        >
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {[
              { icon: FileText, labelAr: 'طلباتي', labelEn: 'My Requests', color: 'brand-primary', action: () => onNavigate('dashboard') },
              { icon: MessageSquare, labelAr: 'المحادثات', labelEn: 'Chats', color: 'brand-teal', action: () => onNavigate('dashboard') },
              { icon: CreditCard, labelAr: 'المدفوعات', labelEn: 'Payments', color: 'brand-purple', action: () => {} },
              { icon: UserCheck, labelAr: 'الموردين', labelEn: 'Suppliers', color: 'brand-accent', action: () => {} },
              { icon: Globe, labelAr: 'السوق', labelEn: 'Market', color: 'brand-primary', action: () => {} },
              { icon: Monitor, labelAr: 'الإحصائيات', labelEn: 'Analytics', color: 'brand-teal', action: () => {} },
            ].map((shortcut, idx) => (
              <HapticButton
                key={idx}
                onClick={shortcut.action}
                className={`flex items-center gap-2.5 px-5 py-3.5 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-brand-border/50 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-${shortcut.color}/10 hover:border-${shortcut.color}/30 transition-all group`}
              >
                <div className={`p-2 bg-${shortcut.color}/10 text-${shortcut.color} rounded-xl group-hover:scale-110 transition-transform`}>
                  <shortcut.icon size={18} />
                </div>
                <span className="text-sm font-black text-brand-text-main">{isRtl ? shortcut.labelAr : shortcut.labelEn}</span>
              </HapticButton>
            ))}
          </div>
        </motion.div>

        {/* AI Insights Module */}
        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-6xl mx-auto mb-20 md:mb-32"
          >
            <AIInsights role={effectiveRole as any} />
          </motion.div>
        )}

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
                <div className="p-4 bg-brand-error/10 text-brand-error rounded-2xl border border-brand-error/20 flex items-center gap-3 text-sm font-bold">
                  <AlertCircle size={18} />
                  {voiceError}
                </div>
              )}

              {aiStatus && (
                <div className="flex items-center gap-3 text-brand-teal font-bold text-xs uppercase tracking-widest bg-brand-teal/5 py-3 px-6 rounded-2xl border border-brand-teal/10 animate-pulse">
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

        {/* Active Conversations Section */}
        {profile && (
          <div className="mt-12 w-full text-left">
            {(effectiveRole === 'supplier' || effectiveRole === 'admin') && supplierChats.length > 0 && (
              <div className="space-y-6 mb-12">
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-black text-brand-text-main flex items-center gap-4 tracking-tight">
                    <div className="p-3.5 bg-gradient-to-br from-brand-teal to-brand-primary rounded-2xl text-white shadow-lg shadow-brand-teal/20">
                      <MessageSquare size={24} />
                    </div>
                    {i18n.language === 'ar' ? 'المحادثات النشطة' : 'Active Conversations'}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-1.5 bg-brand-teal/10 text-brand-teal text-sm font-bold rounded-full border border-brand-teal/20">
                      {supplierChats.length} {i18n.language === 'ar' ? 'محادثة' : 'Chats'}
                    </span>
                    <button
                      onClick={() => setConfirmModal({
                        show: true,
                        title: i18n.language === 'ar' ? 'مسح كل المحادثات' : 'Clear All Chats',
                        message: i18n.language === 'ar' 
                          ? (effectiveRole === 'admin' ? 'هل أنت متأكد من مسح جميع المحادثات في النظام؟ لا يمكن التراجع عن هذا الإجراء.' : 'هل أنت متأكد من مسح جميع المحادثات؟ لا يمكن التراجع عن هذا الإجراء.')
                          : (effectiveRole === 'admin' ? 'Are you sure you want to clear ALL chats in the system? This action cannot be undone.' : 'Are you sure you want to clear all chats? This action cannot be undone.'),
                        onConfirm: handleClearAllChats,
                        isLoading: false
                      })}
                      className="p-3 text-brand-error hover:bg-brand-error/10 rounded-lg transition-colors"
                      title={i18n.language === 'ar' ? 'مسح الكل' : 'Clear All'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="bento-grid">
                  <AnimatePresence mode="popLayout">
                    {supplierChats
                      .filter(c => !c.isCategoryChat)
                      .slice(0, showAllChats ? undefined : 4)
                      .map((chat, idx) => (
                        <motion.div
                          key={chat.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: idx * 0.1 }}
                          layout
                          className={idx === 0 ? 'bento-item-large' : 'bento-item'}
                        >
                          <ChatCard 
                            chat={chat} 
                            onOpen={() => onOpenChat(chat.id)} 
                            activeRole="supplier"
                          />
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>
                {supplierChats.filter(c => !c.isCategoryChat).length > 4 && (
                  <button
                    onClick={() => setShowAllChats(!showAllChats)}
                    className="mt-4 flex items-center gap-2 text-brand-teal font-bold hover:text-brand-teal-dark transition-colors mx-auto bg-brand-teal/5 px-6 py-2 rounded-full shadow-sm"
                  >
                    {showAllChats 
                      ? (i18n.language === 'ar' ? 'عرض أقل' : 'Show Less') 
                      : (i18n.language === 'ar' ? `عرض المزيد (${supplierChats.length - 3}+)` : `Show More (${supplierChats.length - 3}+)`)}
                    {showAllChats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                )}
              </div>
            )}

            {effectiveRole === 'customer' && customerChats.length > 0 && (
              <div className="space-y-6 mb-12">
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-black text-brand-text-main flex items-center gap-4 tracking-tight">
                    <div className="p-3.5 bg-gradient-to-br from-brand-teal to-brand-primary rounded-2xl text-white shadow-lg shadow-brand-teal/20">
                      <MessageSquare size={24} />
                    </div>
                    {i18n.language === 'ar' ? 'المحادثات النشطة' : 'Active Conversations'}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-1.5 bg-brand-teal/10 text-brand-teal text-sm font-bold rounded-full border border-brand-teal/20">
                      {customerChats.length} {i18n.language === 'ar' ? 'محادثة' : 'Chats'}
                    </span>
                    <button
                      onClick={() => setConfirmModal({
                        show: true,
                        title: i18n.language === 'ar' ? 'مسح كل المحادثات' : 'Clear All Chats',
                        message: i18n.language === 'ar' ? 'هل أنت متأكد من مسح جميع المحادثات؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to clear all chats? This action cannot be undone.',
                        onConfirm: handleClearAllChats,
                        isLoading: false
                      })}
                      className="p-3 text-brand-error hover:bg-brand-error/10 rounded-lg transition-colors"
                      title={i18n.language === 'ar' ? 'مسح الكل' : 'Clear All'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="bento-grid">
                  <AnimatePresence mode="popLayout">
                    {customerChats
                      .filter(c => !c.isCategoryChat)
                      .slice(0, showAllChats ? undefined : 4)
                      .map((chat, idx) => (
                        <motion.div
                          key={chat.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: idx * 0.1 }}
                          layout
                          className={idx === 0 ? 'bento-item-large' : 'bento-item'}
                        >
                          <ChatCard 
                            chat={chat} 
                            onOpen={() => onOpenChat(chat.id)} 
                            activeRole="customer"
                          />
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>
                {customerChats.filter(c => !c.isCategoryChat).length > 4 && (
                  <button
                    onClick={() => setShowAllChats(!showAllChats)}
                    className="mt-4 flex items-center gap-2 text-brand-teal font-bold hover:text-brand-teal-dark transition-colors mx-auto bg-brand-teal/5 px-6 py-2 rounded-full shadow-sm"
                  >
                    {showAllChats 
                      ? (i18n.language === 'ar' ? 'عرض أقل' : 'Show Less') 
                      : (i18n.language === 'ar' ? `عرض المزيد (${customerChats.length - 3}+)` : `Show More (${customerChats.length - 3}+)`)}
                    {showAllChats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Available Requests / My Requests Section */}
        {profile && requests.length > 0 && (
          <div className="mt-24 w-full text-left">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <h3 className="text-3xl md:text-4xl font-black text-brand-text-main flex items-center gap-4 tracking-tight mb-3">
                  <div className="p-4 bg-gradient-to-br from-brand-teal to-brand-primary rounded-2xl text-white shadow-xl shadow-brand-teal/20">
                    <Package size={28} strokeWidth={2} />
                  </div>
                  {effectiveRole === 'supplier' 
                    ? (i18n.language === 'ar' ? 'الطلبات المتاحة' : 'Available Requests')
                    : (i18n.language === 'ar' ? 'طلباتي' : 'My Requests')}
                </h3>
                <p className="text-brand-text-muted text-lg font-medium max-w-2xl">
                  {effectiveRole === 'supplier' 
                    ? (i18n.language === 'ar' ? 'تصفح أحدث طلبات العملاء وقدم عروضك المميزة.' : 'Browse the latest customer requests and submit your premium offers.')
                    : (i18n.language === 'ar' ? 'تابع حالة طلباتك وتواصل مع الموردين.' : 'Track your requests and communicate with suppliers.')}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-brand-text-muted font-medium bg-brand-surface/50 backdrop-blur-md px-6 py-3 rounded-2xl border border-brand-border/50 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-teal"></span>
                  </div>
                  <span className="text-brand-text-main font-bold text-base">{requests.length}</span>
                  {i18n.language === 'ar' ? 'طلب متاح' : 'Requests'}
                </div>
              </div>
            </div>

            <div className="bento-grid">
              <AnimatePresence mode="popLayout">
                {requests.slice(0, showAllRequests ? undefined : 4).map((req, idx) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.1 }}
                    layout
                    className={idx === 0 ? 'bento-item-wide' : 'bento-item'}
                  >
                    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl p-6 md:p-10 rounded-[3rem] border border-white/40 dark:border-gray-700/50 shadow-2xl shadow-brand-primary/5 transition-all duration-500 group hover:shadow-brand-primary/15 hover:-translate-y-2 relative overflow-hidden h-full">
                      {/* Decorative Background Elements */}
                      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-teal/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                      
                      <div className="flex flex-col md:flex-row gap-8 md:gap-12 relative z-10">
                        {/* Request Image */}
                        <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] overflow-hidden bg-brand-background/50 shrink-0 border border-brand-border/50 group-hover:border-brand-teal/30 transition-all duration-700 shadow-inner group-hover:shadow-2xl group-hover:shadow-brand-teal/10">
                          {req.imageUrl ? (
                            <img 
                              src={req.imageUrl} 
                              alt={req.productName} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            (() => {
                              const Icon = getCategoryIcon(i18n.language === 'ar' ? req.categoryNameAr || '' : req.categoryNameEn || '');
                              return (
                                <div className="w-full h-full flex items-center justify-center text-brand-teal bg-brand-teal/5 group-hover:bg-brand-teal/10 transition-colors duration-700">
                                  <Icon size={64} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-700" />
                                </div>
                              );
                            })()
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        </div>

                        {/* Request Details */}
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex justify-between items-start mb-6 gap-6">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3 mb-4">
                                <span className="px-4 py-1.5 bg-brand-teal/10 text-brand-teal rounded-full text-sm font-black border border-brand-teal/20 tracking-wide uppercase">
                                  {i18n.language === 'ar' ? req.categoryNameAr : req.categoryNameEn || (i18n.language === 'ar' ? 'عام' : 'General')}
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-bold text-brand-text-muted">
                                  <Clock size={14} />
                                  {new Date(req.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <h4 className="text-3xl md:text-4xl font-black text-brand-text-main mb-4 truncate group-hover:text-brand-primary transition-colors duration-500 tracking-tight">
                                {req.productName}
                              </h4>
                              <div className="flex flex-wrap gap-4 text-sm font-bold text-brand-text-muted">
                                <span className="flex items-center gap-2 px-4 py-2 bg-brand-surface/80 backdrop-blur-md rounded-2xl border border-brand-border/50 group-hover:border-brand-primary/20 transition-colors">
                                  <MapPin size={18} className="text-brand-primary" />
                                  <span className="truncate max-w-[150px] md:max-w-none">{req.location || (i18n.language === 'ar' ? 'موقع غير محدد' : 'Location N/A')}</span>
                                </span>
                                {req.quantity && (
                                  <span className="flex items-center gap-2 px-4 py-2 bg-brand-surface/80 backdrop-blur-md text-brand-primary rounded-2xl border border-brand-border/50 font-black">
                                    <Package size={18} />
                                    {req.quantity}
                                  </span>
                                )}
                              </div>
                            </div>
                            {(profile?.uid === req.customerId || profile?.role === 'admin') && (
                              <HapticButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRequest(req.id, req.imageUrl);
                                }}
                                className="p-4 text-brand-text-muted hover:text-brand-error hover:bg-brand-error/10 rounded-[1.5rem] transition-all shrink-0 border border-transparent hover:border-brand-error/20"
                                title={i18n.language === 'ar' ? 'حذف الطلب' : 'Delete Request'}
                              >
                                <Trash2 size={28} strokeWidth={1.5} />
                              </HapticButton>
                            )}
                          </div>

                          {/* Suggested Suppliers Section */}
                          {profile?.role === 'customer' && (
                            <div className="mt-10 p-8 bg-brand-surface/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 dark:border-gray-700/30 shadow-inner relative overflow-hidden group/suppliers">
                              <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-0 group-hover/suppliers:opacity-100 transition-opacity duration-700" />
                              
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10">
                                <h5 className="text-lg font-black text-brand-text-main flex items-center gap-3">
                                  <div className="p-2.5 bg-brand-primary/10 rounded-2xl text-brand-primary shadow-sm">
                                    <SparklesIcon size={20} />
                                  </div>
                                  {i18n.language === 'ar' ? 'موردون مقترحون بالذكاء الاصطناعي' : 'AI Suggested Suppliers'}
                                </h5>
                                <HapticButton
                                  onClick={() => handleSuggestMoreSuppliers(req.id, req.categoryId, req.suggestedSupplierIds || [])}
                                  disabled={isSuggestingMore[req.id]}
                                  className="text-sm font-black text-brand-primary hover:text-white hover:bg-brand-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 px-6 py-3 rounded-2xl border border-brand-primary/20 hover:border-brand-primary shadow-sm hover:shadow-brand-primary/20"
                                >
                                  {isSuggestingMore[req.id] ? (
                                    <Loader2 size={18} className="animate-spin" />
                                  ) : (
                                    <Plus size={18} />
                                  )}
                                  {i18n.language === 'ar' ? 'اقتراح المزيد' : 'Suggest More'}
                                </HapticButton>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                                {(req.suggestedSupplierIds || []).length > 0 ? (
                                  req.suggestedSupplierIds?.map(suppId => {
                                    const supplier = allSuppliers.find(s => s.uid === suppId);
                                    if (!supplier) return null;
                                    return (
                                      <motion.div 
                                        key={suppId} 
                                        whileHover={{ scale: 1.02 }}
                                        className="p-5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2rem] border border-white/40 dark:border-gray-700/50 flex items-center gap-5 shadow-sm hover:shadow-xl hover:shadow-brand-teal/10 hover:border-brand-teal/30 transition-all group/supplier cursor-pointer" 
                                        onClick={() => onViewProfile?.(supplier.uid)}
                                      >
                                        <div className="w-16 h-16 bg-brand-surface rounded-2xl flex items-center justify-center text-brand-text-muted overflow-hidden border border-brand-border/50 shrink-0 group-hover/supplier:scale-105 transition-transform duration-500 shadow-inner">
                                          {supplier.logoUrl ? (
                                            <img src={supplier.logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                          ) : (
                                            <Building2 size={28} className="opacity-40" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h6 className="text-base font-black text-brand-text-main truncate group-hover/supplier:text-brand-primary transition-colors">
                                            {supplier.companyName || supplier.name}
                                          </h6>
                                          <p className="text-sm font-medium text-brand-text-muted truncate mt-1 flex items-center gap-1.5">
                                            <MapPin size={14} className="text-brand-teal" />
                                            {supplier.location || (i18n.language === 'ar' ? 'موقع غير محدد' : 'Location N/A')}
                                          </p>
                                        </div>
                                        <HapticButton
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartChat(req.id, supplier.uid, profile.uid);
                                          }}
                                          className="p-3.5 bg-brand-teal/10 text-brand-teal rounded-2xl hover:bg-brand-teal hover:text-white transition-all shadow-sm hover:shadow-brand-teal/20 hover:-translate-y-1"
                                          title={i18n.language === 'ar' ? 'محادثة' : 'Chat'}
                                        >
                                          <MessageSquare size={22} />
                                        </HapticButton>
                                      </motion.div>
                                    );
                                  }).filter(Boolean)
                                ) : (
                                  <div className="col-span-full py-12 text-center bg-white/30 dark:bg-gray-800/30 rounded-[2rem] border border-dashed border-brand-border/50">
                                    <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-4 text-brand-text-muted/40">
                                      <Building2 size={32} />
                                    </div>
                                    <p className="text-base font-bold text-brand-text-muted">
                                      {i18n.language === 'ar' ? 'لا يوجد موردون مقترحون حالياً' : 'No suggested suppliers yet'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-8 pt-8 border-t border-brand-border/30">
                            <div className="flex items-center gap-5">
                              <div className="relative">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-brand-teal to-brand-primary rounded-full blur-sm opacity-50" />
                                <div className="relative w-14 h-14 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-brand-teal font-black text-xl border border-brand-teal/20 shadow-inner">
                                  {req.customerName?.charAt(0) || 'U'}
                                </div>
                              </div>
                              <div>
                                <p className="text-lg font-black text-brand-text-main">{req.customerName || 'User'}</p>
                                <div className="text-sm font-bold text-brand-text-muted mt-1 flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
                                  {i18n.language === 'ar' ? 'صاحب الطلب' : 'Request Owner'}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-4">
                              {profile?.role === 'supplier' && profile?.uid !== req.customerId && (
                                <>
                                  <HapticButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartChat(req.id, profile?.uid || '', req.customerId);
                                    }}
                                    disabled={chatLoading === req.id}
                                    className="flex-1 sm:flex-none px-8 py-4 bg-gradient-to-r from-brand-teal to-brand-primary text-white rounded-[1.5rem] font-black text-base shadow-xl shadow-brand-teal/20 hover:shadow-2xl hover:shadow-brand-teal/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:translate-y-0"
                                  >
                                    {chatLoading === req.id ? (
                                      <Loader2 size={22} className="animate-spin" />
                                    ) : (
                                      <MessageSquare size={22} />
                                    )}
                                    {i18n.language === 'ar' ? 'بدء محادثة' : 'Start Chat'}
                                  </HapticButton>
                                  <HapticButton
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigate('dashboard');
                                    }}
                                    className="flex-1 sm:flex-none px-8 py-4 bg-brand-surface text-brand-primary rounded-[1.5rem] font-black text-base border-2 border-brand-primary/20 hover:bg-brand-primary/5 hover:border-brand-primary/40 transition-all flex items-center justify-center gap-3"
                                  >
                                    <Send size={22} className={isRtl ? 'rotate-180' : ''} />
                                    {i18n.language === 'ar' ? 'تقديم عرض' : 'Submit Offer'}
                                  </HapticButton>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {requests.length > 3 && (
              <button
                onClick={() => setShowAllRequests(!showAllRequests)}
                className="mt-8 flex items-center gap-2 text-brand-teal font-bold hover:text-brand-teal-dark transition-colors mx-auto bg-brand-teal/5 px-8 py-3 rounded-full shadow-sm"
              >
                {showAllRequests 
                  ? (i18n.language === 'ar' ? 'عرض أقل' : 'Show Less') 
                  : (i18n.language === 'ar' ? `عرض المزيد (${requests.length - 3}+)` : `Show More (${requests.length - 3}+)`)}
                {showAllRequests ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            )}
            {showAllRequests && requests.length > visibleRequestsCount && (
              <div ref={sentinelRef} className="h-20 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-teal border-t-transparent rounded-full animate-spin opacity-50"></div>
              </div>
            )}
          </div>
        )}




        {!profile && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-32 relative group overflow-hidden rounded-[4rem] bg-white/40 dark:bg-gray-900/40 backdrop-blur-3xl border border-white/40 dark:border-gray-700/50 shadow-2xl shadow-brand-primary/10"
          >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-teal/5 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-brand-teal/10 rounded-full blur-[120px] group-hover:scale-125 transition-transform duration-1000" />
            <div className="absolute -bottom-32 -left-32 w-[30rem] h-[30rem] bg-brand-primary/10 rounded-full blur-[120px] group-hover:scale-125 transition-transform duration-1000" />
            
            <div className="relative z-10 p-8 md:p-24 flex flex-col lg:flex-row items-center justify-between gap-16">
              <div className="text-center lg:text-left max-w-3xl">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-brand-teal/10 text-brand-teal font-black text-sm mb-8 border border-brand-teal/20 shadow-sm">
                  <SparklesIcon size={18} />
                  {i18n.language === 'ar' ? 'للموردين والشركات المتميزة' : 'For Premium Suppliers & Businesses'}
                </div>
                <h3 className="text-3xl md:text-6xl lg:text-7xl font-black mb-8 text-brand-text-main tracking-tight leading-[1.1]">
                  {i18n.language === 'ar' ? 'هل أنت مورد؟' : 'Are you a supplier?'}
                </h3>
                <p className="text-lg md:text-2xl text-brand-text-muted mb-12 leading-relaxed font-medium">
                  {i18n.language === 'ar' 
                    ? 'انضم إلى شبكتنا الحصرية من الموردين المتميزين. ابدأ في تلقي طلبات المنتجات من العملاء، وسّع نطاق عملك، وزد مبيعاتك بكل سهولة واحترافية.' 
                    : 'Join our exclusive network of premium suppliers. Start receiving product requests from customers, expand your reach, and grow your sales with ease and professionalism.'}
                </p>
                <HapticButton
                  onClick={() => onNavigate('auth-supplier')}
                  className="group/btn relative overflow-hidden bg-gradient-to-r from-brand-teal via-brand-primary to-brand-teal bg-[length:200%_auto] animate-gradient-x text-white px-12 py-6 rounded-[2rem] text-xl font-black shadow-2xl shadow-brand-teal/30 hover:shadow-brand-teal/50 transition-all hover:-translate-y-2 flex items-center justify-center gap-4 w-full md:w-auto"
                >
                  <span className="relative z-10 flex items-center gap-4">
                    {i18n.language === 'ar' ? 'سجل كمورد الآن' : 'Register as Supplier Now'}
                    <ArrowRight size={28} className={`group-hover/btn:translate-x-2 transition-transform ${isRtl ? 'rotate-180 group-hover/btn:-translate-x-2' : ''}`} />
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-out" />
                </HapticButton>
              </div>
              
              <div className="hidden lg:flex relative w-80 h-80 shrink-0 items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-teal/30 to-brand-primary/30 rounded-full animate-pulse-slow blur-3xl" />
                <motion.div 
                  animate={{ 
                    y: [0, -20, 0],
                    rotate: [0, 5, 0]
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-64 h-64 bg-white/60 dark:bg-gray-900/60 backdrop-blur-3xl rounded-[3rem] border border-white/40 dark:border-gray-700/50 shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-1000"
                >
                  <Building2 size={120} className="text-brand-teal opacity-80" strokeWidth={1} />
                  {/* Floating Elements */}
                  <div className="absolute -top-6 -right-6 p-4 bg-brand-primary text-white rounded-2xl shadow-xl animate-bounce-slow">
                    <Package size={32} />
                  </div>
                  <div className="absolute -bottom-6 -left-6 p-4 bg-brand-teal text-white rounded-2xl shadow-xl animate-bounce-slow" style={{ animationDelay: '1s' }}>
                    <SparklesIcon size={32} />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
        </motion.div>
      </div>
    )}

    <UserProfileModal 
      user={selectedUser}
      isOpen={!!selectedUser}
      onClose={() => setSelectedUser(null)}
    />

  {/* Delete Confirmation Modal */}
  <AnimatePresence>
    {requestToDelete && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-10 max-w-md w-full shadow-2xl border border-white/20 dark:border-gray-700/50 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-error/10 to-transparent pointer-events-none" />
          
          <div className="relative w-20 h-20 bg-brand-error/10 text-brand-error rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-brand-error/20">
            <Trash2 size={40} strokeWidth={1.5} />
          </div>
          
          <h3 className="text-2xl font-black text-brand-text-main mb-3">
            {i18n.language === 'ar' ? 'حذف الطلب' : 'Delete Request'}
          </h3>
          <p className="text-brand-text-muted mb-10 text-lg font-medium">
            {i18n.language === 'ar' 
              ? 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.' 
              : 'Are you sure you want to delete this request? This action cannot be undone.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setRequestToDelete(null)}
              className="flex-1 py-4 bg-brand-surface text-brand-text-main rounded-2xl font-bold hover:bg-brand-border/50 transition-colors border border-brand-border/50"
            >
              {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex-1 py-4 bg-brand-error text-white rounded-2xl font-bold hover:bg-red-600 transition-colors shadow-xl shadow-brand-error/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              {isDeleting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={20} />
                  {i18n.language === 'ar' ? 'حذف' : 'Delete'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

  {/* Clear All Confirmation Modal */}
  <AnimatePresence>
    {confirmModal.show && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-10 max-w-md w-full shadow-2xl border border-white/20 dark:border-gray-700/50 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-error/10 to-transparent pointer-events-none" />
          
          <div className="relative w-20 h-20 bg-brand-error/10 text-brand-error rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner border border-brand-error/20">
            <Trash2 size={40} strokeWidth={1.5} />
          </div>
          
          <h3 className="text-2xl font-black text-brand-text-main mb-3">
            {confirmModal.title}
          </h3>
          <p className="text-brand-text-muted mb-10 text-lg font-medium">
            {confirmModal.message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              className="flex-1 py-4 bg-brand-surface text-brand-text-main rounded-2xl font-bold hover:bg-brand-border/50 transition-colors border border-brand-border/50"
            >
              {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={confirmModal.onConfirm}
              disabled={confirmModal.isLoading}
              className="flex-1 py-4 bg-brand-error text-white rounded-2xl font-bold hover:bg-red-600 transition-colors shadow-xl shadow-brand-error/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              {confirmModal.isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={20} />
                  {i18n.language === 'ar' ? 'مسح الكل' : 'Clear All'}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
</div>
);
};

export default Home;
