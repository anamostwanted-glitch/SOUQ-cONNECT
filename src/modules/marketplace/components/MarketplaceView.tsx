import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  orderBy,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { MarketplaceItem, UserProfile, Category, AppFeatures } from '../../../core/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  MessageCircle, 
  MessageSquare,
  Tag, 
  MapPin, 
  CheckCircle, 
  X, 
  Image as ImageIcon,
  ChevronRight, 
  ChevronLeft,
  DollarSign,
  ZoomIn,
  Camera,
  Edit,
  Trash2,
  Sparkles
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { Skeleton } from '../../../shared/components/Skeleton';
import { HapticButton } from '../../../shared/components/HapticButton';
import { BlurImage } from '../../../shared/components/BlurImage';
import { GestureImageViewer } from '../../../shared/components/GestureImageViewer';
import { MarketplaceAddProduct } from './MarketplaceAddProduct';
import { ProductDetailsModal } from '../../../shared/components/ProductDetailsModal';
import { VisualSearchModal } from '../../../shared/components/search/VisualSearchModal';
import { SmartCategoryExplorer } from './SmartCategoryExplorer';
import { WhatsAppButton } from '../../../shared/components/WhatsAppButton';

interface MarketplaceViewProps {
  profile: UserProfile | null;
  features: AppFeatures;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
}

export default function MarketplaceView({ profile, features, onOpenChat, onViewProfile }: MarketplaceViewProps) {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [showSmartCategories, setShowSmartCategories] = useState(false);
  const [visualSearchResults, setVisualSearchResults] = useState<MarketplaceItem[] | null>(null);
  const [visualSearchKeywords, setVisualSearchKeywords] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'myshop'>('discover');
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);

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

    // Fetch categories
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

  const handleAddItem = async (itemData: Partial<MarketplaceItem>) => {
    if (!auth.currentUser || !profile) return;

    if (editingItem) {
      try {
        const itemRef = doc(db, 'marketplace', editingItem.id);
        await updateDoc(itemRef, {
          ...itemData,
          updatedAt: new Date().toISOString()
        });
        setEditingItem(null);
        setShowAddModal(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `marketplace/${editingItem.id}`);
      }
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newItemData: MarketplaceItem = {
      id: tempId,
      sellerId: auth.currentUser.uid,
      sellerName: profile.name,
      sellerRole: profile.role,
      title: itemData.title || '',
      titleAr: itemData.titleAr || '',
      titleEn: itemData.titleEn || '',
      description: itemData.description || '',
      descriptionAr: itemData.descriptionAr || '',
      descriptionEn: itemData.descriptionEn || '',
      price: itemData.price || 0,
      currency: t('currency'),
      categories: itemData.categories || [],
      location: itemData.location || '',
      images: itemData.images || ['https://picsum.photos/seed/product/800/600'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isVerifiedSupplier: profile.isVerified || false,
      sellerPhone: itemData.sellerPhone,
      isHighQuality: itemData.isHighQuality,
      features: itemData.features
    };

    // Optimistic UI update
    setItems(prev => [newItemData, ...prev]);
    setShowAddModal(false);

    try {
      await addDoc(collection(db, 'marketplace'), {
        sellerId: newItemData.sellerId,
        sellerName: newItemData.sellerName,
        sellerRole: newItemData.sellerRole,
        title: newItemData.title,
        titleAr: newItemData.titleAr,
        titleEn: newItemData.titleEn,
        description: newItemData.description,
        descriptionAr: newItemData.descriptionAr,
        descriptionEn: newItemData.descriptionEn,
        price: newItemData.price,
        currency: newItemData.currency,
        categories: newItemData.categories,
        location: newItemData.location,
        images: newItemData.images,
        status: newItemData.status,
        createdAt: newItemData.createdAt,
        updatedAt: newItemData.updatedAt,
        isVerifiedSupplier: newItemData.isVerifiedSupplier,
        sellerPhone: newItemData.sellerPhone,
        isHighQuality: newItemData.isHighQuality,
        features: newItemData.features
      });
    } catch (err) {
      // Revert optimistic update
      setItems(prev => prev.filter(item => item.id !== tempId));
      handleFirestoreError(err, OperationType.CREATE, 'marketplace');
    }
  };

  const handleContactSeller = async (item: MarketplaceItem) => {
    if (!auth.currentUser) return;
    if (item.sellerId === auth.currentUser.uid) return;

    const chatId = [auth.currentUser.uid, item.sellerId].sort().join('_');
    const isRtl = i18n.language.startsWith('ar');
    const displayTitle = isRtl ? (item.titleAr || item.title) : (item.titleEn || item.title);
    
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        updatedAt: new Date().toISOString(),
        lastMessage: `${t('marketplace')}: ${displayTitle}`
      }).catch(async () => {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(chatRef, {
          id: chatId,
          customerId: auth.currentUser?.uid,
          supplierId: item.sellerId,
          updatedAt: new Date().toISOString(),
          lastMessage: `${t('marketplace')}: ${displayTitle}`,
          status: 'active'
        });
      });

      await addDoc(collection(db, `chats/${chatId}/messages`), {
        chatId,
        senderId: auth.currentUser.uid,
        text: `${t('contact_seller')} - ${displayTitle}\n${window.location.origin}/marketplace/${item.id}`,
        type: 'text',
        createdAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'contactEvents'), {
        userId: auth.currentUser.uid,
        supplierId: item.sellerId,
        itemId: item.id,
        createdAt: new Date().toISOString()
      });

      onOpenChat(chatId);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!window.confirm(t('confirm_delete_product', 'Are you sure you want to delete this product?'))) return;

    try {
      const itemRef = doc(db, 'marketplace', itemId);
      await updateDoc(itemRef, { status: 'deleted' });
      // Optimistic update
      setItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `marketplace/${itemId}`);
    }
  };

  const handleEditItem = (e: React.MouseEvent, item: MarketplaceItem) => {
    e.stopPropagation();
    setEditingItem(item);
    setShowAddModal(true);
  };

  const filteredItems = visualSearchResults 
    ? visualSearchResults 
    : items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      item.title.toLowerCase().includes(searchLower) || 
      item.description.toLowerCase().includes(searchLower) ||
      (item.titleAr && item.titleAr.toLowerCase().includes(searchLower)) ||
      (item.titleEn && item.titleEn.toLowerCase().includes(searchLower)) ||
      (item.descriptionAr && item.descriptionAr.toLowerCase().includes(searchLower)) ||
      (item.descriptionEn && item.descriptionEn.toLowerCase().includes(searchLower));
    
    let matchesCategory = true;
    if (selectedCategories.length > 0) {
      const subCategoryIds = categories
        .filter(cat => cat.parentId && selectedCategories.includes(cat.parentId))
        .map(cat => cat.id);
      
      const allValidIds = [...selectedCategories, ...subCategoryIds];
      matchesCategory = allValidIds.some(id => item.categories.includes(id));
    }

    return matchesSearch && matchesCategory;
  });

  const toggleCategory = (categoryId: string) => {
    if (categoryId === 'all') {
      setSelectedCategories([]);
      return;
    }
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  const clearVisualSearch = () => {
    setVisualSearchResults(null);
    setVisualSearchKeywords([]);
  };

  // Stats for My Shop
  const myShopStats = {
    total: items.length,
    views: items.reduce((acc, item) => acc + (item.views || 0), 0),
    activeOrders: items.filter(i => i.status === 'active').length
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
      {/* Premium Dual-Tab Header */}
      <div className="flex flex-col gap-8 mb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
              {activeTab === 'discover' ? t('discover', 'Discover') : t('my_shop', 'My Shop')}
            </h1>
            <p className="text-slate-500 font-medium">
              {activeTab === 'discover' ? t('discover_desc', 'Explore premium products from trusted suppliers') : t('myshop_desc', 'Manage your products and track your performance')}
            </p>
          </div>

          <div className="bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl flex gap-1">
            <button 
              onClick={() => setActiveTab('discover')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'discover' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t('discover', 'Discover')}
            </button>
            {auth.currentUser && (
              <button 
                onClick={() => setActiveTab('myshop')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'myshop' ? 'bg-white text-brand-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t('my_shop', 'My Shop')}
              </button>
            )}
          </div>
        </div>

        {activeTab === 'discover' ? (
          <div className="space-y-6">
            {/* Smart Search Bar */}
            <div className="relative group max-w-2xl">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="w-6 h-6 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
              </div>
              <input 
                type="text"
                placeholder={t('search_placeholder', 'Search for products, suppliers...')}
                className="w-full pl-14 pr-16 py-5 bg-white border-2 border-slate-100 rounded-[24px] text-lg font-medium focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all shadow-xl shadow-slate-200/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={visualSearchResults !== null}
              />
              <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                {visualSearchResults === null ? (
                  <HapticButton
                    onClick={() => setShowVisualSearch(true)}
                    className="p-3 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-2xl transition-all"
                    title={t('visualSearch.title', 'Visual Search')}
                  >
                    <Camera className="w-6 h-6" />
                  </HapticButton>
                ) : (
                  <HapticButton
                    onClick={clearVisualSearch}
                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </HapticButton>
                )}
              </div>
            </div>

            {/* Horizontal Categories */}
            <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
              <HapticButton 
                onClick={() => setShowSmartCategories(true)}
                className="px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2 bg-gradient-to-r from-brand-primary to-brand-teal text-white border-transparent shadow-lg shadow-brand-primary/20 flex items-center gap-2"
              >
                <Sparkles size={16} />
                {i18n.language === 'ar' ? 'المستكشف الذكي' : 'Smart Explorer'}
              </HapticButton>
              <button 
                onClick={() => toggleCategory('all')}
                className={`px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2 ${selectedCategories.length === 0 ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'}`}
              >
                {t('all', 'All Categories')}
              </button>
              {categories.filter(cat => !cat.parentId).map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-6 py-3 rounded-full text-sm font-bold whitespace-nowrap transition-all border-2 ${selectedCategories.includes(cat.id) ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'}`}
                >
                  {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* My Shop Dashboard Stats */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-brand-primary to-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-brand-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Tag className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-70">{t('total_products', 'Total Products')}</span>
              </div>
              <div className="text-4xl font-black">{myShopStats.total}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-[32px] text-white shadow-xl shadow-emerald-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <ZoomIn className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-70">{t('store_views', 'Store Views')}</span>
              </div>
              <div className="text-4xl font-black">{myShopStats.views}</div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-[32px] text-white shadow-xl shadow-amber-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-70">{t('active_listings', 'Active Listings')}</span>
              </div>
              <div className="text-4xl font-black">{myShopStats.activeOrders}</div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Search Active State */}
      <AnimatePresence>
        {visualSearchResults !== null && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-brand-primary/5 border-2 border-brand-primary/10 rounded-[24px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-brand-primary text-lg font-black flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {t('visualSearch.resultsFor', 'Visual Search Results')}
                </h3>
                <p className="text-slate-600 font-medium mt-1">
                  {t('visualSearch.foundMatches', 'Found {{count}} matching items based on your image.', { count: visualSearchResults.length })}
                </p>
              </div>
              
              {visualSearchKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {visualSearchKeywords.slice(0, 4).map((keyword, idx) => (
                    <span key={idx} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-full shadow-sm">
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
              <Skeleton className="aspect-[4/5] w-full rounded-none" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
                <Skeleton className="h-12 w-full mt-4 rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map((item) => (
            <motion.div 
              layoutId={`item-container-${item.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={item.id}
              className="group bg-white rounded-[32px] border border-slate-100 overflow-hidden hover:shadow-2xl hover:border-brand-primary/20 transition-all duration-500 cursor-pointer relative"
              onClick={() => setSelectedItem(item)}
            >
              <motion.div layoutId={`item-image-container-${item.id}`} className="relative aspect-[4/5] overflow-hidden">
                <BlurImage 
                  layoutId={`item-image-${item.id}`}
                  src={item.images[0]} 
                  alt={i18n.language.startsWith('ar') ? (item.titleAr || item.title) : (item.titleEn || item.title)}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                
                {/* Glassmorphism Price Tag */}
                <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl text-brand-primary font-black shadow-lg border border-white/20">
                  {item.price} {item.currency}
                </div>

                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {item.isVerifiedSupplier && (
                    <div className="bg-emerald-500 text-white p-2 rounded-2xl shadow-lg flex items-center gap-2" title={t('verified_supplier')}>
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:inline">{t('trusted_seller', 'Trusted Seller')}</span>
                    </div>
                  )}
                  {item.isHighQuality && (
                    <div className="bg-brand-primary text-white p-2 rounded-2xl shadow-lg">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {visualSearchResults !== null && (
                  <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl text-white text-xs font-black shadow-lg flex items-center gap-2 border border-white/10">
                    <span className="text-brand-primary">✨</span>
                    {Math.max(98 - (visualSearchResults.findIndex(res => res.id === item.id) * 4), 60)}% Match
                  </div>
                )}

                {/* Quick Action Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                  <div className="w-full flex items-center justify-between text-white">
                    <span className="text-sm font-bold">{t('view_details', 'View Details')}</span>
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>
              
              <div className="p-6">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-2 font-black uppercase tracking-widest">
                  <Tag className="w-4 h-4" />
                  <span>{item.categories && item.categories.length > 0 ? item.categories.join(', ') : 'N/A'}</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2 line-clamp-1 group-hover:text-brand-primary transition-colors">
                  {i18n.language.startsWith('ar') ? (item.titleAr || item.title) : (item.titleEn || item.title)}
                </h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-6 font-medium">
                  <MapPin className="w-4 h-4 text-brand-primary" />
                  <span>{item.location || 'N/A'}</span>
                </div>
                
                <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-500 border-2 border-white shadow-sm">
                      {item.sellerName.charAt(0)}
                      {item.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-700">{item.sellerName}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.sellerRole || t('supplier', 'Supplier')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {activeTab === 'discover' && auth.currentUser && item.sellerId !== auth.currentUser.uid && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactSeller(item);
                          }}
                          className="p-2 bg-brand-primary/10 text-brand-primary rounded-full hover:bg-brand-primary/20 transition-colors"
                          title={t('contact_seller', 'Contact Seller')}
                        >
                          <MessageSquare className="w-4 h-4 fill-current" />
                        </motion.button>
                        <WhatsAppButton 
                          phoneNumber={item.sellerPhone} 
                          productName={i18n.language.startsWith('ar') ? (item.titleAr || item.title) : (item.titleEn || item.title)}
                          productId={item.id}
                          variant="icon"
                        />
                      </>
                    )}
                    {activeTab === 'myshop' && (
                      <div className="flex gap-1">
                        <HapticButton 
                          onClick={(e) => handleEditItem(e, item)}
                          className="p-2 text-slate-400 hover:text-brand-primary transition-colors"
                        >
                          <Edit className="w-5 h-5" />
                        </HapticButton>
                        <HapticButton 
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </HapticButton>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-slate-50 rounded-[48px] border-4 border-dashed border-slate-200">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <ImageIcon className="w-12 h-12 text-slate-300" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">{t('no_items', 'No items found')}</h3>
          <p className="text-slate-500 font-medium max-w-xs mx-auto">{t('no_items_desc', 'Try adjusting your filters or search terms to find what you are looking for.')}</p>
        </div>
      )}

      {/* Floating Add Button (Premium Design) */}
      {auth.currentUser && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <HapticButton 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 bg-brand-primary text-white pl-5 pr-7 py-4 rounded-[24px] font-black shadow-2xl shadow-brand-primary/40 hover:scale-105 active:scale-95 transition-all group"
          >
            <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-90 transition-transform duration-500">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-lg">{t('sell_item', 'Sell Item')}</span>
          </HapticButton>
        </motion.div>
      )}

      {/* Modals */}
      <MarketplaceAddProduct 
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onAdd={handleAddItem}
        categories={categories}
        profile={profile}
        initialData={editingItem || undefined}
      />

      <ProductDetailsModal 
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onContactSeller={handleContactSeller}
        onViewProfile={onViewProfile}
      />

      <VisualSearchModal
        isOpen={showVisualSearch}
        onClose={() => setShowVisualSearch(false)}
        items={items}
        onResultsFound={(results, keywords) => {
          setVisualSearchResults(results as MarketplaceItem[]);
          setVisualSearchKeywords(keywords);
        }}
      />

      <AnimatePresence>
        {showSmartCategories && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-brand-background md:p-4"
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
                // For now, we map the mock IDs to real category logic or just close and show all if not found
                // In a real app, we'd map this to the actual selectedCategories state
                setSelectedCategories([categoryId]);
                setShowSmartCategories(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
