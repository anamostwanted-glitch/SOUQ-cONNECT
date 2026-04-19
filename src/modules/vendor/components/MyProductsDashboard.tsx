import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { MarketplaceItem, AdAnalytics } from '../../../core/types';
import { VendorProductCard } from './VendorProductCard';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

import { SmartUploadModal } from '../../marketplace/components/upload-flow/SmartUploadModal';
import { UserProfile, Category } from '../../../core/types';
import { doc as getDocRef, getDoc } from 'firebase/firestore';
import { 
  Package, 
  TrendingUp, 
  Search, 
  Filter, 
  Plus, 
  Zap, 
  Sparkles, 
  BarChart3, 
  Activity,
  LayoutGrid,
  List,
  ChevronDown,
  X,
  Trash2
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { MiniSparkline } from '../../../shared/components/MiniSparkline';

export const MyProductsDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [analytics, setAnalytics] = useState<AdAnalytics[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MarketplaceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const fetchProfile = async () => {
      const docSnap = await getDoc(getDocRef(db, 'users', auth.currentUser!.uid));
      if (docSnap.exists()) setProfile(docSnap.data() as UserProfile);
    };
    fetchProfile();

    // Fetch categories
    const unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    });
    
    // Fetch items
    const itemsQ = query(collection(db, 'marketplace'), where('sellerId', '==', auth.currentUser.uid), where('status', '!=', 'deleted'));
    const unsubscribeItems = onSnapshot(itemsQ, (snap) => {
      const fetchedItems: MarketplaceItem[] = [];
      snap.forEach(doc => fetchedItems.push({ id: doc.id, ...doc.data() } as MarketplaceItem));
      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'marketplace', false);
      setLoading(false);
    });

    // Fetch analytics
    const analyticsQ = query(collection(db, 'ad_analytics'), where('sellerId', '==', auth.currentUser.uid));
    const unsubscribeAnalytics = onSnapshot(analyticsQ, (snap) => {
      const fetchedAnalytics: AdAnalytics[] = [];
      snap.forEach(doc => fetchedAnalytics.push({ id: doc.id, ...doc.data() } as AdAnalytics));
      setAnalytics(fetchedAnalytics);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ad_analytics', false);
    });

    return () => {
      unsubCats();
      unsubscribeItems();
      unsubscribeAnalytics();
    };
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalViews = analytics.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalClicks = analytics.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
  const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0';

  const handleEdit = (item: MarketplaceItem) => {
    setEditingItem(item);
    setShowUploadModal(true);
  };

  const handleDelete = (item: MarketplaceItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await updateDoc(doc(db, 'marketplace', itemToDelete.id), { 
        status: 'deleted', 
        deletedAt: new Date().toISOString() 
      });
      toast.success(isRtl ? 'تم حذف المنتج' : 'Product deleted');
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'marketplace', false);
    } finally {
      setIsDeleting(false);
    }
  };

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]";

  return (
    <div className="space-y-10 pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 1. Neural Pulse Header */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 p-8 rounded-[2.5rem] ${glassClass} relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Package size={24} />
            </div>
            <h2 className="text-3xl font-black text-brand-text-main">{isRtl ? 'منتجاتي' : 'My Products'}</h2>
          </div>
          <p className="text-brand-text-muted font-bold text-sm uppercase tracking-widest">{isRtl ? 'إدارة المعرض الذكي' : 'Smart Gallery Management'}</p>
        </div>

        <div className="md:col-span-2 grid grid-cols-3 gap-4">
          <div className="bg-brand-background/50 p-4 rounded-3xl border border-brand-border/50 text-center flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'إجمالي المشاهدات' : 'Total Views'}</p>
              <p className="text-2xl font-black text-brand-text-main">{totalViews.toLocaleString()}</p>
            </div>
            <div className="mt-2">
              <MiniSparkline color="#6366f1" />
            </div>
          </div>
          <div className="bg-brand-background/50 p-4 rounded-3xl border border-brand-border/50 text-center flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'معدل التحويل' : 'Conversion'}</p>
              <p className="text-2xl font-black text-brand-teal">{avgCtr}%</p>
            </div>
            <div className="mt-2">
              <MiniSparkline color="#14b8a6" />
            </div>
          </div>
          <div className="bg-brand-background/50 p-4 rounded-3xl border border-brand-border/50 text-center flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'المنتجات النشطة' : 'Active Items'}</p>
              <p className="text-2xl font-black text-brand-primary">{items.filter(i => i.status === 'active').length}</p>
            </div>
            <div className="mt-2 h-8 flex items-center justify-center">
              <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-lg text-[10px] font-black uppercase tracking-widest">
                {isRtl ? 'نمو مستمر' : 'Growing'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Smart Command Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-primary/50 group-focus-within:text-brand-primary transition-colors" size={20} />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'ابحث في منتجاتك...' : 'Search your products...'}
            className="w-full pl-14 pr-6 py-4 bg-brand-surface border border-brand-border rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all font-bold text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-brand-primary/10 rounded-full text-brand-text-muted">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex p-1 bg-brand-surface border border-brand-border rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-primary text-white shadow-lg' : 'text-brand-text-muted hover:text-brand-text-main'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-primary text-white shadow-lg' : 'text-brand-text-muted hover:text-brand-text-main'}`}
            >
              <List size={18} />
            </button>
          </div>

          <select 
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
            className="bg-brand-surface border border-brand-border rounded-xl px-4 py-2.5 text-sm font-bold text-brand-text-main outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all appearance-none pr-10 relative"
          >
            <option value="all">{isRtl ? 'الكل' : 'All Status'}</option>
            <option value="active">{isRtl ? 'نشط' : 'Active'}</option>
            <option value="inactive">{isRtl ? 'غير نشط' : 'Inactive'}</option>
          </select>

          <HapticButton 
            onClick={() => {
              setEditingItem(null);
              setShowUploadModal(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:-translate-y-1 transition-all"
          >
            <Plus size={18} />
            {isRtl ? 'إضافة منتج' : 'Add Product'}
          </HapticButton>
        </div>
      </div>

      {/* 3. Neural Product Gallery (Bento Grid) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 size={40} className="animate-spin text-brand-primary" />
          <p className="text-brand-text-muted font-bold animate-pulse">{isRtl ? 'جاري تحميل معرضك العصبي...' : 'Loading your neural gallery...'}</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4"}>
          {filteredItems.map((item, idx) => (
            <motion.div
              key={`${item.id}-${idx}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <VendorProductCard 
                item={item} 
                analytics={analytics.find(a => a.adId === item.id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                viewMode={viewMode}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={`p-12 rounded-[2.5rem] ${glassClass} text-center flex flex-col items-center gap-6`}>
          <div className="w-20 h-20 rounded-3xl bg-brand-primary/5 flex items-center justify-center text-brand-primary/30">
            <Package size={40} />
          </div>
          <div>
            <h3 className="text-xl font-black text-brand-text-main mb-2">{isRtl ? 'لا توجد منتجات' : 'No Products Found'}</h3>
            <p className="text-brand-text-muted font-medium">{isRtl ? 'ابدأ بإضافة منتجاتك لتعزيز حضورك في السوق.' : 'Start adding your products to boost your market presence.'}</p>
          </div>
          <HapticButton 
            onClick={() => setShowUploadModal(true)}
            className="bg-brand-primary text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest"
          >
            {isRtl ? 'أضف أول منتج الآن' : 'Add First Product Now'}
          </HapticButton>
        </div>
      )}

      {showUploadModal && (
        <SmartUploadModal 
          onClose={() => {
            setShowUploadModal(false);
            setEditingItem(null);
          }}
          onAdd={() => {
            setShowUploadModal(false);
            setEditingItem(null);
            toast.success(isRtl ? 'تم تحديث المعرض بنجاح' : 'Gallery updated successfully');
          }}
          categories={categories}
          profile={profile!}
          item={editingItem || undefined}
        />
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-surface w-full max-w-md rounded-[2.5rem] border border-brand-border shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-brand-error/10 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-error">
                  <Trash2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-brand-text-main mb-2">
                  {isRtl ? 'تأكيد حذف المنتج' : 'Confirm Product Deletion'}
                </h2>
                <p className="text-brand-text-muted font-medium mb-8">
                  {isRtl 
                    ? 'هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.' 
                    : 'Are you sure you want to delete this product? This action cannot be undone.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setItemToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 px-6 py-4 bg-brand-background border border-brand-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-surface transition-all disabled:opacity-50"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="flex-1 px-6 py-4 bg-brand-error text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-error/90 transition-all shadow-lg shadow-brand-error/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    {isRtl ? 'حذف المنتج' : 'Delete Product'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Loader2 = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
