import React, { useState } from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'motion/react';
import { ImageIcon } from 'lucide-react';

interface OptimizedImageProps extends Omit<HTMLMotionProps<"img">, "onLoad" | "onError"> {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
  containerClassName?: string;
  blur?: boolean;
}

/**
 * OptimizedImage Component
 * Uses the <picture> tag to serve modern formats with fallback support.
 * Enhanced with Framer Motion animations and loading states.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt, 
  aspectRatio = 'aspect-[4/5]',
  className = '', 
  containerClassName = '',
  blur = false,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Simulate an image processing service by adding format parameters
  const avifSrc = src.includes('?') ? `${src}&fm=avif` : `${src}?fm=avif`;
  const webpSrc = src.includes('?') ? `${src}&fm=webp` : `${src}?fm=webp`;

  return (
    <div className={`relative overflow-hidden ${aspectRatio} ${containerClassName} bg-brand-surface`}>
      <AnimatePresence>
        {!isLoaded && !hasError && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-brand-surface"
          >
            <div className="w-full h-full animate-pulse bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-teal/5" />
          </motion.div>
        )}
        
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-surface text-brand-text-muted">
            <ImageIcon size={48} strokeWidth={1} className="mb-2 opacity-20" />
            <span className="text-xs font-medium uppercase tracking-widest opacity-40">Load failed</span>
          </div>
        )}
      </AnimatePresence>

      <picture>
        <source srcSet={avifSrc} type="image/avif" />
        <source srcSet={webpSrc} type="image/webp" />
        <motion.img
          src={src}
          alt={alt}
          initial={{ opacity: 0, scale: 1.1, filter: blur ? 'blur(10px)' : 'none' }}
          animate={{ 
            opacity: isLoaded ? 1 : 0, 
            scale: isLoaded ? 1 : 1.1,
            filter: isLoaded ? 'none' : (blur ? 'blur(10px)' : 'none')
          }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-all duration-700 ${className}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          {...props}
        />
      </picture>
    </div>
  );
};

export default OptimizedImage;
