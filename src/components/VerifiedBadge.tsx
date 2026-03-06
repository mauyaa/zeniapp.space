import React from 'react';
import { CheckCircle2 } from 'lucide-react';
interface VerifiedBadgeProps {
  className?: string;
  showText?: boolean;
}
export function VerifiedBadge({ className = '', showText = true }: VerifiedBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}
      role="status"
      aria-label="Verified Listing"
    >
      <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" />
      {showText && <span className="text-xs font-medium tracking-wide">Verified</span>}
    </div>
  );
}
