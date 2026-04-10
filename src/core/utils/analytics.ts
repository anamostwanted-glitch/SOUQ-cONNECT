import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import { app } from '../firebase';

let analytics: Analytics | null = null;

// Initialize analytics only on client-side
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

/**
 * Logs a custom event to Firebase Analytics.
 * @param eventName The name of the event.
 * @param eventParams Additional parameters for the event.
 */
export const trackEvent = (eventName: string, eventParams?: { [key: string]: any }) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  } else {
    console.warn(`Analytics not initialized. Event: ${eventName}`);
  }
};
