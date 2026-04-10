import { useEffect, useRef } from 'react';
import { UserProfile, ProductRequest } from '../../core/types';
import { fetchMarketplaceItems, fetchCategories, fetchSuppliers } from '../../modules/marketplace/services/marketService';
import { analyzeUserBehavior, checkAiStatus } from '../../core/services/geminiService';
import { handleAiError } from '../../core/utils/errorHandling';

export function usePredictiveNavigation(
  profile: UserProfile | null, 
  recentSearches: string[], 
  recentRequests: ProductRequest[],
  setIsMomentOfNeed: (isNeed: boolean) => void
) {
  const isPrefetching = useRef(false);

  useEffect(() => {
    if (!profile || isPrefetching.current) return;

    const analyzeAndPrefetch = async () => {
      isPrefetching.current = true;
      try {
        // Check if AI is even available before trying
        const status = await checkAiStatus();
        if (!status.available) {
          console.warn('Predictive Engine: AI is currently unavailable.', status.reason);
          setIsMomentOfNeed(false);
          return;
        }

        console.log('Predictive Engine: Analyzing user behavior...');
        const behavior = await analyzeUserBehavior(profile, recentSearches, recentRequests);
        
        if (!behavior) {
          console.warn('Predictive Engine: analyzeUserBehavior returned null/undefined, using fallback.');
          setIsMomentOfNeed(false);
          return;
        }

        setIsMomentOfNeed(behavior.isMomentOfNeed);

        if (behavior.isMomentOfNeed) {
          console.log('Predictive Engine: Moment of need detected. Pre-fetching critical data...');
          // Pre-fetch critical data in parallel
          await Promise.all([
            fetchMarketplaceItems('discover'),
            fetchCategories(),
            fetchSuppliers()
          ]);
          console.log('Predictive Engine: Data pre-fetched successfully.');
        }
      } catch (error) {
        handleAiError(error, 'usePredictiveNavigation:analyzeAndPrefetch', false);
      } finally {
        isPrefetching.current = false;
      }
    };

    analyzeAndPrefetch();
  }, [profile, recentSearches, recentRequests, setIsMomentOfNeed]);
}
