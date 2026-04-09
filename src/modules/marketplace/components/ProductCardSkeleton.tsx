import React from 'react';
import { Skeleton } from '../../../shared/components/Skeleton';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-brand-surface rounded-[2rem] border border-brand-border overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-square w-full bg-brand-background/50" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-start">
          <Skeleton className="h-5 w-3/4 rounded-lg" />
          <Skeleton className="h-5 w-1/4 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-2/3 rounded-lg" />
        <div className="pt-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
