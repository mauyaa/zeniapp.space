import React from 'react';
import { Link } from 'react-router-dom';

const checks = [
  'Verified badges show listings reviewed by ZENI.',
  'Report suspicious listings directly from any card.',
  'Schedule safe viewings and use in-app chat first.',
];

export function SafetySection() {
  return (
    <div className="rounded-2xl border border-[var(--zeni-black)]/8 bg-[var(--zeni-white)] p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--zeni-black)]/45">
            Safety
          </div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-light tracking-tight text-[var(--zeni-black)]">
            Safety and trust, <span className="font-medium">explained.</span>
          </h2>
          <p className="mt-2 text-sm text-[var(--zeni-black)]/55 max-w-xl font-light">
            Anti-scam checks and verified agents across Kenya reduce risk for everyone.
          </p>
        </div>
        <Link
          to="/login"
          className="font-mono text-xs uppercase tracking-widest text-[var(--zeni-green)] hover:text-[var(--zeni-black)] transition-colors"
        >
          Learn more →
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {checks.map((check) => (
          <div key={check} className="flex items-start gap-3">
            <svg
              viewBox="0 0 24 24"
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--zeni-green)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm text-[var(--zeni-black)]/55 font-light leading-relaxed">
              {check}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
