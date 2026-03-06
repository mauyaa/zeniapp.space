import React from 'react';

export function TypingIndicator({
  text = 'Agent typically replies in ~8 mins',
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-200">
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-amber-500/80 dark:bg-amber-300" />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-amber-500/80 dark:bg-amber-300"
          style={{ animationDelay: '0.1s' }}
        />
        <span
          className="h-2 w-2 animate-bounce rounded-full bg-amber-500/80 dark:bg-amber-300"
          style={{ animationDelay: '0.2s' }}
        />
      </div>
      <span>{text}</span>
    </div>
  );
}
