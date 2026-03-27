import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableCategoryItem } from './SortableCategoryItem';
import { Category } from '../types';

interface CategoryListProps {
  categories: Category[];
  allCategories: Category[];
  onReorder: (newCategories: Category[]) => void;
  onManageKeywords?: (category: Category) => void;
  viewMode: 'grid' | 'list';
}

export const CategoryList: React.FC<CategoryListProps> = ({ categories, allCategories, onReorder, onManageKeywords, viewMode }) => {
  return (
    <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-6' : 'space-y-4'}>
        {categories.map((category) => (
          <div key={category.id} className="whitespace-nowrap">
            <SortableCategoryItem 
              category={category} 
              allCategories={allCategories} 
              onReorder={onReorder} 
              onManageKeywords={onManageKeywords}
            />
          </div>
        ))}
      </div>
    </SortableContext>
  );
};
