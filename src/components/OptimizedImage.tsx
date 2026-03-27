import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * 3. Optimized Images (WebP/AVIF)
 * This component uses the <picture> tag to serve modern formats with fallbacks.
 * In a real Meta environment, the Image Processing Service would handle this.
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({ src, alt, className, width, height }) => {
  // Simulate an image processing service by adding format parameters
  // Many CDNs like Cloudinary or Imgix support this.
  const avifSrc = `${src}?fm=avif&w=${width || 800}`;
  const webpSrc = `${src}?fm=webp&w=${width || 800}`;
  const defaultSrc = `${src}?w=${width || 800}`;

  return (
    <picture className={className}>
      <source srcSet={avifSrc} type="image/avif" />
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={defaultSrc}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </picture>
  );
};

export default OptimizedImage;
