import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface HapticButtonProps extends HTMLMotionProps<"button"> {
  hapticFeedback?: boolean;
  onPrefetch?: () => void;
}

export const HapticButton: React.FC<HapticButtonProps> = ({ 
  children, 
  onClick, 
  onPrefetch,
  hapticFeedback = true,
  ...props 
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
      // Light haptic feedback
      navigator.vibrate(50);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      {...props}
    >
      {children}
    </motion.button>
  );
};
