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
import { db, auth } from '../firebase';
import { MarketplaceItem, UserProfile, Category, AppFeatures } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  MessageCircle, 
  Tag, 
  MapPin, 
  CheckCircle, 
  X, 
  Image as ImageIcon,
  ChevronRight, 
  ChevronLeft,
  DollarSign,
  ZoomIn
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { Skeleton } from './Skeleton';
import { HapticButton } from './HapticButton';
import { BlurImage } from './BlurImage';
import { GestureImageViewer } from './GestureImageViewer';

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
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'my'>('all');

  // Form State
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    location: profile?.location || '',
    images: [] as string[]
  });

  useEffect(() => {
    const q = filterTab === 'my' && auth.currentUser
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
  }, [filterTab]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !profile) return;

    const tempId = `temp-${Date.now()}`;
    const newItemData: MarketplaceItem = {
      id: tempId,
      sellerId: auth.currentUser.uid,
      sellerName: profile.name,
      sellerRole: profile.role,
      title: newItem.title,
      description: newItem.description,
      price: parseFloat(newItem.price),
      currency: t('currency'),
      category: newItem.category,
      location: newItem.location,
      images: newItem.images.length > 0 ? newItem.images : ['https://picsum.photos/seed/product/800/600'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isVerifiedSupplier: profile.isVerified || false
    };

    // Optimistic UI update
    setItems(prev => [newItemData, ...prev]);
    setShowAddModal(false);
    setNewItem({ title: '', description: '', price: '', category: '', location: profile.location || '', images: [] });

    try {
      await addDoc(collection(db, 'marketplace'), {
        sellerId: newItemData.sellerId,
        sellerName: newItemData.sellerName,
        sellerRole: newItemData.sellerRole,
        title: newItemData.title,
        description: newItemData.description,
        price: newItemData.price,
        currency: newItemData.currency,
        category: newItemData.category,
        location: newItemData.location,
        images: newItemData.images,
        status: newItemData.status,
        createdAt: newItemData.createdAt,
        updatedAt: newItemData.updatedAt,
        isVerifiedSupplier: newItemData.isVerifiedSupplier
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
    
    // Create chat if not exists (logic usually handled by a service, but inline for simplicity)
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        updatedAt: new Date().toISOString(),
        lastMessage: `${t('marketplace')}: ${item.title}`
      }).catch(async () => {
        // If doc doesn't exist, set it
        const { setDoc } = await import('firebase/firestore');
        await setDoc(chatRef, {
          id: chatId,
          customerId: auth.currentUser?.uid,
          supplierId: item.sellerId,
          updatedAt: new Date().toISOString(),
          lastMessage: `${t('marketplace')}: ${item.title}`,
          status: 'active'
        });
      });

      // Add initial message about the item
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        chatId,
        senderId: auth.currentUser.uid,
        text: `${t('contact_seller')} - ${item.title}\n${window.location.origin}/marketplace/${item.id}`,
        type: 'text',
        createdAt: new Date().toISOString()
      });

      // Log contact event
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

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesCategory = true;
    if (selectedCategories.length > 0) {
      // Get subcategories of selected categories to include them in results
      const subCategoryIds = categories
        .filter(cat => cat.parentId && selectedCategories.includes(cat.parentId))
        .map(cat => cat.id);
      
      const allValidIds = [...selectedCategories, ...subCategoryIds];
      matchesCategory = allValidIds.includes(item.category);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('marketplace')}</h1>
          <p className="text-slate-500">{t('google_style_desc')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder={t('search_placeholder')}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {auth.currentUser && (
            <HapticButton 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-brand-primary text-white px-6 py-2 rounded-xl font-medium hover:bg-brand-primary-hover transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{t('sell_item')}</span>
            </HapticButton>
          )}
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
        <div className="flex gap-4">
          <button 
            onClick={() => setFilterTab('all')}
            className={`pb-4 px-2 font-medium transition-all relative ${filterTab === 'all' ? 'text-brand-primary' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t('all_items')}
            {filterTab === 'all' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />}
          </button>
          {auth.currentUser && (
            <button 
              onClick={() => setFilterTab('my')}
              className={`pb-4 px-2 font-medium transition-all relative ${filterTab === 'my' ? 'text-brand-primary' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t('my_listings')}
              {filterTab === 'my' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => toggleCategory('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategories.length === 0 ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {t('all')}
          </button>
          {categories.filter(cat => !cat.parentId).map(cat => (
            <button 
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategories.includes(cat.id) ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full mt-4 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <motion.div 
              layoutId={`item-container-${item.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={item.id}
              className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:border-brand-primary/20 transition-all cursor-pointer"
              onClick={() => setSelectedItem(item)}
            >
              <motion.div layoutId={`item-image-container-${item.id}`} className="relative aspect-square overflow-hidden">
                <BlurImage 
                  layoutId={`item-image-${item.id}`}
                  src={item.images[0]} 
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-brand-primary font-bold shadow-sm">
                  {item.price} {item.currency}
                </div>
                {item.isVerifiedSupplier && (
                  <div className="absolute top-3 left-3 bg-emerald-500 text-white p-1.5 rounded-full shadow-sm" title={t('verified_supplier')}>
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
              </motion.div>
              
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Tag className="w-3 h-3" />
                  <span>{item.category}</span>
                </div>
                <h3 className="font-bold text-slate-800 mb-1 line-clamp-1">{item.title}</h3>
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
                  <MapPin className="w-3 h-3" />
                  <span>{item.location || 'N/A'}</span>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="relative w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {item.sellerName.charAt(0)}
                      {item.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-600">{item.sellerName}</span>
                      {item.averageResponseTime && (
                        <span className="text-[9px] text-slate-400">{t('avg_response')}: {item.averageResponseTime}m</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-primary transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">{t('no_items')}</h3>
          <p className="text-slate-500">{t('search_placeholder')}</p>
        </div>
      )}

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass-modal w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-brand-primary text-white">
                <h2 className="text-xl font-bold">{t('add_item')}</h2>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddItem} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('item_title')}</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                    value={newItem.title}
                    onChange={e => setNewItem({...newItem, title: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('item_price')}</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        required
                        type="number"
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                        value={newItem.price}
                        onChange={e => setNewItem({...newItem, price: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('item_category')}</label>
                    <select 
                      required
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none bg-white"
                      value={newItem.category}
                      onChange={e => setNewItem({...newItem, category: e.target.value})}
                    >
                      <option value="">{t('category_select')}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('item_description')}</label>
                  <textarea 
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none resize-none"
                    value={newItem.description}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('location')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                      value={newItem.location}
                      onChange={e => setNewItem({...newItem, location: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20"
                >
                  {t('add_item')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              layoutId={`item-container-${selectedItem.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.7}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) setSelectedItem(null);
              }}
              className="glass-modal w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
            >
              {/* Image Gallery */}
              <motion.div 
                layoutId={`item-image-container-${selectedItem.id}`} 
                className="w-full md:w-1/2 bg-slate-100 relative group cursor-zoom-in"
                onClick={() => setViewingImage(selectedItem.images[0])}
              >
                <BlurImage 
                  layoutId={`item-image-${selectedItem.id}`}
                  src={selectedItem.images[0]} 
                  alt={selectedItem.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(null);
                  }}
                  className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full text-white transition-all md:hidden"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </motion.div>

              {/* Content */}
              <div className="w-full md:w-1/2 p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-bold uppercase tracking-wider">
                    {selectedItem.category}
                  </span>
                  <button onClick={() => setSelectedItem(null)} className="hidden md:block p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedItem.title}</h2>
                <div className="text-2xl font-black text-brand-primary mb-6">
                  {selectedItem.price} {selectedItem.currency}
                </div>

                <div className="space-y-6 mb-8">
                  <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{t('item_description')}</h4>
                    <p className="text-slate-600 leading-relaxed">{selectedItem.description}</p>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xl">
                      {selectedItem.sellerName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800">{selectedItem.sellerName}</h4>
                        {selectedItem.isVerifiedSupplier && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <p className="text-xs text-slate-500">{selectedItem.sellerRole}</p>
                    </div>
                    <button 
                      onClick={() => onViewProfile(selectedItem.sellerId)}
                      className="ml-auto p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-brand-primary"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-5 h-5 text-brand-primary" />
                    <span>{selectedItem.location || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-auto">
                  <HapticButton 
                    onClick={() => handleContactSeller(selectedItem)}
                    className="flex-1 flex items-center justify-center gap-3 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-primary-hover transition-all shadow-xl shadow-brand-primary/20"
                  >
                    <MessageCircle className="w-6 h-6" />
                    {t('contact_seller')}
                  </HapticButton>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Screen Image Viewer */}
      <AnimatePresence>
        {viewingImage && (
          <GestureImageViewer 
            src={viewingImage} 
            alt="Marketplace Item" 
            onClose={() => setViewingImage(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
