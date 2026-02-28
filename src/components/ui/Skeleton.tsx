import React from 'react';
import { cn } from '../../utils/cn';

/** Generic skeleton block - use zeni-skeleton-shimmer in theme for animation */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('zeni-skeleton-shimmer rounded', className)} />;
}

/** Card-style skeleton for saved search / viewing row */
export function SkeletonCardRow() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-6 border border-zinc-200 bg-zeni-surface rounded-2xl">
      <Skeleton className="h-24 w-28 flex-shrink-0 rounded-xl" />
      <div className="flex-1 space-y-3 min-w-0">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Profile section skeleton */
export function SkeletonProfileSection() {
  return (
    <div className="space-y-10">
      <div className="flex gap-0 border border-zinc-200 bg-zeni-surface rounded-md overflow-hidden w-fit">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-6 py-4 border-r border-zinc-200 last:border-r-0">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <Skeleton className="h-64 rounded-md" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Grid of small card placeholders (e.g. saved searches) */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-zinc-200 bg-zeni-surface rounded-2xl p-6">
          <Skeleton className="h-12 w-12 rounded-xl mb-4" />
          <Skeleton className="h-5 w-2/3 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-4" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
