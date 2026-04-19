import { useMemo } from 'react';
import { MarketplaceItem, UserProfile, Category } from '../../../core/types';

interface VoiceFilters {
  location?: string;
  priceRange?: { min?: number; max?: number };
  sortBy?: string;
  querySuffix?: string;
}

export const useMarketplaceFilters = (
  items: MarketplaceItem[],
  visualSearchResults: MarketplaceItem[] | null,
  searchTerm: string,
  activeTab: 'discover' | 'services' | 'myshop' | 'requests',
  voiceFilters: VoiceFilters,
  categories: Category[],
  selectedNicheId?: string,
  selectedSectorId?: string,
  selectedHubId?: string
) => {
  return useMemo(() => {
    let result = (visualSearchResults ? visualSearchResults : items).filter(item => {
      const searchLower = searchTerm.toLowerCase();
      
      // 1. Hierarchical Category Filtering
      const activeCategoryId = selectedNicheId || selectedSectorId || selectedHubId;
      if (activeCategoryId) {
        if (!item.categories?.includes(activeCategoryId)) {
          const itemCategories = categories.filter(c => item.categories?.includes(c.id));
          const isDescendant = itemCategories.some(c => {
            let current: any = c;
            while (current) {
              if (current.id === activeCategoryId) return true;
              current = current.parentId ? categories.find(cat => cat.id === current.parentId) : null;
            }
            return false;
          });
          if (!isDescendant) return false;
        }
      }

      // 2. Discover/Services Tab Isolation
      const isServiceItem = categories.filter(c => item.categories?.includes(c.id)).some(c => {
        let current: any = c;
        while (current) {
          if (current.categoryType === 'service') return true;
          current = current.parentId ? categories.find(cat => cat.id === current.parentId) : null;
        }
        return false;
      });
      
      if (activeTab === 'discover' && isServiceItem) return false;
      if (activeTab === 'services' && !isServiceItem) return false;

      // 3. Search Term Matching
      const matchesSearch = 
        (item.title?.toLowerCase() || '').includes(searchLower) || 
        (item.description?.toLowerCase() || '').includes(searchLower) ||
        (item.titleAr?.toLowerCase() || '').includes(searchLower) ||
        (item.titleEn?.toLowerCase() || '').includes(searchLower);
      
      if (!matchesSearch) return false;

      // 4. Voice Filter: Location
      if (voiceFilters.location) {
        const loc = voiceFilters.location.toLowerCase();
        if (!item.location?.toLowerCase().includes(loc)) return false;
      }

      // 5. Voice Filter: Price Range
      if (voiceFilters.priceRange) {
        const { min, max } = voiceFilters.priceRange;
        if (min !== undefined && item.price < min) return false;
        if (max !== undefined && item.price > max) return false;
      }

      // 6. Voice Filter: Query Suffix (Advanced matching)
      if (voiceFilters.querySuffix) {
        const suffix = voiceFilters.querySuffix.toLowerCase();
        const matchesSuffix = 
          (item.title?.toLowerCase() || '').includes(suffix) || 
          (item.description?.toLowerCase() || '').includes(suffix);
        if (!matchesSuffix) return false;
      }

      return true;
    });

    // 7. Voice Filter: Sorting
    if (voiceFilters.sortBy) {
      if (voiceFilters.sortBy === 'price_asc') result.sort((a, b) => a.price - b.price);
      if (voiceFilters.sortBy === 'price_desc') result.sort((a, b) => b.price - a.price);
      if (voiceFilters.sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [items, visualSearchResults, searchTerm, activeTab, voiceFilters, categories, selectedNicheId, selectedSectorId, selectedHubId]);
};
