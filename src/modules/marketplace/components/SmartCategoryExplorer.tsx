import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Camera, Sparkles, ChevronRight, X, Coffee, Monitor, Sofa, Shirt, Wrench, Car, Utensils, ShoppingBag, Package, Box, Layers, BrainCircuit, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HapticButton } from '../../../shared/components/HapticButton';
import { Category as FireCategory } from '../../../core/types';
import { suggestCategoriesFromQuery, handleAiError } from '../../../core/services/geminiService';

// --- Types ---
interface Subcategory {
  id: string;
  nameAr: string;
  nameEn: string;
  icon?: React.ReactNode;
}

interface DisplayCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: React.ReactNode;
  color: string;
  span?: string;
  subcategories: Subcategory[];
}

const CATEGORY_COLORS = [
  'from-orange-400 to-red-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-pink-400 to-rose-500',
  'from-purple-400 to-violet-500',
  'from-amber-400 to-yellow-500',
  'from-cyan-400 to-blue-500',
  'from-gray-600 to-gray-800',
];

const CATEGORY_ICONS = [
  <Package size={24} />,
  <Box size={24} />,
  <Layers size={24} />,
  <ShoppingBag size={24} />,
  <Coffee size={24} />,
  <Monitor size={24} />,
  <Sofa size={24} />,
  <Shirt size={24} />,
  <Wrench size={24} />,
  <Utensils size={24} />,
];

interface SmartCategoryExplorerProps {
  categories: FireCategory[];
  filterType?: 'product' | 'service';
  onSelectCategory?: (categoryId: string, subcategoryId?: string) => void;
  onVisualSearch?: () => void;
  onHoverCategory?: (categoryId: string) => void;
}

export const SmartCategoryExplorer: React.FC<SmartCategoryExplorerProps> = ({ 
  categories, 
  filterType,
  onSelectCategory, 
  onVisualSearch, 
  onHoverCategory 
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<DisplayCategory | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [smartResults, setSmartResults] = useState<Subcategory[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [sortBy, setSortBy] = useState<'grid' | 'az'>('grid');

  // Process real categories into DisplayCategory format
  const displayCategories = useMemo(() => {
    // Deduplicate categories by ID
    const uniqueCategoriesMap = new Map();
    categories.forEach(c => {
      if (c && c.id) uniqueCategoriesMap.set(c.id, c);
    });
    
    let rawCategories = Array.from(uniqueCategoriesMap.values());
    
    // Core Team Filter: Isolate Product vs Service
    if (filterType) {
      rawCategories = rawCategories.filter(c => c.categoryType === filterType || !c.categoryType);
    }
    
    // Sort logic
    if (sortBy === 'az') {
      rawCategories.sort((a, b) => {
        const nameA = isRtl ? a.nameAr : a.nameEn;
        const nameB = isRtl ? b.nameAr : b.nameEn;
        return nameA.localeCompare(nameB);
      });
    }

    const mainCategories = rawCategories.filter(c => !c.parentId);
    
    return mainCategories.map((cat, index) => {
      const subcategories = categories
        .filter(c => c.parentId === cat.id)
        .map(sub => ({
          id: sub.id,
          nameAr: sub.nameAr,
          nameEn: sub.nameEn,
        }));

      return {
        id: cat.id,
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        icon: CATEGORY_ICONS[index % CATEGORY_ICONS.length],
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        span: index === 0 ? 'col-span-2 row-span-2' : index === 4 ? 'col-span-2' : undefined,
        subcategories
      };
    });
  }, [categories]);

  // AI Semantic Search Logic (Local + Simulated AI)
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSmartResults([]);
      return;
    }

    const q = searchQuery.toLowerCase();
    setIsSearching(true);
    setAiThinking(true);

    const timer = setTimeout(() => {
      // Flatten all subcategories for searching
      const allSubs = displayCategories.flatMap(c => c.subcategories);
      
      // Semantic mapping
      const cafeKeywords = ['مقهى', 'قهوة', 'cafe', 'coffee', 'باريستا', 'barista', 'تجهيز', 'setup'];
      const restaurantKeywords = ['مطعم', 'restaurant', 'أكل', 'food', 'مطبخ', 'kitchen', 'فرن', 'oven'];
      const techKeywords = ['تقنية', 'كمبيوتر', 'جوال', 'tech', 'computer', 'mobile', 'برمجة', 'coding'];
      const fashionKeywords = ['ملابس', 'موضة', 'أزياء', 'fashion', 'clothes', 'لبس', 'dress'];

      let results: Subcategory[] = [];

      if (cafeKeywords.some(k => q.includes(k))) {
        results = allSubs.filter(s => 
          (s.nameAr || '').includes('قهوة') || (s.nameAr || '').includes('آلة') || (s.nameAr || '').includes('باريستا') ||
          (s.nameEn || '').toLowerCase().includes('coffee') || (s.nameEn || '').toLowerCase().includes('machine') || (s.nameEn || '').toLowerCase().includes('barista')
        );
      } else if (restaurantKeywords.some(k => q.includes(k))) {
        results = allSubs.filter(s => 
          (s.nameAr || '').includes('مطبخ') || (s.nameAr || '').includes('فرن') || (s.nameAr || '').includes('طباخ') ||
          (s.nameEn || '').toLowerCase().includes('kitchen') || (s.nameEn || '').toLowerCase().includes('oven') || (s.nameEn || '').toLowerCase().includes('cook')
        );
      } else if (techKeywords.some(k => q.includes(k))) {
        results = allSubs.filter(s => 
          (s.nameAr || '').includes('تقنية') || (s.nameAr || '').includes('حاسوب') || (s.nameAr || '').includes('هاتف') ||
          (s.nameEn || '').toLowerCase().includes('tech') || (s.nameEn || '').toLowerCase().includes('computer') || (s.nameEn || '').toLowerCase().includes('phone')
        );
      } else if (fashionKeywords.some(k => q.includes(k))) {
        results = allSubs.filter(s => 
          (s.nameAr || '').includes('ملابس') || (s.nameAr || '').includes('أزياء') || (s.nameAr || '').includes('فستان') ||
          (s.nameEn || '').toLowerCase().includes('clothes') || (s.nameEn || '').toLowerCase().includes('fashion') || (s.nameEn || '').toLowerCase().includes('dress')
        );
      } else {
        results = allSubs.filter(s => 
          (s.nameAr || '').includes(q) || (s.nameEn || '').toLowerCase().includes(q)
        );
      }

      setSmartResults(results.slice(0, 8));
      setIsSearching(false);
      setAiThinking(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [searchQuery, displayCategories]);

  const handleAiSearch = async () => {
    if (searchQuery.length < 3) return;
    
    setIsAiSearching(true);
    setAiThinking(true);
    
    try {
      const matchedIds = await suggestCategoriesFromQuery(searchQuery, categories, i18n.language);
      
      // Map matched IDs to subcategories
      const matchedSubs = categories
        .filter(c => matchedIds.includes(c.id))
        .map(c => ({
          id: c.id,
          nameAr: c.nameAr,
          nameEn: c.nameEn
        }));
        
      setSmartResults(matchedSubs);
    } catch (error) {
      handleAiError(error, 'Semantic search');
    } finally {
      setIsAiSearching(false);
      setAiThinking(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-brand-background overflow-hidden flex flex-col rounded-[2rem] border border-brand-border/50 shadow-xl">
      {/* 1. Semantic Search Bar */}
      <div className="px-4 pt-6 pb-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-20 sticky top-0 border-b border-brand-border/50">
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            {aiThinking ? (
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Sparkles className="w-5 h-5 text-brand-primary" />
              </motion.div>
            ) : (
              <Search className="w-5 h-5 text-brand-text-muted" />
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            placeholder={isRtl ? "ما الذي تبحث عنه؟ (مثال: أريد تجهيز مقهى)" : "What are you looking for? (e.g., Cafe setup)"}
            className={`w-full bg-brand-surface border-none rounded-2xl py-4 ${isRtl ? 'pr-4 pl-28' : 'pl-12 pr-28'} text-sm font-medium text-brand-text-main focus:ring-2 focus:ring-brand-primary/50 transition-all shadow-inner`}
          />
          
          {/* Neural Pulse Glow when typing */}
          <AnimatePresence>
            {searchQuery.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-2xl ring-2 ring-brand-primary/20 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <div className={`absolute inset-y-2 ${isRtl ? 'left-2' : 'right-2'} flex items-center gap-1`}>
            <HapticButton 
              onClick={handleAiSearch}
              disabled={searchQuery.length < 3 || isAiSearching}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                searchQuery.length >= 3 
                  ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20' 
                  : 'bg-brand-surface text-brand-text-muted opacity-50'
              }`}
            >
              {isAiSearching ? (
                <BrainCircuit className="w-5 h-5 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5" />
              )}
            </HapticButton>
            <HapticButton 
              onClick={onVisualSearch}
              className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
            >
              <Camera className="w-5 h-5" />
            </HapticButton>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4 space-y-8">
        {/* View Switcher */}
        <div className="flex items-center justify-between mb-4 mt-2">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text-muted">
             {isRtl ? 'استكشف بذكاء' : 'Explore Smartly'}
           </p>
           <div className="flex bg-brand-surface p-1 rounded-xl border border-brand-border">
              <button 
                onClick={() => setSortBy('grid')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'grid' ? 'bg-brand-primary text-white shadow-md' : 'text-brand-text-muted hover:text-brand-primary'}`}
              >
                {isRtl ? 'شبكة' : 'Grid'}
              </button>
              <button 
                onClick={() => setSortBy('az')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'az' ? 'bg-brand-primary text-white shadow-md' : 'text-brand-text-muted hover:text-brand-primary'}`}
              >
                {isRtl ? 'أ-ي' : 'A-Z'}
              </button>
           </div>
        </div>
        
        {/* AI Suggestions Results */}
        <AnimatePresence>
          {searchQuery && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-brand-teal" />
                <h3 className="text-sm font-bold text-brand-text-main">
                  {isRtl ? 'اقتراحات الذكاء الاصطناعي' : 'AI Suggestions'}
                </h3>
                {aiThinking && (
                  <motion.div 
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-[10px] text-brand-teal font-medium"
                  >
                    {isRtl ? 'جاري التحليل...' : 'Analyzing...'}
                  </motion.div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {smartResults.length > 0 ? (
                  Array.from(new Map(smartResults.map(sub => [sub.id, sub])).values()).map((sub, idx) => (
                    <motion.div
                      key={sub.id || `smart-res-${idx}`}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <HapticButton
                        onClick={() => onSelectCategory?.(sub.id)}
                        className="px-4 py-2 bg-brand-teal/10 text-brand-teal rounded-full text-xs font-bold border border-brand-teal/20 hover:bg-brand-teal hover:text-white transition-all flex items-center gap-2"
                      >
                        <Sparkles size={12} />
                        {isRtl ? sub.nameAr : sub.nameEn}
                      </HapticButton>
                    </motion.div>
                  ))
                ) : (
                  !isSearching && (
                    <p className="text-xs text-brand-text-muted px-2 py-4 italic">
                      {isRtl ? 'لم نجد نتائج مطابقة، جرب كلمات أخرى' : 'No matching results found, try different keywords'}
                    </p>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Predictive Sorting (For You) */}
        {!searchQuery && displayCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-brand-text-main mb-3 px-1">
              {isRtl ? 'مقترح لك' : 'For You'}
            </h3>
            <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-3 snap-x hide-scrollbar">
              {displayCategories.slice(0, 4).map(cat => (
                <HapticButton
                  key={`foryou-${cat.id}`}
                  onClick={() => setActiveCategory(cat)}
                  onMouseEnter={() => onHoverCategory?.(cat.id)}
                  className="snap-start shrink-0 w-40 p-4 rounded-3xl bg-white dark:bg-gray-800 border border-brand-border/50 shadow-sm flex flex-col gap-3"
                >
                  <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-lg`}>
                    {cat.icon}
                  </div>
                  <span className="text-xs font-bold text-brand-text-main text-start leading-tight">
                    {isRtl ? cat.nameAr : cat.nameEn}
                  </span>
                </HapticButton>
              ))}
            </div>
          </div>
        )}

        {/* 3. Bento Grid Categories */}
        {!searchQuery && (
          <div>
            <h3 className="text-sm font-bold text-brand-text-main mb-3 px-1">
              {isRtl ? 'استكشف الأقسام' : 'Explore Categories'}
            </h3>
            {displayCategories.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 auto-rows-[120px]">
                {displayCategories.map((cat, idx) => (
                  <HapticButton
                    key={cat.id}
                    onClick={() => setActiveCategory(cat)}
                    onMouseEnter={() => onHoverCategory?.(cat.id)}
                    className={`relative overflow-hidden rounded-3xl p-4 flex flex-col justify-between group ${cat.span || ''} bg-gradient-to-br ${cat.color} shadow-md`}
                  >
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                    <div className="relative z-10 text-white/90">
                      {cat.icon}
                    </div>
                    <div className="relative z-10 flex items-end justify-between">
                      <span className="text-sm font-black text-white leading-tight max-w-[80%] text-start">
                        {isRtl ? cat.nameAr : cat.nameEn}
                      </span>
                      <ChevronRight className={`w-5 h-5 text-white/50 ${isRtl ? 'rotate-180' : ''}`} />
                    </div>
                  </HapticButton>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-sm text-brand-text-muted">
                  {isRtl ? 'لا توجد فئات مضافة بعد' : 'No categories added yet'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Fluid Expansion (Bottom Sheet) */}
      <AnimatePresence>
        {activeCategory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCategory(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 h-[70vh] bg-white dark:bg-gray-900 rounded-t-[2.5rem] z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden"
            >
              {/* Handle */}
              <div className="w-full flex justify-center pt-4 pb-2" onClick={() => setActiveCategory(null)}>
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
              </div>
              
              <div className="px-6 pb-4 flex items-center justify-between border-b border-brand-border/50">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeCategory.color} flex items-center justify-center text-white shadow-lg`}>
                    {activeCategory.icon}
                  </div>
                  <h2 className="text-xl font-black text-brand-text-main">
                    {isRtl ? activeCategory.nameAr : activeCategory.nameEn}
                  </h2>
                </div>
                <HapticButton onClick={() => setActiveCategory(null)} className="w-8 h-8 bg-brand-surface rounded-full flex items-center justify-center text-brand-text-muted">
                  <X size={18} />
                </HapticButton>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-4">
                  {isRtl ? 'الفئات الفرعية' : 'Subcategories'}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {activeCategory.subcategories.length > 0 ? (
                    activeCategory.subcategories.map((sub, idx) => (
                      <motion.div
                        initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={sub.id}
                      >
                        <HapticButton 
                          onClick={() => {
                            onSelectCategory?.(sub.id);
                            setActiveCategory(null);
                          }}
                          className="w-full flex items-center justify-between p-4 rounded-2xl bg-brand-surface hover:bg-brand-primary/5 border border-transparent hover:border-brand-primary/20 transition-all group"
                        >
                          <span className="text-sm font-bold text-brand-text-main group-hover:text-brand-primary transition-colors">
                            {isRtl ? sub.nameAr : sub.nameEn}
                          </span>
                          <ChevronRight className={`w-4 h-4 text-brand-text-muted group-hover:text-brand-primary ${isRtl ? 'rotate-180' : ''}`} />
                        </HapticButton>
                      </motion.div>
                    ))
                  ) : (
                    <HapticButton 
                      onClick={() => {
                        onSelectCategory?.(activeCategory.id);
                        setActiveCategory(null);
                      }}
                      className="w-full p-4 rounded-2xl bg-brand-primary/10 text-brand-primary text-center font-bold"
                    >
                      {isRtl ? `عرض كل ${activeCategory.nameAr}` : `View all ${activeCategory.nameEn}`}
                    </HapticButton>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
