import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Sparkles, Check } from 'lucide-react';
import { Category } from '../../../core/types';
import { callAiJson, handleAiError } from '../../../core/services/geminiService';
import { Type } from '@google/genai';

interface SmartCategorySelectorProps {
  categories: Category[];
  selectedCategories: string[];
  onSelect: (categories: string[]) => void;
}

export const SmartCategorySelector: React.FC<SmartCategorySelectorProps> = ({ 
  categories, 
  selectedCategories, 
  onSelect 
}) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeCategories = async (input: string) => {
    if (input.length < 3) return;
    setIsAnalyzing(true);
    try {
      const prompt = `Analyze the user input: "${input}" and map it to the most relevant categories from the provided list.
      
      Available Categories: ${JSON.stringify(categories.map(c => ({ id: c.id, name: isAr ? c.nameAr : c.nameEn, keywords: c.keywords })))}
      
      Return a JSON array of category IDs that best match the input.`;

      const result = await callAiJson(prompt, {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      });

      const matched = categories.filter(c => (result as string[]).includes(c.id));
      setSuggestions(matched);
    } catch (error) {
      handleAiError(error, "Category analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => analyzeCategories(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 text-brand-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isAr ? 'ماذا تبيع؟ (مثال: إطارات، أجهزة كهربائية)' : 'What do you sell? (e.g., Tires, Appliances)'}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-border bg-brand-background focus:ring-2 focus:ring-brand-teal outline-none"
        />
        {isAnalyzing && <Sparkles className="absolute right-3 top-3 animate-spin text-brand-teal" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {suggestions.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelect([...selectedCategories, cat.id])}
            className={`p-3 rounded-lg border text-left flex items-center justify-between ${
              selectedCategories.includes(cat.id) ? 'bg-brand-teal/10 border-brand-teal' : 'bg-white border-brand-border'
            }`}
          >
            {isAr ? cat.nameAr : cat.nameEn}
            {selectedCategories.includes(cat.id) && <Check className="w-4 h-4 text-brand-teal" />}
          </button>
        ))}
      </div>
    </div>
  );
};
