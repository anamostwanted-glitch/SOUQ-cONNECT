import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Category } from '../../core/types';
import { semanticSearch } from '../../core/services/geminiService';
import { Search, Sparkles, X, Check, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { handleAiError } from '../../core/utils/errorHandling';

interface SmartCategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onSelect: (ids: string[]) => void;
  productInfo?: {
    title: string;
    description: string;
    imageUrl?: string;
  };
  isRtl?: boolean;
}

const SmartCategorySelector: React.FC<SmartCategorySelectorProps> = ({ 
  categories, 
  selectedCategoryIds, 
  onSelect,
  productInfo,
  isRtl: propIsRtl
}) => {
  const { i18n } = useTranslation();
  const isRtl = propIsRtl ?? i18n.language === 'ar';
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      onSelect(selectedCategoryIds.filter(cid => cid !== id));
    } else {
      onSelect([...selectedCategoryIds, id]);
    }
  };

  useEffect(() => {
    if (!search.trim()) {
      // If we have suggestions, show them first
      if (suggestedIds.length > 0) {
        const suggested = suggestedIds
          .map(id => categories.find(c => c.id === id))
          .filter((c): c is Category => !!c);
        
        const others = categories.filter(c => !c.parentId && !suggestedIds.includes(c.id));
        setResults([...suggested, ...others]);
      } else {
        setResults(categories.filter(c => !c.parentId));
      }
    } else {
      const filtered = categories.filter(c => 
        c.nameAr.includes(search) || c.nameEn.toLowerCase().includes(search.toLowerCase())
      );
      setResults(filtered);
    }
  }, [search, categories, suggestedIds]);

  // Automatic AI suggestion based on product info
  useEffect(() => {
    console.log('SmartCategorySelector: productInfo changed', productInfo);
    const timer = setTimeout(async () => {
      if (!productInfo?.title || productInfo.title.length < 3) {
        console.log('SmartCategorySelector: Title too short or missing', productInfo?.title);
        return;
      }
      
      try {
        console.log('SmartCategorySelector: Fetching suggestions for', productInfo.title);
        const query = `${productInfo.title} ${productInfo.description || ''}`;
        const ids = await semanticSearch(query, categories, i18n.language);
        console.log('SmartCategorySelector: Received IDs', ids);
        if (ids.length > 0) {
          setSuggestedIds(ids);
        }
      } catch (error) {
        console.warn('Failed to get automatic category suggestions:', error);
      }
    }, 1500); // Debounce for 1.5s

    return () => clearTimeout(timer);
  }, [productInfo?.title, productInfo?.description, categories, i18n.language]);

  const handleAiSearch = async () => {
    console.log('SmartCategorySelector: handleAiSearch triggered', search);
    const query = search.trim() || (productInfo?.title ? `${productInfo.title} ${productInfo.description || ''}` : '');
    if (!query) {
      console.log('SmartCategorySelector: No query for AI search');
      return;
    }

    setIsSearching(true);
    try {
      console.log('SmartCategorySelector: Performing semantic search for', query);
      const relevantIds = await semanticSearch(query, categories, i18n.language);
      console.log('SmartCategorySelector: AI Search Results', relevantIds);
      if (relevantIds.length > 0) {
        setSuggestedIds(relevantIds);
        // If we were searching by text, we filter results to show only relevant ones
        if (search.trim()) {
          const relevantCategories = relevantIds
            .map(id => categories.find(c => c.id === id))
            .filter((c): c is Category => !!c);
          setResults(relevantCategories);
        }
      }
    } catch (error) {
      handleAiError(error, 'SmartCategorySelector:handleAiSearch', false);
    } finally {
      setIsSearching(false);
    }
  };

  const selectedCategories = categories.filter(c => selectedCategoryIds.includes(c.id));

  return (
    <div className="relative w-full">
      <div 
        className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-background cursor-pointer flex items-center justify-between min-h-[52px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {selectedCategories.length > 0 ? (
            selectedCategories.map(cat => (
              <span 
                key={cat.id}
                className="px-2 py-1 bg-brand-primary/10 text-brand-primary rounded-lg text-xs font-bold flex items-center gap-1"
              >
                {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory(cat.id);
                  }}
                  className="hover:text-brand-primary-hover"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <span className="text-brand-text-muted">
              {i18n.language === 'ar' ? 'اختر الفئات' : 'Select Categories'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {suggestedIds.length > 0 && selectedCategoryIds.length === 0 && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2 py-1 bg-brand-primary/10 text-brand-primary rounded-lg text-[10px] font-black uppercase"
            >
              <Star size={10} className="fill-brand-primary" />
              {i18n.language === 'ar' ? 'جاهز' : 'Ready'}
            </motion.div>
          )}
          <Search size={20} className="text-brand-text-muted" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-brand-surface border border-brand-border rounded-xl shadow-xl p-4 max-h-96 overflow-y-auto">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={i18n.language === 'ar' ? 'ابحث عن فئة...' : 'Search category...'}
              className="flex-1 px-4 py-2 rounded-lg border border-brand-border outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <button
              type="button"
              onClick={handleAiSearch}
              disabled={isSearching}
              title={i18n.language === 'ar' ? 'تحليل ذكي' : 'AI Analysis'}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/20"
            >
              {isSearching ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Star size={18} className="fill-white" />}
            </button>
          </div>

          <div className="space-y-4">
            {suggestedIds.length > 0 && !search.trim() && (
              <div className="space-y-1">
                <div className="px-4 py-1 flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-widest">
                  <Star size={12} className="fill-brand-primary" />
                  {i18n.language === 'ar' ? 'أفضل المطابقات بالذكاء الاصطناعي' : 'AI Best Matches'}
                </div>
                {suggestedIds
                  .map(id => categories.find(c => c.id === id))
                  .filter((c): c is Category => !!c)
                  .map(cat => (
                    <button
                      key={`suggested-${cat.id}`}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between border ${selectedCategoryIds.includes(cat.id) ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'bg-brand-primary/5 border-brand-primary/10 hover:bg-brand-primary/10'}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{i18n.language === 'ar' ? cat.nameAr : cat.nameEn}</span>
                        <span className="px-1.5 py-0.5 bg-brand-primary text-white text-[8px] font-black rounded-full uppercase">
                          {i18n.language === 'ar' ? 'دقيق' : 'Match'}
                        </span>
                      </div>
                      {selectedCategoryIds.includes(cat.id) && <Check size={16} />}
                    </button>
                  ))}
                <div className="h-px bg-brand-border my-2 mx-4" />
              </div>
            )}

            <div className="space-y-1">
              {suggestedIds.length > 0 && !search.trim() && (
                <div className="px-4 py-1 text-[10px] font-black text-brand-text-muted uppercase tracking-widest">
                  {i18n.language === 'ar' ? 'جميع الفئات' : 'All Categories'}
                </div>
              )}
              {results
                .filter(cat => !suggestedIds.includes(cat.id) || search.trim())
                .sort((a, b) => {
                  const aSelected = selectedCategoryIds.includes(a.id);
                  const bSelected = selectedCategoryIds.includes(b.id);
                  if (aSelected && !bSelected) return -1;
                  if (!aSelected && bSelected) return 1;
                  return 0;
                }).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-all flex items-center justify-between ${selectedCategoryIds.includes(cat.id) ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-brand-background'}`}
                  >
                    <div className="flex items-center gap-2">
                      {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                    </div>
                    {selectedCategoryIds.includes(cat.id) && <Check size={16} />}
                  </button>
                ))}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-brand-border flex justify-end">
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg font-bold text-sm"
            >
              {i18n.language === 'ar' ? 'تم' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCategorySelector;
