import { useState, useEffect, RefObject } from 'react';

export const useAutoFlip = (ref: RefObject<HTMLElement>, isOpen: boolean) => {
  const [position, setPosition] = useState<'top' | 'bottom'>('bottom');

  useEffect(() => {
    if (isOpen && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If space below is less than 400px (approx dropdown height) and space above is more
      if (spaceBelow < 400 && spaceAbove > spaceBelow) {
        setPosition('top');
      } else {
        setPosition('bottom');
      }
    }
  }, [isOpen, ref]);

  return position;
};
