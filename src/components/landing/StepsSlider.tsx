import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

const steps = [
  {
    id: '01',
    title: 'Discover',
    description:
      'Search Kenya on the map, compare listings by price and amenities, and shortlist faster than any portal.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="7" strokeLinecap="round" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: '02',
    title: 'Verify',
    description:
      'Every listing and agent is checked before you engage. Title deeds, identity, and on-site details — all confirmed.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: '03',
    title: 'Connect',
    description:
      'Chat securely, schedule a viewing in-app, and visit with a trusted verified agent. Every step tracked.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 5h16v10H7l-3 3V5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: '04',
    title: 'Close',
    description:
      'Compare offers, review KES pricing data, and close with confidence. Documents stored securely in your vault.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

const AUTO_ADVANCE_MS = 3500;

export function StepsSlider() {
  const [active, setActive] = useState(0);
  const current = useMemo(() => steps[active], [active]);

  const prev = () => setActive((a) => (a - 1 + steps.length) % steps.length);
  const next = () => setActive((a) => (a + 1) % steps.length);

  // Auto-advance
  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % steps.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
      {/* Step cards grid */}
      <div className="grid grid-cols-2 gap-4">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActive(index)}
            className={clsx(
              'text-left p-5 rounded-2xl border transition-all duration-300 group',
              index === active
                ? 'border-[var(--zeni-green)] bg-[var(--zeni-green)]/5 shadow-md'
                : 'border-[var(--zeni-black)]/10 bg-[var(--zeni-white)] hover:border-[var(--zeni-green)]/40'
            )}
          >
            <div
              className={clsx(
                'mb-3 transition-colors',
                index === active ? 'text-[var(--zeni-green)]' : 'text-[var(--zeni-black)]/40'
              )}
            >
              {step.icon}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--zeni-black)]/40 mb-1">
              {step.id}
            </div>
            <div
              className={clsx(
                'text-sm font-medium transition-colors',
                index === active ? 'text-[var(--zeni-black)]' : 'text-[var(--zeni-black)]/60'
              )}
            >
              {step.title}
            </div>
          </button>
        ))}
      </div>

      {/* Active step detail */}
      <div className="relative">
        <div className="rounded-2xl border border-[var(--zeni-black)]/8 bg-[var(--zeni-white)] p-8 shadow-sm">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--zeni-green)] mb-2">
            Step {current.id}
          </div>
          <h3 className="text-3xl font-light tracking-tight text-[var(--zeni-black)] mb-4">
            {current.title}
          </h3>
          <p className="text-[var(--zeni-black)]/60 leading-relaxed font-light">
            {current.description}
          </p>

          {/* Progress bar */}
          <div className="mt-8 flex gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Go to step ${i + 1}`}
                className={clsx(
                  'h-1 rounded-full transition-all duration-500',
                  i === active
                    ? 'bg-[var(--zeni-green)] flex-1'
                    : 'bg-[var(--zeni-black)]/15 w-6'
                )}
              />
            ))}
          </div>

          {/* Nav buttons */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={prev}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--zeni-black)]/10 text-[var(--zeni-black)]/50 transition hover:border-[var(--zeni-green)] hover:text-[var(--zeni-green)]"
              aria-label="Previous step"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--zeni-black)]/10 text-[var(--zeni-black)]/50 transition hover:border-[var(--zeni-green)] hover:text-[var(--zeni-green)]"
              aria-label="Next step"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="font-mono text-xs text-[var(--zeni-black)]/35 ml-2">
              {active + 1} / {steps.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
