import React, { useState } from 'react';
import { Plus, Search, BarChart3, Layers, Tag, Combine, LayoutGrid, ListTree, Sparkles, X, Clock } from 'lucide-react';
import { Category } from '../../core/types';
import { CategoryList } from './CategoryList';
import { AddCategoryModal } from './AddCategoryModal';

interface CategoryManagementProps {
  allCategories: Category[];
  onReorder: (newCategories: Category[]) => void;
  onManageKeywords: (category: Category) => void;
  onSuggestMerges: () => void;
  isSuggestingMerges: boolean;
  activeCategoryTab: 'product' | 'service';
  setActiveCategoryTab: (tab: 'product' | 'service') => void;
  aiSuggestions: string[];
  isSuggesting: boolean;
  onSuggestMainCategories: () => void;
  onSuggestSubcategories: (parentId?: string) => void;
  onAddSuggested: (name: string) => void;
  selectedParentId: string | null;
  onClearParentSelection?: () => void;
  t: any;
  i18n: any;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ 
  allCategories, 
  onReorder, 
  onManageKeywords, 
  onSuggestMerges, 
  isSuggestingMerges,
  activeCategoryTab,
  setActiveCategoryTab,
  aiSuggestions,
  isSuggesting,
  onSuggestMainCategories,
  onSuggestSubcategories,
  onAddSuggested,
  selectedParentId,
  onClearParentSelection,
  t,
  i18n
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterStatus, setFilterStatus] = useState<'active' | 'pending'>('active');
  
  const currentTabCategories = allCategories.filter(c => 
    (c.categoryType === activeCategoryTab || (!c.categoryType && activeCategoryTab === 'product')) &&
    (c.status === filterStatus || (filterStatus === 'active' && !c.status))
  );
  const topLevelCategories = currentTabCategories.filter(c => !c.parentId);
  const subCategories = currentTabCategories.filter(c => c.parentId);
  const categoriesNeedingKeywords = currentTabCategories.filter(c => (c.keywords?.length || 0) === 0);
  
  const filteredCategories = topLevelCategories.filter(c => 
    c.nameAr.includes(searchQuery) || c.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Unified Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 bg-brand-surface p-1.5 rounded-2xl border border-brand-border w-fit shadow-sm">
          <button
            onClick={() => setActiveCategoryTab('product')}
            className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeCategoryTab === 'product' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'text-brand-text-muted hover:text-brand-text-main hover:bg-brand-background'}`}
          >
            {i18n.language === 'ar' ? 'المنتجات' : 'Products'}
          </button>
          <button
            onClick={() => setActiveCategoryTab('service')}
            className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeCategoryTab === 'service' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'text-brand-text-muted hover:text-brand-text-main hover:bg-brand-background'}`}
          >
            {i18n.language === 'ar' ? 'الخدمات' : 'Services'}
          </button>

          <div className="w-px h-6 bg-brand-border mx-2" />

          <button
            onClick={() => setFilterStatus(filterStatus === 'active' ? 'pending' : 'active')}
            className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${filterStatus === 'pending' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-brand-text-muted hover:text-brand-text-main hover:bg-brand-background'}`}
          >
            <Clock size={16} />
            {i18n.language === 'ar' ? 'قيد المراجعة' : 'Pending Review'}
            {allCategories.filter(c => c.status === 'pending').length > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-brand-surface p-6 rounded-[2rem] border border-brand-border shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-brand-background rounded-xl border border-brand-border whitespace-nowrap">
            <BarChart3 className="text-brand-primary" size={18} />
            <span className="text-sm font-bold text-brand-text-main">Total: {topLevelCategories.length}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-brand-background rounded-xl border border-brand-border whitespace-nowrap">
            <Layers className="text-brand-success" size={18} />
            <span className="text-sm font-bold text-brand-text-main">Sub: {subCategories.length}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 bg-brand-warning/10 rounded-xl border border-brand-warning/20 whitespace-nowrap">
            <Tag className="text-brand-warning" size={18} />
            <span className="text-sm font-bold text-brand-warning">Needs Keywords: {categoriesNeedingKeywords.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text-muted/50" size={18} />
            <input 
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-3 bg-brand-background border border-brand-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all w-full sm:w-64 placeholder:text-brand-text-muted/50"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-brand-background p-1 rounded-xl border border-brand-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-surface text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text-main'}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-surface text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text-main'}`}
              title="List View"
            >
              <ListTree size={18} />
            </button>
          </div>

          <button
            onClick={onSuggestMerges}
            disabled={isSuggestingMerges || allCategories.length < 2}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary/10 text-brand-primary rounded-xl font-bold text-sm hover:bg-brand-primary hover:text-white transition-all disabled:opacity-50 shadow-sm flex-1 sm:flex-none"
            title="Smart Merge"
          >
            {isSuggestingMerges ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Combine size={18} />}
            <span className="hidden sm:inline">Smart Merge</span>
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-brand-primary text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-brand-primary-hover transition-all whitespace-nowrap shadow-sm hover:shadow-md hover:shadow-brand-primary/20 flex-1 sm:flex-none"
          >
            <Plus size={18} />
            Add New Category
          </button>
        </div>
      </div>
    </div>

      {/* AI Suggestions for Categories */}
      <div className="p-6 bg-brand-primary/5 rounded-[2rem] border border-brand-primary/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-brand-text-main">
                {selectedParentId 
                  ? (i18n.language === 'ar' ? 'اقتراحات الذكاء الاصطناعي للفئات الفرعية' : 'AI Subcategory Suggestions')
                  : (i18n.language === 'ar' ? 'اقتراحات الذكاء الاصطناعي للفئات الرئيسية' : 'AI Main Category Suggestions')}
              </h4>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">
                  {selectedParentId ? (i18n.language === 'ar' ? 'بناءً على الفئة المختارة' : 'Based on selected parent') : (i18n.language === 'ar' ? 'اقتراحات عامة' : 'General suggestions')}
                </p>
                {selectedParentId && onClearParentSelection && (
                  <button 
                    onClick={onClearParentSelection}
                    className="text-brand-error hover:bg-brand-error/10 p-0.5 rounded-full transition-colors"
                    title={i18n.language === 'ar' ? 'إلغاء التحديد' : 'Clear selection'}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={() => selectedParentId ? onSuggestSubcategories() : onSuggestMainCategories()}
            disabled={isSuggesting}
            className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-primary-hover transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSuggesting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles size={14} />}
            {i18n.language === 'ar' ? 'توليد اقتراحات' : 'Generate Suggestions'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {aiSuggestions.map((s, i) => (
            <button
              key={`${s}-${i}`}
              onClick={() => onAddSuggested(s)}
              className="px-4 py-2 bg-white text-brand-primary text-xs font-bold rounded-xl border border-brand-border hover:border-brand-primary hover:bg-brand-primary/5 transition-all flex items-center gap-2 shadow-sm"
            >
              {s}
              <Plus size={14} className="text-brand-primary/50" />
            </button>
          ))}
          {aiSuggestions.length === 0 && !isSuggesting && (
            <div className="w-full py-8 flex flex-col items-center justify-center text-center bg-brand-background/50 rounded-2xl border border-dashed border-brand-border">
              <Sparkles size={24} className="text-brand-primary/20 mb-2" />
              <p className="text-xs text-brand-text-muted font-medium">
                {selectedParentId 
                  ? (i18n.language === 'ar' ? 'اختر فئة رئيسية ثم اضغط "توليد اقتراحات"' : 'Select a parent category and click "Generate Suggestions"')
                  : (i18n.language === 'ar' ? 'اضغط "توليد اقتراحات" للحصول على فئات رئيسية' : 'Click "Generate Suggestions" for main categories')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-brand-surface rounded-[2rem] border border-brand-border shadow-sm p-6">
        <CategoryList 
          categories={filteredCategories}
          allCategories={allCategories}
          onReorder={onReorder}
          onManageKeywords={onManageKeywords}
          onSuggestSubcategories={onSuggestSubcategories}
          viewMode={viewMode}
        />
      </div>
      
      <AddCategoryModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        activeCategoryTab={activeCategoryTab}
      />
    </div>
  );
};
