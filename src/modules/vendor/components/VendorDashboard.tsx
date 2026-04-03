import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  MessageSquare, 
  TrendingUp, 
  Settings, 
  Search,
  Sparkles,
  Star,
  Activity,
  Target,
  Cpu,
  Zap,
  ShieldCheck,
  Clock,
  BarChart3,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile, AppFeatures, ProductRequest } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { VendorRequestCard } from './VendorRequestCard';
import { VendorOffersList } from './VendorOffersList';
import { ProfileSettings } from '../../user/components/ProfileSettings';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

interface VendorDashboardProps {
  profile: UserProfile;
  features: AppFeatures;
  supplierTab: string;
  setSupplierTab: (tab: string) => void;
  onOpenChat: (chatId: string) => void;
  onViewProfile: (uid: string) => void;
  uiStyle?: 'classic' | 'minimal';
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  profile,
  features,
  supplierTab,
  setSupplierTab,
  onOpenChat,
  onViewProfile,
  uiStyle = 'classic'
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch available requests
  useEffect(() => {
    setLoading(true);
    // In a real app, we'd filter by category or location. For now, get recent open requests.
    const q = query(
      collection(db, 'requests'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedRequests: ProductRequest[] = [];
      snap.forEach(doc => {
        fetchedRequests.push({ id: doc.id, ...doc.data() } as ProductRequest);
      });
      setRequests(fetchedRequests);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'requests');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAiSearch = async () => {
    setIsAiSearching(true);
    // Mock AI search delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsAiSearching(false);
  };

  const tabs = [
    { id: 'requests', label: isRtl ? 'الطلبات المتاحة' : 'Available Requests', icon: ShoppingBag },
    { id: 'offers', label: isRtl ? 'عروضي' : 'My Offers', icon: MessageSquare },
    { id: 'chats', label: isRtl ? 'المحادثات' : 'Chats', icon: MessageSquare },
    { id: 'analytics', label: isRtl ? 'تحليلات الذكاء الاصطناعي' : 'AI Analytics', icon: Sparkles },
    { id: 'settings', label: isRtl ? 'إعدادات المتجر' : 'Store Settings', icon: Settings },
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
              {isRtl ? 'تحليلات الذكاء الاصطناعي للمورد' : 'Vendor AI Analytics'}
            </h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            {isRtl ? 'مباشر' : 'Live'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Conversion Rate Card */}
          <div className={`${glassClass} p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                <Target size={24} />
              </div>
              <Activity size={20} className="text-brand-primary opacity-50" />
            </div>
            <p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider mb-1">
              {isRtl ? 'معدل تحويل العروض' : 'Offer Conversion Rate'}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-brand-text-main">78%</h3>
              <span className="text-emerald-500 text-xs font-bold">+5.2%</span>
            </div>
          </div>

          {/* Average Response Time Card */}
          <div className={`${glassClass} p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                <Clock size={24} />
              </div>
              <Zap size={20} className="text-amber-500 opacity-50" />
            </div>
            <p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider mb-1">
              {isRtl ? 'متوسط وقت الرد' : 'Avg. Response Time'}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-brand-text-main">8m</h3>
              <span className="text-rose-500 text-xs font-bold">-2m</span>
            </div>
          </div>

          {/* Market Share Card */}
          <div className={`${glassClass} p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                <BarChart3 size={24} />
              </div>
              <Cpu size={20} className="text-indigo-500 opacity-50" />
            </div>
            <p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider mb-1">
              {isRtl ? 'الحصة السوقية في فئتك' : 'Category Market Share'}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-brand-text-main">15%</h3>
              <span className="text-indigo-500 text-xs font-bold">Growing</span>
            </div>
          </div>

          {/* Reliability Card */}
          <div className={`${glassClass} p-6 rounded-[2rem] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500`}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                <ShieldCheck size={24} />
              </div>
              <CheckCircle2 size={20} className="text-emerald-500 opacity-50" />
            </div>
            <p className="text-brand-text-muted text-xs font-bold uppercase tracking-wider mb-1">
              {isRtl ? 'مؤشر الموثوقية' : 'Reliability Index'}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-brand-text-main">96%</h3>
              <span className="text-emerald-500 text-xs font-bold">Excellent</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* AI Sales Assistant Card */}
          <div className="bg-gradient-to-br from-brand-primary to-brand-teal p-8 rounded-[2.5rem] text-white relative overflow-hidden group shadow-xl shadow-brand-primary/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                <Sparkles size={28} />
              </div>
              <h3 className="text-2xl font-black mb-4 leading-tight">
                {isRtl ? 'توصيات الذكاء الاصطناعي لزيادة المبيعات' : 'AI Sales Recommendations'}
              </h3>
              <p className="text-white/80 text-sm mb-8 leading-relaxed max-w-sm">
                {isRtl 
                  ? 'هناك زيادة بنسبة 40% في الطلب على "مواد العزل" في منطقتك. نقترح تحديث أسعارك وتقديم عروض منافسة الآن.' 
                  : 'There is a 40% increase in demand for "Insulation Materials" in your area. We suggest updating your prices and providing competitive offers now.'}
              </p>
              <HapticButton className="px-8 py-4 bg-white text-brand-primary rounded-2xl font-black hover:bg-white/90 transition-all flex items-center gap-3 group/btn">
                {isRtl ? 'عرض الفرص المتاحة' : 'View Opportunities'}
                <ChevronRight size={20} className={`group-hover/btn:translate-x-1 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
              </HapticButton>
            </div>
          </div>

          {/* Performance Diagnostics */}
          <div className={`${glassClass} p-8 rounded-[2.5rem]`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Activity size={24} className="text-brand-text-main" />
                <h3 className="text-xl font-black text-brand-text-main">
                  {isRtl ? 'تشخيصات الأداء' : 'Performance Diagnostics'}
                </h3>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                {isRtl ? 'ممتاز' : 'Excellent'}
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-brand-text-muted uppercase tracking-wider">{isRtl ? 'سرعة تقديم العروض' : 'Offer Submission Speed'}</span>
                  <span className="text-brand-text-main">92%</span>
                </div>
                <div className="h-2 bg-brand-background rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '92%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-brand-primary rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-brand-text-muted uppercase tracking-wider">{isRtl ? 'دقة تسعير العروض' : 'Pricing Accuracy'}</span>
                  <span className="text-brand-text-main">85%</span>
                </div>
                <div className="h-2 bg-brand-background rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="h-full bg-brand-teal rounded-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-brand-text-muted uppercase tracking-wider">{isRtl ? 'رضا العملاء' : 'Customer Satisfaction'}</span>
                  <span className="text-brand-text-main">98%</span>
                </div>
                <div className="h-2 bg-brand-background rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '98%' }}
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

  if (showSettings) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <button 
          onClick={() => setShowSettings(false)}
          className="mb-6 flex items-center gap-2 text-brand-text-muted hover:text-brand-primary transition-colors"
        >
          <div className={`w-8 h-8 rounded-full ${glassClass} flex items-center justify-center ${isRtl ? 'rotate-180' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </div>
          <span className="font-bold text-sm uppercase tracking-wider">
            {isRtl ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
          </span>
        </button>
        <div className={`${glassClass} rounded-3xl p-6`}>
          <ProfileSettings profile={profile} />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 max-w-6xl mx-auto space-y-8 pb-24 ${uiStyle === 'minimal' ? 'pt-8' : ''}`}>
      {/* Header & Quick Stats - Hidden in Minimal Mode */}
      {uiStyle !== 'minimal' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-brand-text-main tracking-tight">
                {isRtl ? 'لوحة المورد' : 'Vendor Dashboard'}
              </h1>
              <p className="text-brand-text-muted mt-1">
                {isRtl ? 'أهلاً بك، ' : 'Welcome back, '}<span className="font-bold text-brand-primary">{profile.name}</span>
              </p>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className={`flex items-center gap-2 px-4 py-2 ${glassClass} rounded-xl text-sm font-bold text-brand-text-main hover:border-brand-primary/40 transition-all`}
            >
              <Settings size={16} className="text-brand-primary" />
              {isRtl ? 'إعدادات المتجر' : 'Store Settings'}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: isRtl ? 'الطلبات المتاحة' : 'Available', value: requests.length, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: isRtl ? 'عروض نشطة' : 'Active Offers', value: '12', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: isRtl ? 'محادثات' : 'Chats', value: '5', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: isRtl ? 'التقييم' : 'Rating', value: '4.9', icon: Star, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`${glassClass} p-4 rounded-2xl relative overflow-hidden group`}
              >
                <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${stat.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`} />
                <div className="relative z-10 flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                    <stat.icon size={16} />
                  </div>
                  <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
                <div className="relative z-10 text-2xl font-black text-brand-text-main">
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs - Minimalist Underline Style */}
      <div className={`border-b border-brand-border/40 mb-8 overflow-x-auto hide-scrollbar ${uiStyle === 'minimal' ? 'sticky top-0 bg-brand-background/80 backdrop-blur-md z-30 py-2' : ''}`}>
        <div className="flex gap-8 min-w-max px-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSupplierTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-sm font-bold transition-all relative border-b-2 ${
                supplierTab === tab.id 
                  ? 'text-brand-primary border-brand-primary' 
                  : 'text-brand-text-muted border-transparent hover:text-brand-text-main'
              }`}
            >
              <tab.icon size={18} strokeWidth={supplierTab === tab.id ? 2.5 : 2} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {supplierTab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Search Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-brand-text-muted" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isRtl ? 'ابحث عن منتجات، فئات، طلبات...' : 'Search for products, categories, requests...'}
                    className={`w-full pl-11 pr-4 py-4 ${glassClass} rounded-2xl text-brand-text-main focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all`}
                  />
                </div>
                <button
                  onClick={handleAiSearch}
                  disabled={isAiSearching}
                  className={`px-6 py-4 ${glassClass} text-brand-primary font-black uppercase tracking-widest rounded-2xl hover:bg-white/90 dark:hover:bg-slate-800/90 transition-all flex items-center gap-2 disabled:opacity-50`}
                >
                  {isAiSearching ? (
                    <div className="w-5 h-5 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  <span className="hidden sm:inline">{isRtl ? 'بحث ذكي' : 'Smart Search'}</span>
                </button>
              </div>

              {/* Discover Section */}
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-brand-accent" />
                <h3 className="text-lg font-bold text-brand-text-main">
                  {isRtl ? 'اكتشف أحدث الطلبات التي تطابق تخصصك' : 'Discover the latest requests that match your specialty'}
                </h3>
              </div>

              {/* Requests List */}
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`${glassClass} p-5 rounded-2xl animate-pulse`}>
                      <div className="h-6 bg-brand-border rounded w-1/3 mb-4" />
                      <div className="h-4 bg-brand-border rounded w-1/4 mb-6" />
                      <div className="h-10 bg-brand-border rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className={`text-center py-12 ${glassClass} rounded-3xl`}>
                  <div className="w-16 h-16 bg-brand-background rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBag size={24} className="text-brand-text-muted" />
                  </div>
                  <h3 className="text-lg font-bold text-brand-text-main mb-2">
                    {isRtl ? 'لا توجد طلبات متاحة' : 'No available requests'}
                  </h3>
                  <p className="text-brand-text-muted text-sm max-w-md mx-auto">
                    {isRtl ? 'سنقوم بإعلامك فور توفر طلبات جديدة تطابق تخصصك.' : 'We will notify you as soon as new requests matching your specialty are available.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.filter(req => req.productName.toLowerCase().includes(searchQuery.toLowerCase())).map(req => (
                    <VendorRequestCard
                      key={req.id}
                      request={req}
                      profile={profile}
                      onOpenChat={onOpenChat}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {supplierTab === 'offers' && (
            <motion.div
              key="offers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <VendorOffersList profile={profile} onOpenChat={onOpenChat} />
            </motion.div>
          )}

          {supplierTab === 'chats' && (
            <motion.div
              key="chats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`text-center py-12 ${glassClass} rounded-3xl`}
            >
              <div className="w-16 h-16 bg-brand-background rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} className="text-brand-text-muted" />
              </div>
              <h3 className="text-lg font-bold text-brand-text-main mb-2">
                {isRtl ? 'المحادثات' : 'Chats'}
              </h3>
              <p className="text-brand-text-muted text-sm max-w-md mx-auto">
                {isRtl ? 'محادثاتك مع العملاء ستظهر هنا قريباً.' : 'Your chats with customers will appear here soon.'}
              </p>
            </motion.div>
          )}

          {supplierTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderAIAnalytics()}
            </motion.div>
          )}

          {supplierTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ProfileSettings profile={profile} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
