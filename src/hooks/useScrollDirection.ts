import { useState, useEffect, useRef } from 'react';

export enum ScrollDirection {
  UP = 'up',
  DOWN = 'down',
  NONE = 'none'
}

/**
 * A hook that returns the current scroll direction.
 * @param threshold The minimum scroll distance to trigger a direction change
 */
export function useScrollDirection(threshold: number = 10) {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(ScrollDirection.NONE);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;

      if (Math.abs(diff) > threshold) {
        const direction = diff > 0 ? ScrollDirection.DOWN : ScrollDirection.UP;
        setScrollDirection(direction);
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return scrollDirection;
}
