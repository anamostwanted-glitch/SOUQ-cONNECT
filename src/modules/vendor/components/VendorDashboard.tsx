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
  Activity
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { UserProfile, AppFeatures, ProductRequest } from '../../../core/types';
import { HapticButton } from '../../../shared/components/HapticButton';
import { VendorRequestCard } from './VendorRequestCard';
import { VendorOffersList } from './VendorOffersList';
import { ProfileSettings } from '../../user/components/ProfileSettings';

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
      console.error("Error fetching requests:", error);
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
    { id: 'analytics', label: isRtl ? 'الإحصائيات' : 'Analytics', icon: TrendingUp },
    { id: 'settings', label: isRtl ? 'إعدادات المتجر' : 'Store Settings', icon: Settings },
  ];

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-sm";

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

          {supplierTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`text-center py-12 ${glassClass} rounded-3xl`}
            >
              <div className="w-16 h-16 bg-brand-background rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={24} className="text-brand-text-muted" />
              </div>
              <h3 className="text-lg font-bold text-brand-text-main mb-2">
                {isRtl ? 'إحصائيات المتجر' : 'Store Analytics'}
              </h3>
              <p className="text-brand-text-muted text-sm max-w-md mx-auto">
                {isRtl ? 'تتبع أرباحك، ومعدل قبول العروض، وتقييمات العملاء في هذا القسم قريباً.' : 'Track your earnings, offer acceptance rate, and customer reviews in this section soon.'}
              </p>
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
