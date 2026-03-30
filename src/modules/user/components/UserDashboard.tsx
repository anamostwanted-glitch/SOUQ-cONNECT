import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Heart, 
  Wallet, 
  MapPin, 
  Settings, 
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Plus,
  User as UserIcon,
  Bell,
  LogOut
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, documentId, getDocs } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { UserProfile, AppFeatures, ProductRequest, MarketplaceItem } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { RequestSkeleton } from '../../../shared/components/Skeleton';
import { ProductCard } from '../../marketplace/components/ProductCard';
import { ProductDetailsModal } from '../../../shared/components/ProductDetailsModal';

import { ProfileSettings } from './ProfileSettings';

import { UserRequestCard } from './UserRequestCard';

interface UserDashboardProps {
  profile: UserProfile;
  features: AppFeatures;
  supplierTab?: string;
  setSupplierTab?: (tab: string) => void;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  uiStyle?: 'classic' | 'minimal';
}

type UserTab = 'requests' | 'favorites' | 'wallet' | 'addresses' | 'settings';

export const UserDashboard: React.FC<UserDashboardProps> = ({
  profile,
  features,
  supplierTab = 'dashboard',
  setSupplierTab,
  onOpenChat,
  onViewProfile,
  uiStyle = 'classic'
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  // Map supplierTab to UserTab
  const [activeTab, setActiveTab] = useState<UserTab>(
    supplierTab === 'personal' ? 'settings' : 'requests'
  );
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  const [favoriteItems, setFavoriteItems] = useState<MarketplaceItem[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceItem | null>(null);

  // Sync external tab changes
  useEffect(() => {
    if (supplierTab === 'personal') setActiveTab('settings');
    else if (supplierTab === 'dashboard') setActiveTab('requests');
  }, [supplierTab]);

  // Fetch favorite products
  useEffect(() => {
    if (activeTab !== 'favorites' || !profile?.favoriteProducts || profile.favoriteProducts.length === 0) {
      setFavoriteItems([]);
      setIsLoadingFavorites(false);
      return;
    }

    const fetchFavorites = async () => {
      setIsLoadingFavorites(true);
      
      const chunkedIds = [];
      for (let i = 0; i < profile.favoriteProducts!.length; i += 10) {
        chunkedIds.push(profile.favoriteProducts!.slice(i, i + 10));
      }

      try {
        const allItems: MarketplaceItem[] = [];
        for (const chunk of chunkedIds) {
          const q = query(
            collection(db, 'marketplace'),
            where(documentId(), 'in', chunk)
          );
          const snapshot = await getDocs(q);
          snapshot.docs.forEach(doc => {
            allItems.push({ id: doc.id, ...doc.data() } as MarketplaceItem);
          });
        }
        setFavoriteItems(allItems);
      } catch (error) {
        console.error("Error fetching favorite products:", error);
      } finally {
        setIsLoadingFavorites(false);
      }
    };

    fetchFavorites();
  }, [activeTab, profile?.favoriteProducts]);
  // Fetch user requests
  useEffect(() => {
    if (!profile?.uid) return;
    
    setIsLoadingRequests(true);
    const q = query(
      collection(db, 'requests'), 
      where('customerId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs: ProductRequest[] = [];
      snapshot.forEach((doc) => {
        reqs.push({ id: doc.id, ...doc.data() } as ProductRequest);
      });
      setRequests(reqs);
      setIsLoadingRequests(false);
    }, (error) => {
      console.error("Error fetching user requests:", error);
      setIsLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const tabs = [
    { id: 'requests', icon: ShoppingBag, label: isRtl ? 'طلباتي' : 'My Requests' },
    { id: 'favorites', icon: Heart, label: isRtl ? 'المفضلة' : 'Favorites' },
    { id: 'wallet', icon: Wallet, label: isRtl ? 'المحفظة' : 'Wallet' },
    { id: 'addresses', icon: MapPin, label: isRtl ? 'عناويني' : 'Addresses' },
    { id: 'settings', icon: Settings, label: isRtl ? 'الإعدادات' : 'Settings' },
  ];

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-sm";

  const renderTabContent = () => {
    switch (activeTab) {
      case 'requests':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-brand-text-main mb-4">
              {isRtl ? 'أحدث الطلبات' : 'Recent Requests'}
            </h2>
            <AnimatePresence mode="popLayout">
              {isLoadingRequests ? (
                [1, 2, 3].map(i => <RequestSkeleton key={i} />)
              ) : requests.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`${glassClass} rounded-3xl p-8 text-center flex flex-col items-center justify-center`}
                >
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mb-4">
                    <ShoppingBag size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-brand-text-main mb-2">
                    {isRtl ? 'لا توجد طلبات حالياً' : 'No requests yet'}
                  </h3>
                  <p className="text-brand-text-muted text-sm max-w-xs mx-auto mb-6">
                    {isRtl ? 'ابدأ بإنشاء طلب جديد للحصول على عروض من أفضل الموردين.' : 'Start by creating a new request to get offers from top suppliers.'}
                  </p>
                  <HapticButton className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2">
                    <Plus size={18} />
                    {isRtl ? 'إنشاء طلب جديد' : 'Create New Request'}
                  </HapticButton>
                </motion.div>
              ) : (
                requests.map(req => (
                  <UserRequestCard 
                    key={req.id}
                    request={req}
                    profile={profile}
                    onOpenChat={onOpenChat}
                    onViewProfile={onViewProfile}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        );
      case 'favorites':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-brand-text-main mb-4">
              {isRtl ? 'المنتجات المفضلة' : 'Favorite Products'}
            </h2>
            {isLoadingFavorites ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
              </div>
            ) : favoriteItems.length === 0 ? (
              <div className={`${glassClass} rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]`}>
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-4">
                  <Heart size={32} />
                </div>
                <h3 className="text-lg font-bold text-brand-text-main mb-2">
                  {isRtl ? 'المفضلة فارغة' : 'Favorites is empty'}
                </h3>
                <p className="text-brand-text-muted text-sm max-w-xs mx-auto">
                  {isRtl ? 'احفظ الموردين والمنتجات المفضلة لديك للوصول السريع إليها لاحقاً.' : 'Save your favorite suppliers and products for quick access later.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {favoriteItems.map(item => (
                  <ProductCard 
                    key={item.id} 
                    item={item} 
                    onOpenChat={onOpenChat}
                    onViewDetails={() => setSelectedProduct(item)}
                  />
                ))}
              </div>
            )}
            
            {/* Product Details Modal */}
            <AnimatePresence>
              {selectedProduct && (
                <ProductDetailsModal
                  item={selectedProduct}
                  onClose={() => setSelectedProduct(null)}
                  onContactSeller={() => onOpenChat(selectedProduct.sellerId)}
                  onViewProfile={onViewProfile}
                />
              )}
            </AnimatePresence>
          </div>
        );
      case 'wallet':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-brand-primary to-brand-teal p-6 rounded-3xl text-white shadow-xl shadow-brand-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">{isRtl ? 'الرصيد المتاح' : 'Available Balance'}</p>
                    <h2 className="text-4xl font-black tracking-tight">0.00 <span className="text-xl font-medium text-white/80">{isRtl ? 'ر.س' : 'SAR'}</span></h2>
                  </div>
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                    <Wallet size={24} className="text-white" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <HapticButton className="flex-1 bg-white text-brand-primary py-3 rounded-xl font-bold shadow-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                    <Plus size={18} />
                    {isRtl ? 'شحن الرصيد' : 'Top Up'}
                  </HapticButton>
                  <HapticButton className="flex-1 bg-white/20 backdrop-blur-sm text-white py-3 rounded-xl font-bold border border-white/30 hover:bg-white/30 transition-colors">
                    {isRtl ? 'سحب' : 'Withdraw'}
                  </HapticButton>
                </div>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-brand-text-main mt-8 mb-4">{isRtl ? 'طرق الدفع' : 'Payment Methods'}</h3>
            <div className={`${glassClass} rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-brand-primary transition-colors`}>
              <div className="w-12 h-12 bg-brand-background rounded-xl flex items-center justify-center text-brand-text-muted">
                <CreditCard size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-brand-text-main">{isRtl ? 'إضافة بطاقة جديدة' : 'Add New Card'}</h4>
                <p className="text-xs text-brand-text-muted">{isRtl ? 'مدى، فيزا، ماستركارد' : 'Mada, Visa, Mastercard'}</p>
              </div>
              <ChevronRight size={20} className={`text-brand-text-muted ${isRtl ? 'rotate-180' : ''}`} />
            </div>
          </div>
        );
      case 'addresses':
        return (
          <div className="space-y-4">
            <HapticButton className={`w-full ${glassClass} border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 text-brand-text-muted hover:text-brand-primary hover:border-brand-primary hover:bg-brand-primary/5 transition-all group`}>
              <div className="w-12 h-12 bg-brand-background rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <span className="font-bold">{isRtl ? 'إضافة عنوان جديد' : 'Add New Address'}</span>
            </HapticButton>
          </div>
        );
      case 'settings':
        if (showProfileEdit) {
          return <ProfileSettings profile={profile} onBack={() => setShowProfileEdit(false)} />;
        }
        return (
          <div className="space-y-6">
            <div className={`${glassClass} rounded-3xl p-6 flex items-center gap-5`}>
              <div className="w-20 h-20 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary shrink-0">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <UserIcon size={32} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-brand-text-main truncate">{profile.name}</h3>
                <p className="text-brand-text-muted text-sm truncate">{profile.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-lg border border-brand-primary/20">
                  {isRtl ? 'مستخدم' : 'User'}
                </span>
              </div>
            </div>

            <div className={`${glassClass} rounded-3xl overflow-hidden`}>
              <div 
                className="p-4 border-b border-brand-border/50 hover:bg-brand-background transition-colors cursor-pointer flex items-center justify-between"
                onClick={() => setShowProfileEdit(true)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl"><UserIcon size={20} /></div>
                  <span className="font-bold text-brand-text-main">{isRtl ? 'البيانات الشخصية' : 'Personal Info'}</span>
                </div>
                <ChevronRight size={20} className={`text-brand-text-muted ${isRtl ? 'rotate-180' : ''}`} />
              </div>
              <div className="p-4 border-b border-brand-border/50 hover:bg-brand-background transition-colors cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl"><Bell size={20} /></div>
                  <span className="font-bold text-brand-text-main">{isRtl ? 'الإشعارات' : 'Notifications'}</span>
                </div>
                <ChevronRight size={20} className={`text-brand-text-muted ${isRtl ? 'rotate-180' : ''}`} />
              </div>
              <div className="p-4 hover:bg-rose-500/5 transition-colors cursor-pointer flex items-center justify-between text-rose-500" onClick={() => auth.signOut()}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 rounded-xl"><LogOut size={20} /></div>
                  <span className="font-bold">{isRtl ? 'تسجيل الخروج' : 'Sign Out'}</span>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`max-w-4xl mx-auto pb-24 md:pb-8 ${uiStyle === 'minimal' ? 'pt-8' : ''}`}>
      {/* Header - Hidden in Minimal Mode if not on settings */}
      {uiStyle !== 'minimal' && (
        <div className="px-6 pt-8 pb-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/50 sticky top-0 z-30">
          <h1 className="text-3xl font-black text-brand-text-main tracking-tight">
            {isRtl ? 'مرحباً،' : 'Hello,'} <span className="text-brand-primary">{profile.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-brand-text-muted mt-1">
            {isRtl ? 'إليك نظرة عامة على نشاطك اليوم' : 'Here is an overview of your activity today'}
          </p>
        </div>
      )}

      <div className="p-6">
        {/* Quick Stats - Hidden in Minimal Mode */}
        {uiStyle !== 'minimal' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className={`${glassClass} p-4 rounded-2xl flex flex-col justify-center`}>
              <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary mb-3">
                <ShoppingBag size={20} />
              </div>
              <span className="text-2xl font-black text-brand-text-main">{requests.length}</span>
              <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider mt-1">{isRtl ? 'إجمالي الطلبات' : 'Total Requests'}</span>
            </div>
            <div className={`${glassClass} p-4 rounded-2xl flex flex-col justify-center`}>
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-3">
                <CheckCircle2 size={20} />
              </div>
              <span className="text-2xl font-black text-brand-text-main">{requests.filter(r => r.status === 'closed').length}</span>
              <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider mt-1">{isRtl ? 'مكتملة' : 'Completed'}</span>
            </div>
            <div className={`${glassClass} p-4 rounded-2xl flex flex-col justify-center`}>
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 mb-3">
                <AlertCircle size={20} />
              </div>
              <span className="text-2xl font-black text-brand-text-main">{requests.filter(r => r.status === 'open').length}</span>
              <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider mt-1">{isRtl ? 'بانتظار العروض' : 'Awaiting Offers'}</span>
            </div>
            <div className="bg-gradient-to-br from-brand-primary to-brand-teal p-4 rounded-2xl shadow-lg text-white flex flex-col justify-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white mb-3">
                <Wallet size={20} />
              </div>
              <span className="text-2xl font-black">0.00</span>
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider mt-1">{isRtl ? 'الرصيد (ر.س)' : 'Balance (SAR)'}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs - Minimalist Underline Style */}
        <div className={`border-b border-brand-border/40 mb-8 overflow-x-auto hide-scrollbar ${uiStyle === 'minimal' ? 'sticky top-0 bg-brand-background/80 backdrop-blur-md z-30 py-2' : ''}`}>
          <div className="flex gap-8 min-w-max px-1">
            {tabs.map(tab => (
              <HapticButton
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as UserTab);
                  if (tab.id === 'settings') setSupplierTab?.('personal');
                  else setSupplierTab?.('dashboard');
                }}
                className={`flex items-center gap-2 py-4 text-sm font-bold transition-all relative border-b-2 ${
                  activeTab === tab.id 
                    ? 'text-brand-primary border-brand-primary' 
                    : 'text-brand-text-muted border-transparent hover:text-brand-text-main'
                }`}
              >
                <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                {tab.label}
              </HapticButton>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </div>
  );
};
