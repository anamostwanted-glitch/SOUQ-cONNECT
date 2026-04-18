import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FluidSlider } from './FluidSlider';
import { PredictiveMatchSection } from './PredictiveMatchSection';
import { fetchMarketplaceItems, fetchMarketTrends, fetchSuppliers, searchMarketplaceAndSuppliers, fetchPredictiveMatches } from '../services/marketService';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Wallet,
  Loader2
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
import { SEOHead } from '../../../shared/components/SEOHead';
import { ProductDiscoveryCanvas } from './ProductDiscoveryCanvas';
import { SmartRequestForm } from './SmartRequestForm';
import { RequestFeed } from './RequestFeed';
import { ProfessionalHub } from './ProfessionalHub';
import { MakeOfferModal } from './MakeOfferModal';
import { BroadcastBox } from './BroadcastBox';
import { ScrollDirection, useScrollDirection } from '../../../shared/hooks/useScrollDirection';

interface MarketInterfaceProps {
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  activeTab?: 'discover' | 'services' | 'myshop' | 'requests';
  setActiveTab?: (tab: 'discover' | 'services' | 'myshop' | 'requests') => void;
  initialItemId?: string | null;
}

import { useAuth } from '../../../core/providers/AuthProvider';
import { useSettings } from '../../../core/providers/SettingsProvider';
import { useCategories } from '../../../core/providers/CategoryProvider';
import { CategoryNavTray } from './CategoryNavTray';

import { GlobalCurrencyToggle } from '../../../shared/components/GlobalCurrencyToggle';
import { useGlobalMarket } from '../../../core/providers/GlobalMarketProvider';

export const MarketInterface: React.FC<MarketInterfaceProps> = ({ 
  onOpenChat, 
  onViewProfile,
  activeTab: externalActiveTab,
  setActiveTab: setExternalActiveTab,
  initialItemId
}) => {
  const { t, i18n } = useTranslation();
  const { profile, viewMode } = useAuth();
  const { settings, features } = useSettings();
  const { currency, setCurrency, isSyncing, greeting, nuance, region } = useGlobalMarket();
  const { categories } = useCategories();
  const queryClient = useQueryClient();
  const isRtl = i18n.language === 'ar';
  const scrollDirection = useScrollDirection();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMinimized = scrollDirection === ScrollDirection.DOWN;
  
  const [internalActiveTab, setInternalActiveTab] = useState<'discover' | 'services' | 'myshop' | 'requests'>('discover');
  
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = (tab: 'discover' | 'services' | 'myshop' | 'requests') => {
    if (setExternalActiveTab) {
      setExternalActiveTab(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');

  // Basic state for now
  // handleGlobalSearch will use the moved state

  // Handle global search events
  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      if (e.detail?.query) {
        setSearchTerm(e.detail.query);
        setActiveTab('discover');
      }
    };
    window.addEventListener('global-search', handleGlobalSearch);
    return () => window.removeEventListener('global-search', handleGlobalSearch);
  }, []);
  const [showAdminHub, setShowAdminHub] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedRequestForOffer, setSelectedRequestForOffer] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [showSmartCategories, setShowSmartCategories] = useState(false);
  
  // 3-Tier Navigation State
  const [selectedHubId, setSelectedHubId] = useState<string | undefined>();
  const [selectedSectorId, setSelectedSectorId] = useState<string | undefined>();
  const [selectedNicheId, setSelectedNicheId] = useState<string | undefined>();

  // Core Team: AI Search Refinement State
  const [searchRefinements, setSearchRefinements] = useState<string[]>([]);
  const [isSearchingAI, setIsSearchingAI] = useState(false);

  const isSearchHidden = scrollDirection === ScrollDirection.DOWN && windowWidth < 768;

  // AI-Driven Search Refinement
  useEffect(() => {
    if (searchTerm.length > 2) {
      const timer = setTimeout(async () => {
        setIsSearchingAI(true);
        try {
          const { suggestCategoriesFromQuery } = await import('../../../core/services/geminiService');
          const suggestedIds = await suggestCategoriesFromQuery(searchTerm, categories, i18n.language);
          const suggestedNames = suggestedIds
            .map(id => {
              const cat = categories.find(c => c.id === id);
              return cat ? (isRtl ? cat.nameAr : cat.nameEn) : null;
            })
            .filter(Boolean) as string[];
          
          setSearchRefinements(suggestedNames);
        } catch (error) {
          console.error('Search refinement failed:', error);
        } finally {
          setIsSearchingAI(false);
        }
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setSearchRefinements([]);
    }
  }, [searchTerm, categories, isRtl, i18n.language]);

  useEffect(() => {
    if (initialItemId) {
      const fetchInitialItem = async () => {
        try {
          const itemSnap = await getDoc(doc(db, 'marketplace', initialItemId));
          if (itemSnap.exists()) {
            setSelectedItem({ id: itemSnap.id, ...itemSnap.data() } as MarketplaceItem);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `marketplace/${initialItemId}`, false);
        }
      };
      fetchInitialItem();
    }
  }, [initialItemId]);

  const { data: itemsData = { items: [], lastDoc: null }, isLoading: itemsLoading } = useQuery({
    queryKey: ['marketplace', activeTab, profile?.uid],
    queryFn: () => fetchMarketplaceItems(activeTab, profile?.uid),
    enabled: !!profile || activeTab === 'discover',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false
  });
  
  const items = itemsData.items;

  // Demand-Driven Taxonomy: Identify active categories
  const activeCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach(item => {
      item.categories?.forEach(catId => ids.add(catId));
    });
    return ids;
  }, [items]);

  const filteredCategories = useMemo(() => {
    const rawCategories = !activeCategoryIds.size 
      ? categories 
      : categories.filter(cat => {
          // Is this category active?
          if (activeCategoryIds.has(cat.id)) return true;
          
          // Do any of its descendants have products?
          const hasActiveDescendant = (parentId: string): boolean => {
            const children = categories.filter(c => c.parentId === parentId);
            return children.some(child => activeCategoryIds.has(child.id) || hasActiveDescendant(child.id));
          };
          
          return hasActiveDescendant(cat.id);
        });

    // Core Team: Ensure absolute uniqueness of category objects by ID
    return Array.from(new Map(rawCategories.map(c => [c.id, c])).values());
  }, [categories, activeCategoryIds]);

  // Adaptive Grid Calculation - Moved down below filteredItems
  const [visualSearchResults, setVisualSearchResults] = useState<MarketplaceItem[] | null>(null);

  const filteredItems = (visualSearchResults 
    ? visualSearchResults 
    : items).filter(item => {
    const searchLower = searchTerm.toLowerCase();
    
    // Core Team Enhancement: Hierarchical Category Filtering
    const activeCategoryId = selectedNicheId || selectedSectorId || selectedHubId;
    if (activeCategoryId) {
      if (!item.categories?.includes(activeCategoryId)) {
        // Find if the item belongs to any descendant of the filter
        const itemCategories = categories.filter(c => item.categories?.includes(c.id));
        const isDescendant = itemCategories.some(c => {
          let current: any = c;
          while (current) {
            if (current.id === activeCategoryId) return true;
            if (current.parentId) {
               current = categories.find(cat => cat.id === current.parentId);
            } else {
              current = null;
            }
          }
          return false;
        });
        if (!isDescendant) return false;
      }
    }

    // Existing Discover View Filter: Strictly separate products and services
    const isServiceItem = categories.filter(c => item.categories?.includes(c.id)).some(c => {
      let current: any = c;
      while (current) {
        if (current.categoryType === 'service') return true;
        if (current.parentId) {
          current = categories.find(cat => cat.id === current.parentId);
        } else {
          current = null;
        }
      }
      return false;
    });
    
    if (activeTab === 'discover' && isServiceItem) return false;
    if (activeTab === 'services' && !isServiceItem) return false;

    const matchesSearch = 
      (item.title?.toLowerCase() || '').includes(searchLower) || 
      (item.description?.toLowerCase() || '').includes(searchLower) ||
      (item.titleAr && item.titleAr.toLowerCase().includes(searchLower)) ||
      (item.titleEn && item.titleEn.toLowerCase().includes(searchLower)) ||
      (item.descriptionAr && item.descriptionAr.toLowerCase().includes(searchLower)) ||
      (item.descriptionEn && item.descriptionEn.toLowerCase().includes(searchLower));
    
    return matchesSearch;
  });

  const gridCols = React.useMemo(() => {
    const isMobile = windowWidth < 768;
    const defaultMobileCols = 2;
    const defaultWebCols = 4;
    
    if (settings?.gridSettings) {
      if (settings.gridSettings.aiAutoPilot) {
        if (isMobile) {
          return filteredItems.length > 10 ? 2 : 1;
        } else {
          return windowWidth > 1400 ? 5 : windowWidth > 1024 ? 4 : 3;
        }
      }
      return isMobile ? (settings.gridSettings.mobileCols || defaultMobileCols) : (settings.gridSettings.webCols || defaultWebCols);
    }
    return isMobile ? defaultMobileCols : defaultWebCols;
  }, [windowWidth, settings?.gridSettings, filteredItems.length]);
  
  return (
    <div className="min-h-screen bg-brand-background pb-32 overflow-x-hidden">
      <SEOHead 
        title={
          activeTab === 'discover' ? (isRtl ? 'سوق الجملة والمنتجات' : 'Wholesale Product Marketplace') :
          activeTab === 'requests' ? (isRtl ? 'بث طلبات المنتجات' : 'Product Request Broadcast') :
          activeTab === 'services' ? (isRtl ? 'رادار الخبراء والخدمات' : 'Expert & Service Radar') :
          (isRtl ? 'السوق الذكي' : 'Smart Marketplace')
        }
        description={isRtl 
          ? 'اكتشف أفضل الموردين والمنتجات والخدمات المهنية في مكان واحد. بوابتك لنمو أعمالك في الشرق الأوسط.' 
          : 'Discover the best suppliers, products, and professional services in one place. Your gateway to business growth.'
        }
        keywords={isRtl 
          ? ['سوق جملة', 'الشرق الأوسط', 'خدمات أعمال', 'موردين', 'تجارة إلكترونية B2B'] 
          : ['wholesale market', 'middle east', 'business services', 'suppliers', 'B2B ecommerce']
        }
      />
      {/* Search Section */}
      <motion.div 
        animate={{ 
          height: isSearchHidden ? 0 : 'auto',
          opacity: isSearchHidden ? 0 : 1,
          marginBottom: isSearchHidden ? 0 : 32,
          y: isSearchHidden ? -20 : 0
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="max-w-7xl mx-auto px-4 pt-6 overflow-hidden hidden md:block" // Hidden on mobile via motion if we want, but let's use responsive classes
      >
        <div className={`flex flex-col md:flex-row items-center justify-between gap-4 ${isSearchHidden ? 'pointer-events-none' : ''}`}>
          <div className="flex-1 w-full max-w-2xl">
            <div className="relative group/search">
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
                    onClick={() => setShowVisualSearch(true)}
                    className="p-2.5 rounded-xl hover:bg-brand-primary/10 text-brand-text-muted hover:text-brand-primary transition-all"
                  >
                    <Camera size={18} />
                  </HapticButton>
                </div>
              </div>

              {/* AI Search Refinements Tray */}
              <AnimatePresence>
                {searchRefinements.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-brand-border rounded-2xl shadow-2xl p-4 z-50 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-brand-primary animate-pulse" />
                      <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-[0.2em]">
                        {isRtl ? 'مقترحات ذكية' : 'AI Refinements'}
                      </span>
                      {isSearchingAI && <Loader2 size={12} className="animate-spin text-brand-primary ml-auto" />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchRefinements.map((refinement, idx) => (
                        <button
                          key={`${refinement}-${idx}`}
                          onClick={() => {
                            setSearchTerm(refinement);
                            setSearchRefinements([]);
                          }}
                          className="px-3 py-1.5 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-lg transition-all border border-brand-primary/10"
                        >
                          {refinement}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlobalCurrencyToggle 
              currentCurrency={currency} 
              onCurrencyChange={setCurrency} 
            />
            <HapticButton
              onClick={() => setShowSmartCategories(true)}
              className="px-6 py-3 bg-brand-primary/10 text-brand-primary rounded-xl font-bold flex items-center gap-2 hover:bg-brand-primary/20 transition-all"
            >
              <Sparkles size={18} />
              {isRtl ? 'استكشاف ذكي' : 'Smart Explorer'}
            </HapticButton>
            <HapticButton
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand-primary/20 hover:scale-105 transition-all"
            >
              <Plus size={18} />
              {isRtl ? 'إضافة منتج' : 'Add Product'}
            </HapticButton>
          </div>
        </div>
      </motion.div>

      {/* Mobile-Only Search Floating/Auto-hide Bar */}
      <div className="md:hidden sticky top-0 z-[40] bg-brand-background/80 backdrop-blur-md border-b border-brand-border px-4 py-3 transition-transform duration-300" style={{ transform: isSearchHidden ? 'translateY(-100%)' : 'translateY(0)' }}>
         <div className="relative flex items-center bg-white dark:bg-slate-900 border border-brand-border rounded-xl p-1 shadow-sm">
            <div className="pl-3 text-brand-text-muted">
              <Search size={16} />
            </div>
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRtl ? 'بحث...' : 'Search...'}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-brand-text-main placeholder-brand-text-muted/50 py-1.5 px-1"
            />
            <HapticButton onClick={() => setShowVisualSearch(true)} className="p-2 text-brand-text-muted border-l border-brand-border ml-1">
               <Camera size={16} />
            </HapticButton>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Global Market Pulse Banner */}
        <AnimatePresence>
          {(greeting || nuance) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Globe size={20} className={isSyncing ? 'animate-spin' : ''} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-brand-text-main flex items-center gap-2">
                       {greeting || (isRtl ? 'أهلاً بك في السوق العالمي' : 'Welcome to Global Market')}
                       <span className="px-1.5 py-0.5 bg-brand-primary text-white text-[9px] rounded-md font-bold uppercase tracking-wider">{region}</span>
                    </h4>
                    <p className="text-xs text-brand-text-muted font-medium mt-0.5">
                       {nuance || (isRtl ? 'جاري مزامنة بيانات السوق الإقليمية...' : 'Syncing regional market data...')}
                    </p>
                  </div>
                </div>
                {isSyncing && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-lg">
                    <Loader2 size={12} className="animate-spin text-brand-primary" />
                    <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">{isRtl ? 'مزامنة' : 'Syncing'}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl mb-6 w-fit md:mb-8">
          <button
            onClick={() => { setActiveTab('discover'); setShowAdminHub(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'discover' && !showAdminHub
                ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {isRtl ? 'اكتشف' : 'Discover'}
          </button>
          <button
            onClick={() => { setActiveTab('requests'); setShowAdminHub(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'requests' && !showAdminHub
                ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {isRtl ? 'الطلبات' : 'Requests'}
          </button>
          <button
            onClick={() => { setActiveTab('services'); setShowAdminHub(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'services' && !showAdminHub
                ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {isRtl ? 'خبراء' : 'Experts'}
          </button>
          {profile && (
            <button
              onClick={() => { setActiveTab('myshop'); setShowAdminHub(false); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === 'myshop' && !showAdminHub
                  ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag size={12} />
              {isRtl ? 'متجري' : 'My Hub'}
            </button>
          )}
          {profile?.role === 'admin' && (
            <button
              onClick={() => setShowAdminHub(true)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                showAdminHub
                  ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield size={12} />
              {isRtl ? 'الإدارة' : 'Admin'}
            </button>
          )}
        </div>

        {/* 3-Tier Professional Category Navigation */}
        {activeTab === 'discover' && (
          <CategoryNavTray 
            categories={filteredCategories}
            selectedHubId={selectedHubId}
            selectedSectorId={selectedSectorId}
            selectedNicheId={selectedNicheId}
            onSelectHub={setSelectedHubId}
            onSelectSector={setSelectedSectorId}
            onSelectNiche={setSelectedNicheId}
            isRtl={isRtl}
          />
        )}
        
        {/* Content */}
        {activeTab === 'requests' ? (
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
        ) : activeTab === 'services' ? (
          <ProfessionalHub 
            categories={categories}
            profile={profile}
            onViewProfile={onViewProfile}
            onOpenChat={onOpenChat}
            isRtl={isRtl}
          />
        ) : activeTab === 'myshop' ? (
          <SellerHub 
            profile={profile!}
            categories={categories}
            onEditItem={(item) => setEditingItem(item)}
            isRtl={isRtl}
          />
        ) : showAdminHub ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom duration-700">
            <div className="p-8 bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:border-brand-primary/30 transition-all">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                <ShieldCheck size={120} />
              </div>
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-6">
                <Database size={28} />
              </div>
              <h3 className="text-xl font-black text-brand-text-main mb-2">{isRtl ? 'نظرة عامة على الإدارة' : 'Marketplace Oversight'}</h3>
              <p className="text-sm text-brand-text-muted mb-8 leading-relaxed">
                {isRtl ? 'تحكم في نشاط السوق، راقب الموردين الجدد، وقم بالموافقة على الطلبات المعلقة.' : 'Control market activity, monitor new suppliers, and approve pending requests.'}
              </p>
              
              <div className="flex flex-wrap gap-4">
                 <div className="px-4 py-2 bg-brand-background rounded-xl border border-brand-border flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-amber animate-pulse" />
                    <span className="text-xs font-bold text-brand-text-main">
                      {isRtl ? 'طلبات معلقة: 12' : '12 Pending Requests'}
                    </span>
                 </div>
                 <div className="px-4 py-2 bg-brand-background rounded-xl border border-brand-border flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                    <span className="text-xs font-bold text-brand-text-main">
                      {isRtl ? 'موردين غير موثقين: 5' : '5 Unverified Suppliers'}
                    </span>
                 </div>
              </div>

              <HapticButton 
                onClick={() => {
                  // Direct user to the actual Admin Dashboard
                  window.dispatchEvent(new CustomEvent('change-view', { detail: 'admin' }));
                }}
                className="mt-8 w-full py-4 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-primary-hover shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} className={isRtl ? '' : 'rotate-180'} />
                {isRtl ? 'الانتقال للوحة التحكم الكاملة' : 'Go to Full Hub'}
              </HapticButton>
            </div>

            <div className="p-8 bg-brand-primary text-white rounded-[2.5rem] shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                 <Zap size={100} />
               </div>
               <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-6">
                 <TrendingUp size={28} />
               </div>
               <h3 className="text-xl font-black mb-2">{isRtl ? 'النمو الاستراتيجي' : 'Strategic Growth'}</h3>
               <p className="text-sm opacity-80 mb-8 leading-relaxed">
                 {isRtl ? 'تحليل النبض الذكي يكشف عن نمو بنسبة 14٪ في قطاع الإلكترونيات هذا الأسبوع.' : 'Neural Pulse analysis reveals 14% growth in the Electronics sector this week.'}
               </p>
               <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-white"
                 />
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Core Team: Grouped Discover Feed */}
            {activeTab === 'discover' && !selectedHubId && !searchTerm ? (
              // Grouped View (Demand-Driven)
              filteredCategories.filter(cat => cat.tier === 'hub' || !cat.parentId).map(hub => {
                const hubItemsRaw = filteredItems.filter(item => {
                    const itemCats = categories.filter(c => item.categories?.includes(c.id));
                    return itemCats.some(c => {
                        let cur: any = c;
                        while(cur) {
                            if (cur.id === hub.id) return true;
                            cur = cur.parentId ? categories.find(p => p.id === cur.parentId) : null;
                        }
                        return false;
                    });
                });
                
                // Core Team: Deduplicate items within the hub group to prevent key collisions
                const hubItems = Array.from(new Map(hubItemsRaw.map(item => [item.id, item])).values());
                
                if (hubItems.length === 0) return null;

                return (
                  <div key={hub.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-brand-text-main flex items-center gap-2">
                         <span className="w-1.5 h-6 bg-brand-primary" />
                         {isRtl ? hub.nameAr : hub.nameEn}
                      </h3>
                      <button 
                        onClick={() => setSelectedHubId(hub.id)}
                        className="text-xs font-bold text-brand-primary hover:underline"
                      >
                         {isRtl ? 'عرض الكل' : 'View All'}
                      </button>
                    </div>
                    <div 
                      className="grid"
                      style={{ 
                        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                        gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '2px' : `${settings?.gridSettings?.gap || 16}px`
                      }}
                    >
                      {hubItems.map((item, idx) => (
                        <ProductCard 
                          key={item.id || `hub-item-${hub.id}-${idx}`} 
                          item={item} 
                          onOpenChat={onOpenChat}
                          onViewDetails={() => setSelectedItem(item)}
                          onViewProfile={onViewProfile}
                          isOwner={profile?.uid === item.sellerId}
                          isAdmin={profile?.role === 'admin'}
                          onDelete={() => {}}
                          onEdit={() => setEditingItem(item)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Flat View (When filter/search is active)
              <div 
                className="grid"
                style={{ 
                  gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                  gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '2px' : `${settings?.gridSettings?.gap || 16}px`
                }}
              >
                {Array.from(new Map(filteredItems.map(item => [item.id, item])).values()).map((item, idx) => (
                  <ProductCard 
                    key={item.id || `market-item-${idx}`} 
                    item={item} 
                    onOpenChat={onOpenChat}
                    onViewDetails={() => setSelectedItem(item)}
                    onViewProfile={onViewProfile}
                    isOwner={profile?.uid === item.sellerId}
                    isAdmin={profile?.role === 'admin'}
                    onDelete={() => {}}
                    onEdit={() => setEditingItem(item)}
                  />
                ))}
              </div>
            )}
            
            {filteredItems.length === 0 && (
              <div className="py-20 text-center bg-brand-surface border border-dashed border-brand-border">
                <div className="w-16 h-16 bg-brand-background flex items-center justify-center mx-auto mb-4 text-brand-text-muted">
                  <Package size={32} />
                </div>
                <h3 className="text-xl font-black text-brand-text-main">
                  {isRtl ? 'لا توجد منتجات متاحة' : 'No Products Available'}
                </h3>
                <p className="text-sm text-brand-text-muted max-w-xs mx-auto mt-2">
                  {isRtl ? 'حاول تغيير معايير البحث أو استكشاف فئات أخرى.' : 'Try changing search criteria or explore other categories.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <SmartUploadModal
          onClose={() => setShowAddModal(false)}
          onAdd={() => setShowAddModal(false)}
          categories={categories}
          profile={profile!}
        />
      )}

      <AnimatePresence>
        {selectedItem && (
          <ProductDetailsModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onContactSeller={(item) => {
              setSelectedItem(null);
              onOpenChat(item.sellerId);
            }}
            onViewProfile={onViewProfile}
            onNext={() => {
              const currentIndex = filteredItems.findIndex(i => i.id === selectedItem.id);
              const nextIndex = (currentIndex + 1) % filteredItems.length;
              setSelectedItem(filteredItems[nextIndex]);
            }}
            onPrev={() => {
              const currentIndex = filteredItems.findIndex(i => i.id === selectedItem.id);
              const prevIndex = (currentIndex - 1 + filteredItems.length) % filteredItems.length;
              setSelectedItem(filteredItems[prevIndex]);
            }}
          />
        )}
      </AnimatePresence>

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
                setShowSmartCategories(false);
              }}
              onHoverCategory={() => {}}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
