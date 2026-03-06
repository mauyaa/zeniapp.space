import React from 'react';
import { Link } from 'react-router-dom';

const checks = [
  'Verified badges show listings reviewed by ZENI (Kenyan Real Estate Management System).',
  'Report suspicious listings directly from any card.',
  'Schedule safe viewings and use in-app chat first.',
];

export function SafetySection() {
  return (
    <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted))]">Safety</div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[rgb(var(--text))]">
            Safety and trust, explained.
          </h2>
          <p className="mt-2 text-sm text-[rgb(var(--muted))] max-w-xl">
            Anti-scam checks and verified agents across Kenya reduce risk for everyone.
          </p>
        </div>
        <Link
          to="/login"
          className="text-sm text-[rgb(var(--accent))] underline underline-offset-4"
        >
          Learn how verification works &rarr;
        </Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm text-[rgb(var(--muted))]">
        {checks.map((check) => (
          <div key={check} className="flex items-start gap-2">
            <svg
              viewBox="0 0 24 24"
              className="mt-0.5 h-4 w-4 text-[rgb(var(--accent))]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{check}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
