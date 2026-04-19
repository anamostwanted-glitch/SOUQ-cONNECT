import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { soundService, SoundType } from '../../core/utils/soundService';

interface HapticButtonProps extends HTMLMotionProps<"button"> {
  hapticFeedback?: boolean;
  soundType?: SoundType;
  onPrefetch?: () => void;
}

export const HapticButton: React.FC<HapticButtonProps> = ({ 
  children, 
  onClick, 
  onPrefetch,
  hapticFeedback = true,
  soundType = SoundType.TAP_LIGHT,
  ...props 
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (hapticFeedback) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        // Light haptic feedback
        navigator.vibrate(50);
      }
      // Audio feedback
      soundService.play(soundType);
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
