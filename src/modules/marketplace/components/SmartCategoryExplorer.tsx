import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Camera, Sparkles, ChevronRight, X, Coffee, Monitor, Sofa, Shirt, Wrench, Car, Utensils, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HapticButton } from '../../../shared/components/HapticButton';

// --- Types ---
interface Subcategory {
  id: string;
  nameAr: string;
  nameEn: string;
  icon?: React.ReactNode;
}

interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: React.ReactNode;
  color: string;
  span?: string; // for bento grid (e.g., 'col-span-2')
  subcategories: Subcategory[];
}

// --- Mock Data ---
const MOCK_CATEGORIES: Category[] = [
  {
    id: 'c1', nameAr: 'معدات المقاهي والمطاعم', nameEn: 'Cafe & Restaurant Eq.', icon: <Coffee size={24} />, color: 'from-orange-400 to-red-500', span: 'col-span-2 row-span-2',
    subcategories: [
      { id: 's1', nameAr: 'آلات الإسبريسو', nameEn: 'Espresso Machines' },
      { id: 's2', nameAr: 'مطاحن القهوة', nameEn: 'Coffee Grinders' },
      { id: 's3', nameAr: 'أفران تجارية', nameEn: 'Commercial Ovens' },
      { id: 's4', nameAr: 'ثلاجات عرض', nameEn: 'Display Fridges' },
    ]
  },
  {
    id: 'c2', nameAr: 'إلكترونيات وتقنية', nameEn: 'Electronics & Tech', icon: <Monitor size={24} />, color: 'from-blue-400 to-indigo-500',
    subcategories: [
      { id: 's5', nameAr: 'حواسيب محمولة', nameEn: 'Laptops' },
      { id: 's6', nameAr: 'شاشات عرض', nameEn: 'Monitors' },
      { id: 's7', nameAr: 'أنظمة نقاط البيع', nameEn: 'POS Systems' },
    ]
  },
  {
    id: 'c3', nameAr: 'أثاث وديكور', nameEn: 'Furniture & Decor', icon: <Sofa size={24} />, color: 'from-emerald-400 to-teal-500',
    subcategories: [
      { id: 's8', nameAr: 'كراسي ومقاعد', nameEn: 'Chairs & Seating' },
      { id: 's9', nameAr: 'طاولات', nameEn: 'Tables' },
      { id: 's10', nameAr: 'إضاءة', nameEn: 'Lighting' },
    ]
  },
  {
    id: 'c4', nameAr: 'أزياء وملابس', nameEn: 'Fashion & Apparel', icon: <Shirt size={24} />, color: 'from-pink-400 to-rose-500',
    subcategories: [
      { id: 's11', nameAr: 'ملابس رجالية', nameEn: 'Men Clothing' },
      { id: 's12', nameAr: 'ملابس نسائية', nameEn: 'Women Clothing' },
    ]
  },
  {
    id: 'c5', nameAr: 'معدات صناعية', nameEn: 'Industrial Eq.', icon: <Wrench size={24} />, color: 'from-gray-600 to-gray-800', span: 'col-span-2',
    subcategories: [
      { id: 's13', nameAr: 'أدوات يدوية', nameEn: 'Hand Tools' },
      { id: 's14', nameAr: 'معدات ثقيلة', nameEn: 'Heavy Machinery' },
    ]
  },
];

// Mock AI Semantic Search
const getAISuggestions = (query: string): Subcategory[] => {
  if (!query) return [];
  const q = query.toLowerCase();
  const allSubs = MOCK_CATEGORIES.flatMap(c => c.subcategories);
  
  // Fake semantic logic
  if (q.includes('مقهى') || q.includes('قهوة') || q.includes('cafe') || q.includes('coffee')) {
    return allSubs.filter(s => ['s1', 's2', 's4', 's8', 's9'].includes(s.id));
  }
  if (q.includes('مطعم') || q.includes('restaurant')) {
    return allSubs.filter(s => ['s3', 's4', 's8', 's9'].includes(s.id));
  }
  
  return allSubs.filter(s => s.nameAr.includes(q) || s.nameEn.toLowerCase().includes(q));
};

interface SmartCategoryExplorerProps {
  onSelectCategory?: (categoryId: string, subcategoryId?: string) => void;
}

export const SmartCategoryExplorer: React.FC<SmartCategoryExplorerProps> = ({ onSelectCategory }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Subcategory[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 2) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setAiSuggestions(getAISuggestions(searchQuery));
        setIsSearching(false);
      }, 600); // Simulate AI processing delay
      return () => clearTimeout(timer);
    } else {
      setAiSuggestions([]);
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
          <HapticButton className="absolute inset-y-2 right-2 w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-colors">
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
                      onClick={() => onSelectCategory?.('ai', sub.id)}
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
        {!searchQuery && (
          <div>
            <h3 className="text-sm font-bold text-brand-text-main mb-3 px-1">
              {isRtl ? 'مقترح لك' : 'For You'}
            </h3>
            <div className="flex overflow-x-auto pb-4 -mx-4 px-4 gap-3 snap-x hide-scrollbar">
              {MOCK_CATEGORIES.slice(0, 3).map(cat => (
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
            <div className="grid grid-cols-2 gap-3 auto-rows-[120px]">
              {MOCK_CATEGORIES.map((cat, idx) => (
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
                  {activeCategory.subcategories.map((sub, idx) => (
                    <motion.div
                      initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={sub.id}
                    >
                      <HapticButton 
                        onClick={() => {
                          onSelectCategory?.(activeCategory.id, sub.id);
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
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
