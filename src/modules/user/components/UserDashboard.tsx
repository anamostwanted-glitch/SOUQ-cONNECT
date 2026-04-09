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
  Globe,
  Users,
  MessageSquare,
  FileText,
  BarChart3,
  Zap,
  ShieldCheck,
  Activity,
  Cpu,
  Target,
  Sparkles,
  Bell,
  LogOut
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, documentId, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { toast } from 'sonner';
import { UserProfile, AppFeatures, ProductRequest, MarketplaceItem } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { RequestSkeleton } from '../../../shared/components/Skeleton';
import { ProductCard } from '../../marketplace/components/ProductCard';
import { ProductDetailsModal } from '../../../shared/components/ProductDetailsModal';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

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

type UserTab = 'requests' | 'favorites' | 'wallet' | 'addresses' | 'settings' | 'chats' | 'suppliers' | 'market' | 'stats';

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
    supplierTab === 'personal' ? 'settings' : 'stats'
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

    fetchFavorites().catch(err => console.error("Unhandled fetchFavorites error:", err));
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
      handleFirestoreError(error, OperationType.GET, 'requests', false);
      setIsLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleDeleteRequest = async (requestId: string) => {
    if (window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا الطلب؟' : 'Are you sure you want to delete this request?')) {
      try {
        await updateDoc(doc(db, 'requests', requestId), {
          status: 'deleted',
          deletedAt: new Date().toISOString()
        });
        toast.success(isRtl ? 'تم حذف الطلب بنجاح' : 'Request deleted successfully');
      } catch (error) {
        console.error('Error deleting request:', error);
        toast.error(isRtl ? 'حدث خطأ أثناء حذف الطلب' : 'Error deleting request');
      }
    }
  };

  const tabs = [
    { id: 'requests', icon: FileText, label: isRtl ? 'طلباتي' : 'My Requests' },
    { id: 'chats', icon: MessageSquare, label: isRtl ? 'المحادثات' : 'Chats' },
    { id: 'wallet', icon: Wallet, label: isRtl ? 'المدفوعات' : 'Payments' },
    { id: 'suppliers', icon: Users, label: isRtl ? 'الموردين' : 'Suppliers' },
    { id: 'market', icon: Globe, label: isRtl ? 'السوق' : 'Market' },
    { id: 'stats', icon: BarChart3, label: isRtl ? 'الإحصائيات' : 'Statistics' },
    { id: 'favorites', icon: Heart, label: isRtl ? 'المفضلة' : 'Favorites' },
    { id: 'settings', icon: Settings, label: isRtl ? 'الإعدادات' : 'Settings' },
  ];

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-sm";

  const renderAIAnalytics = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
              <Sparkles size={20} />
            </div>
            <h2 className="text-xl font-black text-brand-text-main">
              {isRtl ? 'تحليلات الذكاء الاصطناعي' : 'AI Analytics'}
            </h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            {isRtl ? 'مباشر' : 'Live'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Accuracy Card */}
          <div className={`${glassClass} p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                <Target size={24} />
              </div>
              <Activity size={20} className="text-brand-primary opacity-50" />
            </div>
            <p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider mb-1">
              {isRtl ? 'دقة المطابقة' : 'Match Accuracy'}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-brand-text-main">94%</h3>
              <span className="text-emerald-500 text-xs font-bold">+2.4%</span>
            </div>
          </div>

          {/* Response Speed Card */}
          <div className={`${glassClass} p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                <Clock size={24} />
              </div>
              <Zap size={20} className="text-amber-500 opacity-50" />
            </div>
            <p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider mb-1">
              {isRtl ? 'سرعة الاستجابة' : 'Response Speed'}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-brand-text-main">12m</h3>
              <span className="text-rose-500 text-xs font-bold">-3d</span>
            </div>
          </div>

          {/* Market Activity Card */}
          <div className={`${glassClass} p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                <BarChart3 size={24} />
              </div>
              <Zap size={20} className="text-indigo-500 opacity-50" />
            </div>
            <p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider mb-1">
              {isRtl ? 'نشاط السوق' : 'Market Activity'}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-brand-text-main">82%</h3>
              <span className="text-indigo-500 text-xs font-bold">High</span>
            </div>
          </div>

          {/* Quality Card */}
          <div className={`${glassClass} p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                <ShieldCheck size={24} />
              </div>
              <CheckCircle2 size={20} className="text-emerald-500 opacity-50" />
            </div>
            <p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider mb-1">
              {isRtl ? 'جودة الطلبات' : 'Requests Quality'}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-brand-text-main">88%</h3>
              <span className="text-emerald-500 text-xs font-bold">Optimal</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Smart Assistant Card */}
          <div className="bg-gradient-to-br from-brand-primary to-brand-teal p-8 rounded-[2.5rem] text-white relative overflow-hidden group shadow-xl shadow-brand-primary/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                <Sparkles size={28} />
              </div>
              <h3 className="text-2xl font-black mb-4 leading-tight">
                {isRtl ? 'المساعد الذكي يتوقع احتياجك' : 'Smart Assistant predicts your needs'}
              </h3>
              <p className="text-white/80 text-sm mb-8 leading-relaxed max-w-sm">
                {isRtl 
                  ? 'بناءً على طلبك الأخير لـ "إسمنت"، قد تحتاج قريباً إلى "حديد تسليح". هل ترغب في استكشاف الموردين المتاحين؟' 
                  : 'Based on your recent request for "Cement", you might soon need "Rebar". Would you like to explore available suppliers?'}
              </p>
              <HapticButton className="px-8 py-4 bg-white text-brand-primary rounded-2xl font-black hover:bg-white/90 transition-all flex items-center gap-3 group/btn">
                {isRtl ? 'استكشاف المقترحات' : 'Explore Suggestions'}
                <ChevronRight size={20} className={`group-hover/btn:translate-x-1 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
              </HapticButton>
            </div>
          </div>

          {/* System Diagnostics */}
          <div className={`${glassClass} p-8 rounded-[2.5rem]`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Activity size={24} className="text-brand-text-main" />
                <h3 className="text-xl font-black text-brand-text-main">
                  {isRtl ? 'تشخيصات النظام' : 'System Diagnostics'}
                </h3>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                {isRtl ? 'مثالي' : 'Optimal'}
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-brand-text-muted uppercase tracking-wider">{isRtl ? 'سرعة المعالجة' : 'Processing Speed'}</span>
                  <span className="text-brand-text-main">98%</span>
                </div>
                <div className="h-2 bg-brand-background rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '98%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-brand-primary rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-brand-text-muted uppercase tracking-wider">{isRtl ? 'دقة البيانات' : 'Data Accuracy'}</span>
                  <span className="text-brand-text-main">100%</span>
                </div>
                <div className="h-2 bg-brand-background rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="h-full bg-brand-teal rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-brand-text-muted uppercase tracking-wider">{isRtl ? 'أمان المعاملات' : 'Transaction Security'}</span>
                  <span className="text-brand-text-main">99.9%</span>
                </div>
                <div className="h-2 bg-brand-background rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '99.9%' }}
                    transition={{ duration: 1, delay: 0.9 }}
                    className="h-full bg-indigo-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stats':
        return renderAIAnalytics();
      case 'chats':
        return (
          <div className={`${glassClass} rounded-3xl p-12 text-center`}>
            <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mx-auto mb-6">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-2xl font-black text-brand-text-main mb-4">{isRtl ? 'المحادثات' : 'Chats'}</h3>
            <p className="text-brand-text-muted max-w-md mx-auto">
              {isRtl ? 'سيتم عرض محادثاتك مع الموردين هنا قريباً.' : 'Your chats with suppliers will be displayed here soon.'}
            </p>
          </div>
        );
      case 'suppliers':
        return (
          <div className={`${glassClass} rounded-3xl p-12 text-center`}>
            <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mx-auto mb-6">
              <Users size={40} />
            </div>
            <h3 className="text-2xl font-black text-brand-text-main mb-4">{isRtl ? 'الموردين' : 'Suppliers'}</h3>
            <p className="text-brand-text-muted max-w-md mx-auto">
              {isRtl ? 'قائمة الموردين المفضلين والموثوقين ستظهر هنا.' : 'Your list of favorite and trusted suppliers will appear here.'}
            </p>
          </div>
        );
      case 'market':
        return (
          <div className={`${glassClass} rounded-3xl p-12 text-center`}>
            <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mx-auto mb-6">
              <Globe size={40} />
            </div>
            <h3 className="text-2xl font-black text-brand-text-main mb-4">{isRtl ? 'السوق' : 'Market'}</h3>
            <p className="text-brand-text-muted max-w-md mx-auto">
              {isRtl ? 'استكشف المنتجات والمواد المتاحة في السوق.' : 'Explore products and materials available in the market.'}
            </p>
          </div>
        );
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
                    onDelete={handleDeleteRequest}
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
              <div className="p-4 hover:bg-rose-500/5 transition-colors cursor-pointer flex items-center justify-between text-rose-500" onClick={() => auth.signOut().catch(err => console.error("Sign out error:", err))}>
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
    <div className={`min-h-screen pb-24 md:pb-8 transition-colors duration-500 ${activeTab === 'stats' ? 'bg-slate-50/50 dark:bg-slate-950/50' : ''}`}>
      {/* Immersive Background for Stats */}
      {activeTab === 'stats' && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-teal/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header - Hidden in Minimal Mode if not on settings */}
        {uiStyle !== 'minimal' && activeTab !== 'stats' && (
          <div className="px-6 pt-8 pb-6 sticky top-0 z-30">
            <h1 className="text-3xl font-black text-brand-text-main tracking-tight">
              {isRtl ? 'مرحباً،' : 'Hello,'} <span className="text-brand-primary">{profile.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-brand-text-muted mt-1">
              {isRtl ? 'إليك نظرة عامة على نشاطك اليوم' : 'Here is an overview of your activity today'}
            </p>
          </div>
        )}

        <div className="p-6">
          {/* Navigation Tabs - Centered Pill Style */}
          <div className="flex justify-center mb-12 overflow-x-auto hide-scrollbar py-4">
            <div className="flex items-center gap-2 md:gap-4 p-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-slate-700/50 shadow-xl shadow-black/5">
              {tabs.map(tab => (
                <HapticButton
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as UserTab);
                    if (tab.id === 'settings') setSupplierTab?.('personal');
                    else setSupplierTab?.('dashboard');
                  }}
                  className={`flex flex-col items-center gap-1.5 py-3 px-4 md:px-6 rounded-[2rem] transition-all duration-300 relative group ${
                    activeTab === tab.id 
                      ? 'text-brand-primary' 
                      : 'text-brand-text-muted hover:text-brand-text-main'
                  }`}
                >
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-500 ${
                    activeTab === tab.id 
                      ? 'bg-white dark:bg-slate-800 shadow-lg scale-110' 
                      : 'bg-transparent group-hover:bg-white/50 dark:group-hover:bg-slate-800/50'
                  }`}>
                    <tab.icon size={activeTab === tab.id ? 24 : 20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest transition-opacity duration-300 ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>
                    {tab.label}
                  </span>
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-brand-primary/5 rounded-[2rem] -z-10"
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </HapticButton>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
