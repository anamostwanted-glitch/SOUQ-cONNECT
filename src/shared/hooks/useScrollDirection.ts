import { useState, useEffect, RefObject } from 'react';

export enum ScrollDirection {
  UP = 'up',
  DOWN = 'down',
}

export function useScrollDirection(ref?: RefObject<HTMLElement>) {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection | null>(null);

  useEffect(() => {
    // Try to find the scrollable element: provided ref > main tag > window
    const element = ref?.current || document.querySelector('main') || window;
    
    const getScrollY = () => {
      if (element === window) return window.pageYOffset;
      if (element instanceof HTMLElement) return element.scrollTop;
      return 0;
    };

    let lastScrollY = getScrollY();
    
    const updateScrollDirection = () => {
      const scrollY = getScrollY();
      const diff = scrollY - lastScrollY;
      
      // Threshold to avoid jitter
      if (Math.abs(diff) > 10) {
        const direction = diff > 0 ? ScrollDirection.DOWN : ScrollDirection.UP;
        
        // Always reset to UP if we are at the very top
        if (scrollY <= 0) {
          setScrollDirection(ScrollDirection.UP);
        } else if (direction !== scrollDirection) {
          setScrollDirection(direction);
        }
        
        lastScrollY = scrollY > 0 ? scrollY : 0;
      }
    };

    element.addEventListener('scroll', updateScrollDirection, { passive: true });
    return () => {
      element.removeEventListener('scroll', updateScrollDirection);
    };
  }, [scrollDirection, ref?.current]);

  return scrollDirection;
}
