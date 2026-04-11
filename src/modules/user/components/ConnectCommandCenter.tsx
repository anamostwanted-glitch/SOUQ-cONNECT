import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Wallet, 
  ShieldCheck, 
  Star, 
  Zap, 
  Sparkles, 
  TrendingUp, 
  ShoppingBag, 
  MessageSquare, 
  Settings, 
  ChevronRight, 
  Activity, 
  Cpu, 
  Target, 
  Bell, 
  LogOut,
  Plus,
  Heart,
  Globe,
  Users,
  BarChart3,
  FileText,
  Camera,
  Edit2,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Bot,
  Share2,
  ExternalLink,
  Package,
  Megaphone
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { UserProfile, AppFeatures, ProductRequest, MarketplaceItem } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, handleAiError } from '../../../core/utils/errorHandling';
import { ProfileSettings } from './ProfileSettings';
import { UserRequestCard } from './UserRequestCard';
import { VendorRequestCard } from '../../vendor/components/VendorRequestCard';
import { VendorOffersList } from '../../vendor/components/VendorOffersList';
import { SubscriptionManager } from '../../../components/SubscriptionManager';
import { ProductCard } from '../../marketplace/components/ProductCard';
import { SmartUploadModal } from '../../marketplace/components/upload-flow/SmartUploadModal';
import { Category } from '../../../core/types';
import { UserNeuralHub } from '../../common/components/UserNeuralHub';

interface ConnectCommandCenterProps {
  profile: UserProfile;
  features: AppFeatures;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  uiStyle?: 'classic' | 'minimal';
}

type Perspective = 'customer' | 'supplier';

export const ConnectCommandCenter: React.FC<ConnectCommandCenterProps> = ({
  profile,
  features,
  onOpenChat,
  onViewProfile,
  uiStyle = 'classic'
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [perspective, setPerspective] = useState<Perspective>(
    profile.role === 'supplier' ? 'supplier' : 'customer'
  );
  
  const [activeSubView, setActiveSubView] = useState<string | null>(null);
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [myMarketItems, setMyMarketItems] = useState<MarketplaceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [insights, setInsights] = useState<{ ar: string; en: string }[]>([]);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  // AI Insights Mock Data
  useEffect(() => {
    const mockInsights = [
      { ar: "أكمل ملفك الشخصي لزيادة ثقة العملاء بنسبة 40%", en: "Complete your profile to increase customer trust by 40%" },
      { ar: "هناك طلب متزايد على مواد البناء في منطقتك حالياً", en: "There is an increasing demand for construction materials in your area now" },
      { ar: "لديك 3 محادثات جديدة لم يتم الرد عليها", en: "You have 3 new unread conversations" },
      { ar: "رصيد نيرال الخاص بك منخفض، اشحن الآن للحصول على ميزات إضافية", en: "Your Neural Credits are low, top up now for extra features" }
    ];
    setInsights(mockInsights);
    
    const timer = setInterval(() => {
      setCurrentInsightIndex(prev => (prev + 1) % mockInsights.length);
    }, 6000);
    
    return () => clearInterval(timer);
  }, []);

  // Fetch requests based on perspective
  useEffect(() => {
    if (!profile?.uid || auth.currentUser?.isAnonymous) return;
    
    setIsLoadingRequests(true);
    let q;
    if (perspective === 'customer') {
      q = query(
        collection(db, 'requests'), 
        where('customerId', '==', profile.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
    } else {
      q = query(
        collection(db, 'requests'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs: ProductRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.isDeleted) {
          reqs.push({ id: doc.id, ...data } as ProductRequest);
        }
      });
      setRequests(reqs);
      setIsLoadingRequests(false);
    }, (error) => {
      console.error('Firestore Error in requests listener:', error, 'Auth:', auth.currentUser?.uid, 'Perspective:', perspective);
      handleFirestoreError(error, OperationType.GET, 'requests', false);
      setIsLoadingRequests(false);
    });

    return () => unsubscribe();
  }, [profile?.uid, perspective]);

  // Fetch my marketplace items
  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'marketplace'),
      where('sellerId', '==', profile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMyMarketItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'marketplace', false);
    });
    return () => unsub();
  }, [profile?.uid]);

  // Fetch categories
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories', false);
    });
    return () => unsub();
  }, []);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/profile/${profile.uid}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile.companyName || profile.name,
          text: isRtl ? 'تحقق من متجري على المنصة!' : 'Check out my store on the platform!',
          url: shareUrl,
        });
      } catch (err) {
        handleAiError(err, 'ConnectCommandCenter:handleShare', false);
      }
    } else {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          toast.success(isRtl ? 'تم نسخ الرابط' : 'Link copied to clipboard');
        })
        .catch(err => {
          handleAiError(err, 'ConnectCommandCenter:handleShare:clipboard', false);
          toast.error(isRtl ? 'فشل نسخ الرابط' : 'Failed to copy link');
        });
    }
  };

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]";
  const cardClass = `${glassClass} rounded-[2.5rem] p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl`;

  const renderPerspectiveSwitcher = () => (
    <div className="flex p-1.5 bg-brand-background/50 backdrop-blur-xl rounded-2xl border border-brand-border/50 w-fit mx-auto mb-8">
      <button
        onClick={() => setPerspective('customer')}
        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2 ${
          perspective === 'customer' 
            ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
            : 'text-brand-text-muted hover:text-brand-text-main'
        }`}
      >
        <ShoppingBag size={14} />
        {isRtl ? 'كمشتري' : 'As Customer'}
      </button>
      <button
        onClick={() => setPerspective('supplier')}
        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-2 ${
          perspective === 'supplier' 
            ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
            : 'text-brand-text-muted hover:text-brand-text-main'
        }`}
      >
        <Users size={14} />
        {isRtl ? 'كمورد' : 'As Supplier'}
      </button>
    </div>
  );

  const renderAuraHeader = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mb-12"
    >
      <div className={`relative overflow-hidden rounded-[3rem] ${glassClass} p-8 md:p-12 border-2 border-white/50 dark:border-slate-700/50`}>
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-brand-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-brand-teal/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Profile Photo with Aura */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-tr from-brand-primary to-brand-teal rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
            <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-white dark:bg-slate-800 p-1 shadow-2xl overflow-hidden">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover rounded-[2.3rem]" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand-primary bg-brand-primary/5">
                  <UserIcon size={64} strokeWidth={1.5} />
                </div>
              )}
            </div>
            <HapticButton 
              onClick={() => setActiveSubView('settings')}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-slate-700 rounded-xl shadow-xl flex items-center justify-center text-brand-primary hover:scale-110 transition-transform border border-brand-border/50"
            >
              <Camera size={18} />
            </HapticButton>
          </div>

          {/* Identity Info */}
          <div className="flex-1 text-center md:text-right">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-4">
              <h1 className="text-3xl md:text-5xl font-black text-brand-text-main tracking-tight">
                {profile.name}
              </h1>
              {profile.isVerified && (
                <div className="p-1.5 bg-brand-primary/10 text-brand-primary rounded-full" title="Verified Account">
                  <ShieldCheck size={24} fill="currentColor" fillOpacity={0.1} />
                </div>
              )}
            </div>
            
            <p className="text-brand-text-muted text-lg font-medium mb-6 max-w-lg">
              {profile.bio || (isRtl ? 'لم يتم إضافة نبذة شخصية بعد...' : 'No bio added yet...')}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="px-5 py-2.5 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 flex items-center gap-3">
                <Wallet size={20} className="text-brand-primary" />
                <div className="text-right">
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{isRtl ? 'رصيد نيرال' : 'Neural Credits'}</p>
                  <p className="text-lg font-black text-brand-text-main">{profile.neuralCredits || 0}</p>
                </div>
              </div>
              <div className="px-5 py-2.5 rounded-2xl bg-brand-teal/5 border border-brand-teal/10 flex items-center gap-3">
                <Star size={20} className="text-brand-teal" />
                <div className="text-right">
                  <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest">{isRtl ? 'التقييم' : 'Rating'}</p>
                  <p className="text-lg font-black text-brand-text-main">4.9</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <HapticButton 
                  onClick={handleShare}
                  className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-brand-border/50 flex items-center justify-center text-brand-primary shadow-sm hover:bg-brand-primary hover:text-white transition-all"
                  title={isRtl ? 'مشاركة' : 'Share'}
                >
                  <Share2 size={20} />
                </HapticButton>
                <HapticButton 
                  onClick={() => onViewProfile(profile.uid)}
                  className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-brand-border/50 flex items-center justify-center text-brand-teal shadow-sm hover:bg-brand-teal hover:text-white transition-all"
                  title={isRtl ? 'معاينة المتجر' : 'Preview Store'}
                >
                  <ExternalLink size={20} />
                </HapticButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderPulseRibbon = () => (
    <div className="mb-12 overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 bg-brand-primary/5 backdrop-blur-xl rounded-[2rem] border border-brand-primary/10">
        <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand-primary/20">
          <Bot size={20} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentInsightIndex}
              initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
              className="text-sm md:text-base font-bold text-brand-text-main truncate"
            >
              {isRtl ? insights[currentInsightIndex]?.ar : insights[currentInsightIndex]?.en}
            </motion.p>
          </AnimatePresence>
        </div>
        <HapticButton className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary/20 transition-all">
          {isRtl ? 'تفاصيل' : 'Details'}
        </HapticButton>
      </div>
    </div>
  );

  const renderBentoMatrix = () => {
    const customerCards = [
      { id: 'smart_pulse', title: isRtl ? 'النبض الذكي' : 'Smart Pulse', icon: Activity, color: 'text-brand-teal', bg: 'bg-brand-teal/10', stat: 'AI' },
      { id: 'requests', title: isRtl ? 'طلباتي' : 'My Requests', icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10', stat: requests.length },
      { id: 'my_ads', title: isRtl ? 'إعلاناتي' : 'My Ads', icon: Megaphone, color: 'text-purple-500', bg: 'bg-purple-500/10', stat: myMarketItems.length },
      { id: 'favorites', title: isRtl ? 'المفضلة' : 'Favorites', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10', stat: profile.favoriteProducts?.length || 0 },
      { id: 'wallet', title: isRtl ? 'المحفظة' : 'Wallet', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10', stat: '0.00' },
      { id: 'chats', title: isRtl ? 'المحادثات' : 'Chats', icon: MessageSquare, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: '3' },
      { id: 'settings', title: isRtl ? 'الإعدادات' : 'Settings', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-500/10', stat: 'AI Ready' }
    ];

    const supplierCards = [
      { id: 'smart_pulse', title: isRtl ? 'النبض الذكي' : 'Smart Pulse', icon: Activity, color: 'text-brand-teal', bg: 'bg-brand-teal/10', stat: 'AI' },
      { id: 'my_products', title: isRtl ? 'منتجاتي' : 'My Products', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10', stat: myMarketItems.length },
      { id: 'available_requests', title: isRtl ? 'طلبات السوق' : 'Market RFQs', icon: Globe, color: 'text-indigo-500', bg: 'bg-indigo-500/10', stat: '20+' },
      { id: 'my_offers', title: isRtl ? 'عروضي' : 'My Offers', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10', stat: '12' },
      { id: 'analytics', title: isRtl ? 'التحليلات' : 'Analytics', icon: BarChart3, color: 'text-brand-primary', bg: 'bg-brand-primary/10', stat: '94%' },
      { id: 'subscription', title: isRtl ? 'الاشتراك' : 'Subscription', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', stat: 'Pro' },
      { id: 'store_settings', title: isRtl ? 'إعدادات المتجر' : 'Store Settings', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-500/10', stat: 'Active' }
    ];

    const cards = perspective === 'customer' ? customerCards : supplierCards;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {cards.map((card, i) => (
          <motion.button
            key={card.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setActiveSubView(card.id)}
            className={cardClass}
          >
            <div className="flex flex-col h-full justify-between gap-6">
              <div className="flex justify-between items-start">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center shadow-inner`}>
                  <card.icon size={24} />
                </div>
                <div className="px-3 py-1 bg-brand-background/50 rounded-lg border border-brand-border/30">
                  <span className="text-xs font-black text-brand-text-main">{card.stat}</span>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-sm md:text-base font-black text-brand-text-main mb-1">{card.title}</h3>
                <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
                  {isRtl ? 'إدارة وتفاصيل' : 'Manage & Details'}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    );
  };

  const renderSubView = () => {
    if (!activeSubView) return null;

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="fixed inset-0 z-[100] bg-brand-background/95 backdrop-blur-3xl p-6 overflow-y-auto"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <HapticButton 
              onClick={() => setActiveSubView(null)}
              className="flex items-center gap-2 text-brand-text-muted hover:text-brand-primary transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl ${glassClass} flex items-center justify-center group-hover:scale-110 transition-transform ${isRtl ? 'rotate-180' : ''}`}>
                <ChevronRight size={20} className="rotate-180" />
              </div>
              <span className="font-black text-sm uppercase tracking-widest">{isRtl ? 'العودة للمركز' : 'Back to Connect'}</span>
            </HapticButton>
            <h2 className="text-2xl font-black text-brand-text-main">
              {activeSubView === 'settings' || activeSubView === 'store_settings' ? (isRtl ? 'الإعدادات' : 'Settings') : ''}
            </h2>
          </div>

          <div className="pb-24">
            {activeSubView === 'smart_pulse' && (
              <UserNeuralHub profile={profile} isRtl={isRtl} />
            )}
            {(activeSubView === 'settings' || activeSubView === 'store_settings') && (
              <ProfileSettings profile={profile} />
            )}
            {activeSubView === 'requests' && (
              <div className="space-y-4">
                {requests.map(req => (
                  <UserRequestCard 
                    key={req.id}
                    request={req}
                    profile={profile}
                    onOpenChat={onOpenChat}
                    onViewProfile={onViewProfile}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            )}
            {activeSubView === 'available_requests' && (
              <div className="space-y-4">
                {requests.map(req => (
                  <VendorRequestCard 
                    key={req.id}
                    request={req}
                    profile={profile}
                    onOpenChat={onOpenChat}
                  />
                ))}
              </div>
            )}
            {activeSubView === 'my_offers' && (
              <VendorOffersList profile={profile} onOpenChat={onOpenChat} />
            )}
            {activeSubView === 'subscription' && (
              <SubscriptionManager isRtl={isRtl} />
            )}
            {(activeSubView === 'my_products' || activeSubView === 'my_ads') && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-brand-text-main">
                    {activeSubView === 'my_products' ? (isRtl ? 'منتجاتي المعروضة' : 'My Listed Products') : (isRtl ? 'إعلاناتي النشطة' : 'My Active Ads')}
                  </h3>
                  <HapticButton 
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/20"
                  >
                    <Plus size={16} />
                    {isRtl ? 'إضافة جديد' : 'Add New'}
                  </HapticButton>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {myMarketItems.length > 0 ? (
                    myMarketItems.map(item => (
                      <ProductCard 
                        key={item.id}
                        item={item}
                        onOpenChat={onOpenChat}
                        onViewDetails={() => {}}
                        onViewProfile={onViewProfile}
                        isOwner={true}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center">
                      <div className="w-20 h-20 bg-brand-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-primary/20">
                        <Package size={40} />
                      </div>
                      <h3 className="text-xl font-black text-brand-text-main mb-2">
                        {isRtl ? 'لا توجد منتجات بعد' : 'No products yet'}
                      </h3>
                      <p className="text-brand-text-muted max-w-xs mx-auto">
                        {isRtl 
                          ? 'ابدأ بإضافة منتجاتك أو إعلاناتك لتظهر هنا وفي السوق العام.' 
                          : 'Start adding your products or ads to see them here and in the public marketplace.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderRecentOrders = () => {
    const recent = requests.slice(0, 3);
    if (recent.length === 0) return null;

    const handleClearAll = async () => {
      try {
        const batch = [];
        requests.forEach(req => {
          batch.push(updateDoc(doc(db, 'requests', req.id), { isDeleted: true, deletedAt: new Date().toISOString() }));
        });
        await Promise.all(batch);
        toast.success(isRtl ? 'تم مسح الطلبات' : 'Orders cleared');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'requests', false);
        toast.error(isRtl ? 'فشل المسح' : 'Failed to clear');
      }
    };

    return (
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-brand-text-main">{isRtl ? 'طلباتي الأخيرة' : 'My Recent Orders'}</h3>
          <div className="flex gap-2">
            <HapticButton onClick={() => setActiveSubView('requests')} className="text-xs font-bold text-brand-primary">
              {isRtl ? 'عرض الكل' : 'View All'}
            </HapticButton>
            <HapticButton onClick={handleClearAll} className="text-xs font-bold text-rose-500">
              {isRtl ? 'مسح الكل' : 'Clear All'}
            </HapticButton>
          </div>
        </div>
        <div className="space-y-4">
          {recent.map(req => (
            <div key={req.id} className={`${cardClass} flex flex-col gap-4`}>
              <div className="flex justify-between items-start">
                <h4 className="font-black text-brand-text-main">{req.productName}</h4>
                <span className="text-xs font-bold text-brand-text-muted">{new Date(req.createdAt).toLocaleDateString()}</span>
              </div>
              {req.matchedSuppliers && req.matchedSuppliers.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {req.matchedSuppliers.map(supplier => (
                    <div key={supplier.uid} className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-lg text-xs font-bold whitespace-nowrap">
                      {supplier.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-slate-950/30 pb-32">
      <div className="max-w-6xl mx-auto px-6 pt-12">
        {/* Perspective Switcher */}
        {profile.role === 'supplier' && renderPerspectiveSwitcher()}

        {/* Aura Header */}
        {renderAuraHeader()}

        {/* Recent Orders */}
        {perspective === 'customer' && renderRecentOrders()}

        {/* Pulse Ribbon */}
        {renderPulseRibbon()}

        {/* Bento Matrix */}
        {renderBentoMatrix()}

        {/* AI Health Check Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <div className={`${glassClass} rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                  <Activity size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-text-main mb-1">
                    {isRtl ? 'فحص صحة الحساب الذكي' : 'Smart Account Health Check'}
                  </h3>
                  <p className="text-brand-text-muted text-sm font-medium">
                    {isRtl ? 'نظام الذكاء الاصطناعي يحلل أداءك وموثوقيتك' : 'AI system analyzing your performance and reliability'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'الموثوقية' : 'Reliability'}</p>
                  <p className="text-2xl font-black text-emerald-500">98%</p>
                </div>
                <div className="w-px h-12 bg-brand-border/30" />
                <div className="text-center">
                  <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'الاستجابة' : 'Response'}</p>
                  <p className="text-2xl font-black text-brand-primary">12m</p>
                </div>
                <div className="w-px h-12 bg-brand-border/30" />
                <div className="text-center">
                  <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'الحالة' : 'Status'}</p>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {isRtl ? 'مثالي' : 'Optimal'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Logout Button */}
        <div className="mt-12 flex justify-center">
          <HapticButton 
            onClick={() => auth.signOut().catch(err => {
              toast.error(isRtl ? 'فشل تسجيل الخروج' : 'Sign out failed');
            })}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-rose-500/5 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all font-black text-sm uppercase tracking-widest"
          >
            <LogOut size={20} />
            {isRtl ? 'تسجيل الخروج من النظام' : 'Sign Out of System'}
          </HapticButton>
        </div>
      </div>

      {/* Sub-view Overlays */}
      <AnimatePresence>
        {activeSubView && renderSubView()}
      </AnimatePresence>

      <AnimatePresence>
        {showUploadModal && (
          <SmartUploadModal 
            onClose={() => setShowUploadModal(false)}
            onAdd={() => {
              setShowUploadModal(false);
              toast.success(isRtl ? 'تم إضافة المنتج بنجاح' : 'Product added successfully');
            }}
            categories={categories}
            profile={profile}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
