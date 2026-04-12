import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NeuralFluidSlider } from './NeuralFluidSlider';
import { PredictiveMatchSection } from './PredictiveMatchSection';
import { NeuralCommandCenter } from './NeuralCommandCenter';
import { fetchMarketplaceItems, fetchCategories, fetchMarketTrends, fetchSuppliers, searchMarketplaceAndSuppliers, fetchPredictiveMatches } from '../services/marketService';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  getDocs,
  updateDoc,
  doc,
  limit,
  writeBatch,
  increment,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../../core/firebase';
import { MarketplaceItem, UserProfile, Category, AppFeatures, MarketTrend, UserRole } from '../../../core/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  X, 
  Sparkles,
  Camera,
  Building2,
  User,
  Heart,
  TrendingUp,
  Star,
  ShoppingBag,
  Zap,
  BrainCircuit,
  Shield,
  ShieldCheck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit2,
  Trash2,
  LayoutGrid,
  List,
  BarChart3,
  ArrowLeft,
  Menu,
  Mic,
  Database,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, handleAiError } from '../../../core/utils/errorHandling';
import { Skeleton } from '../../../shared/components/Skeleton';
import { HapticButton } from '../../../shared/components/HapticButton';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { SupplierSpotlight } from './SupplierSpotlight';
import { ProductDetailsModal } from '../../../shared/components/ProductDetailsModal';
import { SmartUploadModal } from './upload-flow/SmartUploadModal';
import { EditProductModal } from './EditProductModal';
import { SmartCategoryExplorer } from './SmartCategoryExplorer';
import { VisualSearchModal } from '../../../shared/components/search/VisualSearchModal';
import { NeuralPulseBar } from './NeuralPulseBar';
import { SupplierMosaic } from './SupplierMosaic';
import { SupplierPulseHorizon } from './SupplierPulseHorizon';
import { SupplierNebulaLayout } from './SupplierNebulaLayout';
import { NeuralEconomyHub } from './NeuralEconomyHub';
import { ProductDiscoveryCanvas } from './ProductDiscoveryCanvas';
import { SmartRequestForm } from './SmartRequestForm';
import { RequestFeed } from './RequestFeed';
import { MakeOfferModal } from './MakeOfferModal';

interface MarketInterfaceProps {
  profile: UserProfile | null;
  features: AppFeatures;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  viewMode?: UserRole;
  activeTab?: 'discover' | 'myshop' | 'requests';
  setActiveTab?: (tab: 'discover' | 'myshop' | 'requests') => void;
}

import { BroadcastBox } from './BroadcastBox';
import { ScrollDirection, useScrollDirection } from '../../../shared/hooks/useScrollDirection';

const getGridColsClass = (cols: number) => {
  switch (cols) {
    case 1: return 'grid-cols-1';
    case 2: return 'grid-cols-2';
    case 3: return 'grid-cols-3';
    case 4: return 'grid-cols-4';
    case 5: return 'grid-cols-5';
    case 6: return 'grid-cols-6';
    default: return 'grid-cols-2';
  }
};

export const MarketInterface: React.FC<MarketInterfaceProps> = ({ 
  profile, 
  features, 
  onOpenChat, 
  onViewProfile,
  viewMode,
  activeTab: externalActiveTab,
  setActiveTab: setExternalActiveTab
}) => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRtl = i18n.language === 'ar';
  const scrollDirection = useScrollDirection();
  const isMinimized = scrollDirection === ScrollDirection.DOWN;
  
  const [internalActiveTab, setInternalActiveTab] = useState<'discover' | 'myshop' | 'requests'>('discover');
  
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = (tab: 'discover' | 'myshop' | 'requests') => {
    if (setExternalActiveTab) {
      setExternalActiveTab(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const prefetchCategoryItems = useCallback((categoryId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['marketplace', 'discover', auth.currentUser?.uid, categoryId],
      queryFn: () => fetchMarketplaceItems('discover', auth.currentUser?.uid, categoryId),
    });
  }, [queryClient]);
  
  // Header animation variants
  const headerVariants = {
    visible: { 
      y: 0, 
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: { 
        type: 'spring' as const, 
        stiffness: 300, 
        damping: 30 
      }
    },
    minimized: { 
      y: -75, 
      opacity: 0.95,
      scale: 0.96,
      filter: 'blur(1px)',
      transition: { 
        type: 'spring' as const, 
        stiffness: 250, 
        damping: 35 
      }
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [showSmartCategories, setShowSmartCategories] = useState(false);
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showAdminHub, setShowAdminHub] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [visualSearchResults, setVisualSearchResults] = useState<MarketplaceItem[] | null>(null);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [supplierLayout, setSupplierLayout] = useState<'mosaic' | 'horizon' | 'nebula'>('nebula');
  const [showEconomyHub, setShowEconomyHub] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MarketplaceItem | null>(null);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedRequestForOffer, setSelectedRequestForOffer] = useState<any | null>(null);
  const [sellerTypeFilter, setSellerTypeFilter] = useState<'all' | 'supplier' | 'customer' | 'followed'>('all');
  const [categoryClicks, setCategoryClicks] = useState<Record<string, number>>({});
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [predictiveMatches, setPredictiveMatches] = useState<{ supplierId: string, reason: string }[]>([]);
  const [smartInsight, setSmartInsight] = useState<{ ar: string; en: string } | null>(null);
  const [neuralPulse, setNeuralPulse] = useState<{ ar: string; en: string } | null>(null);
  const [isNeuralPulseLoading, setIsNeuralPulseLoading] = useState(false);
  const [showPulseBar, setShowPulseBar] = useState(true);
  const [viewStyle, setViewStyle] = useState<'grid' | 'canvas'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'canvas';
    }
    return 'grid';
  });
  const [gridSettings, setGridSettings] = useState({
    mobileCols: 2,
    webCols: 4,
    gap: 16
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.gridSettings) {
          setGridSettings(data.gridSettings);
          toast.success(isRtl ? 'تم تحديث إعدادات الشبكة' : 'Grid settings updated');
        }
      }
    });
    return () => unsub();
  }, []);

  const [restoreBtnPos, setRestoreBtnPos] = useState(() => {
    const saved = localStorage.getItem('pulse_restore_pos');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });

  useEffect(() => {
    if (profile && Object.keys(categoryClicks).length > 0) {
      const interests = Object.keys(categoryClicks);
      fetchPredictiveMatches(interests, recentlyViewed)
        .then(setPredictiveMatches)
        .catch(err => handleAiError(err, "Predictive matches"));
    }
  }, [profile, categoryClicks, recentlyViewed]);

  const { data: itemsData = { items: [], lastDoc: null }, isLoading: itemsLoading } = useQuery({
    queryKey: ['marketplace', activeTab, auth.currentUser?.uid],
    queryFn: () => fetchMarketplaceItems(activeTab, auth.currentUser?.uid),
    enabled: !!auth.currentUser || activeTab === 'discover',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false
  });
  
  const items = itemsData.items;

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false
  });

  const { data: marketTrends = [] } = useQuery({
    queryKey: ['marketTrends'],
    queryFn: fetchMarketTrends,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: () => searchMarketplaceAndSuppliers(searchTerm),
    enabled: searchTerm.length > 2
  });
  
  const effectiveRole = viewMode || profile?.role;
  const isAdmin = effectiveRole === 'admin';
  const isSupplier = effectiveRole === 'supplier';
  const isCustomer = effectiveRole === 'customer';

  useEffect(() => {
    if (isCustomer) {
      if (activeTab !== 'requests') setActiveTab('discover');
      setShowAdminHub(false);
      setShowEconomyHub(false);
    } else if (isSupplier) {
      setShowAdminHub(false);
    }
  }, [effectiveRole, isCustomer, isSupplier]);

  const handleDelete = async (item: MarketplaceItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      // Soft delete: Update status instead of hard deleting
      await updateDoc(doc(db, 'marketplace', itemToDelete.id), {
        status: 'deleted',
        deletedAt: new Date().toISOString()
      });
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `marketplace/${itemToDelete.id}`, false);
    }
  };

  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error(isRtl ? 'متصفحك لا يدعم البحث الصوتي' : 'Your browser does not support voice search');
      return;
    }

    setIsListening(true);
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = isRtl ? 'ar-SA' : 'en-US';
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
      setIsListening(false);
      toast.success(isRtl ? `تبحث عن: ${transcript}` : `Searching for: ${transcript}`);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    
    // Track click behavior
    const newClicks = { ...categoryClicks, [categoryId]: (categoryClicks[categoryId] || 0) + 1 };
    setCategoryClicks(newClicks);
    try {
      localStorage.setItem('market_category_clicks', JSON.stringify(newClicks));
    } catch (e) {
      console.warn('LocalStorage quota exceeded for category clicks', e);
    }

    // Smart Insight Logic
    const category = categories.find(c => c.id === categoryId);
    if (category && newClicks[categoryId] === 3) {
      setSmartInsight({
        ar: `لاحظنا اهتمامك بـ ${category.nameAr}. هل تبحث عن شيء محدد؟`,
        en: `We noticed your interest in ${category.nameEn}. Looking for something specific?`
      });
      setTimeout(() => setSmartInsight(null), 5000);
    }
  };

  useEffect(() => {
    const savedRecentlyViewed = localStorage.getItem('market_recently_viewed');
    if (savedRecentlyViewed) {
      try {
        setRecentlyViewed(JSON.parse(savedRecentlyViewed));
      } catch (e) {
        handleAiError(e, "Parsing recently viewed");
      }
    }
  }, []);

  const handleViewProduct = async (item: MarketplaceItem) => {
    setSelectedItem(item);
    // Add to recently viewed
    setRecentlyViewed(prev => {
      const updated = [item.id, ...prev.filter(id => id !== item.id)].slice(0, 10);
      try {
        localStorage.setItem('market_recently_viewed', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage quota exceeded for recently viewed', e);
      }
      return updated;
    });

    // Increment view count
    try {
      const adAnalyticsRef = doc(db, 'ad_analytics', item.id);
      const adAnalyticsSnap = await getDoc(adAnalyticsRef);
      
      if (adAnalyticsSnap.exists()) {
        await updateDoc(adAnalyticsRef, {
          views: increment(1),
          lastUpdated: new Date().toISOString()
        });
      } else {
        await setDoc(adAnalyticsRef, {
          adId: item.id,
          sellerId: item.sellerId,
          views: 1,
          clicks: 0,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  };

  const recentlyViewedItems = items.filter(item => recentlyViewed.includes(item.id))
    .sort((a, b) => recentlyViewed.indexOf(a.id) - recentlyViewed.indexOf(b.id));

  const topCategory = Object.entries(categoryClicks)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  
  const topCategoryData = categories.find(c => c.id === topCategory);

  const filteredItems = visualSearchResults 
    ? visualSearchResults 
    : (searchTerm.length > 2 && searchResults?.products) 
      ? searchResults.products
      : items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.title?.toLowerCase() || '').includes(searchLower) || 
      (item.description?.toLowerCase() || '').includes(searchLower) ||
      (item.titleAr && item.titleAr.toLowerCase().includes(searchLower)) ||
      (item.titleEn && item.titleEn.toLowerCase().includes(searchLower)) ||
      (item.descriptionAr && item.descriptionAr.toLowerCase().includes(searchLower)) ||
      (item.descriptionEn && item.descriptionEn.toLowerCase().includes(searchLower));
    
    const matchesCategory = selectedCategory ? (item.categories || []).includes(selectedCategory) : true;
    
    let matchesSellerType = true;
    if (sellerTypeFilter === 'followed') {
      matchesSellerType = profile?.following?.includes(item.sellerId) || false;
    } else if (sellerTypeFilter !== 'all') {
      matchesSellerType = item.sellerRole === sellerTypeFilter;
    }
    
    return matchesSearch && matchesCategory && matchesSellerType;
  });

  const recommendedItems = items
    .filter(item => {
      // Don't show in recommended if it's the user's own item
      if (auth.currentUser && item.sellerId === auth.currentUser.uid) return false;
      
      const itemCats = item.categories || [];
      
      // Prioritize categories the user is interested in
      const hasInterest = itemCats.length > 0 && profile?.categories && Array.isArray(profile.categories) 
        ? itemCats.some(catId => profile.categories.includes(catId))
        : false;
        
      const hasBehavior = itemCats.length > 0 
        ? itemCats.some(catId => (categoryClicks[catId] || 0) > 2)
        : false;
      
      return hasInterest || hasBehavior;
    })
    .sort((a, b) => {
      // Sort by recency and relevance
      const aCats = a.categories || [];
      const bCats = b.categories || [];
      const aScore = aCats.reduce((acc, catId) => acc + (categoryClicks[catId] || 0), 0);
      const bScore = bCats.reduce((acc, catId) => acc + (categoryClicks[catId] || 0), 0);
      return bScore - aScore;
    })
    .slice(0, 8);

  const trendingItems = items
    .filter(item => {
      // Trending near user's location
      const matchesLocation = profile?.location && item.location 
        ? item.location.toLowerCase().includes(profile.location.toLowerCase())
        : true;
      return matchesLocation && (item.views || 0) > 5;
    })
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 8);

  const glassClass = "bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/30 dark:border-slate-700/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]";
  const ribbonClass = "bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl border border-white/40 dark:border-slate-700/60 shadow-2xl shadow-brand-primary/10";

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [40]
      };
      navigator.vibrate(patterns[type]);
    }
  };

  return (
    <div className="min-h-screen bg-brand-background pb-32 overflow-x-hidden">
      <div className="p-4">
        <NeuralFluidSlider />
      </div>
      {/* Smart Insight Toast */}
      <AnimatePresence>
        {smartInsight && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[60] w-[90%] max-w-md"
          >
            <div className="bg-brand-primary text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-xl">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <p className="text-sm font-bold leading-tight">
                {isRtl ? smartInsight.ar : smartInsight.en}
              </p>
              <button 
                onClick={() => setSmartInsight(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Neural Pulse 2.0 - Smart Floating Bar (Primary Interface) */}
      <AnimatePresence>
        {showPulseBar && (
          <NeuralPulseBar
            isRtl={isRtl}
            neuralPulse={neuralPulse}
            isMinimized={isMinimized}
            onClose={() => setShowPulseBar(false)}
            onVoiceSearch={handleVoiceSearch}
            onVisualSearch={() => setShowVisualSearch(true)}
            onSmartExplorer={() => setShowSmartCategories(true)}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isListening={isListening}
            sellerTypeFilter={sellerTypeFilter}
            setSellerTypeFilter={setSellerTypeFilter}
            categories={categories}
            activeCategory={selectedCategory}
            setActiveCategory={setSelectedCategory}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isAdmin={isAdmin}
            isSupplier={isSupplier}
            showAdminHub={showAdminHub}
            setShowAdminHub={setShowAdminHub}
            onAddProduct={() => setShowAddModal(true)}
            onOpenEconomyHub={() => setShowEconomyHub(true)}
            profile={profile}
          />
        )}
      </AnimatePresence>

      {/* Restore Bar Trigger (if hidden) */}
      <AnimatePresence>
        {!showPulseBar && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.1}
            dragConstraints={{ 
              top: 0, 
              left: isRtl ? -window.innerWidth + 100 : 0, 
              right: isRtl ? 0 : window.innerWidth - 100, 
              bottom: window.innerHeight - 100 
            }}
            onDragEnd={(_, info) => {
              const newPos = { x: restoreBtnPos.x + info.offset.x, y: restoreBtnPos.y + info.offset.y };
              setRestoreBtnPos(newPos);
              localStorage.setItem('pulse_restore_pos', JSON.stringify(newPos));
            }}
            initial={restoreBtnPos}
            animate={restoreBtnPos}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`fixed ${isRtl ? 'right-6' : 'left-6'} top-6 z-[60] hidden md:block`}
          >
            <HapticButton
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setShowPulseBar(true)}
              className="w-12 h-12 bg-brand-primary text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
            >
              <BrainCircuit size={24} className="animate-pulse" />
            </HapticButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 pt-24 md:pt-32 pb-8">
        {/* Hero Search Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="relative p-4 rounded-3xl bg-transparent overflow-hidden group md:hidden">
            <div className="relative z-10 max-w-3xl mx-auto text-center">
              <div className="relative group/search max-w-2xl mx-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary/20 to-brand-teal/20 rounded-2xl blur opacity-25 group-focus-within/search:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center bg-white dark:bg-slate-900 border border-brand-border rounded-2xl p-2 shadow-xl">
                  <div className="pl-4 text-brand-text-muted">
                    <Search size={20} />
                  </div>
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={isRtl ? 'ابحث عن منتجات، موردين، أو فئات...' : 'Search for products, suppliers, or categories...'}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm md:text-base font-bold text-brand-text-main placeholder-brand-text-muted/50 py-3 px-2"
                  />
                  <div className="flex items-center gap-1 pr-1">
                    <HapticButton
                      onClick={handleVoiceSearch}
                      className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-brand-primary/10 text-brand-text-muted hover:text-brand-primary'}`}
                    >
                      <Mic size={18} />
                    </HapticButton>
                    <HapticButton
                      onClick={() => setShowVisualSearch(true)}
                      className="p-2.5 rounded-xl hover:bg-brand-primary/10 text-brand-text-muted hover:text-brand-primary transition-all"
                    >
                      <Camera size={18} />
                    </HapticButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Admin Hub Integration */}
        {isAdmin && showAdminHub && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 mb-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BroadcastBox i18n={i18n} allUsers={suppliers} size="compact" />
              <div className={`p-6 rounded-[2rem] ${glassClass} flex flex-col justify-center items-center text-center`}>
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-4">
                  <Database size={32} />
                </div>
                <h3 className="text-lg font-black text-brand-text-main mb-2">{isRtl ? 'إدارة البيانات' : 'Data Management'}</h3>
                <p className="text-sm text-brand-text-muted mb-6">{isRtl ? 'تصدير وتحليل بيانات المستخدمين والموردين' : 'Export and analyze user and supplier data'}</p>
                <HapticButton className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20">
                  {isRtl ? 'فتح الدليل' : 'Open Directory'}
                </HapticButton>
              </div>
            </div>
          </motion.div>
        )}

        {/* Supplier Spotlight */}
        {searchTerm === '' && !selectedCategory && sellerTypeFilter === 'all' && (
          <SupplierSpotlight 
            suppliers={suppliers} 
            onViewProfile={onViewProfile} 
            isRtl={isRtl} 
          />
        )}

        {/* Predictive Matches Section */}
        <PredictiveMatchSection 
          matches={predictiveMatches}
          suppliers={suppliers}
          onViewProfile={onViewProfile}
          isRtl={isRtl}
        />

        {/* Recommended for You Section */}
        {recommendedItems.length > 0 && !selectedCategory && searchTerm === '' && sellerTypeFilter === 'all' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {isRtl ? 'مقترح لك بذكاء' : 'Smartly Recommended'}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium">
                    {isRtl ? 'بناءً على اهتماماتك وسلوكك' : 'Based on your interests and behavior'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {recommendedItems.map((item) => (
                <div key={item.id} className="w-[200px] shrink-0">
                  <ProductCard
                    item={item}
                    onOpenChat={onOpenChat}
                    onViewDetails={() => handleViewProduct(item)}
                    onViewProfile={onViewProfile}
                    isOwner={profile?.uid === item.sellerId}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onEdit={(item) => setEditingItem(item)}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Trending Near You Section */}
        {trendingItems.length > 0 && !selectedCategory && searchTerm === '' && sellerTypeFilter === 'all' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {isRtl ? 'رائج بالقرب منك' : 'Trending Near You'}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium">
                    {isRtl 
                      ? `أكثر المنتجات طلباً في ${profile?.location || 'منطقتك'}` 
                      : `Most requested items in ${profile?.location || 'your area'}`}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {trendingItems.map((item) => (
                <div key={item.id} className="w-[200px] shrink-0">
                  <ProductCard
                    item={item}
                    onOpenChat={onOpenChat}
                    onViewDetails={() => handleViewProduct(item)}
                    onViewProfile={onViewProfile}
                    isOwner={profile?.uid === item.sellerId}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onEdit={(item) => setEditingItem(item)}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recently Viewed Section */}
        {recentlyViewedItems.length > 0 && !selectedCategory && searchTerm === '' && sellerTypeFilter === 'all' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-teal/10 flex items-center justify-center text-brand-teal">
                  <Heart size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {isRtl ? 'شاهدته مؤخراً' : 'Recently Viewed'}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium">
                    {isRtl ? 'المنتجات التي تصفحتها في زياراتك الأخيرة' : 'Items you explored in your recent visits'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {recentlyViewedItems.map((item) => (
                <div key={item.id} className="w-[280px] shrink-0">
                  <ProductCard
                    item={item}
                    onOpenChat={onOpenChat}
                    onViewDetails={() => handleViewProduct(item)}
                    onViewProfile={onViewProfile}
                    isOwner={profile?.uid === item.sellerId}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onEdit={(item) => setEditingItem(item)}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Visual Search Active State */}
        <AnimatePresence>
          {visualSearchResults !== null && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Camera size={20} />
                  </div>
                  <div>
                    <h3 className="text-brand-primary text-sm font-black">
                      {isRtl ? 'نتائج البحث البصري' : 'Visual Search Results'}
                    </h3>
                    <p className="text-slate-500 text-xs font-medium">
                      {isRtl 
                        ? `تم العثور على ${visualSearchResults.length} منتج مطابق` 
                        : `Found ${visualSearchResults.length} matching items`}
                    </p>
                  </div>
                </div>
                
                <HapticButton
                  onClick={() => setVisualSearchResults(null)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <X size={20} />
                </HapticButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Toggle */}
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            {isRtl ? 'اكتشف المنتجات' : 'Discover Products'}
          </h2>
          <div className="flex items-center gap-2 bg-brand-surface p-1 rounded-xl border border-brand-border">
            <button
              onClick={() => setViewStyle('canvas')}
              className={`p-2 rounded-lg transition-colors hidden md:flex ${viewStyle === 'canvas' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:text-brand-primary'}`}
              title={isRtl ? 'عرض اللوحة' : 'Canvas View'}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewStyle('grid')}
              className={`p-2 rounded-lg transition-colors ${viewStyle === 'grid' ? 'bg-brand-primary text-white' : 'text-brand-text-muted hover:text-brand-primary'}`}
              title={isRtl ? 'عرض الشبكة' : 'Grid View'}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {itemsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {[...Array(10)].map((_, i) => <ProductCardSkeleton key={`skeleton-${i}`} />)}
          </div>
        ) : activeTab === 'requests' ? (
          <div className="space-y-8">
            <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Zap size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-text-main">
                    {isRtl ? 'بث طلبات المنتجات' : 'Product Request Broadcast'}
                  </h3>
                  <p className="text-sm text-brand-text-muted font-medium">
                    {isRtl ? 'اطلب ما تحتاجه وسيقوم الموردون بتقديم عروضهم لك.' : 'Request what you need and suppliers will make offers to you.'}
                  </p>
                </div>
              </div>
              <HapticButton 
                onClick={() => setShowRequestForm(true)}
                className="px-8 py-4 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-primary/20 flex items-center gap-2"
              >
                <Plus size={20} />
                {isRtl ? 'نشر طلب جديد' : 'Post New Request'}
              </HapticButton>
            </div>

            <RequestFeed 
              profile={profile!} 
              isRtl={isRtl} 
              onMakeOffer={(req) => setSelectedRequestForOffer(req)} 
            />
          </div>
        ) : filteredItems.length > 0 ? (
          viewStyle === 'canvas' ? (
            <ProductDiscoveryCanvas 
              items={filteredItems} 
              categories={categories}
              onSelectItem={setSelectedItem}
              onLike={(id) => {
                // Implement like logic if needed
              }}
              onShare={(item) => {
                if (navigator.share) {
                  navigator.share({
                    title: isRtl ? item.titleAr : item.titleEn,
                    text: isRtl ? item.descriptionAr : item.descriptionEn,
                    url: window.location.href,
                  });
                }
              }}
            />
          ) : (
            <motion.div 
              layout
              className={`grid ${getGridColsClass(gridSettings.mobileCols)} md:${getGridColsClass(gridSettings.webCols)} gap-4 md:gap-6`}
              style={{ gap: `${gridSettings.gap}px` }}
            >
              <AnimatePresence>
                {itemsLoading ? (
                  [...Array(10)].map((_, i) => <ProductCardSkeleton key={`skeleton-${i}`} />)
                ) : (
                  filteredItems.map(item => (
                    <ProductCard 
                      key={item.id} 
                      item={item} 
                      onOpenChat={onOpenChat}
                      onViewDetails={() => handleViewProduct(item)}
                      onViewProfile={onViewProfile}
                      isOwner={profile?.uid === item.sellerId}
                      isAdmin={isAdmin}
                      onDelete={handleDelete}
                      onEdit={(item) => setEditingItem(item)}
                    />
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-24 h-24 rounded-full ${glassClass} flex items-center justify-center mb-6`}>
              <Search size={40} className="text-brand-text-muted opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-brand-text-main mb-2">
              {isRtl ? 'لم نجد أي منتجات' : 'No products found'}
            </h3>
            <p className="text-brand-text-muted max-w-md">
              {isRtl 
                ? 'جرب البحث بكلمات مختلفة أو إزالة الفلاتر المحددة لرؤية المزيد من المنتجات.' 
                : 'Try searching with different keywords or removing filters to see more products.'}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showRequestForm && (
          <SmartRequestForm 
            profile={profile!} 
            isRtl={isRtl} 
            onClose={() => setShowRequestForm(false)} 
            onSuccess={() => setShowRequestForm(false)} 
          />
        )}
      </AnimatePresence>

      <MakeOfferModal 
        isOpen={!!selectedRequestForOffer}
        onClose={() => setSelectedRequestForOffer(null)}
        request={selectedRequestForOffer}
        profile={profile!}
        isRtl={isRtl}
      />

      {/* Smart Upload Modal */}
      <AnimatePresence>
        {showAddModal && (
          <SmartUploadModal
            onClose={() => setShowAddModal(false)}
            onAdd={() => setShowAddModal(false)}
            categories={categories}
            profile={profile!}
          />
        )}
      </AnimatePresence>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedItem && (
          <ProductDetailsModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onContactSeller={() => {
              if (!auth.currentUser) return;
              const chatId = [auth.currentUser.uid, selectedItem.sellerId].sort().join('_');
              onOpenChat(chatId);
            }}
            onViewProfile={onViewProfile}
          />
        )}
      </AnimatePresence>

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingItem && (
          <EditProductModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onUpdate={() => setEditingItem(null)}
            categories={categories}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                {isRtl ? 'هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this product? This action cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  onClick={() => confirmDelete().catch(err => handleFirestoreError(err, OperationType.UPDATE, `marketplace/${itemToDelete?.id}`, false))}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  {isRtl ? 'حذف' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <VisualSearchModal
        isOpen={showVisualSearch}
        onClose={() => setShowVisualSearch(false)}
        items={items}
        onResultsFound={(results, keywords) => {
          setVisualSearchResults(results as MarketplaceItem[]);
        }}
      />

      <AnimatePresence>
        {showSmartCategories && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[120] bg-brand-background md:p-4"
          >
            <div className="absolute top-4 right-4 z-50">
              <HapticButton 
                onClick={() => setShowSmartCategories(false)}
                className="w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full flex items-center justify-center text-brand-text-main shadow-lg border border-brand-border/50"
              >
                <X size={20} />
              </HapticButton>
            </div>
            <SmartCategoryExplorer 
              categories={categories}
              onVisualSearch={() => {
                setShowSmartCategories(false);
                setShowVisualSearch(true);
              }}
              onSelectCategory={(categoryId, subcategoryId) => {
                setSelectedCategory(categoryId);
                setShowSmartCategories(false);
              }}
              onHoverCategory={prefetchCategoryItems}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showEconomyHub && (
          <NeuralEconomyHub 
            profile={profile} 
            isRtl={isRtl} 
            onClose={() => setShowEconomyHub(false)} 
          />
        )}
      </AnimatePresence>

      {/* Neural Command Center */}
      <NeuralCommandCenter 
        isOpen={isCommandCenterOpen}
        onClose={() => setIsCommandCenterOpen(false)}
        isRtl={isRtl}
        tabs={[
          { id: 'overview', label: isRtl ? 'نظرة عامة' : 'Overview', icon: LayoutGrid },
          { id: 'strategy', label: isRtl ? 'استراتيجية المنصة' : 'Platform Strategy', icon: Shield },
          { id: 'suppliers', label: isRtl ? 'موردون موثوقون' : 'Trusted Suppliers', icon: Building2 },
          { id: 'analysis', label: isRtl ? 'تحليل السوق' : 'Market Analysis', icon: BarChart3 },
          { id: 'trends', label: isRtl ? 'ماركت ترند' : 'Market Trends', icon: TrendingUp },
        ]}
        onNavigate={(tab) => {
          // Handle navigation logic here
          console.log('Navigate to:', tab);
        }}
      />

      {/* Mobile Floating Action Buttons */}
      <div className="fixed bottom-24 right-6 z-[60] sm:hidden flex flex-col gap-4">
        <HapticButton
          onClick={() => setIsCommandCenterOpen(true)}
          className="w-14 h-14 bg-brand-surface text-brand-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border border-brand-border"
        >
          <Menu size={28} />
        </HapticButton>
        
        <AnimatePresence>
          {profile && isMinimized && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 50 }}
            >
              <HapticButton
                onClick={() => setShowAddModal(true)}
                className="w-14 h-14 bg-brand-primary text-white rounded-full shadow-2xl shadow-brand-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white dark:border-slate-900"
              >
                <Plus size={28} />
              </HapticButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
