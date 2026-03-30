import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  getDocs,
  deleteDoc,
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
  Sparkles
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { Skeleton } from '../../../shared/components/Skeleton';
import { HapticButton } from '../../../shared/components/HapticButton';
import { ProductCard } from './ProductCard';
import { ProductDetailsModal } from '../../../shared/components/ProductDetailsModal';
import { SmartUploadModal } from './upload-flow/SmartUploadModal';
import { EditProductModal } from './EditProductModal';

interface MarketInterfaceProps {
  profile: UserProfile | null;
  features: AppFeatures;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  viewMode?: 'admin' | 'supplier' | 'customer';
}

export const MarketInterface: React.FC<MarketInterfaceProps> = ({ 
  profile, 
  features, 
  onOpenChat, 
  onViewProfile,
  viewMode
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
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
        setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
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
      await deleteDoc(doc(db, 'marketplace', itemToDelete.id));
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `marketplace/${itemToDelete.id}`);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const glassClass = "bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-sm";

  return (
    <div className="min-h-screen bg-brand-background pb-24">
      {/* Floating Header & Search */}
      <div className={`sticky top-0 z-40 ${glassClass} border-b border-white/10`}>
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-auto flex items-center justify-between">
              <h1 className="text-2xl md:text-3xl font-black text-brand-text-main tracking-tight">
                {isRtl ? 'السوق الذكي' : 'Smart Market'}
              </h1>
              
              {/* Mobile Add Button */}
              {profile && effectiveRole !== 'customer' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="md:hidden w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>

            <div className="w-full md:w-1/2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-brand-text-muted`} size={20} />
                <input
                  type="text"
                  placeholder={isRtl ? 'ابحث عن منتجات، موردين...' : 'Search products, suppliers...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-slate-700 rounded-2xl py-3 ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-brand-text-main placeholder-brand-text-muted backdrop-blur-md transition-all`}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text-main`}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              {/* Desktop Add Button */}
              {profile && effectiveRole !== 'customer' && (
                <HapticButton
                  onClick={() => setShowAddModal(true)}
                  className="hidden md:flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                >
                  <Plus size={20} />
                  <span>{isRtl ? 'إضافة منتج' : 'Add Product'}</span>
                </HapticButton>
              )}
            </div>
          </div>

          {/* Tabs for Vendors */}
          {profile && effectiveRole !== 'customer' && (
            <div className="mt-6 flex items-center gap-4 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('discover')}
                className={`pb-3 px-2 text-sm font-bold transition-colors relative ${
                  activeTab === 'discover' ? 'text-brand-primary' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {isRtl ? 'اكتشف' : 'Discover'}
                {activeTab === 'discover' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('myshop')}
                className={`pb-3 px-2 text-sm font-bold transition-colors relative ${
                  activeTab === 'myshop' ? 'text-brand-primary' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {isRtl ? 'متجري' : 'My Shop'}
                {activeTab === 'myshop' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                )}
              </button>
            </div>
          )}

          {/* Categories Horizontal Scroll */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                !selectedCategory 
                  ? 'bg-brand-primary text-white shadow-md' 
                  : 'bg-white/50 dark:bg-slate-800/50 text-brand-text-main hover:bg-white/80 dark:hover:bg-slate-700/80 backdrop-blur-md'
              }`}
            >
              {isRtl ? 'الكل' : 'All'}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  selectedCategory === cat.id 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'bg-white/50 dark:bg-slate-800/50 text-brand-text-main hover:bg-white/80 dark:hover:bg-slate-700/80 backdrop-blur-md'
                }`}
              >
                {isRtl ? cat.nameAr : cat.nameEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
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
            onContactSeller={() => onOpenChat(selectedItem.sellerId)}
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
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
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
    </div>
  );
};
