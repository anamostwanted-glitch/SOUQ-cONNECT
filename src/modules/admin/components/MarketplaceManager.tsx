import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  orderBy, 
  where, 
  limit 
} from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { MarketplaceItem, UserProfile } from '../../../core/types';
import { 
  Search, 
  Trash2, 
  ExternalLink, 
  Tag, 
  Building2, 
  Clock, 
  Eye, 
  Filter,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  ShoppingBag,
  Loader2,
  X
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { ProductDetailsModal } from '../../../shared/components/ProductDetailsModal';

interface MarketplaceManagerProps {
  isRtl: boolean;
}

export const MarketplaceManager: React.FC<MarketplaceManagerProps> = ({ isRtl }) => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deleted' | 'sold'>('all');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    let q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), limit(100));
    
    if (statusFilter !== 'all') {
      q = query(collection(db, 'marketplace'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'), limit(100));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceItem));
      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'marketplace', false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [statusFilter]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(searchLower) ||
        item.titleAr?.toLowerCase().includes(searchLower) ||
        item.titleEn?.toLowerCase().includes(searchLower) ||
        item.sellerName?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower)
      );
    });
  }, [items, searchQuery]);

  const handleDeleteItem = async (itemId: string) => {
    setIsDeleting(itemId);
    try {
      // Soft Delete as per AGENTS.md
      await updateDoc(doc(db, 'marketplace', itemId), { 
        status: 'deleted',
        deletedAt: new Date().toISOString()
      });
      toast.success(isRtl ? 'تمت أرشفة الإعلان بنجاح' : 'Ad archived successfully');
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `marketplace/${itemId}`, false);
      toast.error(isRtl ? 'فشل أرشفة الإعلان' : 'Failed to archive ad');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRestoreItem = async (itemId: string) => {
    try {
      await updateDoc(doc(db, 'marketplace', itemId), { 
        status: 'active',
        deletedAt: null
      });
      toast.success(isRtl ? 'تم استعادة الإعلان بنجاح' : 'Ad restored successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `marketplace/${itemId}`, false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-brand-surface p-8 rounded-[2.5rem] border border-brand-border shadow-sm">
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-brand-text-main tracking-tight flex items-center gap-3">
            <ShoppingBag className="text-brand-primary" />
            {isRtl ? 'إدارة السوق والإعلانات' : 'Marketplace & Ads Management'}
          </h3>
          <p className="text-sm text-brand-text-muted font-medium">
            {isRtl ? 'مراقبة وإدارة جميع المنتجات والإعلانات المنشورة من قبل المستخدمين' : 'Monitor and manage all products and ads posted by users'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative max-w-md">
            <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-brand-text-muted`} size={18} />
            <input
              type="text"
              placeholder={isRtl ? 'بحث في الإعلانات...' : 'Search ads...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm font-medium transition-all`}
            />
          </div>
          
          <div className="flex bg-brand-background p-1 rounded-2xl border border-brand-border">
            {(['all', 'active', 'deleted'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === f 
                    ? 'bg-brand-primary text-white shadow-sm' 
                    : 'text-brand-text-muted hover:text-brand-text-main'
                }`}
              >
                {f === 'all' ? (isRtl ? 'الكل' : 'All') : f === 'active' ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'محذوف' : 'Deleted')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="animate-spin text-brand-primary" size={48} />
          <p className="text-brand-text-muted font-black uppercase tracking-widest text-xs">
            {isRtl ? 'جاري تحميل البيانات...' : 'Loading marketplace data...'}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-brand-surface rounded-[2.5rem] border border-brand-border border-dashed p-20 text-center space-y-4">
          <div className="w-20 h-20 bg-brand-background rounded-3xl flex items-center justify-center mx-auto text-brand-text-muted/20">
            <ShoppingBag size={40} />
          </div>
          <p className="text-brand-text-muted font-bold">
            {isRtl ? 'لم يتم العثور على إعلانات تطابق بحثك' : 'No ads found matching your search'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`group bg-brand-surface rounded-[2rem] border transition-all overflow-hidden flex flex-col ${
                  item.status === 'deleted' ? 'border-brand-error/20 opacity-75' : 'border-brand-border hover:border-brand-primary/30 hover:shadow-xl hover:shadow-brand-primary/5'
                }`}
              >
                {/* Image Preview */}
                <div className="aspect-video relative overflow-hidden bg-brand-background">
                  {item.images?.[0] ? (
                    <img 
                      src={item.images[0]} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-text-muted/20">
                      <ShoppingBag size={48} />
                    </div>
                  )}
                  
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border ${
                      item.status === 'active' ? 'bg-emerald-500/80 text-white border-emerald-400/30' :
                      item.status === 'deleted' ? 'bg-brand-error/80 text-white border-brand-error/30' :
                      'bg-amber-500/80 text-white border-amber-400/30'
                    }`}>
                      {item.status}
                    </span>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const url = new URL(window.location.origin);
                          url.searchParams.set('view', 'marketplace');
                          url.searchParams.set('itemId', item.id);
                          window.open(url.toString(), '_blank');
                        }}
                        className="p-2 bg-white/20 backdrop-blur-md text-white rounded-xl border border-white/30 hover:bg-white/40 transition-all"
                        title={isRtl ? 'فتح في صفحة جديدة' : 'Open in new page'}
                      >
                        <ExternalLink size={14} />
                      </button>
                      
                      {item.status !== 'deleted' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item.id);
                          }}
                          disabled={isDeleting === item.id}
                          className="p-2 bg-brand-error/80 backdrop-blur-md text-white rounded-xl border border-brand-error/30 hover:bg-brand-error transition-all"
                          title={isRtl ? 'أرشفة فورية' : 'Quick Archive'}
                        >
                          {isDeleting === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag size={12} className="text-brand-primary" />
                      <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest truncate">
                        {item.categories?.[0] || 'Uncategorized'}
                      </span>
                    </div>
                    
                    <h4 
                      className="font-black text-brand-text-main line-clamp-1 mb-2 group-hover:text-brand-primary cursor-pointer transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      {isRtl ? (item.titleAr || item.title) : (item.titleEn || item.title)}
                    </h4>
                    
                    <p className="text-xs text-brand-text-muted line-clamp-2 mb-4 leading-relaxed">
                      {isRtl ? (item.descriptionAr || item.description) : (item.descriptionEn || item.description)}
                    </p>

                    <div className="flex items-center gap-3 pt-4 border-t border-brand-border">
                      <div className="w-8 h-8 rounded-lg bg-brand-background flex items-center justify-center text-brand-text-muted border border-brand-border shrink-0">
                        <Building2 size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-brand-text-main truncate">{item.sellerName}</p>
                        <p className="text-[9px] text-brand-text-muted font-bold uppercase">{item.sellerRole}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex items-center gap-2">
                    {item.status === 'deleted' ? (
                      <button
                        onClick={() => handleRestoreItem(item.id)}
                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        {isRtl ? 'استعادة الإعلان' : 'Restore Ad'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setItemToDelete(item.id)}
                        disabled={isDeleting === item.id}
                        className="flex-1 py-3 bg-brand-error text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-error/90 transition-all shadow-lg shadow-brand-error/20 flex items-center justify-center gap-2"
                      >
                        {isDeleting === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        {isRtl ? 'أرشفة الإعلان' : 'Archive Ad'}
                      </button>
                    )}
                    
                    <div className="flex items-center gap-3 px-4 py-3 bg-brand-background rounded-xl border border-brand-border">
                      <Eye size={14} className="text-brand-text-muted" />
                      <span className="text-xs font-black text-brand-text-main">{item.views || 0}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {/* Modals */}
      <AnimatePresence>
        {selectedItem && (
          <ProductDetailsModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onContactSeller={() => {}}
            onViewProfile={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-brand-surface w-full max-w-md rounded-[2.5rem] p-8 border border-brand-border shadow-2xl"
            >
              <div className="w-16 h-16 bg-brand-error/10 rounded-3xl flex items-center justify-center text-brand-error mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              
              <h3 className="text-xl font-black text-brand-text-main text-center mb-2">
                {isRtl ? 'تأكيد الأرشفة' : 'Confirm Archive'}
              </h3>
              <p className="text-sm text-brand-text-muted text-center mb-8 font-medium">
                {isRtl 
                  ? 'هل أنت متأكد من أرشفة هذا الإعلان؟ سيتم إخفاؤه من السوق ولكن سيبقى في الأرشيف.' 
                  : 'Are you sure you want to archive this ad? It will be hidden from the marketplace but kept in the archive.'}
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-4 bg-brand-background text-brand-text-main rounded-2xl text-xs font-black uppercase tracking-widest border border-brand-border hover:bg-brand-surface transition-all"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => handleDeleteItem(itemToDelete)}
                  disabled={isDeleting === itemToDelete}
                  className="flex-1 py-4 bg-brand-error text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-error/90 transition-all shadow-lg shadow-brand-error/20 flex items-center justify-center gap-2"
                >
                  {isDeleting === itemToDelete ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {isRtl ? 'تأكيد الأرشفة' : 'Confirm Archive'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
