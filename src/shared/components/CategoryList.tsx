import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableCategoryItem } from './SortableCategoryItem';
import { Category } from '../../core/types';

interface CategoryListProps {
  categories: Category[];
  allCategories: Category[];
  onReorder: (newCategories: Category[]) => void;
  onManageKeywords?: (category: Category) => void;
  onSuggestSubcategories?: (parentId: string) => void;
  viewMode: 'grid' | 'list';
}

export const CategoryList: React.FC<CategoryListProps> = ({ categories, allCategories, onReorder, onManageKeywords, onSuggestSubcategories, viewMode }) => {
  // Deduplicate categories by ID to prevent dnd-kit & React duplicate key errors
  const uniqueCategories = categories.filter((cat, index, self) => 
    cat.id && self.findIndex(c => c.id === cat.id) === index
  );

  return (
    <SortableContext items={uniqueCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-6' : 'space-y-4'}>
        {uniqueCategories.map((category, index) => (
          <div key={category.id || `cat-${index}`} className="whitespace-nowrap">
            <SortableCategoryItem 
              category={category} 
              allCategories={allCategories} 
              onReorder={onReorder} 
              onManageKeywords={onManageKeywords}
              onSuggestSubcategories={onSuggestSubcategories}
            />
          </div>
        ))}
      </div>
    </SortableContext>
  );
};
