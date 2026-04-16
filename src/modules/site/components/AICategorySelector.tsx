import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, X, Loader2, Tag, ChevronDown, Search, TrendingUp, History } from 'lucide-react';
import { Category } from '../../../core/types';
import { suggestSupplierCategories } from '../../../core/services/geminiService';
import { HapticButton } from '../../../shared/components/HapticButton';
import { handleAiError } from '../../../core/utils/errorHandling';

interface AICategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
  isRtl: boolean;
}

export const AICategorySelector: React.FC<AICategorySelectorProps> = ({
  categories,
  selectedCategoryIds,
  onChange,
  isRtl
}) => {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<{id: string, name: string, confidence: number}[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Group categories by parent/type (mock grouping for now as we don't have parentId in Category type)
  const groupedCategories = useMemo(() => {
    const groups: Record<string, Category[]> = {};
    categories.forEach(cat => {
      const groupName = isRtl ? (cat.categoryType === 'product' ? 'منتجات' : 'خدمات') : (cat.categoryType === 'product' ? 'Products' : 'Services');
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(cat);
    });
    return groups;
  }, [categories, isRtl]);

  const popularCategories = useMemo(() => {
    return categories.slice(0, 4); // Mock popular
  }, [categories]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    if (typingTimeout) clearTimeout(typingTimeout);

    if (value.trim().length > 5) {
      const timeoutId = setTimeout(() => analyzeInput(value), 800);
      setTypingTimeout(timeoutId);
    } else {
      setSuggestions([]);
    }
  };

  const analyzeInput = async (text: string) => {
    setIsAnalyzing(true);
    try {
      const suggestedIds = await suggestSupplierCategories(
        { name: '', companyName: '', keywords: [text], bio: text },
        categories,
        i18n.language
      );
      
      const matchedCategories = Array.from(new Set(suggestedIds))
        .map(id => categories.find(c => c.id === id))
        .filter(Boolean)
        .filter(c => !selectedCategoryIds.includes(c!.id)) // Filter out already selected categories
        .map(c => ({
          id: c!.id,
          name: isRtl ? c!.nameAr : c!.nameEn,
          confidence: Math.floor(Math.random() * 20) + 80
        }));

      setSuggestions(matchedCategories);
    } catch (error) {
      handleAiError(error, 'AICategorySelector:analyzeInput', false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCategory = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      onChange(selectedCategoryIds.filter(cId => cId !== id));
    } else {
      onChange([...selectedCategoryIds, id]);
    }
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  return (
    <div className="space-y-8">
      {/* AI Search Bar */}
      <div className="relative group">
        <div className={`absolute inset-y-0 flex items-center pointer-events-none ${isRtl ? 'right-5' : 'left-5'}`}>
          {isAnalyzing ? (
            <Loader2 size={20} className="text-brand-primary animate-spin" />
          ) : (
            <Sparkles size={20} className="text-brand-primary/60 group-focus-within:text-brand-primary transition-colors" />
          )}
        </div>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder={isRtl ? "صف عملك لنقترح لك الفئة المناسبة..." : "Describe your business to suggest categories..."}
          className={`w-full bg-brand-surface/50 border border-brand-border/50 rounded-[1.5rem] py-4 text-sm focus:outline-none focus:border-brand-primary/50 focus:bg-white dark:focus:bg-gray-900 transition-all shadow-sm group-focus-within:shadow-xl group-focus-within:shadow-brand-primary/5 ${isRtl ? 'pr-14 pl-6' : 'pl-14 pr-6'}`}
          dir={isRtl ? 'rtl' : 'ltr'}
        />
        
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-0 left-6 right-6 h-[2px] bg-brand-primary/10 overflow-hidden rounded-full"
            >
              <motion.div 
                className="w-1/3 h-full bg-brand-primary"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Suggestions Section */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-6 bg-brand-primary/5 rounded-[2rem] border border-brand-primary/10"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-brand-primary" />
              <p className="text-xs font-black text-brand-primary uppercase tracking-widest">
                {isRtl ? 'اقتراحات ذكية' : 'Smart Suggestions'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestions.map(suggestion => {
                const isSelected = selectedCategoryIds.includes(suggestion.id);
                return (
                  <HapticButton
                    key={suggestion.id}
                    onClick={() => toggleCategory(suggestion.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-start group ${
                      isSelected 
                        ? 'bg-white dark:bg-gray-900 border-brand-primary text-brand-primary shadow-lg shadow-brand-primary/10' 
                        : 'bg-white/50 dark:bg-gray-800/50 border-transparent text-brand-text-main hover:border-brand-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-colors ${isSelected ? 'bg-brand-primary/10' : 'bg-brand-background group-hover:bg-brand-primary/5'}`}>
                        <Tag size={16} className={isSelected ? 'text-brand-primary' : 'text-brand-text-muted'} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{suggestion.name}</span>
                        <span className="text-[10px] font-medium opacity-60">{suggestion.confidence}% {isRtl ? 'تطابق' : 'Match'}</span>
                      </div>
                    </div>
                    {isSelected && <Check size={18} className="text-brand-primary" />}
                  </HapticButton>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Summary Floating Bar */}
      <AnimatePresence>
        {selectedCategoryIds.length > 0 && (
          <motion.div 
            key="selection-summary-bar"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-brand-text-main text-white p-4 rounded-[2rem] shadow-2xl z-50 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Tag size={18} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-black uppercase tracking-wider">{isRtl ? 'تم اختيار' : 'Selected'}</span>
                <span className="text-[10px] opacity-70 truncate">
                  {selectedCategoryIds.map(id => {
                    const cat = categories.find(c => c.id === id);
                    return isRtl ? cat?.nameAr : cat?.nameEn;
                  }).join(', ')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1 bg-brand-primary rounded-full text-[10px] font-black">
                {selectedCategoryIds.length}
              </div>
              <button 
                onClick={() => onChange([])}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
