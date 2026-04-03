import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Camera, Sparkles, ChevronRight, X, Coffee, Monitor, Sofa, Shirt, Wrench, Car, Utensils, ShoppingBag, Package, Box, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HapticButton } from '../../../shared/components/HapticButton';
import { Category as FireCategory } from '../../../core/types';

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
  onSelectCategory?: (categoryId: string, subcategoryId?: string) => void;
  onVisualSearch?: () => void;
}

export const SmartCategoryExplorer: React.FC<SmartCategoryExplorerProps> = ({ categories, onSelectCategory, onVisualSearch }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<DisplayCategory | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Process real categories into DisplayCategory format
  const displayCategories = useMemo(() => {
    const mainCategories = categories.filter(c => !c.parentId);
    
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

  // AI Semantic Search Logic
  const aiSuggestions = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    
    // Flatten all subcategories for searching
    const allSubs = displayCategories.flatMap(c => c.subcategories);
    
    // Semantic mapping (can be expanded)
    const cafeKeywords = ['مقهى', 'قهوة', 'cafe', 'coffee', 'باريستا', 'barista'];
    const restaurantKeywords = ['مطعم', 'restaurant', 'أكل', 'food', 'مطبخ', 'kitchen'];
    
    if (cafeKeywords.some(k => q.includes(k))) {
      return allSubs.filter(s => 
        s.nameAr.includes('قهوة') || s.nameAr.includes('آلة') || s.nameEn.toLowerCase().includes('coffee') || s.nameEn.toLowerCase().includes('machine')
      ).slice(0, 6);
    }

    if (restaurantKeywords.some(k => q.includes(k))) {
      return allSubs.filter(s => 
        s.nameAr.includes('مطبخ') || s.nameAr.includes('فرن') || s.nameEn.toLowerCase().includes('kitchen') || s.nameEn.toLowerCase().includes('oven')
      ).slice(0, 6);
    }

    return allSubs.filter(s => 
      s.nameAr.includes(q) || s.nameEn.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery, displayCategories]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  return (
    <div className="relative w-full h-full bg-brand-background overflow-hidden flex flex-col rounded-[2rem] border border-brand-border/50 shadow-xl">
      {/* 1. Semantic Search Bar */}
      <div className="px-4 pt-6 pb-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl z-20 sticky top-0 border-b border-brand-border/50">
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            {isSearching ? (
              <Sparkles className="w-5 h-5 text-brand-primary animate-pulse" />
            ) : (
              <Search className="w-5 h-5 text-brand-text-muted" />
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? "ما الذي تبحث عنه؟ (مثال: أريد تجهيز مقهى)" : "What are you looking for? (e.g., Cafe setup)"}
            className={`w-full bg-brand-surface border-none rounded-2xl py-4 ${isRtl ? 'pr-4 pl-12' : 'pl-12 pr-4'} text-sm font-medium text-brand-text-main focus:ring-2 focus:ring-brand-primary/50 transition-all shadow-inner`}
          />
          <HapticButton 
            onClick={onVisualSearch}
            className="absolute inset-y-2 right-2 w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
          >
            <Camera className="w-5 h-5" />
          </HapticButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4 space-y-8">
        
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
              </div>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.length > 0 ? (
                  aiSuggestions.map(sub => (
                    <HapticButton
                      key={sub.id}
                      onClick={() => onSelectCategory?.(sub.id)}
                      className="px-4 py-2 bg-brand-teal/10 text-brand-teal rounded-full text-xs font-bold border border-brand-teal/20 hover:bg-brand-teal hover:text-white transition-all"
                    >
                      {isRtl ? sub.nameAr : sub.nameEn}
                    </HapticButton>
                  ))
                ) : (
                  !isSearching && (
                    <p className="text-xs text-brand-text-muted">
                      {isRtl ? 'لم نجد نتائج مطابقة' : 'No matching results found'}
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
