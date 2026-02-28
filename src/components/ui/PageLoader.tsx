import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PageLoaderProps {
  message?: string;
  className?: string;
  /** Full-page vs inline */
  fullPage?: boolean;
}

/**
 * Full-page or inline loading spinner with optional message.
 * Use for route-level or section-level loading states.
 * Includes the Zeni branding for full-page variant.
 */
export function PageLoader({ message = 'Loading...', className = '', fullPage = false }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullPage ? 'min-h-screen bg-zeni-background' : 'py-12',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {fullPage && (
        <div className="text-2xl font-serif font-bold tracking-tight text-zeni-foreground dark:text-white mb-2" aria-hidden="true">
  ZENI<span className="text-green-500">.</span>
</div>
      )}
      <div className="relative">
        <Loader2 className="h-8 w-8 animate-spin text-zeni-muted dark:text-slate-500" aria-hidden="true" />
      </div>
      {message && (
        <p className="text-sm text-zeni-muted dark:text-slate-400 font-medium">{message}</p>
      )}
      <span className="sr-only">{message}</span>
    </div>
  );
}
