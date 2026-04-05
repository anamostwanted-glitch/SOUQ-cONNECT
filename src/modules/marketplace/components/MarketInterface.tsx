import React, { useState, useEffect } from 'react';
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
  limit
} from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { MarketplaceItem, UserProfile, Category, AppFeatures, MarketTrend } from '../../../core/types';
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
  ShoppingBag
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { Skeleton } from '../../../shared/components/Skeleton';
import { HapticButton } from '../../../shared/components/HapticButton';
import { ProductCard } from './ProductCard';
import { ProductDetailsModal } from '../../../shared/components/ProductDetailsModal';
import { SmartUploadModal } from './upload-flow/SmartUploadModal';
import { EditProductModal } from './EditProductModal';
import { SmartCategoryExplorer } from './SmartCategoryExplorer';
import { VisualSearchModal } from '../../../shared/components/search/VisualSearchModal';

interface MarketInterfaceProps {
  profile: UserProfile | null;
  features: AppFeatures;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  viewMode?: 'admin' | 'supplier' | 'customer';
}

import { ScrollDirection, useScrollDirection } from '../../../shared/hooks/useScrollDirection';

export const MarketInterface: React.FC<MarketInterfaceProps> = ({ 
  profile, 
  features, 
  onOpenChat, 
  onViewProfile,
  viewMode
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const scrollDirection = useScrollDirection();
  const isMinimized = scrollDirection === ScrollDirection.DOWN;
  
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

  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<UserProfile[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSmartCategories, setShowSmartCategories] = useState(false);
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [visualSearchResults, setVisualSearchResults] = useState<MarketplaceItem[] | null>(null);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'myshop'>('discover');
  const [itemToDelete, setItemToDelete] = useState<MarketplaceItem | null>(null);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [sellerTypeFilter, setSellerTypeFilter] = useState<'all' | 'supplier' | 'customer' | 'followed'>('all');
  const [categoryClicks, setCategoryClicks] = useState<Record<string, number>>({});
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [smartInsight, setSmartInsight] = useState<{ ar: string; en: string } | null>(null);
  
  const effectiveRole = viewMode || profile?.role;
  const isAdmin = effectiveRole === 'admin';

  useEffect(() => {
    const q = activeTab === 'myshop' && auth.currentUser
      ? query(collection(db, 'marketplace'), where('sellerId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'))
      : query(collection(db, 'marketplace'), where('status', '==', 'active'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem));
      setItems(docs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'marketplace', false);
      setLoading(false);
    });

    const fetchCategories = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        const docs = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
        
        // Load click history from localStorage
        const savedClicks = localStorage.getItem('market_category_clicks');
        const clicks = savedClicks ? JSON.parse(savedClicks) : {};
        setCategoryClicks(clicks);

        // Smart Sorting Logic
        const sorted = docs.sort((a, b) => {
          // 1. Check User Interests (Profile Categories)
          const aIsInterest = profile?.categories?.includes(a.id) ? 1 : 0;
          const bIsInterest = profile?.categories?.includes(b.id) ? 1 : 0;
          if (aIsInterest !== bIsInterest) return bIsInterest - aIsInterest;

          // 2. Check User Behavior (Click Count)
          const aClicks = clicks[a.id] || 0;
          const bClicks = clicks[b.id] || 0;
          if (aClicks !== bClicks) return bClicks - aClicks;

          // 3. Random Factor for Freshness (Small weight)
          // We use a stable random based on the day to keep it consistent for a while
          const today = new Date().toDateString();
          const seed = (str: string) => str.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
          const aRandom = seed(a.id + today) % 100;
          const bRandom = seed(b.id + today) % 100;
          if (Math.abs(aRandom - bRandom) > 20) return bRandom - aRandom;

          // 4. Alphabetical Fallback
          const nameA = isRtl ? a.nameAr : a.nameEn;
          const nameB = isRtl ? b.nameAr : b.nameEn;
          return nameA.localeCompare(nameB, i18n.language);
        });
        setCategories(sorted);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    };

    const fetchTrends = async () => {
      try {
        const trendSnap = await getDocs(collection(db, 'marketTrends'));
        const docs = trendSnap.docs.map(d => ({ id: d.id, ...d.data() } as MarketTrend));
        setMarketTrends(docs);
      } catch (error) {
        // Silent fail for trends
      }
    };
    
    const fetchSuppliers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'supplier'), limit(10));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        setSuppliers(docs);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };

    fetchCategories().catch(err => console.error("Unhandled fetchCategories error:", err));
    fetchTrends().catch(err => console.error("Unhandled fetchTrends error:", err));
    fetchSuppliers().catch(err => console.error("Unhandled fetchSuppliers error:", err));

    return () => unsubscribe();
  }, [activeTab]);

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
      handleFirestoreError(error, OperationType.UPDATE, `marketplace/${itemToDelete.id}`);
    }
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
        console.error("Error parsing recently viewed", e);
      }
    }
  }, []);

  const handleViewProduct = (item: MarketplaceItem) => {
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
  };

  const recentlyViewedItems = items.filter(item => recentlyViewed.includes(item.id))
    .sort((a, b) => recentlyViewed.indexOf(a.id) - recentlyViewed.indexOf(b.id));

  const topCategory = Object.entries(categoryClicks)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  
  const topCategoryData = categories.find(c => c.id === topCategory);

  const filteredItems = visualSearchResults 
    ? visualSearchResults 
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

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 shadow-lg shadow-black/5";
  const ribbonClass = "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-xl shadow-brand-primary/5";

  return (
    <div className="min-h-screen bg-brand-background pb-32">
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

      {/* Smart Glass Ribbon Header - The Breathing Ribbon */}
      <motion.div 
        initial="visible"
        animate={isMinimized ? 'minimized' : 'visible'}
        variants={headerVariants}
        className="sticky top-0 z-50 pt-4 md:pt-6"
      >
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            layout
            className={`relative overflow-hidden rounded-[2rem] ${glassClass} transition-all duration-500 ${isMinimized ? 'py-2 px-4 shadow-sm' : 'p-4 md:p-6 shadow-xl'}`}
          >
            {/* Breathing Glow Effect */}
            <AnimatePresence>
              {isMinimized && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 via-brand-teal/5 to-brand-primary/5 pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Minimal Indicator for Minimized State */}
            {isMinimized && (
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-brand-primary/20 rounded-full" />
            )}

            {/* Top Row: Title & Search & Add */}
            <div className={`flex flex-col md:flex-row gap-4 items-center justify-between transition-all duration-500 ${isMinimized ? 'scale-95' : 'scale-100'}`}>
              <AnimatePresence mode="wait">
                {!isMinimized && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full md:w-auto flex items-center justify-between"
                  >
                    <h1 className="text-2xl md:text-3xl font-black text-brand-text-main tracking-tight flex items-center gap-2">
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-teal">
                        {isRtl ? 'السوق الذكي' : 'Smart Market'}
                      </span>
                      <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                    </h1>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div 
                layout
                className={`w-full flex items-center gap-2 transition-all duration-500 ${isMinimized ? 'md:w-full mt-2' : 'md:w-2/3 lg:w-1/2'}`}
              >
                {/* Search Bar with Integrated AI & Visual Search */}
                <motion.div 
                  layout
                  className="relative flex-1 group"
                >
                  <div className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 transition-colors duration-300 group-focus-within:text-brand-primary text-brand-text-muted`}>
                    <Search size={isMinimized ? 16 : 20} />
                  </div>
                  <input
                    type="text"
                    placeholder={
                      isMinimized 
                        ? (isRtl ? 'ابحث...' : 'Search...') 
                        : searchTerm 
                          ? searchTerm 
                          : topCategoryData 
                            ? (isRtl ? `ابحث عن ${topCategoryData.nameAr}...` : `Search for ${topCategoryData.nameEn}...`)
                            : (isRtl ? 'ابحث بذكاء عن منتجات...' : 'Search smartly for products...')
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/50 rounded-2xl ${isMinimized ? 'py-2 text-sm' : 'py-3.5'} ${isRtl ? 'pr-12 pl-24' : 'pl-12 pr-24'} focus:outline-none focus:ring-2 focus:ring-brand-primary/30 text-brand-text-main placeholder-brand-text-muted/60 backdrop-blur-md transition-all duration-300 hover:bg-white/60 dark:hover:bg-slate-800/60`}
                  />
                  
                  {/* Integrated Actions */}
                  <div className={`absolute ${isRtl ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 flex items-center gap-1`}>
                    <HapticButton
                      onClick={() => setShowVisualSearch(true)}
                      className={`${isMinimized ? 'p-1' : 'p-2'} text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all`}
                      title={isRtl ? 'بحث بصري' : 'Visual Search'}
                    >
                      <Camera size={isMinimized ? 16 : 20} />
                    </HapticButton>
                    <div className="w-px h-6 bg-brand-border/30 mx-1" />
                    <HapticButton
                      onClick={() => setShowSmartCategories(true)}
                      className={`${isMinimized ? 'p-1' : 'p-2'} text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all relative group/ai`}
                      title={isRtl ? 'المستكشف الذكي' : 'Smart Explorer'}
                    >
                      <Sparkles size={isMinimized ? 16 : 20} className="group-hover/ai:scale-110 transition-transform" />
                      {!isMinimized && <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-teal rounded-full animate-ping" />}
                    </HapticButton>
                  </div>
                </motion.div>
                
                {/* Add Button - Integrated into Ribbon */}
                {profile && !isMinimized && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center"
                  >
                    <HapticButton
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3.5 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20 hover:shadow-xl hover:shadow-brand-primary/30 transition-all hover:-translate-y-0.5"
                    >
                      <Plus size={20} />
                      <span className="hidden sm:inline">{isRtl ? 'إضافة منتج' : 'Add Product'}</span>
                      <span className="sm:hidden">{isRtl ? 'إضافة' : 'Add'}</span>
                    </HapticButton>
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Bottom Row: Tabs & Categories (Hidden when minimized) */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 space-y-4 overflow-hidden"
                >
                  {/* Segmented Control Tabs */}
                  {profile && (
                    <div className="flex p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl w-fit">
                      <button
                        onClick={() => setActiveTab('discover')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all relative ${
                          activeTab === 'discover' 
                            ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                      >
                        {isRtl ? 'اكتشف' : 'Discover'}
                      </button>
                      <button
                        onClick={() => setActiveTab('myshop')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all relative ${
                          activeTab === 'myshop' 
                            ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                      >
                        {isRtl ? 'متجري' : 'My Shop'}
                      </button>
                      <button
                        onClick={() => setSellerTypeFilter('supplier')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all relative ${
                          sellerTypeFilter === 'supplier' 
                            ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                        }`}
                      >
                        {isRtl ? 'متاجر الموردين' : 'Supplier Stores'}
                      </button>
                    </div>
                  )}

                  {/* Seller Type Filter */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      {isRtl ? 'نوع البائع' : 'Seller Type'}
                    </h4>
                    <div className="flex p-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-[1.5rem] w-full md:w-fit border border-white/40 dark:border-slate-700/50 shadow-lg">
                      {[
                        { id: 'all', label: isRtl ? 'الكل' : 'All', icon: Filter, color: 'bg-slate-500' },
                        { id: 'supplier', label: isRtl ? 'الموردين' : 'Suppliers', icon: Building2, color: 'bg-brand-primary' },
                        { id: 'customer', label: isRtl ? 'المجتمع' : 'Community', icon: User, color: 'bg-brand-secondary' },
                        { id: 'followed', label: isRtl ? 'المتابَعين' : 'Following', icon: Heart, color: 'bg-red-500' }
                      ].map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSellerTypeFilter(type.id as any)}
                          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-[1.25rem] text-xs font-black transition-all duration-500 relative ${
                            sellerTypeFilter === type.id 
                              ? `text-white ${type.color} shadow-lg shadow-black/10 scale-[1.05] z-10` 
                              : 'text-slate-500 hover:text-brand-primary hover:bg-white/50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <type.icon size={14} className={sellerTypeFilter === type.id ? 'animate-pulse' : ''} />
                          {type.label}
                          {sellerTypeFilter === type.id && (
                            <motion.div 
                              layoutId="activeFilter"
                              className="absolute inset-0 rounded-[1.25rem] ring-2 ring-white/20 pointer-events-none"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Personalized Welcome Banner */}
                  {topCategoryData && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-brand-primary/10 to-brand-teal/10 border border-brand-primary/10"
                    >
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="max-w-[70%]">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={16} className="text-brand-primary" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary">
                              {isRtl ? 'اكتشاف ذكي' : 'Smart Discovery'}
                            </span>
                          </div>
                          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                            {isRtl 
                              ? `هل تبحث عن ${topCategoryData.nameAr}؟` 
                              : `Looking for ${topCategoryData.nameEn}?`}
                          </h2>
                          <p className="text-slate-500 text-xs font-medium mb-4">
                            {isRtl 
                              ? 'لقد اخترنا لك أفضل العروض بناءً على اهتماماتك الأخيرة.' 
                              : "We've picked the best deals based on your recent interests."}
                          </p>
                          <HapticButton
                            onClick={() => setSelectedCategory(topCategoryData.id)}
                            className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-black shadow-lg shadow-brand-primary/20"
                          >
                            {isRtl ? 'استكشف الآن' : 'Explore Now'}
                          </HapticButton>
                        </div>
                        <div className="w-24 h-24 rounded-full bg-brand-primary/5 flex items-center justify-center">
                          <Sparkles size={48} className="text-brand-primary/20" />
                        </div>
                      </div>
                      {/* Decorative background elements */}
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-primary/5 rounded-full blur-3xl" />
                      <div className="absolute -left-10 -top-10 w-40 h-40 bg-brand-teal/5 rounded-full blur-3xl" />
                    </motion.div>
                  )}

                  {/* Categories Horizontal Scroll */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      {isRtl ? 'الفئات' : 'Categories'}
                    </h4>
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                    {selectedCategory && (
                      <HapticButton
                        onClick={() => setSelectedCategory(null)}
                        className="shrink-0 px-5 py-2.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 flex items-center gap-2"
                      >
                        <X size={14} />
                        {isRtl ? 'إلغاء الفلتر' : 'Clear Filter'}
                      </HapticButton>
                    )}
                    
                    {categories.map(cat => (
                      <HapticButton
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className={`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${
                          selectedCategory === cat.id
                            ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20'
                            : 'bg-white/40 dark:bg-slate-800/40 text-brand-text-muted border-white/30 dark:border-slate-700/50 hover:bg-white/60 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        {isRtl ? cat.nameAr : cat.nameEn}
                        {profile?.categories?.includes(cat.id) && (
                          <div className={`w-1 h-1 bg-brand-teal rounded-full ${isRtl ? 'mr-1' : 'ml-1'}`} />
                        )}
                      </HapticButton>
                    ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
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
            
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {recommendedItems.map((item) => (
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
            
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {trendingItems.map((item) => (
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

        {/* Market Insights Section */}
        {marketTrends.length > 0 && !selectedCategory && searchTerm === '' && sellerTypeFilter === 'all' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {isRtl ? 'تحليلات السوق' : 'Market Insights'}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium">
                    {isRtl ? 'آخر التوجهات والفرص في السوق' : 'Latest trends and opportunities in the market'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketTrends.map((trend) => (
                <motion.div
                  key={trend.id}
                  whileHover={{ scale: 1.01 }}
                  className={`p-5 rounded-3xl ${glassClass} border-l-4 border-l-brand-primary`}
                >
                  <h3 className="font-black text-slate-900 dark:text-white mb-2">
                    {isRtl ? trend.titleAr : trend.titleEn}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-4">
                    {isRtl ? trend.descriptionAr : trend.descriptionEn}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {trend.suggestions.slice(0, 3).map((s, idx) => (
                      <span key={idx} className="px-2 py-1 rounded-lg bg-brand-primary/5 text-brand-primary text-[10px] font-bold">
                        {s}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Supplier Stores Section */}
        {suppliers.length > 0 && !selectedCategory && searchTerm === '' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {isRtl ? 'متاجر الموردين الموثوقة' : 'Trusted Supplier Stores'}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium">
                    {isRtl ? 'تصفح متاجر الموردين المعتمدين لدينا' : 'Browse our verified supplier stores'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {suppliers.map((supplier) => (
                <motion.div 
                  key={supplier.uid} 
                  whileHover={{ y: -4 }}
                  onClick={() => onViewProfile(supplier.uid)}
                  className={`w-64 shrink-0 p-6 rounded-[2.5rem] ${glassClass} cursor-pointer group relative overflow-hidden`}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Building2 size={80} />
                  </div>
                  <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-brand-surface border-2 border-brand-primary/20 p-1 group-hover:border-brand-primary transition-colors">
                      <img 
                        src={supplier.logoUrl || 'https://picsum.photos/seed/logo/100/100'} 
                        alt={supplier.companyName}
                        className="w-full h-full object-cover rounded-[1.2rem]"
                      />
                    </div>
                    <div>
                      <h3 className="font-black text-brand-text-main line-clamp-1 group-hover:text-brand-primary transition-colors">
                        {isRtl ? supplier.companyName : (supplier.companyName || supplier.name)}
                      </h3>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Star size={12} className="text-brand-warning fill-brand-warning" />
                        <span className="text-[10px] font-bold text-brand-text-muted">4.9</span>
                        <span className="mx-1 text-brand-border">•</span>
                        <span className="text-[10px] font-bold text-brand-text-muted">{supplier.followersCount || 0} {isRtl ? 'متابع' : 'Followers'}</span>
                      </div>
                    </div>
                    <HapticButton className="w-full py-2.5 bg-brand-primary/10 text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-brand-primary group-hover:text-white transition-all">
                      {isRtl ? 'زيارة المتجر' : 'Visit Store'}
                    </HapticButton>
                  </div>
                </motion.div>
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

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className={`rounded-3xl overflow-hidden ${glassClass}`}>
                <Skeleton className="w-full aspect-[4/5]" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6"
          >
            <AnimatePresence>
              {filteredItems.map(item => (
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
              ))}
            </AnimatePresence>
          </motion.div>
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

      {/* Mobile Floating Action Button (FAB) for Add Product */}
      {profile && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-32 right-6 z-[60] md:hidden"
        >
          <HapticButton
            onClick={() => setShowAddModal(true)}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-teal text-white flex items-center justify-center shadow-2xl shadow-brand-primary/40 border-2 border-white/20 backdrop-blur-md"
          >
            <Plus size={28} />
          </HapticButton>
        </motion.div>
      )}


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
                  onClick={confirmDelete}
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
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Mobile Floating Action Button (FAB) */}
      <AnimatePresence>
        {profile && isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            className="fixed bottom-24 right-6 z-[60] sm:hidden"
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
  );
};
