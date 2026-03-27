import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'text' }) => {
  const baseClasses = 'relative overflow-hidden bg-brand-border/50';
  
  let variantClasses = '';
  switch (variant) {
    case 'circular':
      variantClasses = 'rounded-full';
      break;
    case 'rectangular':
      variantClasses = 'rounded-lg';
      break;
    default:
      variantClasses = 'rounded h-4 w-full';
  }

  return (
    <div className={`${baseClasses} ${variantClasses} ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
    </div>
  );
};

export const RequestSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 border border-brand-border-light shadow-sm space-y-4">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
      <Skeleton className="w-16 h-6 rounded-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-3/4 h-4" />
    </div>
    <div className="flex gap-2 pt-2">
      <Skeleton className="w-24 h-8 rounded-lg" />
      <Skeleton className="w-24 h-8 rounded-lg" />
    </div>
  </div>
);

export const SupplierSkeleton = () => (
  <div className="bg-white rounded-xl p-4 border border-brand-border-light shadow-sm space-y-4 min-w-[200px]">
    <div className="flex items-center gap-3">
      <Skeleton variant="circular" className="w-12 h-12" />
      <div className="space-y-2 flex-1">
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-2/3 h-3" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="flex-1 h-8 rounded-lg" />
      <Skeleton className="flex-1 h-8 rounded-lg" />
    </div>
  </div>
);
