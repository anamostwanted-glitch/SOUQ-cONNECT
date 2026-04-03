import { useState, useEffect, RefObject } from 'react';

export enum ScrollDirection {
  UP = 'up',
  DOWN = 'down',
}

export function useScrollDirection(ref?: RefObject<HTMLElement>) {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection | null>(null);

  useEffect(() => {
    const element = ref?.current || window;
    let lastScrollY = ref?.current ? ref.current.scrollTop : window.pageYOffset;
    
    const updateScrollDirection = () => {
      const scrollY = ref?.current ? ref.current.scrollTop : window.pageYOffset;
      
      // Only update if we've scrolled more than a threshold to avoid jitter
      const diff = scrollY - lastScrollY;
      if (Math.abs(diff) > 5) {
        const direction = diff > 0 ? ScrollDirection.DOWN : ScrollDirection.UP;
        if (direction !== scrollDirection) {
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
