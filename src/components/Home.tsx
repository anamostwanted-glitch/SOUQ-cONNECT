import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersistedState } from '../hooks/usePersistedState';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, getDocs, doc, onSnapshot, query, where, orderBy, getDoc, setDoc, writeBatch, deleteDoc, updateDoc, arrayUnion, limit } from 'firebase/firestore';
import { db, storage, auth } from '../firebase';
import { UserProfile, Category, ProductRequest, Chat, AppFeatures } from '../types';
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
} from '../services/geminiService';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import UserProfileModal from './UserProfileModal';
import { soundService, SoundType } from '../utils/soundService';
import ChatCard from './ChatCard';
import { HapticButton } from './HapticButton';
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
  ChevronDown,
  ChevronUp,
  Trash2,
  MapPin,
  AlertCircle,
  ArrowUp,
  Hammer,
  Zap,
  Droplets,
  Wrench,
  Briefcase,
  ShoppingBag
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

interface HomeProps {
  profile: UserProfile | null;
  features: AppFeatures;
  onNavigate: (view: any) => void;
  onOpenChat: (chatId: string) => void;
  onViewProfile?: (uid: string) => void;
}

const Home: React.FC<HomeProps> = ({ profile, features, onNavigate, onOpenChat, onViewProfile }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [searchQuery, setSearchQuery] = usePersistedState('home_search_query', '');
  const [draftDescription, setDraftDescription] = usePersistedState('home_draft_description', '');
  const [showDraftArea, setShowDraftArea] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [matchedSuppliers, setMatchedSuppliers] = useState<UserProfile[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [siteLogo, setSiteLogo] = useState('');
  const [siteName, setSiteName] = useState('');
  const [heroTitleAr, setHeroTitleAr] = useState('');
  const [heroTitleEn, setHeroTitleEn] = useState('');
  const [heroDescriptionAr, setHeroDescriptionAr] = useState('');
  const [heroDescriptionEn, setHeroDescriptionEn] = useState('');
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
  const sentinelRef = useRef<HTMLDivElement>(null);

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
      const userRequests = profile.role === 'admin' ? requests : requests.filter(r => r.customerId === profile.uid);
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
      const userChats = (profile.role === 'supplier' || profile.role === 'admin') ? supplierChats : customerChats;
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
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!profile) {
      setRequests([]);
      return;
    }

    let q;
    if (profile.role === 'customer') {
      q = query(collection(db, 'requests'), where('customerId', '==', profile.uid));
    } else if (profile.role === 'supplier') {
      q = query(collection(db, 'requests'), where('status', '==', 'open'));
    } else {
      q = query(collection(db, 'requests'));
    }

    const unsub = onSnapshot(q, (snap) => {
      console.log('onSnapshot triggered. Documents count:', snap.size);
      let reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductRequest));
      console.log('Fetched requests:', reqs);
      
      // Filter by supplier categories if applicable
      if (profile.role === 'supplier') {
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
    if (profile.role === 'supplier' || profile.role === 'admin') {
      const qChats = profile.role === 'admin' 
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
        setSiteLogo(data.logoUrl || '');
        setSiteName(data.siteName || '');
        setHeroTitleAr(data.heroTitleAr || '');
        setHeroTitleEn(data.heroTitleEn || '');
        setHeroDescriptionAr(data.heroDescriptionAr || '');
        setHeroDescriptionEn(data.heroDescriptionEn || '');
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

  const [voiceError, setVoiceError] = useState<string | null>(null);

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
      const { enhanceRequestDescription } = await import('../services/geminiService');
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
                  matchedSuppliers: matched
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-teal/20 rounded-full blur-[120px] opacity-50 mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-primary/20 rounded-full blur-[120px] opacity-50 mix-blend-multiply" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-4xl text-center mb-16 relative z-10"
      >
        <div className="relative inline-block mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute -inset-6 bg-gradient-to-tr from-brand-teal/20 to-transparent blur-2xl rounded-full" 
          />
          {siteLogo ? (
            <img 
              src={siteLogo} 
              alt={siteName || 'Logo'} 
              className="relative h-20 md:h-28 w-auto mx-auto object-contain drop-shadow-xl"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div className="relative w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-brand-surface to-brand-background rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-brand-teal/10 border border-brand-border/50">
              <Package className="w-10 h-10 md:w-14 md:h-14 text-brand-teal" />
            </div>
          )}
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-brand-text-main mb-6 tracking-tighter leading-[1.1]">
          {i18n.language === 'ar' ? (
            heroTitleAr ? heroTitleAr : <>ابحث عن <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal to-brand-primary">أي منتج</span> بسهولة</>
          ) : (
            heroTitleEn ? heroTitleEn : <>Find <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal to-brand-primary">Any Product</span> with Ease</>
          )}
        </h1>
        
        <p className="text-lg md:text-xl text-brand-text-muted mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
          {i18n.language === 'ar' 
            ? (heroDescriptionAr || t('google_style_desc'))
            : (heroDescriptionEn || t('google_style_desc'))}
        </p>

        <div className="w-full max-w-3xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-teal/30 via-brand-primary/30 to-brand-teal/30 rounded-[2.5rem] blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />
          
          <div className="relative bg-brand-surface/80 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-brand-border/50 overflow-hidden transition-all duration-300 hover:border-brand-teal/30">
            <form onSubmit={handleRequest} className="flex flex-col">
              {/* Main Input Area */}
              <div className="flex items-start gap-4 p-4 md:p-6">
                <textarea
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="flex-1 bg-transparent px-2 py-2 text-xl md:text-2xl outline-none placeholder:text-brand-text-muted/60 font-medium text-brand-text-main resize-none min-h-[60px] md:min-h-[80px] leading-relaxed"
                  required
                  rows={2}
                  style={{ scrollbarWidth: 'none' }}
                />
                
                {/* Send Button */}
                <HapticButton
                  type="submit"
                  disabled={loading || !searchQuery}
                  className={`flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 transform ${
                    !searchQuery 
                      ? 'bg-brand-background text-brand-text-muted cursor-not-allowed border border-brand-border/50' 
                      : 'bg-brand-text-main text-brand-surface shadow-lg hover:scale-105 hover:shadow-xl active:scale-95'
                  }`}
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-brand-surface/30 border-t-brand-surface rounded-full animate-spin" />
                  ) : (
                    <Send size={24} className={isRtl ? 'rotate-180' : ''} />
                  )}
                </HapticButton>
              </div>

              {/* Bottom Toolbar */}
              <div className="flex items-center justify-between px-6 py-4 bg-brand-background/30 border-t border-brand-border/30">
                <div className="flex items-center gap-2 md:gap-3">
                  <HapticButton
                    type="button"
                    onClick={handleVoiceInput}
                    className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-xl transition-all font-semibold text-xs md:text-sm ${
                      isListening 
                        ? 'bg-brand-error/10 text-brand-error shadow-sm animate-pulse border border-brand-error/20' 
                        : 'bg-brand-surface text-brand-text-muted hover:text-brand-text-main border border-brand-border/50 hover:border-brand-border hover:shadow-sm'
                    }`}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    <span className="hidden sm:inline">{isRtl ? 'طلب صوتي' : 'Voice'}</span>
                  </HapticButton>

                  <HapticButton
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 rounded-xl transition-all font-semibold text-xs md:text-sm ${
                      imagePreview 
                        ? 'bg-brand-teal/10 text-brand-teal shadow-sm border border-brand-teal/20' 
                        : 'bg-brand-surface text-brand-text-muted hover:text-brand-text-main border border-brand-border/50 hover:border-brand-border hover:shadow-sm'
                    }`}
                  >
                    <ImageIcon size={16} />
                    <span className="hidden sm:inline">{isRtl ? 'إرفاق صورة' : 'Image'}</span>
                  </HapticButton>
                </div>

                <HapticButton
                  type="button"
                  onClick={handleDraftRequest}
                  disabled={isDrafting || !searchQuery}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs md:text-sm ${
                    isDrafting 
                      ? 'bg-brand-teal/10 text-brand-teal animate-pulse border border-brand-teal/20' 
                      : !searchQuery 
                        ? 'bg-transparent text-brand-text-muted/50 cursor-not-allowed' 
                        : 'bg-brand-teal/10 text-brand-teal hover:bg-brand-teal hover:text-white border border-brand-teal/20 hover:shadow-md hover:shadow-brand-teal/20'
                  }`}
                >
                  {isDrafting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-teal/30 border-t-brand-teal"></div>
                  ) : (
                    <SparklesIcon size={16} />
                  )}
                  <span>{isRtl ? 'تحسين ذكي' : 'AI Enhance'}</span>
                </HapticButton>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
            </form>
          </div>
        </div>

        {/* 3. Conditional Content (Suggested Text & Image Preview) */}
        <AnimatePresence mode="wait">
          {(showDraftArea || imagePreview || voiceError || aiStatus || matchedSuppliers.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 space-y-4"
            >
              {matchedSuppliers.length > 0 && (
                <div className="p-6 bg-brand-surface rounded-[2rem] border border-brand-primary/20 shadow-xl shadow-brand-primary/20/50">
                  <h3 className="text-lg font-bold text-brand-text-main mb-4 flex items-center gap-2">
                    <SparklesIcon size={20} className="text-brand-primary" />
                    {isRtl ? 'موردون مقترحون لطلبك' : 'Suppliers suggested for your request'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {matchedSuppliers.map(supp => (
                      <div key={supp.uid} className="p-4 bg-brand-background rounded-xl border border-brand-border-light flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-surface rounded-xl flex items-center justify-center text-brand-text-muted overflow-hidden border border-brand-border-light shrink-0">
                          {supp.logoUrl ? (
                            <img src={supp.logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                          ) : (
                            <Building2 size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-brand-text-main truncate flex items-center gap-1">
                            {supp.companyName || supp.name}
                            <span className="inline-block w-3 h-3 bg-brand-teal rounded-full" title={isRtl ? 'مورد موثوق' : 'Verified Supplier'}></span>
                          </h4>
                          <p className="text-[10px] text-brand-text-muted truncate">{supp.email}</p>
                        </div>
                        <button
                          onClick={() => handleStartChat(lastRequestId!, supp.uid, profile!.uid)}
                          className="p-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition-colors"
                        >
                          <MessageSquare size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                            className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                          >
                            {isGeneratingCopy ? <div className="w-3 h-3 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" /> : <Bot size={12} />}
                            {isRtl ? 'إنشاء محتوى تسويقي' : 'Generate Marketing Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDraftArea(false)}
                            className="text-brand-text-muted hover:text-brand-error transition-colors"
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

        {/* Smart Matchmaking Results */}
        {(isMatching || (success && matchedSuppliers.length >= 0)) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 w-full text-left bg-brand-surface/80 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] border border-brand-border/50 shadow-2xl shadow-brand-teal/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-start gap-5 mb-10 relative z-10">
              <div className="p-4 bg-gradient-to-br from-brand-teal to-brand-primary text-white rounded-2xl shadow-lg shadow-brand-teal/20 shrink-0">
                <SparklesIcon size={32} className={isMatching ? "animate-pulse" : ""} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-brand-text-main tracking-tight">
                  {isMatching 
                    ? (i18n.language === 'ar' ? 'جاري البحث عن أفضل الموردين...' : 'Finding Best Matches...')
                    : (matchedSuppliers.length > 0 
                        ? (i18n.language === 'ar' ? 'أفضل الموردين المطابقين لطلبك' : 'Best Matching Suppliers')
                        : (i18n.language === 'ar' ? 'لم يتم العثور على موردين حالياً' : 'No Suppliers Found Currently'))}
                </h3>
                <p className="text-brand-text-muted mt-2 text-lg font-medium">
                  {isMatching
                    ? (i18n.language === 'ar' ? 'يقوم الذكاء الاصطناعي بتحليل طلبك للبحث عن أفضل الموردين المناسبين.' : 'AI is analyzing your request to find the best matching suppliers.')
                    : (matchedSuppliers.length > 0
                        ? (i18n.language === 'ar' 
                          ? 'تم إرسال طلبك بنجاح. هؤلاء الموردين هم الأقرب لتلبية احتياجك بناءً على تحليل الذكاء الاصطناعي.' 
                          : 'Your request was sent successfully. These suppliers are the best match based on AI analysis.')
                        : (i18n.language === 'ar'
                          ? 'تم إرسال طلبك بنجاح، ولكن لم نجد موردين مطابقين تماماً في الوقت الحالي. سنقوم بإخطارك فور توفر عروض.'
                          : 'Your request was sent successfully, but we couldn\'t find exact matching suppliers right now. We will notify you as soon as offers arrive.'))}
                </p>
              </div>
            </div>

            {isMatching ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-brand-surface/50 p-6 rounded-2xl border border-brand-border shadow-sm animate-pulse h-48">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 bg-gray-200 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : matchedSuppliers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {matchedSuppliers.map(supplier => (
                <div key={supplier.uid} className="bg-brand-surface/50 p-6 rounded-2xl border border-brand-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col group">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 bg-brand-surface rounded-2xl flex items-center justify-center text-gray-400 overflow-hidden shrink-0 border border-gray-100 shadow-inner group-hover:border-brand-teal/30 transition-colors">
                      {supplier.logoUrl ? (
                        <img src={supplier.logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                      ) : (
                        <Building2 size={24} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 truncate text-lg">{supplier.companyName || supplier.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500 truncate">{supplier.location || '-'}</p>
                        {supplier.rating && supplier.reviewCount ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-brand-warning bg-brand-warning/10 px-2 py-0.5 rounded-lg">
                            <Star size={12} className="fill-brand-warning" />
                            {supplier.rating.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-6 line-clamp-2 flex-1 leading-relaxed">
                    {supplier.bio || (i18n.language === 'ar' ? 'لا يوجد وصف متاح.' : 'No description available.')}
                  </p>
                  <div className="flex gap-3 mt-auto">
                    <button
                      onClick={() => setSelectedUser(supplier)}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                    >
                      {i18n.language === 'ar' ? 'الملف الشخصي' : 'Profile'}
                    </button>
                    {lastRequestId && profile && (
                      <button
                        onClick={() => handleApproveAndStartChat(lastRequestId, supplier.uid, profile.uid)}
                        disabled={chatLoading === supplier.uid}
                        className="flex-[2] py-3 bg-brand-teal text-white rounded-xl text-sm font-bold hover:bg-brand-teal-dark transition-all shadow-lg shadow-brand-teal/20 flex items-center justify-center gap-2"
                      >
                        {chatLoading === supplier.uid ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <MessageSquare size={16} />
                        )}
                        {i18n.language === 'ar' ? 'الموافقة وبدء محادثة' : 'Approve & Start Chat'}
                      </button>
                    )}
                  </div>
                </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                  <Building2 size={40} />
                </div>
                <h4 className="text-lg font-bold text-gray-800">
                  {i18n.language === 'ar' ? 'لا يوجد موردون متاحون حالياً في هذا القسم' : 'No suppliers currently available in this category'}
                </h4>
                <p className="text-gray-500 max-w-md mt-2">
                  {i18n.language === 'ar' 
                    ? 'لقد قمنا بنشر طلبك لجميع الموردين المسجلين. ستتلقى إشعارات بمجرد تقديم عروض أسعار.' 
                    : 'We have published your request to all registered suppliers. You will receive notifications as soon as they provide quotes.'}
                </p>
              </div>
            )}
          </motion.div>
        )}
        {/* Active Conversations Section */}
        {profile && (
          <div className="mt-12 w-full text-left">
            {(profile.role === 'supplier' || profile.role === 'admin') && supplierChats.length > 0 && (
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
                          ? (profile.role === 'admin' ? 'هل أنت متأكد من مسح جميع المحادثات في النظام؟ لا يمكن التراجع عن هذا الإجراء.' : 'هل أنت متأكد من مسح جميع المحادثات؟ لا يمكن التراجع عن هذا الإجراء.')
                          : (profile.role === 'admin' ? 'Are you sure you want to clear ALL chats in the system? This action cannot be undone.' : 'Are you sure you want to clear all chats? This action cannot be undone.'),
                        onConfirm: handleClearAllChats,
                        isLoading: false
                      })}
                      className="p-1.5 text-brand-error hover:bg-brand-error/10 rounded-lg transition-colors"
                      title={i18n.language === 'ar' ? 'مسح الكل' : 'Clear All'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence mode="popLayout">
                    {supplierChats
                      .filter(c => !c.isCategoryChat)
                      .slice(0, showAllChats ? undefined : 3)
                      .map(chat => (
                        <motion.div
                          key={chat.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          layout
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
                {supplierChats.filter(c => !c.isCategoryChat).length > 3 && (
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

            {profile.role === 'customer' && customerChats.length > 0 && (
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
                      className="p-1.5 text-brand-error hover:bg-brand-error/10 rounded-lg transition-colors"
                      title={i18n.language === 'ar' ? 'مسح الكل' : 'Clear All'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence mode="popLayout">
                    {customerChats
                      .filter(c => !c.isCategoryChat)
                      .slice(0, showAllChats ? undefined : 3)
                      .map(chat => (
                        <motion.div
                          key={chat.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          layout
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
                {customerChats.filter(c => !c.isCategoryChat).length > 3 && (
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
          <div className="mt-20 w-full text-left">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-3xl font-black text-brand-text-main flex items-center gap-4 tracking-tight">
                <div className="p-3.5 bg-gradient-to-br from-brand-teal to-brand-primary rounded-2xl text-white shadow-lg shadow-brand-teal/20">
                  <Package size={24} />
                </div>
                {profile.role === 'supplier' 
                  ? (i18n.language === 'ar' ? 'الطلبات المتاحة' : 'Available Requests')
                  : (i18n.language === 'ar' ? 'طلباتي' : 'My Requests')}
              </h3>
              <div className="hidden md:flex items-center gap-4 text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-teal rounded-full animate-pulse" />
                  {requests.length} {i18n.language === 'ar' ? 'طلب متاح حالياً' : 'Total Requests Available'}
                </div>
                {(profile.role === 'customer' || profile.role === 'admin') && (
                  <button
                    onClick={() => setConfirmModal({
                      show: true,
                      title: i18n.language === 'ar' ? 'مسح كل الطلبات' : 'Clear All Requests',
                      message: i18n.language === 'ar' 
                        ? (profile.role === 'admin' ? 'هل أنت متأكد من مسح جميع الطلبات في النظام؟ لا يمكن التراجع عن هذا الإجراء.' : 'هل أنت متأكد من مسح جميع طلباتك؟ لا يمكن التراجع عن هذا الإجراء.')
                        : (profile.role === 'admin' ? 'Are you sure you want to clear ALL requests in the system? This action cannot be undone.' : 'Are you sure you want to clear all your requests? This action cannot be undone.'),
                      onConfirm: handleClearAllRequests,
                      isLoading: false
                    })}
                    className="flex items-center gap-1 px-3 py-1 text-brand-error hover:bg-brand-error/10 rounded-lg transition-colors border border-brand-error/20"
                  >
                    <Trash2 size={14} />
                    <span className="text-xs font-bold">{i18n.language === 'ar' ? 'مسح الكل' : 'Clear All'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <AnimatePresence mode="popLayout">
                {requests
                  .slice(0, showAllRequests ? visibleRequestsCount : 3)
                  .map((req) => (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      className="glass-card p-6 md:p-8 rounded-[2rem] border border-white shadow-xl shadow-brand-teal/5 transition-all group hover:border-brand-teal/20"
                    >
                      <div className="flex flex-col md:flex-row gap-8">
                        {/* Request Image */}
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100 group-hover:scale-105 transition-all">
                          {req.imageUrl ? (
                            <img 
                              src={req.imageUrl} 
                              alt={req.productName} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            (() => {
                              const Icon = getCategoryIcon(i18n.language === 'ar' ? req.categoryNameAr || '' : req.categoryNameEn || '');
                              return (
                                <div className="w-full h-full flex items-center justify-center text-brand-teal bg-brand-teal/5">
                                  <Icon size={32} />
                                </div>
                              );
                            })()
                          )}
                        </div>

                        {/* Request Details */}
                        <div className="flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-brand-teal transition-colors">
                                {req.productName}
                              </h4>
                              <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-500">
                                <span className="flex items-center gap-1.5 px-2 py-1 bg-brand-teal/10 text-brand-teal rounded-lg font-bold">
                                  {i18n.language === 'ar' ? req.categoryNameAr : req.categoryNameEn || (i18n.language === 'ar' ? 'عام' : 'General')}
                                </span>
                                <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg">
                                  <Clock size={14} className="text-brand-teal" />
                                  {new Date(req.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-lg">
                                  <MapPin size={14} className="text-brand-teal" />
                                  {req.location || (i18n.language === 'ar' ? 'موقع غير محدد' : 'Location N/A')}
                                </span>
                                {req.quantity && (
                                  <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-brand-teal rounded-lg">
                                    <Package size={14} />
                                    {req.quantity}
                                  </span>
                                )}
                              </div>
                            </div>
                            {(profile?.uid === req.customerId || profile?.role === 'admin') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRequest(req.id, req.imageUrl);
                                }}
                                className="p-3 text-gray-400 hover:text-brand-error hover:bg-brand-error/10 rounded-2xl transition-all"
                                title={i18n.language === 'ar' ? 'حذف الطلب' : 'Delete Request'}
                              >
                                <Trash2 size={20} />
                              </button>
                            )}
                          </div>

                          {/* Suggested Suppliers Section */}
                          {profile?.role === 'customer' && (
                            <div className="mt-6 p-6 bg-brand-surface/50 rounded-3xl border border-brand-border-light">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="text-sm font-bold text-brand-text-main flex items-center gap-2">
                                  <SparklesIcon size={16} className="text-brand-primary" />
                                  {i18n.language === 'ar' ? 'موردون مقترحون' : 'Suggested Suppliers'}
                                </h5>
                                <button
                                  onClick={() => handleSuggestMoreSuppliers(req.id, req.categoryId, req.suggestedSupplierIds || [])}
                                  disabled={isSuggestingMore[req.id]}
                                  className="text-xs font-bold text-brand-primary hover:text-brand-primary-hover transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                  {isSuggestingMore[req.id] ? (
                                    <div className="w-3 h-3 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                                  ) : (
                                    <Plus size={14} />
                                  )}
                                  {i18n.language === 'ar' ? 'اقتراح المزيد' : 'Suggest More'}
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(req.suggestedSupplierIds || []).length > 0 ? (
                                  req.suggestedSupplierIds?.map(suppId => {
                                    const supplier = allSuppliers.find(s => s.uid === suppId);
                                    if (!supplier) return null;
                                    return (
                                      <div key={suppId} className="p-3 bg-white rounded-2xl border border-brand-border-light flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
                                        <div className="w-10 h-10 bg-brand-surface rounded-xl flex items-center justify-center text-brand-text-muted overflow-hidden border border-brand-border-light shrink-0 cursor-pointer hover:opacity-80" onClick={() => onViewProfile?.(supplier.uid)}>
                                          {supplier.logoUrl ? (
                                            <img src={supplier.logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                          ) : (
                                            <Building2 size={16} />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h6 className="text-xs font-bold text-brand-text-main truncate cursor-pointer hover:text-brand-primary" onClick={() => onViewProfile?.(supplier.uid)}>
                                            {supplier.companyName || supplier.name}
                                          </h6>
                                          <p className="text-[10px] text-brand-text-muted truncate">{supplier.location || (i18n.language === 'ar' ? 'موقع غير محدد' : 'Location N/A')}</p>
                                        </div>
                                        <button
                                          onClick={() => handleStartChat(req.id, profile.uid, supplier.uid)}
                                          className="p-2 bg-brand-teal/10 text-brand-teal rounded-lg hover:bg-brand-teal hover:text-white transition-all"
                                          title={i18n.language === 'ar' ? 'محادثة' : 'Chat'}
                                        >
                                          <MessageSquare size={14} />
                                        </button>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="col-span-full py-4 text-center">
                                    <p className="text-xs text-brand-text-muted italic">
                                      {i18n.language === 'ar' ? 'لا يوجد موردون مقترحون حالياً' : 'No suggested suppliers yet'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-auto flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold text-sm">
                                {req.customerName?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{req.customerName || 'User'}</p>
                                <p className="text-xs text-gray-500">{i18n.language === 'ar' ? 'صاحب الطلب' : 'Request Owner'}</p>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              {profile?.role === 'supplier' && profile?.uid !== req.customerId && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartChat(req.id, profile?.uid || '', req.customerId);
                                    }}
                                    disabled={chatLoading === req.id}
                                    className="btn-primary px-8 py-3 flex items-center gap-2 shadow-lg shadow-brand-teal/20"
                                  >
                                    {chatLoading === req.id ? (
                                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <MessageSquare size={18} />
                                    )}
                                    {i18n.language === 'ar' ? 'بدء محادثة' : 'Start Chat'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigate('dashboard');
                                    }}
                                    className="px-8 py-3 bg-brand-primary/10 text-brand-primary rounded-2xl font-bold hover:bg-brand-primary/20 transition-colors flex items-center justify-center gap-2"
                                  >
                                    <Send size={18} className={isRtl ? 'rotate-180' : ''} />
                                    {i18n.language === 'ar' ? 'تقديم عرض' : 'Submit Offer'}
                                  </button>
                                </>
                              )}
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
          <div className="mt-24 p-12 glass-card rounded-[3rem] border border-brand-teal/10 relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 p-8 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-700">
              <Building2 size={240} />
            </div>
            <div className="relative z-10 text-center md:text-left max-w-2xl">
              <h3 className="text-4xl font-black mb-4 text-brand-text-main">
                {i18n.language === 'ar' ? 'هل أنت مورد؟' : 'Are you a supplier?'}
              </h3>
              <p className="text-xl text-brand-text-muted mb-10 leading-relaxed">
                {i18n.language === 'ar' 
                  ? 'انضم إلى شبكتنا من الموردين وابدأ في تلقي طلبات المنتجات من العملاء وزيادة مبيعاتك.' 
                  : 'Join our network of suppliers and start receiving product requests from customers and grow your sales.'}
              </p>
              <HapticButton
                onClick={() => onNavigate('auth-supplier')}
                className="btn-primary px-12 py-5 text-lg shadow-2xl shadow-brand-teal/20 flex items-center gap-3"
              >
                {i18n.language === 'ar' ? 'سجل كمورد الآن' : 'Register as Supplier Now'}
                <Plus size={24} />
              </HapticButton>
            </div>
          </div>
        )}
      </motion.div>

      <UserProfileModal 
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {requestToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-brand-surface rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-brand-error/10 text-brand-error rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-brand-text-main mb-2">
                {i18n.language === 'ar' ? 'حذف الطلب' : 'Delete Request'}
              </h3>
              <p className="text-brand-text-muted mb-8">
                {i18n.language === 'ar' 
                  ? 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.' 
                  : 'Are you sure you want to delete this request? This action cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRequestToDelete(null)}
                  className="flex-1 py-3 bg-brand-surface text-brand-text-muted rounded-2xl font-bold hover:bg-brand-border transition-colors"
                >
                  {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-brand-error text-white rounded-2xl font-bold hover:bg-brand-error transition-colors shadow-lg shadow-brand-error/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={18} />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-brand-surface rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-brand-error/10 text-brand-error rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-brand-text-main mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-brand-text-muted mb-8">
                {confirmModal.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 py-3 bg-brand-surface text-brand-text-muted rounded-2xl font-bold hover:bg-brand-border transition-colors"
                >
                  {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  disabled={confirmModal.isLoading}
                  className="flex-1 py-3 bg-brand-error text-white rounded-2xl font-bold hover:bg-brand-error transition-colors shadow-lg shadow-brand-error/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirmModal.isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={18} />
                      {i18n.language === 'ar' ? 'مسح الكل' : 'Clear All'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Back to Top Floating Button */}
      <AnimatePresence>
        {showBackToTop && (
          <div className="fixed bottom-24 md:bottom-8 right-6 z-[60]">
            <motion.button
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              whileHover={{ scale: 1.1, backgroundColor: 'var(--brand-teal-dark)' }}
              whileTap={{ scale: 0.9 }}
              onClick={scrollToTop}
              className="bg-brand-teal text-white p-4 rounded-2xl shadow-xl shadow-brand-teal/20 flex items-center justify-center group relative"
              title={i18n.language === 'ar' ? 'الرجوع للأعلى' : 'Back to Top'}
            >
              <ArrowUp className="w-6 h-6" />
              <span className="absolute right-full mr-4 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
                {i18n.language === 'ar' ? 'الرجوع للأعلى' : 'Back to Top'}
              </span>
            </motion.button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
