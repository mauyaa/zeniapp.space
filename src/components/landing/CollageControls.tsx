import React from 'react';

interface CollageControlsProps {
  onPrev: () => void;
  onNext: () => void;
}

export function CollageControls({ onPrev, onNext }: CollageControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrev}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--border))] text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
        aria-label="Previous preview"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onNext}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--border))] text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]"
        aria-label="Next preview"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
