import { UserProfile, ProductRequest } from '../../core/types';

export interface PredictiveAction {
  action: string;
  label: string;
  icon: string;
  reason?: string;
  priority: 'low' | 'medium' | 'high';
}

export const getNextBestAction = (
  profile: UserProfile | null, 
  currentView: string,
  recentRequests?: ProductRequest[],
  unreadMessages?: number
): PredictiveAction | null => {
  if (!profile) return null;

  const isRtl = localStorage.getItem('i18nextLng') === 'ar';

  // 1. Critical Priority: Unread Messages
  if (unreadMessages && unreadMessages > 0 && currentView !== 'chat') {
    return {
      action: 'view_chat',
      label: isRtl ? 'لديك رسائل جديدة' : 'You have new messages',
      icon: 'MessageSquare',
      reason: isRtl ? 'هناك موردين بانتظار ردك' : 'Suppliers are waiting for your response',
      priority: 'high'
    };
  }

  // 2. Supplier Contexts
  if (profile.role === 'supplier') {
    if (currentView === 'dashboard') {
      if (recentRequests && recentRequests.length > 0) {
        return {
          action: 'analyze_market',
          label: isRtl ? 'تحليل الفرص الجديدة' : 'Analyze New Opportunities',
          icon: 'TrendingUp',
          reason: isRtl ? 'هناك طلبات جديدة متوفرة في قسمك' : 'There are new requests available in your category',
          priority: 'medium'
        };
      }
      return {
        action: 'upload_product',
        label: isRtl ? 'رفع منتج جديد' : 'Upload New Product',
        icon: 'Package',
        reason: isRtl ? 'زيادة ظهورك في السوق' : 'Increase your market visibility',
        priority: 'medium'
      };
    }
  }
  
  // 3. Customer Contexts
  if (profile.role === 'customer') {
    if (currentView === 'home' || currentView === 'marketplace') {
      if (recentRequests && recentRequests.length > 0) {
        const lastRequest = recentRequests[0];
        if (lastRequest.status === 'open') {
          return {
            action: 'track_request',
            label: isRtl ? 'متابعة طلبك الأخير' : 'Track Recent Request',
            icon: 'Activity',
            reason: isRtl ? `طلبك لـ "${lastRequest.productName}" قيد المراجعة` : `Your request for "${lastRequest.productName}" is being reviewed`,
            priority: 'medium'
          };
        }
      }
      return {
        action: 'search_market',
        label: isRtl ? 'استكشاف السوق' : 'Explore Market',
        icon: 'Search',
        reason: isRtl ? 'اكتشف أفضل الموردين والمعدات' : 'Discover top suppliers and equipment',
        priority: 'low'
      };
    }
  }

  // 4. Default suggest profile completion
  if (!profile.onboardingCompleted) {
    return {
      action: 'complete_profile',
      label: isRtl ? 'أكمل ملفك الشخصي' : 'Complete Your Profile',
      icon: 'User',
      reason: isRtl ? 'لزيادة الموثوقية والحصول على نتائج أفضل' : 'To increase trust and get better results',
      priority: 'high'
    };
  }

  return null;
};
