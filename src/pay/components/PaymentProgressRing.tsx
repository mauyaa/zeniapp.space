import React from 'react';

export function PaymentProgressRing({ value, label }: { value: number; label: string }) {
  const normalized = Math.min(100, Math.max(0, value));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-28 w-28">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="rgba(148,163,184,0.2)"
            strokeWidth="10"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="rgb(16 185 129)"
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {normalized}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Progress</div>
        </div>
      </div>
      <div className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</div>
    </div>
  );
}

