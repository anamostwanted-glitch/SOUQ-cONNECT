import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Category } from '../types';
import { semanticSearch } from '../services/geminiService';
import { Search, Sparkles, X, Check } from 'lucide-react';

interface SmartCategorySelectorProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (id: string) => void;
}

const SmartCategorySelector: React.FC<SmartCategorySelectorProps> = ({ categories, selectedCategoryId, onSelect }) => {
  const { i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setResults(categories.filter(c => !c.parentId));
    } else {
      const filtered = categories.filter(c => 
        c.nameAr.includes(search) || c.nameEn.toLowerCase().includes(search.toLowerCase())
      );
      setResults(filtered);
    }
  }, [search, categories]);

  const handleAiSearch = async () => {
    if (!search.trim()) return;
    setIsSearching(true);
    try {
      const relevantIds = await semanticSearch(search, categories, i18n.language);
      const relevantCategories = relevantIds
        .map(id => categories.find(c => c.id === id))
        .filter((c): c is Category => !!c);
      setResults(relevantCategories);
    } catch (error) {
      console.error('AI Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="relative w-full">
      <div 
        className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-background cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedCategory ? "text-brand-text-main" : "text-brand-text-muted"}>
          {selectedCategory 
            ? (i18n.language === 'ar' ? selectedCategory.nameAr : selectedCategory.nameEn)
            : (i18n.language === 'ar' ? 'اختر الفئة' : 'Select Category')}
        </span>
        <Search size={20} className="text-brand-text-muted" />
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
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition-all flex items-center gap-2"
            >
              {isSearching ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Sparkles size={18} />}
            </button>
          </div>

          <div className="space-y-1">
            {[...results].sort((a, b) => {
              const aSelected = selectedCategoryId === a.id;
              const bSelected = selectedCategoryId === b.id;
              if (aSelected && !bSelected) return -1;
              if (!aSelected && bSelected) return 1;
              return 0;
            }).map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelect(cat.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded-lg transition-all flex items-center justify-between ${selectedCategoryId === cat.id ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-brand-background'}`}
              >
                {i18n.language === 'ar' ? cat.nameAr : cat.nameEn}
                {selectedCategoryId === cat.id && <Check size={16} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCategorySelector;
