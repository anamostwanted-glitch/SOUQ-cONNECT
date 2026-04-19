import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export type EventType = 
  | 'session_start'
  | 'page_view'
  | 'login'
  | 'registration_start'
  | 'registration_complete'
  | 'supplier_onboarding_step'
  | 'supplier_onboarding_complete'
  | 'search_performed'
  | 'product_view'
  | 'request_created'
  | 'chat_started'
  | 'offer_created'
  | 'offer_accepted'
  | 'error_encountered'
  | 'performance_metric';

export interface AnalyticsEvent {
  type: EventType;
  userId?: string;
  userRole?: string;
  path: string;
  metadata?: Record<string, any>;
  timestamp: any;
  sessionId: string;
}

class AnalyticsService {
  private sessionId: string;

  constructor() {
    this.sessionId = Math.random().toString(36).substring(2, 15);
  }

  async trackEvent(type: EventType, metadata: Record<string, any> = {}) {
    try {
      const user = auth.currentUser;
      const event: AnalyticsEvent = {
        type,
        userId: user?.uid,
        path: window.location.pathname + window.location.search,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          language: navigator.language,
          screenResolution: `${window.innerWidth}x${window.innerHeight}`
        },
        timestamp: serverTimestamp(),
        sessionId: this.sessionId
      };

      // Add to a dedicated analytics collection
      await addDoc(collection(db, 'analytics_events'), event);
      
      // Also log locally for dev
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Analytics] ${type}:`, event);
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  // Conversion Funnel Helpers
  trackRegistration(step: number, role: string) {
    this.trackEvent('registration_start', { step, role });
  }

  trackOnboarding(step: number) {
    this.trackEvent('supplier_onboarding_step', { step });
  }

  trackConversion(type: 'supplier_signup' | 'order_complete', value?: number) {
    this.trackEvent(type === 'supplier_signup' ? 'supplier_onboarding_complete' : 'offer_accepted', { value });
  }
}

export const analytics = new AnalyticsService();
