import React, { useMemo, useState } from 'react';
import clsx from 'clsx';

const steps = [
  {
    id: '01',
    title: 'Discover',
    description: 'Search Kenya on the map, compare listings, and shortlist faster.'
  },
  {
    id: '02',
    title: 'Verify',
    description: 'Listings and agents are checked before you engage.'
  },
  {
    id: '03',
    title: 'Connect',
    description: 'Chat, schedule, and visit with trusted agents.'
  }
];

export function StepsSlider() {
  const [active, setActive] = useState(0);
  const current = useMemo(() => steps[active], [active]);

  const prev = () => setActive((active - 1 + steps.length) % steps.length);
  const next = () => setActive((active + 1) % steps.length);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
      <div className="relative">
        {/* Place steps image in /public/landing/steps.jpg */}
        <div className="h-64 overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface2))] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <img
            src="/landing/steps.jpg"
            alt="How it works"
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="mt-3 text-xs text-[rgb(var(--muted))]">Sample imagery - replace in /public/landing</div>
      </div>

      <div className="relative lg:-ml-16">
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
          <div className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted))]">Process</div>
          <div key={current.id} className="mt-6 transition-opacity duration-300 ease-out">
            <div className="text-sm text-[rgb(var(--muted))]">{current.id}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-[rgb(var(--text))]">
              {current.title}
            </div>
            <p className="mt-3 text-sm text-[rgb(var(--muted))]">{current.description}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-xs text-[rgb(var(--muted))]">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={clsx(
                  'flex items-center gap-2 rounded-full border px-3 py-1 transition',
                  index === active
                    ? 'border-[rgb(var(--accent))] text-[rgb(var(--accent))]'
                    : 'border-[rgb(var(--border))]'
                )}
              >
                <span>{step.id}</span>
                <span className="text-[rgb(var(--muted))]">{step.title}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--border))] text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))]"
              aria-label="Previous step"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--border))] text-[rgb(var(--muted))] transition hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))]"
              aria-label="Next step"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
