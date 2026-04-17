import { lazy, ComponentType } from 'react';

/**
 * A robust wrapper for React.lazy that attempts to retry imports if they fail
 * due to network issues or bundle updates.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | T>,
  maxRetries: number = 2,
  delay: number = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let retries = 0;
    
    while (retries <= maxRetries) {
      try {
        const component = await componentImport();
        // Handle both default and named exports wrapped in { default: T }
        return 'default' in component ? component : { default: component };
      } catch (error) {
        retries++;
        
        if (retries > maxRetries) {
          console.error(`Failed to load component after ${maxRetries} retries:`, error);
          throw error;
        }

        console.warn(`Lazy loading failed (attempt ${retries}/${maxRetries}), retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Component loading failed after retries');
  });
}
