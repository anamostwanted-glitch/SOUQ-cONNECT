import React, { useState } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'motion/react';

interface BlurImageProps extends HTMLMotionProps<"img"> {
  src: string;
  alt: string;
  containerClassName?: string;
  referrerPolicy?: "no-referrer" | "origin" | "unsafe-url";
}

export const BlurImage: React.FC<BlurImageProps> = ({ 
  src, 
  alt, 
  containerClassName = "", 
  referrerPolicy = "no-referrer",
  ...motionProps
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-brand-background animate-pulse flex items-center justify-center z-10"
          >
            <div className="w-full h-full bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 blur-xl" />
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        initial={{ opacity: 0, scale: 1.1, filter: 'blur(10px)', ...((motionProps.initial as any) || {}) }}
        animate={{ 
          opacity: isLoaded ? 1 : 0, 
          scale: isLoaded ? 1 : 1.1,
          filter: isLoaded ? 'blur(0px)' : 'blur(10px)',
          ...((motionProps.animate as any) || {})
        }}
        transition={{ duration: 0.5, ease: 'easeOut', ...motionProps.transition }}
        className={`w-full h-full object-cover ${isLoaded ? '' : 'invisible'} ${motionProps.className || ''}`}
        referrerPolicy={referrerPolicy}
        {...motionProps}
      />
    </div>
  );
};
