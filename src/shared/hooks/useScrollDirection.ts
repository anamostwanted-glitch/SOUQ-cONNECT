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
      const direction = scrollY > lastScrollY ? ScrollDirection.DOWN : ScrollDirection.UP;
      if (direction !== scrollDirection && (scrollY - lastScrollY > 10 || scrollY - lastScrollY < -10)) {
        setScrollDirection(direction);
      }
      lastScrollY = scrollY > 0 ? scrollY : 0;
    };

    element.addEventListener('scroll', updateScrollDirection);
    return () => {
      element.removeEventListener('scroll', updateScrollDirection);
    };
  }, [scrollDirection, ref]);

  return scrollDirection;
}
