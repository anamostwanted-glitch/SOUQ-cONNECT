import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../../../shared/components/SEO';
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
  Search,
  TrendingUp, 
  ShoppingBag, 
  MessageSquare, 
  Settings, 
  Palette,
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
  Megaphone,
  Clock
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase';
import { UserProfile, AppFeatures, ProductRequest, MarketplaceItem } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, handleAiError } from '../../../core/utils/errorHandling';
import { ProfileSettings } from './ProfileSettings';
import { UserSettings } from './UserSettings';
import { NotificationSettings } from './NotificationSettings';
import { InclusiveCenter } from './command-center/InclusiveCenter';
import { ProfileCompletionMeter } from '../../../shared/components/ProfileCompletionMeter';
import { Badge } from '../../../shared/components/ui/badge';
import { Card } from '../../../shared/components/ui/card';
import { calculateProfileCompletion } from '../../../core/utils/profileUtils';
import { UserRequestCard } from './UserRequestCard';
import { VendorRequestCard } from '../../vendor/components/VendorRequestCard';
import { VendorOffersList } from '../../vendor/components/VendorOffersList';
import { MarketplaceAnalytics } from '../../marketplace/components/MarketplaceAnalytics';
import { MyAdsDashboard } from '../../vendor/components/MyAdsDashboard';
import { MyProductsDashboard } from '../../vendor/components/MyProductsDashboard';
import { SubscriptionManager } from '../../../components/SubscriptionManager';
import { ProductCard } from '../../marketplace/components/ProductCard';
import { SmartUploadModal } from '../../marketplace/components/upload-flow/SmartUploadModal';
import { Category } from '../../../core/types';
import { UserNeuralHub } from '../../common/components/UserNeuralHub';
import { UserActivityFeed } from '../../common/components/UserActivityFeed';
import { AuraHeader } from './command-center/AuraHeader';
import { PulseRibbon } from './command-center/PulseRibbon';
import { BentoMatrix } from './command-center/BentoMatrix';

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
    (profile.role === 'supplier' || profile.role === 'admin') ? 'supplier' : 'customer'
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
      { ar: "لديك 3 محادثات جديدة لم يتم الرد عليها", en: "You have 3 new unread conversations" }
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
        limit(20)
      );
    } else {
      // Perspective: Supplier - Show open requests OR matched requests
      q = query(
        collection(db, 'requests'),
        where('status', 'in', ['open', 'matched']),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqsMap = new Map<string, ProductRequest>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.isDeleted) {
          reqsMap.set(doc.id, { id: doc.id, ...data } as ProductRequest);
        }
      });
      setRequests(Array.from(reqsMap.values()));
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
      const itemsMap = new Map<string, MarketplaceItem>();
      snap.docs.forEach(d => {
        itemsMap.set(d.id, { id: d.id, ...d.data() } as MarketplaceItem);
      });
      setMyMarketItems(Array.from(itemsMap.values()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'marketplace', false);
    });
    return () => unsub();
  }, [profile?.uid]);

  // Fetch categories
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      const catsMap = new Map<string, Category>();
      snap.docs.forEach(d => {
        catsMap.set(d.id, { id: d.id, ...d.data() } as Category);
      });
      setCategories(Array.from(catsMap.values()));
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
    <AuraHeader 
      profile={profile}
      onViewProfile={onViewProfile}
      onShare={handleShare}
      onOpenSettings={() => setActiveSubView('settings')}
      glassClass={glassClass}
    />
  );

  const renderPulseRibbon = () => (
    <PulseRibbon insights={insights} currentIndex={currentInsightIndex} />
  );

  const renderBentoMatrix = () => (
    <BentoMatrix 
      perspective={perspective}
      stats={{
        requestsCount: requests.length,
        adsCount: myMarketItems.length,
        favoritesCount: profile.favoriteProducts?.length || 0,
        productsCount: myMarketItems.length,
        notificationsEnabled: profile.notificationPreferences?.newRequests !== false
      }}
      onCardClick={setActiveSubView}
      cardClass={cardClass}
    />
  );

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
              {activeSubView === 'settings' || activeSubView === 'store_settings' ? (isRtl ? 'الإعدادات' : 'Settings') : 
               activeSubView === 'inclusive_mode' ? (isRtl ? 'وضع الشمولية' : 'Inclusive Mode') : ''}
            </h2>
          </div>

          <div className="pb-24">
            {activeSubView === 'smart_pulse' && (
              <UserNeuralHub profile={profile} isRtl={isRtl} />
            )}
            {activeSubView === 'neural_activity' && (
              <UserActivityFeed />
            )}
            {activeSubView === 'notifications' && (
              <div className="space-y-6">
                <NotificationSettings profile={profile} onUpdate={() => {}} />
              </div>
            )}
            {(activeSubView === 'settings' || activeSubView === 'store_settings') && (
              <div className="space-y-6">
                <div className="bg-brand-primary/10 p-4 rounded-2xl border border-brand-primary/20 mb-4">
                  <p className="text-xs font-bold text-brand-primary flex items-center gap-2">
                    <Sparkles size={14} />
                    {isRtl ? 'أهلاً بك في نظام الإعدادات الذكي الجديد' : 'Welcome to the new Smart Settings system'}
                  </p>
                </div>
                <ProfileSettings 
                  profile={profile} 
                  forceShowSupplierSettings={activeSubView === 'store_settings'} 
                />
              </div>
            )}
            {activeSubView === 'neural_lexicon' && (
              <div className="space-y-8">
                <div className="bg-brand-primary/10 p-8 rounded-[2.5rem] border border-brand-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[100px] pointer-events-none" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black text-brand-primary mb-2">
                      {isRtl ? 'معجم التوجهات الذكي' : 'Demand Lexicon Insights'}
                    </h3>
                    <p className="text-brand-text-muted font-bold text-sm max-w-lg leading-relaxed">
                      {isRtl 
                        ? 'يحلل نظام الذكاء الاصطناعي لدينا مئات عمليات البحث يومياً ليكشف لك عما يبحث عنه العملاء فعلياً في مجالك.' 
                        : 'Our AI analyzes hundreds of searches daily to reveal what customers are actually looking for in your industry.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categories
                    .filter(c => profile.categories?.includes(c.id))
                    .map(cat => (
                      <div key={`supp-lex-${cat.id}`} className={`${cardClass} space-y-4`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                            <Search size={20} />
                          </div>
                          <div>
                            <h4 className="font-black text-brand-text-main">
                              {isRtl ? cat.nameAr : cat.nameEn}
                            </h4>
                            <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                              {isRtl ? 'توجهات البحث' : 'Search Trends'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {cat.suggestedKeywords && cat.suggestedKeywords.length > 0 ? (
                            cat.suggestedKeywords.map((kw, i) => (
                              <span 
                                key={`${cat.id}-kw-${i}`}
                                className="px-4 py-1.5 bg-brand-background border border-brand-border rounded-full text-[11px] font-bold text-brand-text-main shadow-sm"
                              >
                                {kw}
                              </span>
                            ))
                          ) : (
                            <p className="text-xs italic text-brand-text-muted">
                              {isRtl ? 'لا توجد بيانات كافية حالياً لهذه الفئة' : 'No sufficient data yet for this category'}
                            </p>
                          )}
                        </div>

                        <div className="pt-4 border-t border-brand-border/50">
                          <p className="text-[10px] font-medium text-brand-text-muted mb-3 flex items-center gap-2">
                            <Sparkles size={12} className="text-brand-primary" />
                            {isRtl ? 'خطوة مقترحة:' : 'Suggested Step:'}
                          </p>
                          <div className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/10">
                            <p className="text-[11px] font-bold text-brand-primary leading-tight">
                              {isRtl 
                                ? 'أضف هذه الكلمات إلى "الكلمات المفتاحية" في ملفك الشخصي لتظهر للعملاء بشكل أسرع.' 
                                : 'Add these terms to your profile "Keywords" to appear faster in customer searches.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {(!profile.categories || profile.categories.length === 0) && (
                   <div className={`${cardClass} text-center py-12 space-y-4`}>
                      <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mx-auto">
                        <AlertCircle size={32} />
                      </div>
                      <p className="text-brand-text-muted font-bold">
                        {isRtl ? 'يرجى تحديد تخصصاتك في الإعدادات لرؤية الكلمات التوجيهية المناسبة لك.' : 'Please select your specialties in settings to see relevant demand keywords.'}
                      </p>
                      <HapticButton 
                        onClick={() => setActiveSubView('settings')}
                        className="px-6 py-2 bg-brand-primary text-white rounded-xl font-bold transition-all"
                      >
                        {isRtl ? 'الذهاب للإعدادات' : 'Go to Settings'}
                      </HapticButton>
                   </div>
                )}
              </div>
            )}
            {activeSubView === 'branding_settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-brand-text-main">{isRtl ? 'إعدادات الهوية البصرية' : 'Visual Identity Settings'}</h2>
                <UserSettings profile={profile} />
              </div>
            )}
            {activeSubView === 'inclusive_mode' && (
              <InclusiveCenter isRtl={isRtl} />
            )}
            {activeSubView === 'requests' && (
              <div className="space-y-4">
                {requests.map((req, idx) => (
                  <UserRequestCard 
                    key={`ccc-user-req-${req.id || `idx-${idx}`}`}
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
                {requests.map((req, idx) => (
                  <VendorRequestCard 
                    key={`ccc-vendor-req-${req.id || `idx-${idx}`}`}
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
            {activeSubView === 'my_ads' && (
              <MyAdsDashboard />
            )}
            {activeSubView === 'my_products' && (
              <MyProductsDashboard />
            )}
            {activeSubView === 'ad_analytics' && (
              <MarketplaceAnalytics />
            )}
            {activeSubView === 'subscription' && (
              <SubscriptionManager isRtl={isRtl} />
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
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                <Clock size={20} />
             </div>
             <h3 className="text-xl font-black text-brand-text-main">
                {isRtl ? 'طلباتي الأخيرة' : 'My Recent Orders'}
             </h3>
          </div>
          <div className="flex gap-2">
            <HapticButton onClick={() => setActiveSubView('requests')} className="text-xs font-black uppercase tracking-widest text-brand-primary px-4 py-2 bg-brand-primary/5 rounded-xl transition-all hover:bg-brand-primary/10">
              {isRtl ? 'عرض الكل' : 'View All'}
            </HapticButton>
            <HapticButton onClick={handleClearAll} className="text-xs font-black uppercase tracking-widest text-rose-500 px-4 py-2 bg-rose-500/5 rounded-xl transition-all hover:bg-rose-500/10">
              {isRtl ? 'مسح الكل' : 'Clear All'}
            </HapticButton>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recent.map((req, idx) => (
            <motion.div 
              key={`ccc-recent-req-${req.id}-${perspective}-${idx}`} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`${cardClass} flex flex-col gap-4 border-2 border-transparent hover:border-brand-primary/20 cursor-pointer group`}
              onClick={() => setActiveSubView('requests')}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-black text-brand-text-main group-hover:text-brand-primary transition-colors">{req.productName}</h4>
                <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${
                  req.status === 'open' ? 'bg-emerald-500/10 text-emerald-500' : 
                  req.status === 'matched' ? 'bg-brand-primary/10 text-brand-primary' : 
                  'bg-brand-text-muted/10 text-brand-text-muted'
                }`}>
                  {req.status}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] font-bold text-brand-text-muted">
                 <Clock size={12} />
                 {new Date(req.createdAt).toLocaleDateString()}
              </div>

              {req.matchedSuppliers && req.matchedSuppliers.length > 0 && (
                <div className="flex -space-x-2 mt-2">
                    {Array.from(new Map(req.matchedSuppliers.slice(0, 3).map(s => [s.uid, s])).values()).map((supplier, sIdx) => (
                    <div 
                      key={`ccc-recent-supplier-${req.id}-${supplier.uid}-${sIdx}`} 
                      className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-brand-surface flex items-center justify-center text-[8px] font-black text-brand-primary shadow-sm overflow-hidden"
                      title={supplier.name}
                    >
                      {supplier.photoURL ? (
                        <img src={supplier.photoURL} alt={supplier.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        supplier.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                  ))}
                  {req.matchedSuppliers.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-brand-background flex items-center justify-center text-[8px] font-black text-brand-text-muted">
                        +{req.matchedSuppliers.length - 3}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-slate-950/30 pb-32">
      <SEO 
        title={isRtl ? 'لوحة التحكم' : 'Dashboard'} 
        description={isRtl ? 'مركز القيادة العصبي - سوق كونيكت' : 'Neural Command Center - Souq Connect'}
      />
      <div className="max-w-6xl mx-auto px-6 pt-12">
        {/* Perspective Switcher */}
        {profile.role === 'supplier' && renderPerspectiveSwitcher()}

        {/* Aura Header */}
        {renderAuraHeader()}

        {/* AI Health Check Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Main AI Pulse Card */}
             <div className={`${glassClass} rounded-[2.5rem] p-8 lg:col-span-2 relative overflow-hidden group`}>
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full gap-8">
                 <div className="flex items-center gap-6">
                   <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                     <Activity size={32} />
                   </div>
                   <div>
                     <h3 className="text-2xl font-black text-brand-text-main mb-1">
                       {isRtl ? 'تحليلات المركز العصبي' : 'Neural Center Analytics'}
                     </h3>
                     <p className="text-brand-text-muted text-sm font-medium">
                       {isRtl ? 'الذكاء الاصطناعي يراقب أداءك وموثوقيتك' : 'AI monitoring your performance and reliability'}
                     </p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full md:w-auto">
                   <div className="text-center">
                     <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'الموثوقية' : 'Reliability'}</p>
                     <p className="text-2xl font-black text-emerald-500">98%</p>
                   </div>
                   <div className="text-center">
                     <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'الاستجابة' : 'Response'}</p>
                     <p className="text-2xl font-black text-brand-primary">12m</p>
                   </div>
                   <div className="text-center">
                     <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'المطابقة' : 'Accuracy'}</p>
                     <p className="text-2xl font-black text-brand-teal">94%</p>
                   </div>
                   <div className="text-center">
                     <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest mb-1">{isRtl ? 'الجودة' : 'Quality'}</p>
                     <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                       {isRtl ? 'مثالي' : 'Optimal'}
                     </span>
                   </div>
                 </div>
               </div>
             </div>

             {/* Smart Assistant Card */}
             <motion.div 
               whileHover={{ y: -5 }}
               className="bg-gradient-to-br from-brand-primary to-brand-teal p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-xl shadow-brand-primary/20 flex flex-col justify-center"
             >
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
               <div className="relative z-10">
                 <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center mb-4">
                    <Sparkles size={20} />
                 </div>
                 <h4 className="text-lg font-black mb-2 leading-tight">
                    {isRtl ? 'مساعد التوقع الذكي' : 'Smart Prediction'}
                 </h4>
                 <p className="text-xs text-white/80 font-medium mb-6 leading-relaxed">
                    {isRtl 
                      ? 'بناءً على طلباتك، قد تحتاج قريباً لحديد تسليح لتكمل مشروعك.' 
                      : 'Based on recent activity, you might soon need Rebar to complete your build.'}
                 </p>
                 <HapticButton className="w-full py-3 bg-white text-brand-primary rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/90">
                    {isRtl ? 'استكشاف المقترحات' : 'Explore Ideas'} <Sparkles size={14} />
                 </HapticButton>
               </div>
             </motion.div>
          </div>
        </motion.div>

        {/* Pulse Ribbon */}
        {renderPulseRibbon()}

        {/* Recent Orders */}
        {perspective === 'customer' && renderRecentOrders()}

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
