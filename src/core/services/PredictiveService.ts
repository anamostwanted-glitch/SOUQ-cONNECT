import { UserProfile } from '../../core/types';

export const getNextBestAction = (profile: UserProfile | null, currentView: string) => {
  if (!profile) return null;

  // منطق بسيط للتنبؤ بناءً على الدور والسياق
  if (profile.role === 'supplier' && currentView === 'dashboard') {
    return {
      action: 'upload_product',
      label: 'Upload New Product',
      icon: 'Package'
    };
  }
  
  if (profile.role === 'customer' && currentView === 'home') {
    return {
      action: 'search_market',
      label: 'Explore Market',
      icon: 'ShoppingBag'
    };
  }

  return null;
};
