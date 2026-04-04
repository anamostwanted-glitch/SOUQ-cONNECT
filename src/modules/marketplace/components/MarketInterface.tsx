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
  doc
} from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { MarketplaceItem, UserProfile, Category, AppFeatures } from '../../../core/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  X, 
  Sparkles,
  Camera
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
      handleFirestoreError(err, OperationType.LIST, 'marketplace');
      setLoading(false);
    });

    const fetchCategories = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        const docs = catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
        const sorted = docs.sort((a, b) => {
          const nameA = isRtl ? a.nameAr : a.nameEn;
          const nameB = isRtl ? b.nameAr : b.nameEn;
          return nameA.localeCompare(nameB, i18n.language);
        });
        setCategories(sorted);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    };
    fetchCategories();

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
    return matchesSearch && matchesCategory;
  });

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 shadow-lg shadow-black/5";
  const ribbonClass = "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-xl shadow-brand-primary/5";

  return (
    <div className="min-h-screen bg-brand-background pb-32">
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
                    placeholder={isMinimized ? (isRtl ? 'ابحث...' : 'Search...') : (isRtl ? 'ابحث بذكاء عن منتجات...' : 'Search smartly for products...')}
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
                
                {/* Desktop Add Button - Integrated into Ribbon */}
                {profile && effectiveRole !== 'customer' && !isMinimized && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="hidden md:block"
                  >
                    <HapticButton
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-2 px-6 py-3.5 bg-brand-primary text-white rounded-2xl font-bold shadow-lg shadow-brand-primary/20 hover:shadow-xl hover:shadow-brand-primary/30 transition-all hover:-translate-y-0.5"
                    >
                      <Plus size={20} />
                      <span>{isRtl ? 'إضافة' : 'Add'}</span>
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
                  {profile && effectiveRole !== 'customer' && (
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
                    </div>
                  )}

                  {/* Categories Horizontal Scroll */}
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
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`shrink-0 px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${
                          selectedCategory === cat.id
                            ? 'bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20'
                            : 'bg-white/40 dark:bg-slate-800/40 text-brand-text-muted border-white/30 dark:border-slate-700/50 hover:bg-white/60 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        {isRtl ? cat.nameAr : cat.nameEn}
                      </HapticButton>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
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
                  onViewDetails={() => setSelectedItem(item)}
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
      {profile && effectiveRole !== 'customer' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 right-6 z-50 md:hidden"
        >
          <HapticButton
            onClick={() => setShowAddModal(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-teal text-white flex items-center justify-center shadow-2xl shadow-brand-primary/40 border-4 border-white/20"
          >
            <Plus size={32} />
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
    </div>
  );
};
