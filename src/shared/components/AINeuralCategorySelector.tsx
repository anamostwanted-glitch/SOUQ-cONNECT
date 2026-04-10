import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Sparkles, 
  ChevronRight, 
  Check, 
  Zap, 
  Cpu, 
  LayoutGrid,
  X,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { Category } from '../../core/types';
import { HapticButton } from './HapticButton';
import { suggestNeuralCategories } from '../../core/services/geminiService';
import { handleAiError } from '../../core/utils/errorHandling';

interface AINeuralCategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onSelect: (categoryIds: string[]) => void;
  productInfo?: {
    title: string;
    description: string;
    imageUrl?: string;
  };
  isRtl?: boolean;
}

export const AINeuralCategorySelector: React.FC<AINeuralCategorySelectorProps> = ({
  categories,
  selectedCategoryIds,
  onSelect,
  productInfo,
  isRtl = false
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  const selectedCategories = useMemo(() => 
    categories.filter(c => selectedCategoryIds.includes(c.id)),
    [categories, selectedCategoryIds]
  );

  // Filter categories based on search and hierarchy
  const filteredCategories = useMemo(() => {
    let filtered = categories;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return categories.filter(c => 
        c.nameAr.toLowerCase().includes(query) || 
        c.nameEn.toLowerCase().includes(query) ||
        c.keywords?.some(k => k.toLowerCase().includes(query))
      );
    }

    if (activeParentId) {
      return categories.filter(c => c.parentId === activeParentId);
    }

    // Default: show top-level categories
    return categories.filter(c => !c.parentId);
  }, [categories, searchQuery, activeParentId]);

  // AI Analysis logic
  useEffect(() => {
    const analyze = async () => {
      if (!productInfo?.title || productInfo.title.length < 3) return;
      
      setIsAnalyzing(true);
      try {
        const matches = await suggestNeuralCategories(
          { title: productInfo.title, description: productInfo.description },
          categories
        );
        setAiSuggestions(matches);
      } catch (error) {
        handleAiError(error, 'AINeuralCategorySelector:analyze', false);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const timer = setTimeout(analyze, 1000);
    return () => clearTimeout(timer);
  }, [productInfo?.title, productInfo?.description, categories]);

  const handleSelect = (categoryId: string, forceClose: boolean = false) => {
    const hasChildren = categories.some(c => c.parentId === categoryId);

    if (hasChildren && !searchQuery) {
      setActiveParentId(categoryId);
    } else {
      if (selectedCategoryIds.includes(categoryId)) {
        onSelect(selectedCategoryIds.filter(id => id !== categoryId));
      } else {
        onSelect([...selectedCategoryIds, categoryId]);
      }
      
      // If it's a leaf category or forceClose is requested, close the modal
      if (!hasChildren || forceClose || searchQuery) {
        setTimeout(() => setIsOpen(false), 300);
      }
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-brand-primary/50 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-colors ${selectedCategories.length > 0 ? 'bg-brand-primary/10 text-brand-primary' : 'bg-slate-200 text-slate-400'}`}>
            <LayoutGrid size={18} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {t('category', 'Category')}
            </p>
            <p className={`text-sm font-bold ${selectedCategories.length > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
              {selectedCategories.length > 0 
                ? (i18n.language === 'ar' ? selectedCategories.map(c => c.nameAr).join(', ') : selectedCategories.map(c => c.nameEn).join(', '))
                : t('select_category', 'Select Category')}
            </p>
          </div>
        </div>
        <ChevronDown size={20} className="text-slate-300 group-hover:text-brand-primary transition-colors" />
      </button>

      {/* Neural Bridge Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[120] bg-slate-900 text-white rounded-t-[32px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border-t border-white/10"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center text-brand-primary">
                    <Cpu size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">
                      {isRtl ? 'المنسق الدلالي الذكي' : 'Smart Neural Bridge'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {isRtl ? 'اختيار الفئة بالذكاء الاصطناعي' : 'AI-Powered Category Selection'}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search & AI Suggestions */}
              <div className="p-6 space-y-6">
                {/* Search Bar */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-primary transition-colors" size={20} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isRtl ? 'ابحث عن الفئة أو المعنى...' : 'Search category or meaning...'}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm focus:ring-2 focus:ring-brand-primary/50 outline-none transition-all"
                  />
                  {isAnalyzing && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Zap size={16} className="text-brand-primary animate-bounce" />
                    </div>
                  )}
                </div>

                {/* AI Suggestions (The 3 Power Cells) */}
                {aiSuggestions.length > 0 && !searchQuery && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-widest">
                      <Sparkles size={12} />
                      {isRtl ? 'ترشيحات الذكاء الاصطناعي' : 'AI Neural Suggestions'}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {aiSuggestions.map((id, idx) => {
                        const cat = categories.find(c => c.id === id);
                        if (!cat) return null;
                        return (
                          <motion.button
                            key={id}
                            type="button"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => handleSelect(id, true)}
                            className="flex items-center justify-between p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl hover:bg-brand-primary/20 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                                <Check size={16} />
                              </div>
                              <span className="font-bold text-sm">
                                {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                {isRtl ? 'اختيار سريع' : 'Quick Select'}
                              </span>
                              <ArrowRight size={16} className="text-brand-primary" />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Categories List */}
              <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
                {/* Breadcrumbs if in subcategory */}
                {activeParentId && !searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setActiveParentId(null)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors group"
                  >
                    <div className="p-1 bg-white/5 rounded-lg group-hover:bg-brand-primary/20 group-hover:text-brand-primary transition-all">
                      <ChevronRight size={14} className={isRtl ? '' : 'rotate-180'} />
                    </div>
                    <span className="text-xs font-bold">
                      {isRtl ? 'العودة للفئات الرئيسية' : 'Back to Main Categories'}
                    </span>
                  </button>
                )}

                <div className="grid grid-cols-1 gap-2">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelect(cat.id)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          selectedCategoryIds.includes(cat.id) 
                            ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            selectedCategoryIds.includes(cat.id) ? 'bg-white/20' : 'bg-white/5'
                          }`}>
                            <LayoutGrid size={18} />
                          </div>
                          <span className="font-bold text-sm">
                            {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                          </span>
                        </div>
                        {categories.some(c => c.parentId === cat.id) && !searchQuery ? (
                          <ChevronRight size={18} className={`text-slate-500 ${isRtl ? 'rotate-180' : ''}`} />
                        ) : selectedCategoryIds.includes(cat.id) ? (
                          <Check size={18} />
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Search size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                      <p className="text-slate-500 font-medium">
                        {isRtl ? 'لم نجد فئات تطابق بحثك' : 'No categories match your search'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer / Done Button */}
              <div className="p-6 border-t border-white/5 bg-white/5">
                <HapticButton
                  onClick={() => setIsOpen(false)}
                  className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  {isRtl ? 'تم الاختيار' : 'Done Selecting'}
                </HapticButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
