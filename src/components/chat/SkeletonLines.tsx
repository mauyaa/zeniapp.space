import React from 'react';

export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3 py-4">
      {Array.from({ length: Math.min(lines, 4) }).map((_, idx) => {
        const isRight = idx % 2 === 0;
        return (
          <div key={idx} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
            <div
              className="animate-pulse rounded-2xl bg-gray-200/60"
              style={{
                width: `${45 + (idx % 3) * 10}%`,
                height: '36px',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
