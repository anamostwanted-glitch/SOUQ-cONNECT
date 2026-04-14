import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FluidSlider } from './FluidSlider';
import { PredictiveMatchSection } from './PredictiveMatchSection';
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
import { ProductDiscoveryCanvas } from './ProductDiscoveryCanvas';
import { SmartRequestForm } from './SmartRequestForm';
import { RequestFeed } from './RequestFeed';
import { MakeOfferModal } from './MakeOfferModal';
import { BroadcastBox } from './BroadcastBox';
import { ScrollDirection, useScrollDirection } from '../../../shared/hooks/useScrollDirection';

interface MarketInterfaceProps {
  profile: UserProfile | null;
  features: AppFeatures;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  viewMode?: UserRole;
  activeTab?: 'discover' | 'myshop' | 'requests';
  setActiveTab?: (tab: 'discover' | 'myshop' | 'requests') => void;
}

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

  // Basic state for now
  const [searchTerm, setSearchTerm] = useState('');

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
  const [visualSearchResults, setVisualSearchResults] = useState<MarketplaceItem[] | null>(null);
  
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const { data: itemsData = { items: [], lastDoc: null }, isLoading: itemsLoading } = useQuery({
    queryKey: ['marketplace', activeTab, auth.currentUser?.uid],
    queryFn: () => fetchMarketplaceItems(activeTab, auth.currentUser?.uid),
    enabled: !!auth.currentUser || activeTab === 'discover',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false
  });
  
  const items = itemsData.items;

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
    
    return matchesSearch;
  });
  
  return (
    <div className="min-h-screen bg-brand-background pb-32 overflow-x-hidden">
      {/* Search Section */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
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
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        
        {/* Tabs */}
        <div className="flex p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl mb-8 w-fit">
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
        ) : showAdminHub ? (
          <div className="p-6 rounded-[2rem] bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/30 dark:border-slate-700/40 shadow-xl flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-4">
              <Database size={32} />
            </div>
            <h3 className="text-lg font-black text-brand-text-main mb-2">{isRtl ? 'إدارة البيانات' : 'Data Management'}</h3>
            <p className="text-sm text-brand-text-muted mb-6">{isRtl ? 'تصدير وتحليل بيانات المستخدمين والموردين' : 'Export and analyze user and supplier data'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <ProductCard 
                key={item.id} 
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
            onContactSeller={() => {}}
            onViewProfile={onViewProfile}
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
