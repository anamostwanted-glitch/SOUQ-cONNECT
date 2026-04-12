import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Sparkles, 
  TrendingUp, 
  Zap, 
  Search, 
  Mic, 
  Camera, 
  X,
  ChevronRight,
  ChevronLeft,
  Activity,
  Cpu,
  Filter,
  Building2,
  User,
  Heart,
  ChevronDown,
  LayoutGrid,
  Plus,
  Shield,
  Wallet
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';

interface NeuralPulseBarProps {
  isRtl: boolean;
  neuralPulse: { ar: string; en: string } | null;
  isMinimized: boolean;
  onClose: () => void;
  onVoiceSearch: () => void;
  onVisualSearch: () => void;
  onSmartExplorer: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isListening: boolean;
  sellerTypeFilter: 'all' | 'supplier' | 'customer' | 'followed';
  setSellerTypeFilter: (type: 'all' | 'supplier' | 'customer' | 'followed') => void;
  categories: any[];
  activeCategory: string | null;
  setActiveCategory: (id: string | null) => void;
  activeTab: 'discover' | 'myshop' | 'requests';
  setActiveTab: (tab: 'discover' | 'myshop' | 'requests') => void;
  isAdmin: boolean;
  isSupplier: boolean;
  showAdminHub: boolean;
  setShowAdminHub: (show: boolean) => void;
  onAddProduct: () => void;
  onOpenEconomyHub: () => void;
  profile: any;
}

export const NeuralPulseBar: React.FC<NeuralPulseBarProps> = ({
  isRtl,
  neuralPulse,
  isMinimized,
  onClose,
  onVoiceSearch,
  onVisualSearch,
  onSmartExplorer,
  searchTerm,
  setSearchTerm,
  isListening,
  sellerTypeFilter,
  setSellerTypeFilter,
  categories,
  activeCategory,
  setActiveCategory,
  activeTab,
  setActiveTab,
  isAdmin,
  isSupplier,
  showAdminHub,
  setShowAdminHub,
  onAddProduct,
  onOpenEconomyHub,
  profile
}) => {
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
  const [insights, setInsights] = useState<{ ar: string; en: string }[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (neuralPulse) {
      setInsights(prev => {
        const exists = prev.some(p => p.en === neuralPulse.en);
        if (exists) return prev;
        return [neuralPulse, ...prev].slice(0, 5);
      });
    }
  }, [neuralPulse]);

  useEffect(() => {
    if (insights.length > 1) {
      const timer = setInterval(() => {
        setCurrentInsightIndex(prev => (prev + 1) % insights.length);
      }, 8000);
      return () => clearInterval(timer);
    }
  }, [insights]);

  const glassClass = "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]";

  return (
    <div className={`fixed z-[60] left-0 right-0 transition-[top] duration-500 ease-in-out ${isMinimized ? 'top-2' : 'top-4 md:top-6'} safe-top`}>
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          layout
          drag
          dragConstraints={{ top: 0, left: -300, right: 300, bottom: 800 }}
          dragElastic={0.1}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          style={{ 
            WebkitBackdropFilter: 'blur(24px)',
            backdropFilter: 'blur(24px)',
            cursor: 'grab',
            touchAction: 'none'
          }}
          whileDrag={{ cursor: 'grabbing', scale: 1.02, zIndex: 100 }}
          className={`relative overflow-hidden rounded-3xl md:rounded-[2.5rem] ${glassClass} p-1.5 md:p-3 flex items-center gap-1.5 md:gap-2`}
        >
          {/* Breathing Glow Effect */}
          <motion.div 
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-r from-brand-primary/10 via-brand-teal/10 to-brand-primary/10 pointer-events-none"
          />

          {/* AI Pulse Indicator */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 shrink-0 relative z-10`}>
            <div className="relative">
              <BrainCircuit size={18} className="text-brand-primary animate-pulse" />
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-brand-primary rounded-full blur-sm" 
              />
            </div>
            <div className="flex flex-col">
              <span className="hidden sm:block text-[10px] font-black text-brand-primary uppercase tracking-widest leading-none">Smart Market Hub</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse" />
                <span className="text-[8px] font-bold text-brand-teal uppercase tracking-tighter">AI Active</span>
              </div>
            </div>
          </div>

          {/* Dynamic Insight Area - Hidden on mobile for better space */}
          <div className="hidden md:flex flex-1 min-w-0 h-10 items-center relative z-10">
            <AnimatePresence mode="wait">
              {insights.length > 0 ? (
                <motion.div
                  key={currentInsightIndex}
                  initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                  className="flex items-center gap-2 w-full"
                >
                  <TrendingUp size={14} className="text-brand-teal shrink-0" />
                  <p className="text-xs md:text-sm font-bold text-brand-text-main leading-tight">
                    {isRtl ? insights[currentInsightIndex].ar : insights[currentInsightIndex].en}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-brand-text-muted"
                >
                  <Activity size={14} className="animate-pulse" />
                  <p className="text-xs font-medium italic">
                    {isRtl ? 'جاري تحليل السوق...' : 'Analyzing market trends...'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Integrated Search Trigger (Desktop Only) */}
          <div className="hidden md:flex flex-1 items-center bg-slate-100/50 dark:bg-slate-800/50 rounded-xl md:rounded-2xl border border-brand-border/30 px-2 md:px-3 py-1 gap-1.5 md:gap-2 relative z-10">
            <Search size={14} className="text-brand-text-muted shrink-0" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRtl ? 'ابحث...' : 'Search...'}
              className="bg-transparent border-none focus:ring-0 text-[10px] md:text-xs w-full text-brand-text-main placeholder-brand-text-muted/50 p-0"
            />
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-0.5 md:gap-1 relative z-10">
            {profile && (
              <HapticButton
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setActiveTab('requests')}
                className={`p-1.5 md:p-2 rounded-xl md:rounded-2xl transition-all ${activeTab === 'requests' ? 'bg-brand-primary text-white' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'}`}
                title={isRtl ? 'طلبات المنتجات' : 'Product Requests'}
              >
                <Zap size={16} />
              </HapticButton>
            )}
            <div className="w-px h-6 bg-brand-border/20 mx-0.5 hidden sm:block" />
            {profile && (
              <HapticButton
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onOpenEconomyHub}
                className="p-1.5 md:p-2 rounded-xl md:rounded-2xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-all flex items-center gap-1.5"
              >
                <Wallet size={16} />
                <span className="hidden lg:block text-[10px] font-black">{profile?.neuralCredits || 0}</span>
              </HapticButton>
            )}
            <div className="w-px h-6 bg-brand-border/20 mx-0.5 hidden sm:block" />
            {profile && (isAdmin || isSupplier) && (
              <HapticButton
                whileHover={{ scale: 1.1 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onAddProduct}
                className="p-1.5 md:p-2 rounded-xl md:rounded-2xl bg-brand-primary text-white shadow-lg shadow-brand-primary/20 transition-all"
              >
                <Plus size={16} />
              </HapticButton>
            )}
            <div className="w-px h-6 bg-brand-border/20 mx-0.5 hidden sm:block" />
            <HapticButton
              whileHover={{ scale: 1.1 }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1.5 md:p-2 rounded-xl md:rounded-2xl transition-all ${isExpanded ? 'bg-brand-primary text-white' : 'hover:bg-brand-primary/10 text-brand-text-muted hover:text-brand-primary'}`}
            >
              <Filter size={16} />
            </HapticButton>
            <div className="w-px h-6 bg-brand-border/20 mx-0.5 hidden sm:block" />
            <HapticButton
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onVoiceSearch}
              className={`p-1.5 md:p-2 rounded-xl md:rounded-2xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-brand-primary/10 text-brand-text-muted hover:text-brand-primary'}`}
            >
              <Mic size={16} />
            </HapticButton>
            <HapticButton
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(20, 184, 166, 0.1)' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onVisualSearch}
              className="p-1.5 md:p-2 rounded-xl md:rounded-2xl hover:bg-brand-primary/10 text-brand-text-muted hover:text-brand-primary transition-all"
            >
              <Camera size={16} />
            </HapticButton>
            <HapticButton
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(15, 23, 42, 0.1)' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onSmartExplorer}
              className="p-1.5 md:p-2 rounded-xl md:rounded-2xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-all group"
            >
              <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
            </HapticButton>
            <HapticButton
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 md:p-2 rounded-xl md:rounded-2xl hover:bg-red-500/10 text-brand-text-muted hover:text-red-500 transition-all shrink-0"
            >
              <X size={16} />
            </HapticButton>
          </div>

          {/* Progress Bar for Insight Rotation */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary/5">
            <motion.div 
              key={currentInsightIndex}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 8, ease: "linear" }}
              className="h-full bg-brand-primary/40"
            />
          </div>
        </motion.div>

        {/* Expanded Filters Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className={`mt-2 rounded-[2rem] ${glassClass} overflow-hidden p-3 space-y-4`}
              style={{ 
                WebkitBackdropFilter: 'blur(24px)',
                backdropFilter: 'blur(24px)'
              }}
            >
              {/* Navigation Tabs */}
              <div className="flex p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl w-fit overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => { setActiveTab('discover'); setShowAdminHub(false); }}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                    activeTab === 'discover' && !showAdminHub
                      ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {isRtl ? 'اكتشف' : 'Discover'}
                </button>
                <button
                  onClick={() => { setActiveTab('requests'); setShowAdminHub(false); }}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                    activeTab === 'requests' && !showAdminHub
                      ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {isRtl ? 'الطلبات' : 'Requests'}
                </button>
                {(isAdmin || isSupplier) && (
                  <button
                    onClick={() => { setActiveTab('myshop'); setShowAdminHub(false); }}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                      activeTab === 'myshop' && !showAdminHub
                        ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    {isRtl ? 'متجري' : 'My Shop'}
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setShowAdminHub(true)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                      showAdminHub
                        ? 'text-brand-primary bg-white dark:bg-slate-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <Shield size={10} />
                    {isRtl ? 'الإدارة' : 'Admin Hub'}
                  </button>
                )}
              </div>

              {/* Seller Type Filters */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: isRtl ? 'الكل' : 'All', icon: LayoutGrid, color: 'bg-slate-500' },
                  { id: 'supplier', label: isRtl ? 'الموردين' : 'Suppliers', icon: Building2, color: 'bg-brand-primary' },
                  { id: 'customer', label: isRtl ? 'المجتمع' : 'Community', icon: User, color: 'bg-brand-teal' },
                  { id: 'followed', label: isRtl ? 'المتابَعين' : 'Following', icon: Heart, color: 'bg-red-500' }
                ].map((type) => (
                  <HapticButton
                    key={type.id}
                    onClick={() => setSellerTypeFilter(type.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      sellerTypeFilter === type.id 
                        ? `text-white ${type.color} shadow-lg` 
                        : 'text-slate-500 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                  >
                    <type.icon size={14} />
                    {type.label}
                  </HapticButton>
                ))}
              </div>

              {/* Categories Quick Access */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <HapticButton
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    !activeCategory 
                      ? 'bg-brand-primary text-white' 
                      : 'text-slate-500 bg-slate-100/50 dark:bg-slate-800/50'
                  }`}
                >
                  {isRtl ? 'جميع الفئات' : 'All Categories'}
                </HapticButton>
                {categories.map((cat) => (
                  <HapticButton
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeCategory === cat.id 
                        ? 'bg-brand-primary text-white' 
                        : 'text-slate-500 bg-slate-100/50 dark:bg-slate-800/50'
                    }`}
                  >
                    {isRtl ? cat.nameAr : cat.nameEn}
                  </HapticButton>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
