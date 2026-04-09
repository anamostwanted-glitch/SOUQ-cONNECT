import React from 'react';

export const Skeleton = ({ className, variant = 'default' }: { className?: string, variant?: 'default' | 'circular' }) => (
  <div className={`animate-pulse bg-brand-surface ${variant === 'circular' ? 'rounded-full' : 'rounded-xl'} ${className}`} />
);

export const RequestSkeleton = () => (
  <div className="space-y-4 p-4 animate-pulse">
    <div className="h-4 bg-brand-surface rounded w-3/4" />
    <div className="h-4 bg-brand-surface rounded w-1/2" />
  </div>
);
